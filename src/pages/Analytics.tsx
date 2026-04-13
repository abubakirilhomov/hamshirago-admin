import { useCallback, useEffect, useMemo, useState } from "react";
import { getOrders, getAllMedics, type AdminOrder, type AdminMedic } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  Bar,
} from "recharts";

// ── Helpers ────────────────────────────────────────────────────────────────────

// Локальная дата YYYY-MM-DD (с учётом timezone браузера)
function toDateStr(d: Date) {
  return d.toLocaleDateString("sv");
}

function getISOWeek(d: Date): string {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() + 3 - ((dt.getDay() + 6) % 7));
  const week1 = new Date(dt.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((dt.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `W${String(weekNum).padStart(2, "0")} ${dt.getFullYear()}`;
}

function avgMinutes(orders: AdminOrder[]): number {
  const durations = orders
    .filter((o) => o.status === "DONE" && o.created_at && o.updated_at)
    .map((o) => (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 60000);
  if (!durations.length) return 0;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  return `${Math.floor(minutes / 60)}ч ${minutes % 60}мин`;
}

// ── Component ──────────────────────────────────────────────────────────────────

const Analytics = () => {
  const [allOrders, setAllOrders] = useState<AdminOrder[]>([]);
  const [medicsMap, setMedicsMap] = useState<Map<string, AdminMedic>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [period, setPeriod] = useState<30 | 90>(30);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Загружаем заказы только за 90 дней (максимальный период)
      // Останавливаемся как только встречаем заказы старше cutoff (сортировка DESC)
      const cutoff90 = new Date();
      cutoff90.setDate(cutoff90.getDate() - 90);
      const collected: AdminOrder[] = [];
      let pg = 1;
      while (true) {
        const res = await getOrders(pg, 100);
        if (!res?.data || res.data.length === 0) break;
        collected.push(...res.data);
        const last = res.data[res.data.length - 1];
        if (!last || !last.created_at || new Date(String(last.created_at)) < cutoff90 || pg >= (res.totalPages ?? 1)) break;
        pg++;
      }
      setAllOrders(collected);

      // Медики: только первые 100 для lookup имён (достаточно для топ-10)
      const mFirst = await getAllMedics(1, 100);
      const map = new Map<string, AdminMedic>();
      mFirst?.data?.forEach((m) => map.set(m.id, m));
      setMedicsMap(map);
    } catch (e) {
      console.error("Analytics load error:", e);
      setLoadError(e instanceof Error ? e.message : "Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Computed analytics (null-safe) ────────────────────────────────────────
  const computed = useMemo(() => {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - period);
      const cutoffStr = toDateStr(cutoff);

      const periodOrders = allOrders.filter(
        (o) => o.created_at && String(o.created_at) >= cutoffStr
      );
      const doneOrders = periodOrders.filter((o) => o.status === "DONE");
      const canceledOrders = periodOrders.filter((o) => o.status === "CANCELED");

      const price = (o: AdminOrder) => Number(o.priceAmount) || 0;
      const fee = (o: AdminOrder) => Number(o.platformFee) || 0;

      // KPIs
      const avgOrderValue = doneOrders.length
        ? Math.round(doneOrders.reduce((s, o) => s + price(o), 0) / doneOrders.length)
        : 0;
      const conversionRate = periodOrders.length
        ? Math.round((doneOrders.length / periodOrders.length) * 100)
        : 0;
      const avgTime = avgMinutes(doneOrders);
      const platformRevenue = doneOrders.reduce((s, o) => s + fee(o), 0);

      // Weekly chart
      const weekMap = new Map<string, { orders: number; revenue: number }>();
      periodOrders.forEach((o) => {
        if (!o.created_at) return;
        const w = getISOWeek(new Date(String(o.created_at)));
        const prev = weekMap.get(w) ?? { orders: 0, revenue: 0 };
        weekMap.set(w, {
          orders: prev.orders + 1,
          revenue: prev.revenue + (o.status === "DONE" ? fee(o) : 0),
        });
      });
      const weeklyChart = Array.from(weekMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([week, v]) => ({ week, orders: v.orders, revenue: v.revenue }));

      // Top medics
      const medicStats = new Map<string, { orders: number; gross: number }>();
      doneOrders.forEach((o) => {
        if (!o.medicId) return;
        const prev = medicStats.get(o.medicId) ?? { orders: 0, gross: 0 };
        medicStats.set(o.medicId, { orders: prev.orders + 1, gross: prev.gross + price(o) });
      });
      const topMedics = Array.from(medicStats.entries())
        .map(([id, v]) => ({ id, ...v, medic: medicsMap.get(id) }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 10);

      // Top services
      const serviceStats = new Map<string, { orders: number; gross: number }>();
      doneOrders.forEach((o) => {
        const title = o.serviceTitle || "Неизвестная услуга";
        const prev = serviceStats.get(title) ?? { orders: 0, gross: 0 };
        serviceStats.set(title, { orders: prev.orders + 1, gross: prev.gross + price(o) });
      });
      const topServices = Array.from(serviceStats.entries())
        .map(([title, v]) => ({ title, ...v }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 8);

      return {
        periodOrders, doneOrders, canceledOrders,
        avgOrderValue, conversionRate, avgTime, platformRevenue,
        weeklyChart, topMedics, topServices,
      };
    } catch (e) {
      console.error("Analytics compute error:", e);
      return null;
    }
  }, [allOrders, medicsMap, period]);

  const fmt = (n: number) => `${n.toLocaleString("ru-RU")} UZS`;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Аналитика</h1>
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

  if (loadError || !computed) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Аналитика</h1>
        <div className="rounded-2xl border bg-card p-8 text-center">
          <p className="text-sm text-destructive mb-4">{loadError ?? "Ошибка вычисления данных"}</p>
          <button
            onClick={() => loadData()}
            className="rounded-lg px-4 py-2 text-sm font-medium bg-primary text-white"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  const {
    periodOrders, doneOrders, canceledOrders,
    avgOrderValue, conversionRate, avgTime, platformRevenue,
    weeklyChart, topMedics, topServices,
  } = computed;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Аналитика</h1>
        <div className="flex gap-2">
          {([30, 90] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                period === p
                  ? "bg-primary text-white"
                  : "border border-input bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {p} дней
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Средний чек", value: fmt(avgOrderValue), sub: "выполненные заказы" },
          { label: "Доход платформы", value: fmt(platformRevenue), sub: `за ${period} дней` },
          { label: "Конверсия", value: `${conversionRate}%`, sub: "создан → выполнен" },
          { label: "Ср. время выполнения", value: avgTime > 0 ? formatDuration(avgTime) : "—", sub: "от создания до DONE" },
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

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Всего заказов", value: periodOrders.length, color: "text-blue-600" },
          { label: "Выполнено", value: doneOrders.length, color: "text-emerald-600" },
          { label: "Отменено", value: canceledOrders.length, color: "text-red-500" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-4 text-center">
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      {weeklyChart.length > 0 && (
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-white/80 via-white/75 to-cyan-50/80 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-cyan-950/30 p-6 backdrop-blur-md">
          <h2 className="text-base font-semibold mb-6">Заказы и доход по неделям</h2>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={weeklyChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === "orders" ? [value, "Заказов"] : [`${value.toLocaleString("ru-RU")} UZS`, "Доход"]
                }
              />
              <Legend formatter={(v) => v === "orders" ? "Заказов" : "Доход (UZS)"} />
              <Bar yAxisId="left" dataKey="orders" fill="#0d9488" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top medics */}
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-white/80 via-white/75 to-cyan-50/80 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-cyan-950/30 backdrop-blur-md overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50">
            <h2 className="text-base font-semibold">Топ медиков</h2>
            <p className="text-xs text-muted-foreground mt-0.5">по выполненным заказам за {period} дней</p>
          </div>
          {topMedics.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Нет данных</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">#</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Медик</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">Заказов</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground">Выручка</th>
                  </tr>
                </thead>
                <tbody>
                  {topMedics.map(({ id, orders, gross, medic }, idx) => (
                    <tr key={id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-2.5 text-muted-foreground font-bold">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium">{medic?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">⭐ {medic?.rating != null ? Number(medic.rating).toFixed(1) : "—"}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-emerald-600">{orders}</td>
                      <td className="px-5 py-2.5 text-right text-xs text-muted-foreground">{gross.toLocaleString("ru-RU")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top services */}
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-white/80 via-white/75 to-cyan-50/80 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-cyan-950/30 backdrop-blur-md overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50">
            <h2 className="text-base font-semibold">Популярные услуги</h2>
            <p className="text-xs text-muted-foreground mt-0.5">выполненные заказы за {period} дней</p>
          </div>
          {topServices.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Нет данных</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">#</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Услуга</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">Заказов</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground">Выручка</th>
                  </tr>
                </thead>
                <tbody>
                  {topServices.map(({ title, orders, gross }, idx) => (
                    <tr key={title} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-2.5 text-muted-foreground font-bold">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-medium">{title}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-blue-600">{orders}</td>
                      <td className="px-5 py-2.5 text-right text-xs text-muted-foreground">{gross.toLocaleString("ru-RU")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
