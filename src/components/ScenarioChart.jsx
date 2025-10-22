import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const CHART_WIDTH = 1000;
const CHART_HEIGHT = 520;
const MARGINS = { top: 50, right: 40, bottom: 80, left: 90 };

function buildPath(points, accessor, xScale, yScale) {
  if (!points.length) {
    return '';
  }
  return points
    .map((point, index) => {
      const x = xScale(point.monthIndex);
      const y = yScale(accessor(point));
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function getNiceTicks(maxValue, desiredCount = 5) {
  if (maxValue <= 0) {
    return [0];
  }
  const rawStep = maxValue / desiredCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;
  let niceStep;
  if (residual >= 5) {
    niceStep = 5 * magnitude;
  } else if (residual >= 2) {
    niceStep = 2 * magnitude;
  } else {
    niceStep = magnitude;
  }
  const ticks = [0];
  let value = niceStep;
  while (value < maxValue) {
    ticks.push(value);
    value += niceStep;
  }
  if (ticks[ticks.length - 1] < maxValue) {
    ticks.push(maxValue);
  }
  return ticks;
}

function formatPointLabel(point) {
  try {
    if (!(point.date instanceof Date) || Number.isNaN(point.date.getTime())) {
      return point.monthIndex === 0 ? 'Hoy' : '';
    }
    if (point.monthIndex === 0) {
      return 'Hoy';
    }
    return point.date.toLocaleString('es-ES', { month: 'long' });
  } catch {
    return point.monthIndex === 0 ? 'Hoy' : '';
  }
}

export default function ScenarioChart({
  timeline,
  retirementAge,
  formatCurrency,
  initialBalance,
}) {
  const svgRef = useRef(null);
  const [visibleMonths, setVisibleMonths] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [hoverPoint, setHoverPoint] = useState(null);

  const points = useMemo(() => {
    if (!Array.isArray(timeline) || timeline.length === 0) {
      return [];
    }
    const baseBalance = initialBalance ?? timeline[0]?.balance ?? 0;
    return timeline.map((point) => ({
      ...point,
      total: point.balance,
      invested: baseBalance + point.contributed,
      year: point.date.getUTCFullYear(),
      label: formatPointLabel(point),
    }));
  }, [timeline, initialBalance]);

  const lastPoint = points.length ? points[points.length - 1] : null;

  useEffect(() => {
    if (!lastPoint) {
      setVisibleMonths(0);
      setSelectedPoint(null);
      setHoverPoint(null);
      return;
    }
    setVisibleMonths(lastPoint.monthIndex);
    setSelectedPoint(lastPoint);
    setHoverPoint(null);
  }, [lastPoint]);

  const visiblePoints = useMemo(() => {
    if (!points.length || !lastPoint) {
      return [];
    }
    const limit = visibleMonths > 0 ? visibleMonths : lastPoint.monthIndex;
    return points.filter((point) => point.monthIndex <= limit);
  }, [points, visibleMonths, lastPoint]);

  useEffect(() => {
    if (!visiblePoints.length) {
      setSelectedPoint(null);
      return;
    }
    const lastVisible = visiblePoints[visiblePoints.length - 1];
    if (!selectedPoint || selectedPoint.monthIndex > lastVisible.monthIndex) {
      setSelectedPoint(lastVisible);
    }
    if (hoverPoint && hoverPoint.monthIndex > lastVisible.monthIndex) {
      setHoverPoint(null);
    }
  }, [visiblePoints, selectedPoint, hoverPoint]);

  const innerWidth = CHART_WIDTH - MARGINS.left - MARGINS.right;
  const innerHeight = CHART_HEIGHT - MARGINS.top - MARGINS.bottom;
  const baselineY = MARGINS.top + innerHeight;

  const visibleMaxMonth = visiblePoints.length
    ? visiblePoints[visiblePoints.length - 1].monthIndex
    : 1;

  const maxValueForScale = useMemo(() => {
    if (!visiblePoints.length) {
      return 0;
    }
    return visiblePoints.reduce(
      (acc, point) => Math.max(acc, point.total, point.invested),
      0
    );
  }, [visiblePoints]);

  const yDomainMax = maxValueForScale > 0 ? maxValueForScale * 1.05 : 1;

  const xScale = useCallback(
    (monthIndex) => {
      if (visibleMaxMonth === 0) {
        return MARGINS.left;
      }
      return (
        MARGINS.left + (monthIndex / visibleMaxMonth) * innerWidth
      );
    },
    [visibleMaxMonth, innerWidth]
  );

  const yScale = useCallback(
    (value) => {
      if (!Number.isFinite(value)) {
        return baselineY;
      }
      const ratio = value <= 0 ? 0 : Math.min(value / yDomainMax, 1);
      return MARGINS.top + (1 - ratio) * innerHeight;
    },
    [innerHeight, yDomainMax, baselineY]
  );

  const totalPath = useMemo(
    () => buildPath(visiblePoints, (point) => point.total, xScale, yScale),
    [visiblePoints, xScale, yScale]
  );

  const investedPath = useMemo(
    () => buildPath(visiblePoints, (point) => point.invested, xScale, yScale),
    [visiblePoints, xScale, yScale]
  );

  const yTicks = useMemo(
    () => getNiceTicks(maxValueForScale, 4),
    [maxValueForScale]
  );

  const xTicks = useMemo(() => {
    if (!visiblePoints.length) {
      return [];
    }
    const ticks = [];
    const seenYears = new Set();
    visiblePoints.forEach((point) => {
      if (!seenYears.has(point.year)) {
        seenYears.add(point.year);
        ticks.push({
          label: point.year,
          monthIndex: point.monthIndex,
        });
      }
    });
    const lastVisible = visiblePoints[visiblePoints.length - 1];
    if (!seenYears.has(lastVisible.year)) {
      ticks.push({ label: lastVisible.year, monthIndex: lastVisible.monthIndex });
    }
    return ticks;
  }, [visiblePoints]);

  const retirementPoint = useMemo(
    () => visiblePoints.find((point) => point.isRetirement) ?? null,
    [visiblePoints]
  );

  const lastVisiblePoint = visiblePoints.length
    ? visiblePoints[visiblePoints.length - 1]
    : null;

  const activePoint = hoverPoint ?? selectedPoint ?? retirementPoint ?? lastVisiblePoint;

  const handlePointerMove = useCallback(
    (event) => {
      if (!svgRef.current || !visiblePoints.length) {
        return;
      }
      const svg = svgRef.current;
      const ctm = svg.getScreenCTM();
      if (!ctm) {
        return;
      }
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const cursor = point.matrixTransform(ctm.inverse());
      let nearest = null;
      visiblePoints.forEach((candidate) => {
        const candidateX = xScale(candidate.monthIndex);
        const distance = Math.abs(candidateX - cursor.x);
        if (!nearest || distance < nearest.distance) {
          nearest = { point: candidate, distance };
        }
      });
      if (nearest) {
        setHoverPoint(nearest.point);
      }
    },
    [visiblePoints, xScale]
  );

  const handlePointerLeave = useCallback(() => {
    setHoverPoint(null);
  }, []);

  const handleClick = useCallback(() => {
    if (hoverPoint) {
      setSelectedPoint(hoverPoint);
    }
  }, [hoverPoint]);

  const resetZoom = useCallback(() => {
    if (lastPoint) {
      setVisibleMonths(lastPoint.monthIndex);
      setSelectedPoint(lastPoint);
      setHoverPoint(null);
    }
  }, [lastPoint]);

  if (!points.length) {
    return null;
  }

  const sliderMax = lastPoint?.monthIndex ?? 1;
  const sliderMin = 1;
  const sliderStep = sliderMax > 240 ? 6 : 1;

  const tooltipPosition = activePoint
    ? {
        left: `${(xScale(activePoint.monthIndex) / CHART_WIDTH) * 100}%`,
        top: `${(yScale(activePoint.total) / CHART_HEIGHT) * 100}%`,
      }
    : null;

  return (
    <div className="scenario-chart">
      <div className="scenario-chart__canvas">
        <svg
          ref={svgRef}
          className="scenario-chart__svg"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label="Evolución del capital acumulado"
          onMouseMove={handlePointerMove}
          onMouseLeave={handlePointerLeave}
          onClick={handleClick}
        >
          <rect
            x="0"
            y="0"
            width={CHART_WIDTH}
            height={CHART_HEIGHT}
            className="scenario-chart__backdrop"
            rx="18"
          />
          <line
            x1={MARGINS.left}
            y1={baselineY}
            x2={CHART_WIDTH - MARGINS.right}
            y2={baselineY}
            className="scenario-chart__axis"
          />
          <line
            x1={MARGINS.left}
            y1={MARGINS.top}
            x2={MARGINS.left}
            y2={baselineY}
            className="scenario-chart__axis"
          />
          {yTicks.map((tick) => (
            <g key={`y-${tick}`} className="scenario-chart__tick">
              <line
                x1={MARGINS.left}
                x2={CHART_WIDTH - MARGINS.right}
                y1={yScale(tick)}
                y2={yScale(tick)}
                className="scenario-chart__grid-line"
              />
              <text
                x={MARGINS.left - 14}
                y={yScale(tick)}
                alignmentBaseline="middle"
                className="scenario-chart__tick-label"
              >
                {formatCurrency(tick)}
              </text>
            </g>
          ))}
          {xTicks.map((tick) => (
            <g key={`x-${tick.monthIndex}`} className="scenario-chart__tick">
              <line
                x1={xScale(tick.monthIndex)}
                x2={xScale(tick.monthIndex)}
                y1={baselineY}
                y2={MARGINS.top}
                className="scenario-chart__grid-line scenario-chart__grid-line--vertical"
              />
              <text
                x={xScale(tick.monthIndex)}
                y={baselineY + 24}
                textAnchor="middle"
                className="scenario-chart__tick-label"
              >
                {tick.label}
              </text>
            </g>
          ))}
          {investedPath && (
            <path d={investedPath} className="scenario-chart__line scenario-chart__line--invested" />
          )}
          {totalPath && (
            <path d={totalPath} className="scenario-chart__line scenario-chart__line--total" />
          )}
          {retirementPoint && (
            <line
              x1={xScale(retirementPoint.monthIndex)}
              x2={xScale(retirementPoint.monthIndex)}
              y1={MARGINS.top}
              y2={baselineY}
              className="scenario-chart__retirement"
            />
          )}
          {activePoint && (
            <g className="scenario-chart__active-point">
              <line
                x1={xScale(activePoint.monthIndex)}
                x2={xScale(activePoint.monthIndex)}
                y1={MARGINS.top}
                y2={baselineY}
                className="scenario-chart__cursor"
              />
              <circle
                cx={xScale(activePoint.monthIndex)}
                cy={yScale(activePoint.invested)}
                r={7}
                className="scenario-chart__dot scenario-chart__dot--invested"
              />
              <circle
                cx={xScale(activePoint.monthIndex)}
                cy={yScale(activePoint.total)}
                r={8}
                className="scenario-chart__dot scenario-chart__dot--total"
              />
            </g>
          )}
          <text
            x={MARGINS.left + innerWidth / 2}
            y={CHART_HEIGHT - 24}
            textAnchor="middle"
            className="scenario-chart__axis-label"
          >
            Año
          </text>
          <text
            x={24}
            y={MARGINS.top + innerHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 24 ${MARGINS.top + innerHeight / 2})`}
            className="scenario-chart__axis-label"
          >
            Monto (USD)
          </text>
        </svg>
        {activePoint && tooltipPosition && (
          <div
            className="scenario-chart__tooltip"
            style={{
              left: tooltipPosition.left,
              top: tooltipPosition.top,
            }}
          >
            <p className="scenario-chart__tooltip-heading">{`Año ${activePoint.year}`}</p>
            {activePoint.label && (
              <p className="scenario-chart__tooltip-subheading">{activePoint.label}</p>
            )}
            <p className="scenario-chart__tooltip-subheading scenario-chart__tooltip-subheading--age">
              {`Edad: ${activePoint.age} años`}
            </p>
            <div className="scenario-chart__tooltip-row">
              <span>Invertido</span>
              <strong>{formatCurrency(activePoint.invested)}</strong>
            </div>
            <div className="scenario-chart__tooltip-row scenario-chart__tooltip-row--total">
              <span>Total acumulado</span>
              <strong>{formatCurrency(activePoint.total)}</strong>
            </div>
          </div>
        )}
      </div>
      {lastPoint && sliderMax > sliderMin && (
        <div className="scenario-chart__controls">
          <label htmlFor="zoomRange" className="scenario-chart__controls-label">
            Zoom temporal
          </label>
          <input
            id="zoomRange"
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={sliderStep}
            value={Math.max(sliderMin, Math.min(sliderMax, visibleMonths || sliderMax))}
            onChange={(event) => setVisibleMonths(Number(event.target.value))}
          />
          <span className="scenario-chart__controls-value">
            {`Mostrando hasta ${(
              (Math.max(sliderMin, visibleMonths || sliderMax) / 12)
            ).toFixed(1)} años (${visiblePoints.length} puntos)`}
          </span>
          <button type="button" className="scenario-chart__reset" onClick={resetZoom}>
            Ver todo
          </button>
        </div>
      )}
      {lastVisiblePoint && (
        <div className="scenario-chart__legend">
          <div className="scenario-chart__legend-item">
            <span className="scenario-chart__legend-swatch scenario-chart__legend-swatch--total" />
            <div>
              <strong>Total acumulado</strong>
              <span>{formatCurrency(lastVisiblePoint.total)}</span>
            </div>
          </div>
          <div className="scenario-chart__legend-item">
            <span className="scenario-chart__legend-swatch scenario-chart__legend-swatch--invested" />
            <div>
              <strong>Capital invertido</strong>
              <span>{formatCurrency(lastVisiblePoint.invested)}</span>
            </div>
          </div>
          <div className="scenario-chart__legend-item scenario-chart__legend-item--goal">
            <span className="scenario-chart__legend-year">Meta: {retirementAge} años</span>
            <span>Último año mostrado: {lastVisiblePoint.year}</span>
          </div>
        </div>
      )}
    </div>
  );
}

