"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

interface ProfitChartProps {
  data: Array<{ date: string; profit: number; cumulative: number }>;
}

export function ProfitOverTimeChart({ data }: ProfitChartProps) {
  if (data.length < 2) return null;

  return (
    <div className="card">
      <h3 className="font-bold mb-4">Profit Over Time</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "var(--muted)" }}
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            }
          />
          <YAxis
            tick={{ fontSize: 12, fill: "var(--muted)" }}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--card-border)",
              borderRadius: "8px",
            }}
            formatter={(value) => [`$${Number(value).toFixed(0)}`, "Cumulative"]}
            labelFormatter={(label) => new Date(label).toLocaleDateString()}
          />
          <Line
            type="monotone"
            dataKey="cumulative"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface LocationChartProps {
  data: Array<{ name: string; profit: number }>;
}

export function ProfitByLocationChart({ data }: LocationChartProps) {
  if (data.length === 0) return null;

  return (
    <div className="card">
      <h3 className="font-bold mb-4">Profit by Location</h3>
      <ResponsiveContainer
        width="100%"
        height={Math.max(150, data.length * 40)}
      >
        <BarChart data={data} layout="vertical">
          <XAxis
            type="number"
            tickFormatter={(v) => `$${v}`}
            tick={{ fontSize: 12, fill: "var(--muted)" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: "var(--muted)" }}
            width={100}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--card-border)",
              borderRadius: "8px",
            }}
            formatter={(value) => [`$${Number(value).toFixed(0)}`, "Profit"]}
          />
          <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.profit >= 0 ? "var(--primary)" : "var(--danger)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
