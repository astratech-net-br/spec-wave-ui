// Observabilidade (fase 2): alarmes + dashboard. Notificação via SNS — passe
// -c alarmEmail=<email> para assinar (confirmação chega por email).
//
// Alarme-chave: SpecWave/RefineDurationMs p90 > 25 s (EMF emitido pelo
// artifactService) — é o gatilho da decisão de mover o refine para Function
// URL/assíncrono (teto duro do HTTP API é 29 s).

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cwactions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snssubs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import type { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export interface ObservabilityStackProps extends cdk.StackProps {
  httpApi: apigwv2.HttpApi;
  apiFn: NodejsFunction;
  webhookFn: NodejsFunction;
  refineWorkerFn: NodejsFunction;
  table: dynamodb.Table;
}

export class ObservabilityStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);

    const topic = new sns.Topic(this, 'Alarms', { topicName: 'spec-wave-alarms' });
    const alarmEmail = this.node.tryGetContext('alarmEmail') as string | undefined;
    if (alarmEmail) topic.addSubscription(new snssubs.EmailSubscription(alarmEmail));

    const alarm = (a: cloudwatch.Alarm) => {
      a.addAlarmAction(new cwactions.SnsAction(topic));
      return a;
    };

    const api5xx = props.httpApi.metricServerError({ period: cdk.Duration.minutes(5) });
    const apiErrors = props.apiFn.metricErrors({ period: cdk.Duration.minutes(5) });
    const webhookErrors = props.webhookFn.metricErrors({ period: cdk.Duration.minutes(5) });
    const refineWorkerErrors = props.refineWorkerFn.metricErrors({ period: cdk.Duration.minutes(5) });
    const apiP90 = props.apiFn.metricDuration({
      period: cdk.Duration.minutes(5),
      statistic: 'p90',
    });
    const refineP90 = new cloudwatch.Metric({
      namespace: 'SpecWave',
      metricName: 'RefineDurationMs',
      statistic: 'p90',
      period: cdk.Duration.minutes(15),
    });
    const dynamoThrottles = new cloudwatch.Metric({
      namespace: 'AWS/DynamoDB',
      metricName: 'ThrottledRequests',
      dimensionsMap: { TableName: props.table.tableName },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    alarm(
      new cloudwatch.Alarm(this, 'Api5xx', {
        metric: api5xx,
        threshold: 5,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: 'spec-wave: >5 respostas 5xx do HTTP API em 5 min',
      }),
    );
    alarm(
      new cloudwatch.Alarm(this, 'ApiFnErrors', {
        metric: apiErrors,
        threshold: 3,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: 'spec-wave: erros na Lambda api',
      }),
    );
    alarm(
      new cloudwatch.Alarm(this, 'WebhookFnErrors', {
        metric: webhookErrors,
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        // Webhook com erro = instalação fora de sincronia. O GitHub reentrega
        // (nosso 500 força retry), mas persistência de erro exige ação manual
        // (redeliver na UI do App).
        alarmDescription: 'spec-wave: erros na Lambda webhook (vínculo instalação↔tenant)',
      }),
    );
    alarm(
      new cloudwatch.Alarm(this, 'RefineP90', {
        metric: refineP90,
        // Refino agora roda no worker assíncrono (timeout 5 min) — sem o teto de
        // 29s. Alarme aciona perto do timeout (p90 > 4 min = geração patológica).
        threshold: 240_000,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: 'spec-wave: refine p90 > 4 min — worker perto do timeout',
      }),
    );
    alarm(
      new cloudwatch.Alarm(this, 'RefineWorkerErrors', {
        metric: refineWorkerErrors,
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: 'spec-wave: erros no worker de refino (job não concluído)',
      }),
    );
    alarm(
      new cloudwatch.Alarm(this, 'DynamoThrottles', {
        metric: dynamoThrottles,
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: 'spec-wave: throttling no DynamoDB',
      }),
    );

    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: 'spec-wave',
    });
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'HTTP API — requests / 4xx / 5xx',
        left: [
          props.httpApi.metricCount({ period: cdk.Duration.minutes(5) }),
          props.httpApi.metricClientError({ period: cdk.Duration.minutes(5) }),
          api5xx,
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda api — duração (p50/p90) e erros',
        left: [
          props.apiFn.metricDuration({ period: cdk.Duration.minutes(5), statistic: 'p50' }),
          apiP90,
        ],
        right: [apiErrors],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Refine (worker async) — duração p50/p90 e erros',
        left: [
          new cloudwatch.Metric({
            namespace: 'SpecWave',
            metricName: 'RefineDurationMs',
            statistic: 'p50',
            period: cdk.Duration.minutes(15),
          }),
          refineP90,
        ],
        right: [refineWorkerErrors],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Webhook + DynamoDB',
        left: [props.webhookFn.metricInvocations({ period: cdk.Duration.minutes(5) }), webhookErrors],
        right: [dynamoThrottles],
        width: 12,
      }),
    );

    new cdk.CfnOutput(this, 'AlarmTopicArn', { value: topic.topicArn });
  }
}
