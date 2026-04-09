import { useCallback, useEffect, useState } from "react";
import {
  getVoiceAgentStats,
  getVoiceSessions,
  getVoiceSession,
  VoiceAgentStats,
  VoiceSession,
} from "@/lib/api";
import { Mic, TrendingUp, CheckCircle, Activity, Users, Stethoscope, X, RefreshCw, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ── Helpers ───────────────────────────────────────────────────────────────────

const REC_LABEL: Record<string, string> = {
  DOCTOR: "Врач",
  NURSE: "Медсестра",
  NONE: "—",
};

const REC_COLOR: Record<string, { text: string; bg: string }> = {
  DOCTOR: { text: "#0d9488", bg: "#f0fdfa" },
  NURSE:  { text: "#6366f1", bg: "#eef2ff" },
  NONE:   { text: "#94a3b8", bg: "#f8fafc" },
};

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none mb-1">{value}</p>
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// ── Session modal ─────────────────────────────────────────────────────────────

function SessionModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVoiceSession(sessionId)
      .then(setSession)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white">История сессии</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="p-5 flex flex-col gap-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !session ? (
          <div className="p-5 text-center text-slate-400">Сессия не найдена</div>
        ) : (
          <>
            {/* Meta */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex gap-3 flex-wrap">
              <span className="text-xs font-medium text-slate-500">Язык: <b className="text-slate-800 dark:text-slate-200">{session.lang.toUpperCase()}</b></span>
              <span className="text-xs font-medium text-slate-500">Статус: <b className="text-slate-800 dark:text-slate-200">{session.status === "COMPLETED" ? "Завершена" : "Активна"}</b></span>
              {session.recommendation && session.recommendation !== "NONE" && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ color: REC_COLOR[session.recommendation]?.text, background: REC_COLOR[session.recommendation]?.bg }}
                >
                  → {REC_LABEL[session.recommendation]}
                  {session.suggestedSpecialization ? ` (${session.suggestedSpecialization})` : ""}
                </span>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              {session.messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                    style={m.role === "user"
                      ? { background: "#0d9488", color: "#fff", borderRadius: "14px 14px 4px 14px" }
                      : { background: "#f1f5f9", color: "#0f172a", borderRadius: "14px 14px 14px 4px" }
                    }
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {session.messages.length === 0 && (
                <p className="text-center text-slate-400 text-sm">Нет сообщений</p>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
              {new Date(session.createdAt).toLocaleString("ru-RU")}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const VoiceAgent = () => {
  const [stats, setStats] = useState<VoiceAgentStats | null>(null);
  const [sessions, setSessions] = useState<VoiceSession[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [recFilter, setRecFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalId, setModalId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([
        getVoiceAgentStats(),
        getVoiceSessions(page, 20, statusFilter || undefined, recFilter || undefined),
      ]);
      setStats(s);
      setSessions(r.data);
      setTotal(r.total);
    } catch {}
    setLoading(false);
  }, [page, statusFilter, recFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}>
            <Mic size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Голосовой агент</h1>
            <p className="text-sm text-slate-500">AI консультант — статистика и сессии</p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg transition-colors"
        >
          <RefreshCw size={14} />
          Обновить
        </button>
      </div>

      {/* Stats grid */}
      {loading && !stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Всего сессий"       value={stats.totalSessions}          icon={Mic}          color="#0d9488" />
          <StatCard label="Завершено"           value={stats.completedSessions}      icon={CheckCircle}  color="#22c55e" />
          <StatCard label="Врач рекомендован"   value={stats.doctorRecommendations}  icon={Stethoscope}  color="#6366f1" />
          <StatCard label="Медсестра вызвана"   value={stats.nurseRecommendations}   icon={Users}        color="#f59e0b" />
        </div>
      ) : null}

      {/* Extra stats row */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Конверсия"        value={`${(stats.conversionRate * 100).toFixed(1)}%`} icon={TrendingUp} color="#0d9488" />
          <StatCard label="Среднее обменов"  value={stats.averageExchanges.toFixed(1)}              icon={Activity}  color="#64748b" />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none"
        >
          <option value="">Все статусы</option>
          <option value="ACTIVE">Активные</option>
          <option value="COMPLETED">Завершённые</option>
        </select>
        <select
          value={recFilter}
          onChange={(e) => { setRecFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none"
        >
          <option value="">Все рекомендации</option>
          <option value="DOCTOR">Врач</option>
          <option value="NURSE">Медсестра</option>
          <option value="NONE">Без рекомендации</option>
        </select>
      </div>

      {/* Sessions table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 dark:text-white">Сессии</h2>
          <span className="text-sm text-slate-400">{total} всего</span>
        </div>

        {loading ? (
          <div className="p-4 flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-10 text-center">
            <Mic size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-400 text-sm">Сессий пока нет</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sessions.map((s) => {
              const rc = s.recommendation ? (REC_COLOR[s.recommendation] ?? REC_COLOR.NONE) : REC_COLOR.NONE;
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  onClick={() => setModalId(s.id)}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#f0fdfa" }}>
                    <Mic size={14} color="#0d9488" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      Сессия {s.id.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-slate-400">
                      {s.lang.toUpperCase()} · {s.messages.length} сообщений · {new Date(s.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ color: rc.text, background: rc.bg }}
                    >
                      {s.recommendation ? REC_LABEL[s.recommendation] : "—"}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.status === "COMPLETED" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>
                      {s.status === "COMPLETED" ? "Завершена" : "Активна"}
                    </span>
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              ← Назад
            </button>
            <span className="text-sm text-slate-400">стр. {page} / {Math.ceil(total / 20)}</span>
            <button
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
              className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Вперёд →
            </button>
          </div>
        )}
      </div>

      {/* Session detail modal */}
      {modalId && <SessionModal sessionId={modalId} onClose={() => setModalId(null)} />}
    </div>
  );
};

export default VoiceAgent;
