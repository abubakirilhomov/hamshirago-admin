import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import { getOrders, getPendingMedics, getSettings, type AdminOrder } from "@/lib/api";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  UserCheck,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

const OrdersAreaChart = lazy(() =>
  import("recharts").then(({ Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis }) => ({
    default: ({ data }: { data: { day: string; orders: number }[] }) => (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="orders"
            stroke="hsl(var(--primary))"
            strokeWidth={2.4}
            fill="url(#ordersGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    ),
  }))
);

// Лимит для подсчёта дохода — последние N DONE заказов
const REVENUE_LIMIT = 500;
// Лимит для 7-дневного графика — последние N всех заказов
const CHART_LIMIT = 200;
// Интервал обновления (мс)
const REFRESH_MS = 120_000;

const Dashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalOrders: 0,
    doneOrders: 0,
    canceledOrders: 0,
    pendingMedics: 0,
    totalRevenue: 0,
    todayOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyOrders, setDailyOrders] = useState<{ day: string; orders: number }[]>([]);
  const [isPaidMode, setIsPaidMode] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      // 5 лёгких запросов параллельно
      const [allOrders, doneOrders, canceledOrders, pending, settings] = await Promise.all([
        getOrders(1, 1),
        getOrders(1, 1, "DONE"),
        getOrders(1, 1, "CANCELED"),
        getPendingMedics(),
        getSettings(),
      ]);
      setIsPaidMode(settings.isPaidMode);

      // Доход: последние REVENUE_LIMIT DONE заказов (макс 5 страниц по 100)
      let revenue = 0;
      if (doneOrders.total > 0) {
        const PAGE = 100;
        const pagesToFetch = Math.min(Math.ceil(REVENUE_LIMIT / PAGE), Math.ceil(doneOrders.total / PAGE));
        let revenueOrders: AdminOrder[] = [];
        for (let i = 1; i <= pagesToFetch; i++) {
          const res = await getOrders(i, PAGE, "DONE");
          revenueOrders = revenueOrders.concat(res.data);
          if (revenueOrders.length >= REVENUE_LIMIT) break;
        }
        revenue = revenueOrders.reduce((sum, o) => sum + (o.platformFee || 0), 0);
      }

      // 7-дневный график + сегодня: последние CHART_LIMIT заказов (2 страницы)
      const today = new Date().toISOString().split("T")[0];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      let recentData: AdminOrder[] = [];
      const PAGE2 = 100;
      const pagesToScan = Math.min(Math.ceil(CHART_LIMIT / PAGE2), allOrders.totalPages);
      for (let i = 1; i <= pagesToScan; i++) {
        const res = await getOrders(i, PAGE2);
        recentData = recentData.concat(res.data);
        const last = res.data[res.data.length - 1];
        if (!last || new Date(last.created_at) < cutoff) break;
      }

      const todayCount = recentData.filter((o) => o.created_at?.startsWith(today)).length;
      const last7Days = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.set(d.toISOString().split("T")[0], 0);
      }
      recentData.forEach((o) => {
        const key = String(o.created_at || "").split("T")[0];
        if (last7Days.has(key)) last7Days.set(key, (last7Days.get(key) || 0) + 1);
      });
      const chartData = Array.from(last7Days.entries()).map(([date, orders]) => ({
        day: new Date(date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
        orders,
      }));
      setDailyOrders(chartData);

      setStats({
        totalOrders: allOrders.total,
        doneOrders: doneOrders.total,
        canceledOrders: canceledOrders.total,
        pendingMedics: pending.length,
        totalRevenue: revenue,
        todayOrders: todayCount,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dashboard.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
    const intervalId = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, [load]);

  const formatUZS = (n: number) => `${n.toLocaleString("ru-RU")} UZS`;
  const successRate = stats.totalOrders > 0 ? Math.round((stats.doneOrders / stats.totalOrders) * 100) : 0;
  const cancelRate = stats.totalOrders > 0 ? Math.round((stats.canceledOrders / stats.totalOrders) * 100) : 0;
  const kpiCards = [
    {
      title: t("dashboard.ordersToday"),
      value: stats.todayOrders,
      icon: TrendingUp,
      colorClass: "text-cyan-700 dark:text-cyan-300",
      className:
        "bg-gradient-to-br from-cyan-50/90 via-white/80 to-sky-100/80 border-cyan-200/60 backdrop-blur-md shadow-[0_20px_40px_-28px_rgba(8,145,178,0.6)] dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-cyan-950/45 dark:to-slate-900/90 dark:border-cyan-900/40",
    },
    {
      title: t("dashboard.totalOrders"),
      value: stats.totalOrders,
      icon: ClipboardList,
      colorClass: "text-blue-700 dark:text-blue-300",
      className:
        "bg-gradient-to-br from-blue-50/90 via-white/80 to-indigo-100/80 border-blue-200/60 backdrop-blur-md shadow-[0_20px_40px_-28px_rgba(37,99,235,0.55)] dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-blue-950/45 dark:to-slate-900/90 dark:border-blue-900/40",
    },
    {
      title: t("dashboard.done"),
      value: stats.doneOrders,
      icon: CheckCircle2,
      colorClass: "text-emerald-700 dark:text-emerald-300",
      className:
        "bg-gradient-to-br from-emerald-50/90 via-white/80 to-teal-100/80 border-emerald-200/60 backdrop-blur-md shadow-[0_20px_40px_-28px_rgba(5,150,105,0.55)] dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-emerald-950/45 dark:to-slate-900/90 dark:border-emerald-900/40",
    },
    {
      title: t("dashboard.canceled"),
      value: stats.canceledOrders,
      icon: XCircle,
      colorClass: "text-rose-700 dark:text-rose-300",
      className:
        "bg-gradient-to-br from-rose-50/90 via-white/80 to-pink-100/80 border-rose-200/60 backdrop-blur-md shadow-[0_20px_40px_-28px_rgba(225,29,72,0.5)] dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-rose-950/35 dark:to-slate-900/90 dark:border-rose-900/40",
    },
    {
      title: t("dashboard.platformRevenue"),
      value: stats.totalRevenue,
      icon: DollarSign,
      colorClass: "text-teal-700 dark:text-teal-300",
      description: t("dashboard.revenueLimit", { count: REVENUE_LIMIT }),
      formatValue: formatUZS,
      className:
        "bg-gradient-to-br from-teal-50/90 via-white/80 to-emerald-100/80 border-teal-200/60 backdrop-blur-md shadow-[0_20px_40px_-28px_rgba(13,148,136,0.55)] dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-teal-950/40 dark:to-slate-900/90 dark:border-teal-900/40",
    },
    {
      title: t("dashboard.pendingVerif"),
      value: stats.pendingMedics,
      icon: UserCheck,
      colorClass: "text-amber-700 dark:text-amber-300",
      className:
        "bg-gradient-to-br from-amber-50/90 via-white/80 to-yellow-100/80 border-amber-200/60 backdrop-blur-md shadow-[0_20px_40px_-28px_rgba(217,119,6,0.5)] dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-amber-950/35 dark:to-slate-900/90 dark:border-amber-900/40",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="kpi-card h-28">
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-8 w-2/3" />
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

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-gradient-to-br from-primary/25 to-info/20 dark:from-cyan-700/20 dark:to-indigo-700/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-64 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-300/20 to-cyan-300/20 dark:from-emerald-700/20 dark:to-cyan-700/20 blur-3xl" />

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            onClick={load}
            className="ml-auto font-medium underline underline-offset-2 hover:no-underline"
          >
            {t("common.retry")}
          </button>
        </div>
      )}

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/30 dark:border-slate-700/60 bg-gradient-to-br from-primary/20 via-cyan-50/50 to-info/20 dark:from-slate-900 dark:via-cyan-950/30 dark:to-slate-900 p-6 md:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-20 h-52 w-52 rounded-full bg-info/20 blur-3xl" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Operations Center</p>
            <h1 className="text-3xl font-semibold tracking-tight">HamshiraGo Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground dark:text-slate-300 max-w-2xl">
              {t("dashboard.subtitle")}
            </p>
            {isPaidMode !== null && (
              <Link to="/settings" className="inline-flex items-center gap-1.5 w-fit mt-1">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80 ${
                  isPaidMode
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}>
                  <CreditCard className="h-3 w-3" />
                  {isPaidMode ? t("dashboard.paidModeOn") : t("dashboard.paidModeOff")}
                </span>
              </Link>
            )}
          </div>
          <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/75 p-4 backdrop-blur-md">
            <p className="text-xs uppercase tracking-wider text-muted-foreground dark:text-slate-300">{t("dashboard.efficiency")}</p>
            <div className="mt-3 space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm text-foreground dark:text-slate-100">
                  <span>{t("dashboard.successOrders")}</span>
                  <span className="font-semibold">{successRate}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted/70 dark:bg-slate-700/70">
                  <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${successRate}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-sm text-foreground dark:text-slate-100">
                  <span>{t("dashboard.cancels")}</span>
                  <span className="font-semibold">{cancelRate}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted/70 dark:bg-slate-700/70">
                  <div className="h-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-400" style={{ width: `${cancelRate}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((card) => (
          <KpiCard
            key={card.title}
            className={card.className}
            title={card.title}
            value={card.value}
            icon={card.icon}
            colorClass={card.colorClass}
            description={card.description}
            formatValue={card.formatValue}
          />
        ))}
      </div>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-white/80 via-white/75 to-cyan-50/80 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-cyan-950/30 backdrop-blur-md p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("dashboard.last7Days")}</h2>
          <span className="status-badge status-created">auto refresh 2m</span>
        </div>
        <div className="h-72">
          <Suspense fallback={<div className="h-72 animate-pulse rounded-lg bg-muted" />}>
            <OrdersAreaChart data={dailyOrders} />
          </Suspense>
        </div>
      </motion.section>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-emerald-50/80 via-white/80 to-teal-100/70 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-emerald-950/30 p-5 backdrop-blur-md"
        >
          <p className="text-sm font-semibold">{t("dashboard.orderFlow")}</p>
          <p className="mt-2 text-sm text-muted-foreground dark:text-slate-300">
            {t("dashboard.inProgress")}: <span className="font-semibold text-foreground">{stats.totalOrders - stats.doneOrders - stats.canceledOrders}</span>
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/50 dark:border-slate-700/60 bg-white/75 dark:bg-slate-900/70 p-3">
              <p className="text-xs text-muted-foreground dark:text-slate-300">DONE</p>
              <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">{stats.doneOrders}</p>
            </div>
            <div className="rounded-xl border border-white/50 dark:border-slate-700/60 bg-white/75 dark:bg-slate-900/70 p-3">
              <p className="text-xs text-muted-foreground dark:text-slate-300">CANCELED</p>
              <p className="text-lg font-semibold text-rose-700 dark:text-rose-300">{stats.canceledOrders}</p>
            </div>
            <div className="rounded-xl border border-white/50 dark:border-slate-700/60 bg-white/75 dark:bg-slate-900/70 p-3">
              <p className="text-xs text-muted-foreground dark:text-slate-300">{t("dashboard.pendingVerif")}</p>
              <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">{stats.pendingMedics}</p>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-indigo-50/80 via-white/80 to-blue-100/70 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-indigo-950/35 p-5 backdrop-blur-md"
        >
          <p className="text-sm font-semibold">{t("dashboard.financialFocus")}</p>
          <p className="mt-2 text-sm text-muted-foreground dark:text-slate-300">{t("dashboard.finRevenue")}</p>
          <p className="mt-4 text-3xl font-bold tracking-tight text-indigo-900 dark:text-indigo-200">{formatUZS(stats.totalRevenue)}</p>
          <div className="mt-4 h-2 rounded-full bg-white/80 dark:bg-slate-700/80">
            <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500" style={{ width: `${Math.min(100, successRate + 12)}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground dark:text-slate-300">{t("dashboard.efficiencyNote")}</p>
        </motion.section>
      </div>
    </div>
  );
};

export default Dashboard;
