import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export interface DateRange {
  from: string;
  to: string;
  label: string;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const getPresets = (): { label: string; from: string; to: string }[] => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const today = fmt(now);

  const thisMonthStart = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastMonthStart = fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = fmt(new Date(now.getFullYear(), now.getMonth(), 0));
  const last3Start = fmt(new Date(now.getFullYear(), now.getMonth() - 2, 1));
  const last6Start = fmt(new Date(now.getFullYear(), now.getMonth() - 5, 1));
  const last12Start = fmt(new Date(now.getFullYear(), now.getMonth() - 11, 1));
  const ytdStart = fmt(new Date(now.getFullYear(), 0, 1));

  return [
    { label: 'This Month', from: thisMonthStart, to: today },
    { label: 'Last Month', from: lastMonthStart, to: lastMonthEnd },
    { label: 'Last 3 Months', from: last3Start, to: today },
    { label: 'Last 6 Months', from: last6Start, to: today },
    { label: 'Last 12 Months', from: last12Start, to: today },
    { label: 'YTD', from: ytdStart, to: today },
  ];
};

export const getDefaultDateRange = (): DateRange => {
  const presets = getPresets();
  const p = presets[2]; // Last 3 Months default
  return { from: p.from, to: p.to, label: p.label };
};

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ value, onChange }) => {
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(value.from);
  const [customTo, setCustomTo] = useState(value.to);

  const presets = getPresets();

  const handlePreset = (preset: { label: string; from: string; to: string }) => {
    setShowCustom(false);
    onChange({ from: preset.from, to: preset.to, label: preset.label });
  };

  const handleCustomApply = () => {
    if (customFrom && customTo && customFrom <= customTo) {
      onChange({ from: customFrom, to: customTo, label: 'Custom' });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 text-xs font-medium text-gray-500 mr-1">
        <Calendar className="w-3.5 h-3.5" />
        <span>Period:</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePreset(preset)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-150 ${
              value.label === preset.label && !showCustom
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-150 flex items-center gap-1 ${
            showCustom || value.label === 'Custom'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
          }`}
        >
          Custom <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {showCustom && (
        <div className="flex flex-wrap items-center gap-2 mt-2 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <label className="text-xs text-gray-500 font-medium">From</label>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <label className="text-xs text-gray-500 font-medium">To</label>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <button
            onClick={handleCustomApply}
            disabled={!customFrom || !customTo || customFrom > customTo}
            className="px-3 py-1 text-xs font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
};

export default DateRangeFilter;
