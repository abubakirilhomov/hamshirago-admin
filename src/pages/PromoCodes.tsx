import { useCallback, useEffect, useState } from "react";
import {
  getPromoCodes,
  createPromoCode,
  deactivatePromoCode,
  type AdminPromoCode,
  type CreatePromoCodeDto,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Tag, XCircle } from "lucide-react";
import { motion } from "framer-motion";

const fmt = (n: number) => n.toLocaleString("ru-RU");

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Активен</Badge>
  ) : (
    <Badge variant="secondary" className="text-muted-foreground">Деактивирован</Badge>
  );
}

const EMPTY_FORM: CreatePromoCodeDto = {
  code: "",
  discountAmount: undefined,
  discountPercent: undefined,
  maxUses: undefined,
  expiresAt: "",
};

export default function PromoCodes() {
  const [codes, setCodes] = useState<AdminPromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE">("ACTIVE");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreatePromoCodeDto>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPromoCodes();
      setCodes(data);
    } catch {
      toast.error("Ошибка загрузки промо-кодов");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "ACTIVE" ? codes.filter((c) => c.isActive) : codes;

  async function handleCreate() {
    if (!form.code.trim()) { toast.error("Введите код"); return; }
    if (!form.discountAmount && !form.discountPercent) {
      toast.error("Укажите скидку (сумму или процент)"); return;
    }
    setSaving(true);
    try {
      const dto: CreatePromoCodeDto = {
        code: form.code.trim().toUpperCase(),
        ...(form.discountAmount ? { discountAmount: Number(form.discountAmount) } : {}),
        ...(form.discountPercent ? { discountPercent: Number(form.discountPercent) } : {}),
        ...(form.maxUses ? { maxUses: Number(form.maxUses) } : {}),
        ...(form.expiresAt ? { expiresAt: form.expiresAt } : {}),
      };
      const created = await createPromoCode(dto);
      setCodes((prev) => [created, ...prev]);
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      toast.success("Промо-код создан");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка создания");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: string) {
    setDeactivatingId(id);
    try {
      const updated = await deactivatePromoCode(id);
      setCodes((prev) => prev.map((c) => c.id === id ? updated : c));
      toast.success("Промо-код деактивирован");
    } catch {
      toast.error("Ошибка деактивации");
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/30 dark:border-slate-700/60 bg-gradient-to-br from-violet-50/80 via-white/70 to-purple-50/80 dark:from-slate-900 dark:via-violet-950/25 dark:to-slate-900 p-6 md:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Marketing</p>
            <h1 className="text-3xl font-semibold tracking-tight">Промо-коды</h1>
            <p className="text-sm text-muted-foreground mt-1">Управление скидочными кодами для клиентов.</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Создать код
          </Button>
        </div>
      </motion.section>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-violet-50/80 to-purple-100/70 dark:from-slate-900/90 dark:to-violet-950/30 p-4">
          <p className="text-xs text-muted-foreground">Всего кодов</p>
          <p className="text-2xl font-semibold text-violet-900 dark:text-violet-200">{codes.length}</p>
          <Tag className="h-4 w-4 text-violet-600 dark:text-violet-300 mt-2" />
        </div>
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-emerald-50/80 to-teal-100/70 dark:from-slate-900/90 dark:to-emerald-950/30 p-4">
          <p className="text-xs text-muted-foreground">Активных</p>
          <p className="text-2xl font-semibold text-emerald-900 dark:text-emerald-200">{codes.filter((c) => c.isActive).length}</p>
          <Tag className="h-4 w-4 text-emerald-600 dark:text-emerald-300 mt-2" />
        </div>
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-blue-50/80 to-indigo-100/70 dark:from-slate-900/90 dark:to-blue-950/30 p-4">
          <p className="text-xs text-muted-foreground">Использований (всего)</p>
          <p className="text-2xl font-semibold text-blue-900 dark:text-blue-200">{codes.reduce((s, c) => s + c.usedCount, 0)}</p>
          <Tag className="h-4 w-4 text-blue-600 dark:text-blue-300 mt-2" />
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["ACTIVE", "ALL"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary text-white"
                : "border border-input bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "ACTIVE" ? "Активные" : "Все"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white dark:bg-slate-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Код</TableHead>
              <TableHead>Скидка</TableHead>
              <TableHead>Использований</TableHead>
              <TableHead>Истекает</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  Промо-коды не найдены
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                  <TableCell>
                    {c.discountAmount != null
                      ? `${fmt(c.discountAmount)} UZS`
                      : c.discountPercent != null
                      ? `${c.discountPercent}%`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {c.usedCount}
                    {c.maxUses != null && <span className="text-muted-foreground"> / {c.maxUses}</span>}
                  </TableCell>
                  <TableCell>
                    {c.expiresAt
                      ? new Date(c.expiresAt).toLocaleDateString("ru-RU")
                      : <span className="text-muted-foreground">Бессрочно</span>}
                  </TableCell>
                  <TableCell><StatusBadge isActive={c.isActive} /></TableCell>
                  <TableCell>
                    {c.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                        disabled={deactivatingId === c.id}
                        onClick={() => handleDeactivate(c.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        {deactivatingId === c.id ? "..." : "Деактивировать"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Создать промо-код</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Код <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="WELCOME50"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Скидка (UZS)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="50000"
                  value={form.discountAmount ?? ""}
                  onChange={(e) => setForm({ ...form, discountAmount: e.target.value ? Number(e.target.value) : undefined, discountPercent: undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label>Скидка (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="10"
                  value={form.discountPercent ?? ""}
                  onChange={(e) => setForm({ ...form, discountPercent: e.target.value ? Number(e.target.value) : undefined, discountAmount: undefined })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Макс. использований</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="100"
                  value={form.maxUses ?? ""}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label>Истекает</Label>
                <Input
                  type="date"
                  value={form.expiresAt ?? ""}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Укажите либо сумму, либо процент скидки.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
