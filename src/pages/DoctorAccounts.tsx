import { useCallback, useEffect, useState } from "react";
import {
  getDoctorAccounts,
  getDoctorAccountsPending,
  verifyDoctorAccount,
  blockDoctorAccount,
  DoctorAccount,
} from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CheckCircle, XCircle, ShieldOff, Shield, Stethoscope,
  RefreshCw, Clock, Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ── Helpers ───────────────────────────────────────────────────────────────────

const VS_LABEL: Record<string, string> = {
  PENDING:  "На проверке",
  APPROVED: "Верифицирован",
  REJECTED: "Отклонён",
};

const VS_COLOR: Record<string, { text: string; bg: string }> = {
  PENDING:  { text: "#eab308", bg: "#fefce8" },
  APPROVED: { text: "#22c55e", bg: "#f0fdf4" },
  REJECTED: { text: "#ef4444", bg: "#fef2f2" },
};

// ── Reject modal ──────────────────────────────────────────────────────────────

function RejectModal({
  doctor,
  onConfirm,
  onClose,
}: {
  doctor: DoctorAccount;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function handle() {
    setSaving(true);
    await onConfirm(reason);
    setSaving(false);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Отклонить верификацию</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500 mb-3">
          Врач: <b className="text-slate-800">{doctor.name}</b>
        </p>
        <label className="text-xs font-semibold text-slate-500 mb-1 block">ПРИЧИНА (необязательно)</label>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Документы не соответствуют требованиям..."
        />
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button variant="destructive" disabled={saving} onClick={handle}>
            {saving ? "Отклоняем..." : "Отклонить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DoctorAccounts() {
  const [doctors, setDoctors] = useState<DoctorAccount[]>([]);
  const [pending, setPending] = useState<DoctorAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [vsFilter, setVsFilter] = useState("");
  const [blockedFilter, setBlockedFilter] = useState("");
  const [tab, setTab] = useState<"all" | "pending">("all");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<DoctorAccount | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const isBlocked = blockedFilter === "true" ? true : blockedFilter === "false" ? false : undefined;
      const [all, pend] = await Promise.all([
        getDoctorAccounts(page, 20, search || undefined, vsFilter || undefined, isBlocked),
        getDoctorAccountsPending(),
      ]);
      setDoctors(all.data);
      setTotal(all.total);
      setPending(pend);
    } catch {}
    setLoading(false);
  }, [page, search, vsFilter, blockedFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id: string) {
    setActionId(id);
    try {
      await verifyDoctorAccount(id, "APPROVED");
      toast.success("Врач верифицирован");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    }
    setActionId(null);
  }

  async function handleRejectConfirm(id: string, reason: string) {
    setActionId(id);
    try {
      await verifyDoctorAccount(id, "REJECTED", reason || undefined);
      toast.success("Верификация отклонена");
      setRejectTarget(null);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    }
    setActionId(null);
  }

  async function handleBlock(id: string, isBlocked: boolean) {
    setActionId(id);
    try {
      await blockDoctorAccount(id, isBlocked);
      toast.success(isBlocked ? "Врач заблокирован" : "Врач разблокирован");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    }
    setActionId(null);
  }

  const displayed = tab === "pending" ? pending : doctors;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}>
            <Stethoscope size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Аккаунты врачей</h1>
            <p className="text-sm text-slate-500">Верификация и управление доступом</p>
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

      {/* Tabs */}
      <div className="flex gap-2">
        {(["all", "pending"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t ? "bg-teal-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"}`}
          >
            {t === "all" ? "Все" : "На проверке"}
            {t === "pending" && pending.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">{pending.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Filters (only for "all" tab) */}
      {tab === "all" && (
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Поиск по имени, телефону..."
              className="pl-8 h-9 text-sm"
            />
          </div>
          <select
            value={vsFilter}
            onChange={(e) => { setVsFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none h-9"
          >
            <option value="">Все статусы</option>
            <option value="PENDING">На проверке</option>
            <option value="APPROVED">Верифицированы</option>
            <option value="REJECTED">Отклонены</option>
          </select>
          <select
            value={blockedFilter}
            onChange={(e) => { setBlockedFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none h-9"
          >
            <option value="">Все</option>
            <option value="false">Активные</option>
            <option value="true">Заблокированные</option>
          </select>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 dark:text-white">
            {tab === "pending" ? "Ожидают верификации" : "Список врачей"}
          </h2>
          <span className="text-sm text-slate-400">{tab === "all" ? total : pending.length} всего</span>
        </div>

        {loading ? (
          <div className="p-4 flex flex-col gap-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="p-10 text-center">
            <Clock size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-400 text-sm">
              {tab === "pending" ? "Нет врачей на проверке" : "Врачей не найдено"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {displayed.map((d) => {
              const vs = VS_COLOR[d.verificationStatus] ?? VS_COLOR.PENDING;
              const isActing = actionId === d.id;
              return (
                <div key={d.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-slate-200">
                    {d.profilePhotoUrl ? (
                      <img src={d.profilePhotoUrl} alt={d.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-teal-50 flex items-center justify-center">
                        <Stethoscope size={16} color="#0d9488" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{d.name}</p>
                      {d.isBlocked && (
                        <span className="text-xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Блок</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {d.phone}
                      {d.specialization ? ` · ${d.specialization}` : ""}
                      {` · ${d.experienceYears} лет`}
                    </p>
                    {d.rating !== null && (
                      <p className="text-xs text-amber-500">★ {Number(d.rating).toFixed(1)} ({d.reviewCount})</p>
                    )}
                  </div>

                  {/* Verification badge */}
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ color: vs.text, background: vs.bg }}
                  >
                    {VS_LABEL[d.verificationStatus]}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {d.verificationStatus === "PENDING" && (
                      <>
                        <button
                          disabled={isActing}
                          onClick={() => handleApprove(d.id)}
                          title="Верифицировать"
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-40"
                        >
                          <CheckCircle size={15} color="#22c55e" />
                        </button>
                        <button
                          disabled={isActing}
                          onClick={() => setRejectTarget(d)}
                          title="Отклонить"
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-40"
                        >
                          <XCircle size={15} color="#ef4444" />
                        </button>
                      </>
                    )}
                    <button
                      disabled={isActing}
                      onClick={() => handleBlock(d.id, !d.isBlocked)}
                      title={d.isBlocked ? "Разблокировать" : "Заблокировать"}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 ${d.isBlocked ? "bg-amber-50 hover:bg-amber-100" : "bg-slate-100 hover:bg-slate-200"}`}
                    >
                      {d.isBlocked
                        ? <Shield size={15} color="#f59e0b" />
                        : <ShieldOff size={15} color="#94a3b8" />
                      }
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {tab === "all" && total > 20 && (
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

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          doctor={rejectTarget}
          onConfirm={(reason) => handleRejectConfirm(rejectTarget.id, reason)}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}
