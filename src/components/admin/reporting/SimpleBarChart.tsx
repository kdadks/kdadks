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
  if (!data.length) return null;

  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((item, index) => {
          const barHeight = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const barColor = item.color || 'bg-indigo-500';

          return (
            <div key={index} className="flex flex-col items-center flex-1">
              <div className="w-full flex flex-col items-center justify-end h-full">
                {showValues && (
                  <span className="text-xs font-medium text-gray-600 mb-1">
                    {item.value}
                  </span>
                )}
                <div
                  className={`w-full max-w-[60px] ${barColor} rounded-t-md transition-all duration-300 hover:opacity-80`}
                  style={{ height: `${barHeight}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 mt-2 truncate w-full text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SimpleBarChart;
