import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ReportingCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  /** Previous period value — if provided, auto-calculates trend % */
  previousValue?: number;
  currentNumericValue?: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'pink' | 'teal' | 'orange';
  loading?: boolean;
  /** For metrics where 'down' is actually good (e.g. churn rate) */
  invertTrend?: boolean;
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  pink: 'bg-pink-50 text-pink-600',
  teal: 'bg-teal-50 text-teal-600',
  orange: 'bg-orange-50 text-orange-600',
};

const ReportingCard: React.FC<ReportingCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  previousValue,
  currentNumericValue,
  icon,
  color,
  loading = false,
  invertTrend = false,
}) => {
  // Auto-compute trend from previousValue if provided
  let computedTrend = trend;
  let computedTrendValue = trendValue;

  if (
    previousValue !== undefined &&
    currentNumericValue !== undefined &&
    previousValue > 0
  ) {
    const pct = ((currentNumericValue - previousValue) / previousValue) * 100;
    const isUp = pct >= 0;
    computedTrend = isUp ? 'up' : 'down';
    if (invertTrend) computedTrend = isUp ? 'down' : 'up';
    computedTrendValue = `${isUp ? '+' : ''}${pct.toFixed(1)}% vs prior period`;
  }

  const TrendIcon =
    computedTrend === 'up'
      ? TrendingUp
      : computedTrend === 'down'
      ? TrendingDown
      : Minus;

  const trendColor =
    computedTrend === 'up'
      ? 'text-green-600'
      : computedTrend === 'down'
      ? 'text-red-600'
      : 'text-gray-400';

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-24" />
            <div className="h-7 bg-gray-200 rounded w-16 mt-2" />
            <div className="h-3 bg-gray-200 rounded w-20 mt-2" />
          </div>
          <div className="w-12 h-12 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1.5 tabular-nums">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>
          )}
          {computedTrend && computedTrendValue && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trendColor}`}>
              <TrendIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{computedTrendValue}</span>
            </div>
          )}
        </div>
        <div
          className={`p-3 rounded-xl flex-shrink-0 ml-3 transition-transform duration-200 group-hover:scale-110 ${colorMap[color]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export default ReportingCard;
