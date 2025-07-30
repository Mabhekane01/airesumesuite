import React from "react";

interface DataPoint {
  [key: string]: any;
}

interface LineChartProps {
  data: DataPoint[];
  dataKey: string;
  width?: number;
  height?: number;
  strokeColor?: string;
}

interface BarChartProps {
  data: DataPoint[];
  dataKey: string;
  width?: number;
  height?: number;
  fillColor?: string;
}

interface PieChartProps {
  data: DataPoint[];
  dataKey: string;
  nameKey: string;
  width?: number;
  height?: number;
  colors?: string[];
}

export const SimpleLineChart: React.FC<LineChartProps> = ({
  data,
  dataKey,
  width = 400,
  height = 200,
  strokeColor = "#3B82F6",
}) => {
  if (!data || data.length === 0) return null;

  const allValues = data.flatMap((d) => [
    d.applications || 0,
    d.responses || 0,
    d.interviews || 0,
    d.offers || 0,
    d.rejections || 0,
  ]);
  const maxValue = Math.max(...allValues, 1);

  const points = data
    .map((d, i) => {
      const x = 70 + (i * (width - 100)) / Math.max(data.length - 1, 1);
      const y = height - 40 - (d[dataKey] / maxValue) * (height - 80);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="w-full h-full bg-white dark:bg-dark-primary rounded-lg overflow-hidden p-2 sm:p-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto min-h-[180px] sm:min-h-[220px] max-w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Line Chart"
      >
        {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => {
          const yPos = height - 40 - ratio * (height - 80);
          return (
            <line
              key={i}
              x1="60"
              y1={yPos}
              x2={width - 30}
              y2={yPos}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          );
        })}
        <line
          x1="50"
          y1="20"
          x2="50"
          y2={height - 40}
          stroke="#d1d5db"
          strokeWidth="1"
        />
        <line
          x1="50"
          y1={height - 40}
          x2={width - 20}
          y2={height - 40}
          stroke="#d1d5db"
          strokeWidth="1"
        />

        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const yPos = height - 40 - ratio * (height - 80);
          const value = Math.round(ratio * maxValue);
          return (
            <text
              key={i}
              x="45"
              y={yPos + 4}
              fontSize="12"
              fill="#6b7280"
              textAnchor="end"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {value}
            </text>
          );
        })}

        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((d, i) => {
          const x = 70 + (i * (width - 100)) / Math.max(data.length - 1, 1);
          const y = height - 40 - (d[dataKey] / maxValue) * (height - 80);
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r="4"
                fill={strokeColor}
                stroke="white"
                strokeWidth="2"
              />
              <rect
                x={x - 20}
                y={y - 28}
                width="40"
                height="20"
                fill="rgba(0,0,0,0.75)"
                rx="4"
              />
              <text
                x={x}
                y={y - 14}
                fontSize="11"
                fill="white"
                textAnchor="middle"
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight="500"
              >
                {d[dataKey]}
              </text>
              <text
                x={x}
                y={height - 20}
                fontSize="10"
                fill="#6b7280"
                textAnchor="middle"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {(d.date || d.month || `W${i + 1}`)
                  .toString()
                  .replace("2025-W", "W")
                  .slice(0, 8)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const SimpleBarChart: React.FC<BarChartProps> = ({
  data,
  dataKey,
  width = 400,
  height = 200,
  fillColor = "#10B981",
}) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d[dataKey] || 0));

  return (
    <div className="w-full h-full bg-white dark:bg-dark-primary rounded-lg px-3 py-2 sm:px-6 sm:py-4 overflow-x-auto">
      <div className="relative h-full flex items-end justify-start min-h-[200px]">
        {[0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => (
          <div
            key={i}
            className="absolute left-12 right-4 border-t border-gray-200 dark:border-gray-700"
            style={{ bottom: `${20 + ratio * (100 - 40)}%` }}
          />
        ))}

        <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-2 sm:py-4">
          {[
            maxValue,
            Math.round(maxValue * 0.8),
            Math.round(maxValue * 0.6),
            Math.round(maxValue * 0.4),
            Math.round(maxValue * 0.2),
            0,
          ].map((value, i) => (
            <span
              key={i}
              className="text-xs text-gray-500 dark:text-gray-400 font-medium"
            >
              {value}
            </span>
          ))}
        </div>

        <div className="flex items-end justify-start gap-2 sm:gap-4 ml-12 mr-4 h-full w-max min-w-full">
          {data.map((d, i) => {
            const barValue = d[dataKey] || 0;
            const barHeight = maxValue > 0 ? (barValue / maxValue) * 80 : 0;

            return (
              <div
                key={i}
                className="flex flex-col items-center flex-1 max-w-[40px] sm:max-w-[60px] h-full justify-end pb-6 sm:pb-8"
              >
                {barValue > 0 && (
                  <div className="mb-1 sm:mb-2 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {barValue}
                  </div>
                )}

                <div
                  className="w-5 sm:w-7 md:w-9 rounded-t-md transition-all duration-300 ease-in-out hover:scale-105 hover:opacity-80"
                  style={{
                    height: `${Math.max(barHeight, 2)}%`,
                    backgroundColor: fillColor,
                    minHeight: barValue > 0 ? "4px" : "2px",
                  }}
                />

                <div className="mt-1 sm:mt-2 text-xs text-gray-500 dark:text-gray-400 font-medium text-center">
                  {(d.name || d.month || d.date || d.status || `P${i + 1}`)
                    .toString()
                    .replace("2025-", "")
                    .slice(0, 4)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const SimplePieChart: React.FC<PieChartProps> = ({
  data,
  dataKey,
  nameKey,
  width = 200,
  height = 200,
  colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#6B7280"],
}) => {
  if (!data || data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + (d[dataKey] || 0), 0);
  let currentAngle = 0;

  const segments = data.map((d, i) => {
    const value = d[dataKey] || 0;
    const angle = (value / total) * 360;
    const percentage = (value / total) * 100;

    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle += angle;

    const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
    const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
    const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
    const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M 50 50`,
      `L ${x1} ${y1}`,
      `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      "Z",
    ].join(" ");

    return {
      pathData,
      color: colors[i % colors.length],
      percentage: percentage.toFixed(1),
      name: d[nameKey] || d.name || `Item ${i + 1}`,
      value,
    };
  });

  return (
    <div className="flex flex-col lg:flex-row lg:space-x-6 space-y-4 lg:space-y-0 items-center w-full max-w-full">
      <div className="flex-shrink-0">
        <svg
          role="img"
          aria-label="Pie chart"
          width={Math.min(width, 160)}
          height={Math.min(height, 160)}
          viewBox="0 0 100 100"
          className="max-w-full w-full h-auto"
        >
          {segments.map((segment, i) => (
            <path
              key={i}
              d={segment.pathData}
              fill={segment.color}
              stroke="#1F2937"
              strokeWidth="0.5"
            />
          ))}
        </svg>
      </div>
      <div className="space-y-1 flex-1 w-full text-sm sm:text-xs">
        {segments.map((segment, i) => (
          <div key={i} className="flex items-center space-x-2 text-xs">
            <div
              className="w-3 h-3 rounded flex-shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-dark-text-primary truncate">
              {segment.name}: {segment.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SimpleResponsiveContainer: React.FC<{
  width?: string | number;
  height?: string | number;
  children: React.ReactNode;
}> = ({ width = "100%", height = 250, children }) => {
  return (
    <div
      style={{ width, height }}
      className="flex items-center justify-center min-h-[180px] sm:min-h-[200px] max-h-[400px] w-full overflow-hidden px-2"
    >
      {children}
    </div>
  );
};

export const LineChart = SimpleLineChart;
export const BarChart = SimpleBarChart;
export const PieChart = SimplePieChart;
export const ResponsiveContainer = SimpleResponsiveContainer;

export const Line: React.FC<any> = () => null;
export const Bar: React.FC<any> = () => null;
export const Pie: React.FC<any> = () => null;
export const Cell: React.FC<any> = () => null;
export const XAxis: React.FC<any> = () => null;
export const YAxis: React.FC<any> = () => null;
export const CartesianGrid: React.FC<any> = () => null;
export const Tooltip: React.FC<any> = () => null;
export const Legend: React.FC<any> = () => null;
