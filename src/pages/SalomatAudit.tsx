import { useCallback, useEffect, useState } from "react";
import { getSalomatAuditStats, SalomatAuditStats } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, AlertTriangle, Stethoscope, Users, ShieldAlert, Clock, RefreshCw } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ── Constants ─────────────────────────────────────────────────────────────────

const PIE_COLORS = [
  "#0d9488", "#6366f1", "#f59e0b", "#ef4444",
  "#22c55e", "#8b5cf6", "#ec4899", "#14b8a6",
  "#f97316", "#64748b",
];

const DAYS_OPTIONS = [7, 14, 30, 90] as const;

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color, danger,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  danger?: boolean;
}) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border p-5 flex items-center gap-4 ${danger && value > 0 ? "border-red-200 dark:border-red-900" : "border-slate-200 dark:border-slate-700"}`}>
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className={`text-2xl font-extrabold leading-none mb-1 ${danger && value > 0 ? "text-red-600" : "text-slate-900 dark:text-white"}`}>
          {value}
        </p>
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// ── Custom tooltip for pie ─────────────────────────────────────────────────────

function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-bold text-slate-800 dark:text-slate-100">{payload[0].name}</p>
      <p className="text-slate-500">{payload[0].value} направлений</p>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

const SalomatAudit = () => {
  const [stats, setStats] = useState<SalomatAuditStats | null>(null);
  const [days, setDays] = useState<typeof DAYS_OPTIONS[number]>(30);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await getSalomatAuditStats(days));
    } catch {}
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const pieData = stats?.topSpecializations.map((s) => ({
    name: s.specialization,
    value: s.count,
  })) ?? [];

  // Conversion rate: referrals / totalEvents
  const conversionRate = stats && stats.totalEvents > 0
    ? Math.round(((stats.doctorReferrals + stats.nurseReferrals) / stats.totalEvents) * 100)
    : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
            style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
          >
            <Shield size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Salomat Аудит</h1>
            <p className="text-sm text-slate-500">Мониторинг AI-ассистента — безопасность и направления</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Period toggle */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            {DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${days === d ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {d}д
              </button>
            ))}
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg transition-colors"
          >
            <RefreshCw size={14} />
            Обновить
          </button>
        </div>
      </div>

      {/* KPI cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Всего событий"     value={stats.totalEvents}      icon={Shield}      color="#0d9488" />
          <StatCard label="Красные флаги"     value={stats.redFlags}         icon={AlertTriangle} color="#ef4444" danger />
          <StatCard label="К врачу"           value={stats.doctorReferrals}  icon={Stethoscope} color="#6366f1" />
          <StatCard label="К медсестре"       value={stats.nurseReferrals}   icon={Users}       color="#f59e0b" />
          <StatCard label="Safeguard срабат." value={stats.safeguards}       icon={ShieldAlert} color="#ec4899" danger />
          <StatCard label="Rate limit"        value={stats.rateLimits}       icon={Clock}       color="#94a3b8" />
        </div>
      ) : null}

      {/* Conversion rate banner */}
      {stats && (
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 rounded-xl border border-teal-200 dark:border-teal-800 p-5 flex items-center gap-5">
          <div className="text-4xl font-extrabold text-teal-700 dark:text-teal-300">{conversionRate}%</div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100">Конверсия в направление</p>
            <p className="text-sm text-slate-500">
              {stats.doctorReferrals + stats.nurseReferrals} из {stats.totalEvents} сессий завершились направлением к специалисту
            </p>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie — top specializations */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-bold text-slate-900 dark:text-white mb-4">Топ специализаций</h2>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              Нет данных по специализациям
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={40}
                  paddingAngle={3}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend
                  formatter={(value) => <span className="text-xs text-slate-600 dark:text-slate-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Event breakdown bar */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-bold text-slate-900 dark:text-white mb-4">Разбивка событий</h2>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : !stats ? null : (
            <div className="space-y-3 mt-2">
              {[
                { label: "Направления к врачу",  value: stats.doctorReferrals, color: "#6366f1", max: stats.totalEvents },
                { label: "Направления к медсестре", value: stats.nurseReferrals, color: "#f59e0b", max: stats.totalEvents },
                { label: "Красные флаги",        value: stats.redFlags,        color: "#ef4444", max: stats.totalEvents },
                { label: "Safeguard",            value: stats.safeguards,      color: "#ec4899", max: stats.totalEvents },
                { label: "Rate limit",           value: stats.rateLimits,      color: "#94a3b8", max: stats.totalEvents },
              ].map(({ label, value, color, max }) => {
                const pct = max > 0 ? Math.round((value / max) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">{label}</span>
                      <span className="font-bold" style={{ color }}>{value} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top specializations table */}
      {stats && stats.topSpecializations.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-bold text-slate-900 dark:text-white">Топ специализаций по направлениям</h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {stats.topSpecializations.map((s, i) => {
              const pct = stats.doctorReferrals > 0 ? Math.round((s.count / stats.doctorReferrals) * 100) : 0;
              return (
                <div key={s.specialization} className="flex items-center gap-4 px-5 py-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">{s.specialization}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 w-8 text-right">{s.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalomatAudit;
