"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Eye, Inbox, TrendingUp } from "lucide-react";

import type { AnalyticsData } from "@/lib/data/analytics";

const PIE_COLORS = ["#1f4434", "#2c5e49", "#8db8a4", "#b89b6e", "#c9b48f", "#d6e5dc"];

function fmtDay(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-card p-5">
      <h2 className="text-base font-medium text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function AnalyticsCharts({ data }: { data: AnalyticsData }) {
  const stats = [
    { label: `Views (${data.days}d)`, value: data.totalViews, icon: Eye },
    { label: `Enquiries (${data.days}d)`, value: data.totalEnquiries, icon: Inbox },
    { label: "Conversion", value: `${data.conversionRate}%`, icon: TrendingUp },
  ];
  const maxTop = Math.max(1, ...data.topListings.map((l) => l.views));
  const hasData = data.totalViews > 0;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-line bg-card p-5">
            <Icon size={20} className="text-brand" />
            <p className="mt-4 text-3xl font-medium text-ink">{value}</p>
            <p className="mt-1 text-sm text-muted">{label}</p>
          </div>
        ))}
      </div>

      {!hasData && (
        <p className="rounded-xl border border-dashed border-line bg-card px-5 py-4 text-sm text-muted">
          No views recorded yet. Once visitors browse listings, traffic will
          appear here.
        </p>
      )}

      {/* Views over time */}
      <Card title={`Views over the last ${data.days} days`}>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.viewsOverTime} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1f4434" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#1f4434" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e3d9" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDay}
                tick={{ fontSize: 11, fill: "#76736a" }}
                interval="preserveStartEnd"
                minTickGap={32}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#76736a" }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                labelFormatter={(l) => fmtDay(String(l))}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e7e3d9",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#1f4434"
                strokeWidth={2}
                fill="url(#viewsFill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top listings */}
        <Card title="Top listings">
          {data.topListings.length === 0 ? (
            <p className="text-sm text-muted">No data yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.topListings.map((l) => (
                <li key={l.slug}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <Link
                      href={`/listings/${l.slug}`}
                      target="_blank"
                      className="truncate text-ink-soft hover:text-brand"
                    >
                      {l.title}
                    </Link>
                    <span className="shrink-0 font-medium text-ink">{l.views}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-paper-2">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${(l.views / maxTop) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Traffic sources */}
        <Card title="Traffic sources">
          {data.trafficSources.length === 0 ? (
            <p className="text-sm text-muted">No data yet.</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.trafficSources}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {data.trafficSources.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid #e7e3d9", fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 space-y-2 text-sm">
                {data.trafficSources.map((s, i) => (
                  <li key={s.name} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-ink-soft">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      {s.name}
                    </span>
                    <span className="font-medium text-ink">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {/* Geography */}
      {data.geo.length > 0 && (
        <Card title="Top countries">
          <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {data.geo.map((g) => (
              <li
                key={g.country}
                className="flex items-center justify-between rounded-lg bg-paper-2 px-3 py-2"
              >
                <span className="text-ink-soft">{g.country}</span>
                <span className="font-medium text-ink">{g.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
