import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { getOrders, type AdminOrder } from "@/lib/api";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

type RevenueChartProps = {
  data: { day: string; revenue: number }[];
  formatUZS: (n: number) => string;
  tooltipLabel: string;
};

const RevenueBarChart = lazy(() =>
  import("recharts").then(({ Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis }) => ({
    default: ({ data, formatUZS, tooltipLabel }: RevenueChartProps) => (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 1_000_000
                ? `${(v / 1_000_000).toFixed(1)}M`
                : v >= 1_000
                ? `${(v / 1_000).toFixed(0)}k`
                : String(v)
            }
          />
          <Tooltip formatter={(v: number) => [formatUZS(v), tooltipLabel]} />
          <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    ),
  }))
);

const ORDER_LIMIT = 500;
const PAGE_SIZE = 100;

// ── Helpers ────────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return toDateStr(d);
}

function defaultTo() {
  return toDateStr(new Date());
}

function buildDayRange(from: string, to: string): string[] {
  const days: string[] = [];
  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  const cur = new Date(start);
  while (cur <= end) {
    days.push(toDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function exportCsv(orders: AdminOrder[], from: string, to: string) {
  const headers = [
    "ID",
    "Дата",
    "Услуга",
    "Клиент ID",
    "Медик ID",
    "Цена (UZS)",
    "Скидка (UZS)",
    "Комиссия платформы (UZS)",
    "Статус",
  ];
  const rows = orders.map((o) => [
    o.id,
    (o.created_at ?? "").split("T")[0],
    o.serviceTitle,
    o.clientId,
    o.medicId ?? "",
    o.priceAmount,
    o.discountAmount,
    o.platformFee,
    o.status,
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hamshirago_report_${from}_${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ──────────────────────────────────────────────────────────────────

const Reports = () => {
  const { t } = useTranslation();
  const [allDoneOrders, setAllDoneOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const collected: AdminOrder[] = [];
      let page = 1;
      while (collected.length < ORDER_LIMIT) {
        const res = await getOrders(page, PAGE_SIZE, "DONE");
        collected.push(...res.data);
        if (collected.length >= res.total || page >= res.totalPages) break;
        page++;
      }
      setAllDoneOrders(collected.slice(0, ORDER_LIMIT));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("reports.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Filtered set ────────────────────────────────────────────────────────────
  const filtered = allDoneOrders.filter((o) => {
    const d = (o.created_at ?? "").split("T")[0];
    return d >= from && d <= to;
  });

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalRevenue = filtered.reduce((s, o) => s + (o.platformFee || 0), 0);
  const totalGross = filtered.reduce((s, o) => s + (o.priceAmount || 0), 0);
  const totalDiscount = filtered.reduce((s, o) => s + (o.discountAmount || 0), 0);
  const avgOrder = filtered.length > 0 ? Math.round(totalGross / filtered.length) : 0;

  // ── Daily revenue chart ─────────────────────────────────────────────────────
  const days = buildDayRange(from, to);
  const dailyMap = new Map<string, number>(days.map((d) => [d, 0]));
  filtered.forEach((o) => {
    const key = (o.created_at ?? "").split("T")[0];
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + (o.platformFee || 0));
    }
  });
  const chartData = days.slice(-60).map((d) => ({
    day: new Date(d + "T00:00:00").toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
    revenue: dailyMap.get(d) ?? 0,
  }));

  // ── Top services ────────────────────────────────────────────────────────────
  const serviceMap = new Map<string, { count: number; revenue: number; gross: number }>();
  filtered.forEach((o) => {
    const prev = serviceMap.get(o.serviceTitle) ?? { count: 0, revenue: 0, gross: 0 };
    serviceMap.set(o.serviceTitle, {
      count: prev.count + 1,
      revenue: prev.revenue + (o.platformFee || 0),
      gross: prev.gross + (o.priceAmount || 0),
    });
  });
  const topServices = Array.from(serviceMap.entries())
    .map(([title, v]) => ({ title, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  const formatUZS = (n: number) => `${n.toLocaleString("ru-RU")} UZS`;

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("reports.title")}</h1>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-5 h-24">
              <Skeleton className="h-3 w-1/2 mb-3" />
              <Skeleton className="h-7 w-3/4" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <Skeleton className="h-6 w-60 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button size="sm" variant="ghost" onClick={load} className="gap-1.5 text-red-700 dark:text-red-400 hover:text-red-800">
            <RefreshCw className="h-3.5 w-3.5" /> {t("reports.retry")}
          </Button>
        </div>
      )}

      {/* Header + filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t("reports.title")}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <label className="text-muted-foreground whitespace-nowrap">{t("reports.dateFrom")}</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
            />
            <label className="text-muted-foreground whitespace-nowrap">{t("reports.dateTo")}</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <Button
            size="sm"
            onClick={() => exportCsv(filtered, from, to)}
            disabled={filtered.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {t("reports.exportCsv", { count: filtered.length })}
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: t("reports.platformRevenue"), value: formatUZS(totalRevenue), sub: t("reports.revenueCommissions") },
          { label: t("reports.completedOrders"), value: String(filtered.length), sub: t("reports.donePeriod") },
          { label: t("reports.avgOrder"), value: formatUZS(avgOrder), sub: t("reports.grossPrice") },
          { label: t("reports.discountsGiven"), value: formatUZS(totalDiscount), sub: t("reports.totalDiscount") },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-white/80 via-white/75 to-cyan-50/80 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-cyan-950/30 p-5 backdrop-blur-md"
          >
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-xl font-bold break-all">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Daily revenue bar chart */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-white/80 via-white/75 to-cyan-50/80 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-cyan-950/30 backdrop-blur-md p-5"
      >
        <h2 className="mb-4 text-lg font-semibold">{t("reports.revenueByDay")}</h2>
        {chartData.every((d) => d.revenue === 0) ? (
          <p className="text-sm text-muted-foreground py-10 text-center">{t("reports.noData")}</p>
        ) : (
          <div className="h-64">
            <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
              <RevenueBarChart data={chartData} formatUZS={formatUZS} tooltipLabel={t("reports.revenueTooltip")} />
            </Suspense>
          </div>
        )}
      </motion.section>

      {/* Top services table */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-white/80 via-white/75 to-cyan-50/80 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-cyan-950/30 backdrop-blur-md p-5"
      >
        <h2 className="mb-4 text-lg font-semibold">{t("reports.revenueByService")}</h2>
        {topServices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">{t("reports.noData")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2.5 font-medium">{t("reports.colService")}</th>
                  <th className="pb-2.5 font-medium text-right">{t("reports.colOrders")}</th>
                  <th className="pb-2.5 font-medium text-right">{t("reports.colGross")}</th>
                  <th className="pb-2.5 font-medium text-right">{t("reports.colRevenue")}</th>
                </tr>
              </thead>
              <tbody>
                {topServices.map((s) => (
                  <tr key={s.title} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5">{s.title}</td>
                    <td className="py-2.5 text-right font-mono">{s.count}</td>
                    <td className="py-2.5 text-right font-mono">{formatUZS(s.gross)}</td>
                    <td className="py-2.5 text-right font-mono font-medium text-teal-700 dark:text-teal-300">
                      {formatUZS(s.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td className="pt-2.5 font-semibold">{t("reports.totalRow")}</td>
                  <td className="pt-2.5 text-right font-mono font-semibold">{filtered.length}</td>
                  <td className="pt-2.5 text-right font-mono font-semibold">{formatUZS(totalGross)}</td>
                  <td className="pt-2.5 text-right font-mono font-semibold text-teal-700 dark:text-teal-300">
                    {formatUZS(totalRevenue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </motion.section>
    </div>
  );
};

export default Reports;
