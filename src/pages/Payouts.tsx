import { useCallback, useEffect, useState } from "react";
import {
  getWithdrawalRequests,
  approveWithdrawal,
  declineWithdrawal,
  type WithdrawalRequest,
  type WithdrawalStatus,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Wallet, CheckCircle2, XCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";

const STATUS_LABEL: Record<WithdrawalStatus, string> = {
  PENDING:  "Ожидает",
  APPROVED: "Одобрена",
  DECLINED: "Отклонена",
};

const STATUS_COLOR: Record<WithdrawalStatus, { text: string; bg: string }> = {
  PENDING:  { text: "#d97706", bg: "#fef3c7" },
  APPROVED: { text: "#16a34a", bg: "#dcfce7" },
  DECLINED: { text: "#dc2626", bg: "#fee2e2" },
};

export default function Payouts() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<WithdrawalStatus | "ALL">("ALL");
  const [actionId, setActionId] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<WithdrawalRequest | null>(null);
  const [declineNote, setDeclineNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWithdrawalRequests(
        statusFilter === "ALL" ? undefined : statusFilter,
      );
      setRequests(data);
    } catch {
      toast.error("Ошибка загрузки заявок на выплату");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(req: WithdrawalRequest) {
    setActionId(req.id);
    try {
      const updated = await approveWithdrawal(req.id);
      setRequests((prev) => prev.map((r) => r.id === req.id ? updated : r));
      toast.success(`Выплата ${formatAmount(req.amount)} одобрена`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setActionId(null);
    }
  }

  async function handleDeclineConfirm() {
    if (!declineTarget) return;
    setActionId(declineTarget.id);
    try {
      const updated = await declineWithdrawal(declineTarget.id, declineNote.trim() || undefined);
      setRequests((prev) => prev.map((r) => r.id === declineTarget.id ? updated : r));
      toast.success("Заявка отклонена");
      setDeclineTarget(null);
      setDeclineNote("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setActionId(null);
    }
  }

  function formatAmount(n: number) {
    return Number(n).toLocaleString("ru-RU") + " UZS";
  }

  const pending  = requests.filter((r) => r.status === "PENDING").length;
  const approved = requests.filter((r) => r.status === "APPROVED").length;
  const total    = requests.reduce((s, r) => s + (r.status === "APPROVED" ? Number(r.amount) : 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/30 dark:border-slate-700/60 bg-gradient-to-br from-violet-50/80 via-white/70 to-purple-50/80 dark:from-slate-900 dark:via-violet-950/25 dark:to-slate-900 p-6 md:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Finance</p>
          <h1 className="text-3xl font-semibold tracking-tight">Выплаты медикам</h1>
          <p className="text-sm text-muted-foreground mt-1">Управление заявками на вывод средств.</p>
        </div>
      </motion.section>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-amber-50/80 to-yellow-100/70 dark:from-slate-900/90 dark:to-amber-950/30 p-4">
          <p className="text-xs text-muted-foreground">Ожидают</p>
          <p className="text-2xl font-semibold text-amber-900 dark:text-amber-200">{pending}</p>
          <Clock className="h-4 w-4 text-amber-500 mt-2" />
        </div>
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-emerald-50/80 to-green-100/70 dark:from-slate-900/90 dark:to-emerald-950/30 p-4">
          <p className="text-xs text-muted-foreground">Одобрено</p>
          <p className="text-2xl font-semibold text-emerald-900 dark:text-emerald-200">{approved}</p>
          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-2" />
        </div>
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-violet-50/80 to-purple-100/70 dark:from-slate-900/90 dark:to-violet-950/30 p-4">
          <p className="text-xs text-muted-foreground">Выплачено</p>
          <p className="text-2xl font-semibold text-violet-900 dark:text-violet-200">{formatAmount(total)}</p>
          <Wallet className="h-4 w-4 text-violet-500 mt-2" />
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as WithdrawalStatus | "ALL")}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все статусы</SelectItem>
            <SelectItem value="PENDING">Ожидают</SelectItem>
            <SelectItem value="APPROVED">Одобренные</SelectItem>
            <SelectItem value="DECLINED">Отклонённые</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">Всего: {requests.length}</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white dark:bg-slate-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Медик</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead>Комментарий</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-16">
                  <Wallet className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p>Заявок на выплату нет</p>
                  {statusFilter !== "ALL" && (
                    <p className="text-xs mt-1 opacity-60">Попробуйте изменить фильтр</p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req) => {
                const colors = STATUS_COLOR[req.status];
                return (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.medicName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{req.medicPhone}</TableCell>
                    <TableCell className="font-semibold">{formatAmount(req.amount)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ color: colors.text, background: colors.bg }}>
                        {req.status === "PENDING"  && <Clock className="h-3 w-3" />}
                        {req.status === "APPROVED" && <CheckCircle2 className="h-3 w-3" />}
                        {req.status === "DECLINED" && <XCircle className="h-3 w-3" />}
                        {STATUS_LABEL[req.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(req.createdAt).toLocaleDateString("ru-RU")}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[140px] truncate">
                      {req.adminNote ?? "—"}
                    </TableCell>
                    <TableCell>
                      {req.status === "PENDING" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                            disabled={actionId === req.id}
                            onClick={() => handleApprove(req)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Одобрить
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                            disabled={actionId === req.id}
                            onClick={() => { setDeclineTarget(req); setDeclineNote(""); }}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Отклонить
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Decline dialog */}
      <Dialog open={!!declineTarget} onOpenChange={(o) => !o && setDeclineTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Отклонить заявку</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Заявка на <span className="font-semibold text-foreground">{declineTarget && formatAmount(declineTarget.amount)}</span> от <span className="font-semibold text-foreground">{declineTarget?.medicName ?? declineTarget?.medicPhone}</span>.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Причина (необязательно)</label>
              <Input
                value={declineNote}
                onChange={(e) => setDeclineNote(e.target.value)}
                placeholder="Недостаточно данных..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineTarget(null)}>Отмена</Button>
            <Button
              variant="destructive"
              disabled={!!actionId}
              onClick={handleDeclineConfirm}
            >
              {actionId ? "Сохранение..." : "Отклонить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
