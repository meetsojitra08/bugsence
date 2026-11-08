import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ProjectAnalyticsTrendPoint } from "@/features/projects/types";

interface TrendsChartProps {
  data: ProjectAnalyticsTrendPoint[];
  days: number;
  onDaysChange: (days: number) => void;
  isLoading?: boolean;
}

export function TrendsChart({ data, days, onDaysChange, isLoading }: TrendsChartProps) {
  const totalCreated = data.reduce((acc, curr) => acc + curr.created, 0);
  const totalResolved = data.reduce((acc, curr) => acc + curr.resolved, 0);

  const formatDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const monthNames = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ];
        const month = monthNames[parseInt(parts[1], 10) - 1];
        const day = parseInt(parts[2], 10);
        return `${month} ${day}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-xs" data-testid="trends-chart">
      {/* Header with range toggles */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">Issue Activity Trends</h3>
          <p className="text-xs text-text-muted">
            Created vs resolved issues over the selected time horizon
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Summary counters */}
          <div className="hidden items-center gap-3 text-xs md:flex">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-text-muted">Created:</span>
              <span className="font-semibold text-text">{totalCreated}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success" />
              <span className="text-text-muted">Resolved:</span>
              <span className="font-semibold text-text">{totalResolved}</span>
            </span>
          </div>

          {/* Range buttons */}
          <div className="inline-flex rounded-lg border border-border bg-surface-elevated p-0.5">
            {[7, 30, 90].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onDaysChange(option)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  days === option
                    ? "bg-primary text-white shadow-xs"
                    : "text-text-muted hover:text-text"
                }`}
                data-testid={`range-btn-${option}`}
              >
                {option}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div className="mt-6 h-[260px] w-full">
        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">
            Loading trend metrics...
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">
            No activity logged in this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="hsl(var(--text-muted))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={25}
              />
              <YAxis
                stroke="hsl(var(--text-muted))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--surface-elevated))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                labelFormatter={(label) => formatDate(String(label))}
              />
              <Area
                type="monotone"
                dataKey="created"
                name="Created"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#createdGrad)"
              />
              <Area
                type="monotone"
                dataKey="resolved"
                name="Resolved"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#resolvedGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
