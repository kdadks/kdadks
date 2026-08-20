import React from 'react';

interface SimpleBarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  showValues?: boolean;
}

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  data,
  height = 200,
  showValues = true,
}) => {
  if (!data || !data.length) {
    return (
      <div className="w-full flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1); // ensure at least 1 to avoid div/0

  // Reserve space for labels (~20px) and values (~18px)
  const labelHeight = 20;
  const valueHeight = showValues ? 18 : 0;
  const barAreaHeight = height - labelHeight - valueHeight;

  return (
    <div className="w-full overflow-x-auto">
      <div
        className="flex items-end gap-1 min-w-0"
        style={{ height: barAreaHeight + labelHeight + valueHeight }}
      >
        {data.map((item, index) => {
          const pct = (item.value / maxValue) * 100;
          const barPx = Math.max((pct / 100) * barAreaHeight, item.value > 0 ? 2 : 0); // at least 2px if value > 0
          const barColor = item.color || 'bg-indigo-500';

          return (
            <div
              key={index}
              className="flex flex-col items-center justify-end flex-1 min-w-0"
              style={{ height: barAreaHeight + labelHeight + valueHeight }}
            >
              {/* Value label */}
              <div style={{ height: valueHeight }} className="flex items-end justify-center w-full">
                {showValues && (
                  <span className="text-[10px] leading-tight font-semibold text-gray-600 text-center truncate w-full">
                    {item.value.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Bar */}
              <div
                className="w-full flex items-end justify-center"
                style={{ height: barAreaHeight }}
              >
                <div
                  className={`w-full ${barColor} rounded-t transition-all duration-500 hover:opacity-75 cursor-default`}
                  style={{
                    height: barPx,
                    minHeight: item.value > 0 ? 2 : 0,
                  }}
                  title={`${item.label}: ${item.value.toLocaleString()}`}
                />
              </div>

              {/* Label */}
              <div
                className="flex items-start justify-center w-full pt-1"
                style={{ height: labelHeight }}
              >
                <span
                  className="text-[10px] text-gray-500 text-center leading-tight"
                  style={{
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    wordBreak: 'break-word',
                  }}
                >
                  {item.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SimpleBarChart;
