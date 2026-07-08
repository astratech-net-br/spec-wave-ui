// Métricas via CloudWatch Embedded Metric Format (EMF): uma linha JSON no
// stdout vira métrica no namespace SpecWave — sem SDK nem chamadas extras.
// Usado para medir a duração do refine (decisão da fase 2: se p90 > 25 s,
// migrar o refine para Function URL/assíncrono).

export function emitMetric(
  name: string,
  value: number,
  unit: 'Milliseconds' | 'Count',
  dimensions: Record<string, string> = {},
): void {
  const dimensionNames = Object.keys(dimensions);
  // Publica o rollup sem dimensão além do recorte dimensionado — alarmes agregam
  // no rollup; investigação usa as dimensões.
  const dimensionSets = dimensionNames.length ? [dimensionNames, []] : [[]];
  console.log(
    JSON.stringify({
      _aws: {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          {
            Namespace: 'SpecWave',
            Dimensions: dimensionSets,
            Metrics: [{ Name: name, Unit: unit }],
          },
        ],
      },
      [name]: value,
      ...dimensions,
    }),
  );
}
