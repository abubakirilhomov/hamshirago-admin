import { useEffect, useRef, useState } from "react";
import { getClientErrors, updateClientErrorStatus, getClientErrorStats, type ClientError, type ClientErrorStats } from "@/lib/api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Bug, CheckCircle2, Clock3, XCircle, AlertTriangle, ClipboardList } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Все статусы" },
  { value: "NEW", label: "Новые" },
  { value: "IN_PROGRESS", label: "В работе" },
  { value: "FIXED", label: "Исправлено" },
  { value: "IGNORED", label: "Игнорируется" },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NEW:         { label: "Новая",        color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  IN_PROGRESS: { label: "В работе",     color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  FIXED:       { label: "Исправлено",   color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  IGNORED:     { label: "Игнорируется", color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
};

const APP_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  mobile:     { label: "Mobile",    emoji: "📱", color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  web:        { label: "Web",       emoji: "🌐", color: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  "web-medic":{ label: "Web Medic", emoji: "🏥", color: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" },
  medic:      { label: "Medic App", emoji: "🩺", color: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
};

function AppTypeBadge({ appType, screen }: { appType?: string | null; screen?: string | null }) {
  const info = APP_LABELS[appType ?? ""];

  if (info) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${info.color}`}>
        <span>{info.emoji}</span>
        <span>{info.label}</span>
      </span>
    );
  }

  // appType yo'q — screen yoki raw value ko'rsat
  const fallback = screen
    ? screen.split("/").filter(Boolean).slice(-2).join(" / ")
    : appType ?? null;

  if (!fallback) {
    return <span className="text-xs text-muted-foreground italic">noma'lum</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 max-w-[120px] truncate cursor-default">
            <span>❓</span>
            <span className="truncate">{fallback}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">appType yo'q</p>
          {screen && <p className="text-xs font-mono text-muted-foreground">{screen}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function UserSupport() {
  const [errors, setErrors] = useState<ClientError[]>([]);
  const [stats, setStats] = useState<ClientErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [inputValue, setInputValue] = useState(""); // контролирует поле ввода мгновенно
  const [search, setSearch] = useState("");          // debounced — триггерит API
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selected, setSelected] = useState<ClientError | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadErrors();
  }, [page, statusFilter, search]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadStats() {
    try {
      const data = await getClientErrorStats();
      setStats(data);
    } catch { /* ignore */ }
  }

  async function loadErrors() {
    setLoading(true);
    const q = search;
    try {
      if (q.trim()) {
        // При поиске грузим до 500 ошибок (5 страниц × 100) для полного охвата
        const statusVal = statusFilter === "ALL" ? undefined : statusFilter;
        const first = await getClientErrors({ page: 1, limit: 100, status: statusVal });
        const allData = [...first.data];
        const maxPages = Math.min(first.totalPages, 5);
        if (maxPages > 1) {
          const rest = await Promise.all(
            Array.from({ length: maxPages - 1 }, (_, i) =>
              getClientErrors({ page: i + 2, limit: 100, status: statusVal })
            )
          );
          rest.forEach((r) => allData.push(...r.data));
        }
        setErrors(allData);
        setTotalPages(1);
        setTotal(allData.length);
      } else {
        const data = await getClientErrors({
          page,
          limit: 20,
          status: statusFilter === "ALL" ? undefined : statusFilter,
        });
        setErrors(data.data);
        setTotalPages(Math.ceil(data.total / (data.limit || 20)));
        setTotal(data.total);
      }
    } catch {
      toast.error("Ошибка загрузки ошибок");
    } finally {
      setLoading(false);
    }
  }

async function handleStatusChange(id: string, status: string) {
    setUpdatingId(id);
    try {
      await updateClientErrorStatus(id, status);
      setErrors((prev) => prev.map((e) => e.id === id ? { ...e, status } : e));
      if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status } : prev);
      await loadStats();
      toast.success("Статус обновлён");
    } catch {
      toast.error("Ошибка обновления статуса");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleAddToTask(err: ClientError) {
    const app = APP_LABELS[err.appType ?? ""]?.label ?? err.appType ?? "unknown";
    const code = err.errorCode ? `[${err.errorCode}] ` : "";
    const msg = err.message?.slice(0, 120) ?? "Unknown error";
    const url = err.url ? ` | \`${err.url}\`` : "";
    const count = err.count && err.count > 1 ? ` | x${err.count} повторений` : "";
    const date = new Date(err.createdAt).toISOString().slice(0, 10);

    const taskLine = `- [ ] **[BUG][${app}]** ${code}${msg}${url}${count} — UserSupport \`${err.id}\` (${date})`;

    try {
      await navigator.clipboard.writeText(taskLine);
      toast.success("Задача скопирована в буфер — вставьте в docs/tasks.md", { duration: 4000 });
    } catch {
      toast.error("Не удалось скопировать — скопируйте вручную");
    }

    if (err.status === "NEW") {
      await handleStatusChange(err.id, "IN_PROGRESS");
    }
  }

  const filtered = search
    ? errors.filter((e) =>
        e.message?.toLowerCase().includes(search.toLowerCase()) ||
        e.errorCode?.toLowerCase().includes(search.toLowerCase()) ||
        e.userId?.toLowerCase().includes(search.toLowerCase())
      )
    : errors;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">User Support</h1>
        <p className="text-sm text-muted-foreground mt-1">Ошибки пользователей — анализ и устранение</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Новые", value: stats?.NEW ?? 0, icon: AlertTriangle, color: "text-red-500" },
          { label: "В работе", value: stats?.IN_PROGRESS ?? 0, icon: Clock3, color: "text-yellow-500" },
          { label: "Исправлено", value: stats?.FIXED ?? 0, icon: CheckCircle2, color: "text-green-500" },
          { label: "Игнорируется", value: stats?.IGNORED ?? 0, icon: XCircle, color: "text-slate-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-xl border border-border p-4 flex items-center gap-3">
            <Icon className={`h-5 w-5 ${color} flex-shrink-0`} />
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Поиск по ошибке, коду, userId..."
          value={inputValue}
          onChange={(e) => {
            const val = e.target.value;
            setInputValue(val);
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
            searchDebounceRef.current = setTimeout(() => { setSearch(val); setPage(1); }, 400);
          }}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground self-center ml-auto">Всего: {total}</span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ошибка</TableHead>
              <TableHead>Пользователь</TableHead>
              <TableHead>Приложение</TableHead>
              <TableHead>Кол-во</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Bug className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Ошибок нет
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((err) => (
                <TableRow
                  key={err.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelected(err)}
                >
                  <TableCell className="max-w-xs">
                    <p className="font-medium text-sm truncate">{err.errorCode || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{err.message}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">
                    {err.userId ? err.userId.slice(0, 8) + "..." : "—"}
                  </TableCell>
                  <TableCell>
                    <AppTypeBadge appType={err.appType} screen={err.screen} />
                  </TableCell>
                  <TableCell className="text-sm font-semibold">
                    {err.count ?? 1}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_LABELS[err.status]?.color ?? ""}`}>
                      {STATUS_LABELS[err.status]?.label ?? err.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(err.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={err.status}
                      onValueChange={(v) => handleStatusChange(err.id, v)}
                      disabled={updatingId === err.id}
                    >
                      <SelectTrigger className="h-7 text-xs w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW">Новая</SelectItem>
                        <SelectItem value="IN_PROGRESS">В работе</SelectItem>
                        <SelectItem value="FIXED">Исправлено</SelectItem>
                        <SelectItem value="IGNORED">Игнорировать</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Detail modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-red-500" />
              Детали ошибки
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Статус</p>
                  <Select
                    value={selected.status}
                    onValueChange={(v) => handleStatusChange(selected.id, v)}
                    disabled={updatingId === selected.id}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW">Новая</SelectItem>
                      <SelectItem value="IN_PROGRESS">В работе</SelectItem>
                      <SelectItem value="FIXED">Исправлено</SelectItem>
                      <SelectItem value="IGNORED">Игнорировать</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Кол-во</p>
                  <p className="font-bold text-lg">{selected.count ?? 1}</p>
                </div>
              </div>

              {selected.errorCode && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Код ошибки</p>
                  <p className="font-mono text-xs bg-muted px-2 py-1 rounded">{selected.errorCode}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-1">Сообщение</p>
                <p className="bg-muted px-3 py-2 rounded text-xs">{selected.message}</p>
              </div>

              {selected.stacktrace && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Stack trace</p>
                  <pre className="bg-slate-950 text-green-400 text-xs p-3 rounded overflow-x-auto whitespace-pre-wrap break-all max-h-40">
                    {selected.stacktrace}
                  </pre>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground mb-1">Приложение</p>
                  <AppTypeBadge appType={selected.appType} screen={selected.screen} />
                </div>
                {selected.userId && (
                  <div>
                    <p className="text-muted-foreground mb-1">User ID</p>
                    <p className="font-mono">{selected.userId}</p>
                  </div>
                )}
                {selected.screen && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-1">Экран / Route</p>
                    <p className="font-mono bg-muted px-2 py-1 rounded break-all">{selected.screen}</p>
                  </div>
                )}
                {selected.url && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-1">URL</p>
                    <p className="font-mono bg-muted px-2 py-1 rounded break-all">{selected.url}</p>
                  </div>
                )}
                {selected.appVersion && (
                  <div>
                    <p className="text-muted-foreground mb-1">Версия</p>
                    <p>{selected.appVersion}</p>
                  </div>
                )}
              </div>

              {selected.deviceInfo && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Устройство</p>
                  <p className="text-xs bg-muted px-2 py-1 rounded break-all">{selected.deviceInfo}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-1">Дата</p>
                <p className="text-xs">{new Date(selected.createdAt).toLocaleString("ru-RU")}</p>
              </div>

              <div className="pt-2 border-t border-border">
                <Button
                  className="w-full gap-2"
                  variant="outline"
                  onClick={() => handleAddToTask(selected)}
                  disabled={updatingId === selected.id}
                >
                  <ClipboardList className="h-4 w-4 text-blue-500" />
                  Добавить в задачи (tasks.md)
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  Копирует строку задачи · статус → В работе
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
