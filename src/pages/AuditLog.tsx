import { useCallback, useEffect, useState } from "react";
import { getAuditLog, type AuditLogEntry } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";

const ACTIONS = [
  "ALL",
  "block_user",
  "unblock_user",
  "block_medic",
  "unblock_medic",
  "verify_medic",
  "reject_medic",
  "cancel_order",
  "complete_consultation",
  "cancel_consultation",
  "update_settings",
  "topup_medic",
];

function ActionBadge({ action }: { action: string }) {
  const color =
    action.startsWith("block") || action.startsWith("reject") || action.startsWith("cancel")
      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
      : action.startsWith("verify") || action.startsWith("complete") || action.startsWith("unblock")
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium font-mono ${color}`}>
      {action}
    </span>
  );
}

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async (p: number, action: string) => {
    setLoading(true);
    try {
      const data = await getAuditLog(p, 20, action === "ALL" ? undefined : action);
      setEntries(data.data);
      setTotal(data.total);
      setTotalPages(Math.ceil(data.total / data.limit));
    } catch {
      toast.error("Ошибка загрузки аудит-лога");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page, actionFilter); }, [load, page, actionFilter]);

  function handleFilterChange(value: string) {
    setActionFilter(value);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/30 dark:border-slate-700/60 bg-gradient-to-br from-slate-50/80 via-white/70 to-zinc-50/80 dark:from-slate-900 dark:via-slate-800/25 dark:to-slate-900 p-6 md:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-slate-300/20 blur-3xl" />
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Security</p>
          <h1 className="text-3xl font-semibold tracking-tight">Аудит-лог</h1>
          <p className="text-sm text-muted-foreground mt-1">
            История всех действий администраторов. Всего записей: <span className="font-semibold text-foreground">{total}</span>
          </p>
        </div>
      </motion.section>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={actionFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Все действия" />
          </SelectTrigger>
          <SelectContent>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {a === "ALL" ? "Все действия" : a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          Страница {page} из {totalPages}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white dark:bg-slate-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Время</TableHead>
              <TableHead>Admin ID</TableHead>
              <TableHead>Действие</TableHead>
              <TableHead>Объект</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Детали</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  Записей не найдено
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => {
                const isExpanded = expandedId === entry.id;
                let parsedDetails: Record<string, unknown> | null = null;
                try {
                  if (entry.details) parsedDetails = JSON.parse(entry.details);
                } catch { /* not JSON */ }

                return (
                  <>
                    <TableRow
                      key={entry.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString("ru-RU", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {entry.adminId.slice(0, 8)}…
                      </TableCell>
                      <TableCell><ActionBadge action={entry.action} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {entry.targetType && (
                          <span>
                            <span className="font-medium text-foreground">{entry.targetType}</span>
                            {entry.targetId && <span className="ml-1 font-mono">{entry.targetId.slice(0, 8)}…</span>}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {entry.ip ?? "—"}
                      </TableCell>
                      <TableCell>
                        {entry.details && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && entry.details && (
                      <TableRow key={`${entry.id}-details`}>
                        <TableCell colSpan={6} className="bg-muted/30 dark:bg-slate-800/40 p-0">
                          <div className="px-6 py-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Детали:</p>
                            <pre className="text-xs text-foreground bg-background dark:bg-slate-900 rounded-lg p-3 overflow-x-auto border border-border">
                              {parsedDetails
                                ? JSON.stringify(parsedDetails, null, 2)
                                : entry.details}
                            </pre>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
