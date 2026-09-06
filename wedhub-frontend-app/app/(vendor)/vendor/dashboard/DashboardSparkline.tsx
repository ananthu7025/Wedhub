import React from "react";

interface SparklineProps {
  color: "emerald" | "blue" | "coral";
  dataPoints?: number[];
  className?: string;
}

export function DashboardSparkline({ color, dataPoints, className = "" }: SparklineProps) {
  // Only render if we have at least 2 points and at least one positive value
  if (!dataPoints || dataPoints.length < 2 || !dataPoints.some((v) => v > 0)) {
    return null;
  }

  const configs = {
    emerald: {
      id: "gradient-emerald",
      stroke: "#10b981", // emerald-500
      stopColor: "#10b981",
    },
    blue: {
      id: "gradient-blue",
      stroke: "#3b82f6", // blue-500
      stopColor: "#3b82f6",
    },
    coral: {
      id: "gradient-coral",
      stroke: "#f43f5e", // rose-500
      stopColor: "#f43f5e",
    },
  };

  const c = configs[color];
  const width = 140;
  const height = 44;
  const paddingY = 6;

  const min = Math.min(...dataPoints);
  const max = Math.max(...dataPoints);
  const range = max - min || 1;

  const coords = dataPoints.map((val, idx) => {
    const x = (idx / (dataPoints.length - 1)) * width;
    const normalized = (val - min) / range;
    const y = height - paddingY - normalized * (height - paddingY * 2);
    return { x, y };
  });

  // Build smooth cubic bezier curve
  let pathD = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? 0 : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    pathD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`h-9 w-24 sm:h-11 sm:w-28 overflow-hidden ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={c.id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.stopColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={c.stopColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${c.id})`} />
      <path
        d={pathD}
        stroke={c.stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

