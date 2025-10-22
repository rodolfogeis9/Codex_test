export default function ScenarioChart({
  timeline,
  retirementAge,
  projectionEndAge,
  formatCurrency,
}) {
  if (!Array.isArray(timeline) || timeline.length === 0) {
    return null;
  }

  const chartWidth = 100;
  const chartHeight = 60;
  const leftPadding = 8;
  const rightPadding = 8;
  const topPadding = 6;
  const bottomPadding = 12;
  const drawableWidth = chartWidth - leftPadding - rightPadding;
  const drawableHeight = chartHeight - topPadding - bottomPadding;
  const baselineY = chartHeight - bottomPadding;

  const lastPoint = timeline[timeline.length - 1];
  const maxBalance = Math.max(...timeline.map((point) => point.balance));
  const denominator = lastPoint.monthIndex === 0 ? 1 : lastPoint.monthIndex;

  const chartPoints = timeline.map((point) => {
    const x = leftPadding + (point.monthIndex / denominator) * drawableWidth;
    const ratio = maxBalance <= 0 ? 0 : point.balance / maxBalance;
    const y = baselineY - ratio * drawableHeight;
    return {
      x,
      y,
      balance: point.balance,
      isRetirement: point.isRetirement,
    };
  });

  const pathData = chartPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

  const areaPathData = chartPoints.length > 1
    ? [
        `M ${chartPoints[0].x.toFixed(2)} ${baselineY}`,
        ...chartPoints.map(
          (point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
        ),
        `L ${chartPoints[chartPoints.length - 1].x.toFixed(2)} ${baselineY}`,
        'Z',
      ].join(' ')
    : '';

  const retirementPoint = chartPoints.find((point) => point.isRetirement);

  return (
    <div className="scenario-chart">
      <svg
        className="scenario-chart__svg"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label="Evolución del capital proyectado"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(20, 180, 140, 0.45)" />
            <stop offset="100%" stopColor="rgba(20, 180, 140, 0.05)" />
          </linearGradient>
        </defs>
        <rect
          x="0"
          y="0"
          width={chartWidth}
          height={chartHeight}
          rx="6"
          className="scenario-chart__backdrop"
        />
        <line
          x1={leftPadding}
          x2={chartWidth - rightPadding}
          y1={baselineY}
          y2={baselineY}
          className="scenario-chart__axis"
        />
        <line
          x1={leftPadding}
          x2={leftPadding}
          y1={topPadding}
          y2={baselineY}
          className="scenario-chart__axis"
        />
        {areaPathData && (
          <path d={areaPathData} className="scenario-chart__area" fill="url(#chartGradient)" />
        )}
        {pathData && (
          <path d={pathData} className="scenario-chart__line" />
        )}
        {retirementPoint && (
          <line
            x1={retirementPoint.x}
            x2={retirementPoint.x}
            y1={topPadding}
            y2={baselineY}
            className="scenario-chart__retirement"
          />
        )}
        {chartPoints.map((point) => (
          <circle
            key={`${point.x}-${point.y}`}
            cx={point.x}
            cy={point.y}
            r={1.3}
            className="scenario-chart__dot"
          />
        ))}
        {retirementPoint && (
          <circle
            cx={retirementPoint.x}
            cy={retirementPoint.y}
            r={1.7}
            className="scenario-chart__dot scenario-chart__dot--highlight"
          />
        )}
      </svg>
      <div className="scenario-chart__legend">
        <div className="scenario-chart__legend-item">
          <span>Hoy</span>
          <strong>{formatCurrency(timeline[0].balance)}</strong>
        </div>
        {retirementPoint && (
          <div className="scenario-chart__legend-item">
            <span>{`Jubilación (${retirementAge} años)`}</span>
            <strong>{formatCurrency(retirementPoint.balance)}</strong>
          </div>
        )}
        <div className="scenario-chart__legend-item">
          <span>{`Proyección (${projectionEndAge} años)`}</span>
          <strong>{formatCurrency(lastPoint.balance)}</strong>
        </div>
      </div>
    </div>
  );
}

