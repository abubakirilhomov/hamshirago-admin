import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getAdminConsultations,
  completeConsultation,
  cancelAdminConsultation,
  getServices,
  type AdminConsultation,
  type AdminService,
} from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<AdminConsultation["status"], string> = {
  PENDING:   "Ожидает",
  ACTIVE:    "Активна",
  COMPLETED: "Завершена",
  CANCELED:  "Отменена",
};

const STATUS_VARIANT: Record<AdminConsultation["status"], "default" | "secondary" | "destructive" | "outline"> = {
  PENDING:   "default",
  ACTIVE:    "secondary",
  COMPLETED: "outline",
  CANCELED:  "destructive",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUSES = ["", "PENDING", "ACTIVE", "COMPLETED", "CANCELED"] as const;

// ── Complete Modal ─────────────────────────────────────────────────────────────

function CompleteModal({
  consultation,
  services,
  onClose,
  onDone,
}: {
  consultation: AdminConsultation;
  services: AdminService[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [notes, setNotes] = useState(consultation.doctorNotes ?? "");
  const [serviceId, setServiceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      await completeConsultation(consultation.id, notes.trim() || undefined, serviceId || undefined);
      onDone();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Завершить консультацию</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Doctor & patient info */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p><span className="font-medium text-foreground">Врач:</span> {consultation.doctor?.name ?? "—"} ({consultation.doctor?.specialization ?? "—"})</p>
            <p><span className="font-medium text-foreground">Клиент ID:</span> {(consultation.clientId ?? "").slice(0, 8)}…</p>
            {consultation.symptoms && (
              <p><span className="font-medium text-foreground">Симптомы:</span> {consultation.symptoms}</p>
            )}
          </div>

          {/* Doctor notes */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Заметки врача</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Диагноз, рекомендации..."
              rows={4}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Prescription service dropdown */}
          <div>
            <label className="text-sm font-medium block mb-1.5">
              Назначить услугу медсестры <span className="text-muted-foreground font-normal">(необязательно)</span>
            </label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— Без назначения —</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} — {s.price.toLocaleString("ru-RU")} UZS
                </option>
              ))}
            </select>
            {serviceId && (
              <p className="text-xs text-muted-foreground mt-1">
                Будет создан рецепт, действующий 7 дней. Клиент сможет оформить заказ через приложение.
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Сохраняем..." : "Завершить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Detail Modal ───────────────────────────────────────────────────────────────

function DetailModal({
  consultation,
  onClose,
}: {
  consultation: AdminConsultation;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Детали консультации</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[consultation.status]}>{STATUS_LABELS[consultation.status]}</Badge>
            <span className="text-xs text-muted-foreground">{formatDate(consultation.createdAt)}</span>
          </div>
          <p><span className="font-medium">Врач:</span> {consultation.doctor?.name ?? "—"} ({consultation.doctor?.specialization ?? "—"})</p>
          <p><span className="font-medium">Клиент ID:</span> {consultation.clientId}</p>
          {consultation.symptoms && (
            <div>
              <p className="font-medium mb-1">Симптомы:</p>
              <p className="text-muted-foreground leading-relaxed">{consultation.symptoms}</p>
            </div>
          )}
          {consultation.doctorNotes && (
            <div>
              <p className="font-medium mb-1">Заметки врача:</p>
              <p className="text-muted-foreground leading-relaxed">{consultation.doctorNotes}</p>
            </div>
          )}
          <p><span className="font-medium">Стоимость:</span> {consultation.price.toLocaleString("ru-RU")} UZS</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const Consultations = () => {
  const [consultations, setConsultations] = useState<AdminConsultation[]>([]);
  const [services, setServices] = useState<AdminService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [detailItem, setDetailItem] = useState<AdminConsultation | null>(null);
  const [completeItem, setCompleteItem] = useState<AdminConsultation | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const load = useCallback(async (p: number, status: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await getAdminConsultations(p, 20, status || undefined);
      setConsultations(res.data);
      setPage(res.page);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getServices().then(setServices).catch(() => {});
  }, []);

  useEffect(() => {
    load(1, statusFilter);
    setPage(1);
  }, [statusFilter, load]);

  async function handleCancel(id: string) {
    if (!confirm("Отменить консультацию?")) return;
    setCancelingId(id);
    try {
      await cancelAdminConsultation(id);
      load(page, statusFilter);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка отмены консультации");
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Консультации</h1>
          {!loading && <p className="text-sm text-muted-foreground mt-0.5">Всего: {total}</p>}
        </div>
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s ? STATUS_LABELS[s as AdminConsultation["status"]] : "Все статусы"}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-600 dark:text-red-400">
          {error}
          <Button size="sm" variant="outline" className="ml-3" onClick={() => load(page, statusFilter)}>Повторить</Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-white/80 via-white/75 to-cyan-50/80 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-cyan-950/30 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Врач</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Клиент ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Статус</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Дата</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Цена</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="px-5 py-3"><Skeleton className="h-4 w-36" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                      <td className="px-5 py-3 text-right"><Skeleton className="h-7 w-28 ml-auto" /></td>
                    </tr>
                  ))
                : consultations.map((c) => (
                    <tr key={c.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium">{c.doctor?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{c.doctor?.specialization ?? ""}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{(c.clientId ?? "").slice(0, 8)}…</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABELS[c.status]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-3 text-right font-medium">{c.price.toLocaleString("ru-RU")} UZS</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setDetailItem(c)}>Детали</Button>
                          {(c.status === "PENDING" || c.status === "ACTIVE") && (
                            <>
                              <Button size="sm" onClick={() => setCompleteItem(c)}>Завершить</Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={cancelingId === c.id}
                                onClick={() => handleCancel(c.id)}
                              >
                                {cancelingId === c.id ? "…" : "Отменить"}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!loading && consultations.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">Консультаций не найдено</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => { setPage(page - 1); load(page - 1, statusFilter); }}
          >
            ← Назад
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages || loading}
            onClick={() => { setPage(page + 1); load(page + 1, statusFilter); }}
          >
            Вперёд →
          </Button>
        </div>
      )}

      {/* Modals */}
      {detailItem && (
        <DetailModal consultation={detailItem} onClose={() => setDetailItem(null)} />
      )}
      {completeItem && (
        <CompleteModal
          consultation={completeItem}
          services={services}
          onClose={() => setCompleteItem(null)}
          onDone={() => { setCompleteItem(null); load(page, statusFilter); }}
        />
      )}
    </div>
  );
};

export default Consultations;
