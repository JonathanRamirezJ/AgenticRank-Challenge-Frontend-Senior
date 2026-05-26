import { memo, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Order } from "../types";

interface Props {
  orders: Order[];
}

interface Bucket {
  minute: string;
  count: number;
}

function bucketByMinute(orders: Order[]): Bucket[] {
  const buckets = new Map<string, number>();
  for (const o of orders) {
    const d = new Date(o.status.placedAt);
    d.setSeconds(0, 0);
    const key = d.toISOString();
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const out: Bucket[] = [];
  const sorted = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [iso, count] of sorted) {
    const d = new Date(iso);
    const minute = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    out.push({ minute, count });
  }
  return out.slice(-30);
}

function OrdersPerMinuteChartBase({ orders }: Props) {
  const data = useMemo(() => bucketByMinute(orders), [orders]);

  return (
    <section className="chart">
      <header className="chart__header">
        <h2 className="chart__title">Orders per minute</h2>
        <span className="chart__hint">last 30 min</span>
      </header>
      <div className="chart__body">
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="opmFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00e5a0" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#00e5a0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1f1f1f" vertical={false} />
            <XAxis dataKey="minute" stroke="#666" fontSize={11} />
            <YAxis stroke="#666" fontSize={11} allowDecimals={false} width={28} />
            <Tooltip
              contentStyle={{
                background: "#111",
                border: "1px solid #2a2a2a",
                fontSize: 12,
              }}
              labelStyle={{ color: "#888" }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#00e5a0"
              strokeWidth={2}
              fill="url(#opmFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export const OrdersPerMinuteChart = memo(OrdersPerMinuteChartBase);
