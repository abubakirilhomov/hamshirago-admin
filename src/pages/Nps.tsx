import { useEffect, useState } from "react";
import { getNpsStats, type NpsStats } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";

function NpsGauge({ score }: { score: number }) {
  const color = score >= 50 ? "#10b981" : score >= 0 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <div
        className="text-6xl font-black"
        style={{ color }}
      >
        {score > 0 ? `+${score}` : score}
      </div>
      <div className="text-sm text-muted-foreground font-medium">NPS Score</div>
      <div
        className="text-xs font-semibold px-3 py-1 rounded-full"
        style={{ background: color + "20", color }}
      >
        {score >= 50 ? "Отлично" : score >= 0 ? "Нейтрально" : "Требует улучшения"}
      </div>
    </div>
  );
}

const Nps = () => {
  const [stats, setStats] = useState<NpsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getNpsStats()
      .then(setStats)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">NPS Дашборд</h1>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-5 h-28">
              <Skeleton className="h-3 w-1/2 mb-3" />
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/3" />
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

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">NPS Дашборд</h1>
        <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 p-6 text-red-600 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { overall, monthly } = stats;
  const pct = (n: number) => overall.total > 0 ? Math.round((n / overall.total) * 100) : 0;

  // Chart: monthly NPS (reversed so oldest is left)
  const chartData = [...monthly].reverse().map((m) => ({
    month: m.month,
    nps: m.nps,
    total: m.total,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">NPS Дашборд</h1>

      {/* Overall metrics */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* NPS gauge */}
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-white/80 via-white/75 to-cyan-50/80 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-cyan-950/30 p-6 backdrop-blur-md flex items-center justify-center">
          <NpsGauge score={overall.nps} />
        </div>

        {/* Promoters */}
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-white/80 to-emerald-50/60 dark:from-slate-900/90 dark:to-emerald-950/20 p-5 backdrop-blur-md">
          <p className="text-xs text-muted-foreground mb-1">Промоутеры (9–10)</p>
          <p className="text-3xl font-black text-emerald-600">{overall.promoters}</p>
          <p className="text-xs text-muted-foreground mt-1">{pct(overall.promoters)}% от общего</p>
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct(overall.promoters)}%` }} />
          </div>
        </div>

        {/* Passives */}
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-white/80 to-amber-50/60 dark:from-slate-900/90 dark:to-amber-950/20 p-5 backdrop-blur-md">
          <p className="text-xs text-muted-foreground mb-1">Нейтральные (7–8)</p>
          <p className="text-3xl font-black text-amber-500">{overall.passives}</p>
          <p className="text-xs text-muted-foreground mt-1">{pct(overall.passives)}% от общего</p>
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct(overall.passives)}%` }} />
          </div>
        </div>

        {/* Detractors */}
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-white/80 to-red-50/60 dark:from-slate-900/90 dark:to-red-950/20 p-5 backdrop-blur-md">
          <p className="text-xs text-muted-foreground mb-1">Критики (0–6)</p>
          <p className="text-3xl font-black text-red-500">{overall.detractors}</p>
          <p className="text-xs text-muted-foreground mt-1">{pct(overall.detractors)}% от общего</p>
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct(overall.detractors)}%` }} />
          </div>
        </div>
      </div>

      {/* Monthly NPS chart */}
      {chartData.length > 0 ? (
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-white/80 via-white/75 to-cyan-50/80 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-cyan-950/30 p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold">Тренд NPS по месяцам</h2>
            <span className="text-xs text-muted-foreground">последние 12 мес.</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[-100, 100]} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === "nps" ? [`${value > 0 ? "+" : ""}${value}`, "NPS"] : [value, "Ответов"]
                }
                labelFormatter={(label: string) => `Месяц: ${label}`}
              />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              <Bar
                dataKey="nps"
                radius={[6, 6, 0, 0]}
                fill="#0d9488"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
          Недостаточно данных для построения графика
        </div>
      )}

      {/* Monthly table */}
      {monthly.length > 0 && (
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-white/80 via-white/75 to-cyan-50/80 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-cyan-950/30 backdrop-blur-md overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50">
            <h2 className="text-base font-semibold">По месяцам</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground">Месяц</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">NPS</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Ответов</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-emerald-600">Промоутеры</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-amber-500">Нейтральные</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-red-500">Критики</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m) => {
                  const npsColor = m.nps >= 50 ? "#10b981" : m.nps >= 0 ? "#f59e0b" : "#ef4444";
                  return (
                    <tr key={m.month} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 font-medium">{m.month}</td>
                      <td className="px-4 py-3 text-right font-bold" style={{ color: npsColor }}>
                        {m.nps > 0 ? `+${m.nps}` : m.nps}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{m.total}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">{m.promoters}</td>
                      <td className="px-4 py-3 text-right text-amber-500 font-medium">{m.passives}</td>
                      <td className="px-6 py-3 text-right text-red-500 font-medium">{m.detractors}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Nps;
