import { useCallback, useEffect, useState } from "react";
import {
  getAdminTiers,
  createTier,
  updateTier,
  getSubscriptionStats,
  type AdminSubscriptionTier,
  type SubscriptionTierFormData,
  type SubscriptionStats,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import { CreditCard, Pencil, Plus } from "lucide-react";
import { motion } from "framer-motion";

const fmt = (n: number) => n.toLocaleString("ru-RU");

const EMPTY_FORM: SubscriptionTierFormData = {
  name: "",
  nameUz: "",
  description: "",
  price: 0,
  billingDays: 30,
  maxOrders: 5,
  discountPercent: 10,
  isActive: true,
  sortOrder: 1,
};

export default function SubscriptionTiers() {
  const [tiers, setTiers] = useState<AdminSubscriptionTier[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminSubscriptionTier | null>(null);
  const [form, setForm] = useState<SubscriptionTierFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tiersData, statsData] = await Promise.all([
        getAdminTiers(),
        getSubscriptionStats().catch(() => null),
      ]);
      setTiers(tiersData);
      if (statsData) setStats(statsData);
    } catch {
      toast.error("Ошибка загрузки тарифов");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(tier: AdminSubscriptionTier) {
    setEditTarget(tier);
    setForm({
      name: tier.name,
      nameUz: tier.nameUz,
      description: tier.description,
      price: tier.price,
      billingDays: tier.billingDays,
      maxOrders: tier.maxOrders,
      discountPercent: tier.discountPercent,
      isActive: tier.isActive,
      sortOrder: tier.sortOrder,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Введите название"); return; }
    setSaving(true);
    try {
      if (editTarget) {
        const updated = await updateTier(editTarget.id, form);
        setTiers((prev) => prev.map((t) => t.id === editTarget.id ? updated : t));
        toast.success("Тариф обновлён");
      } else {
        const created = await createTier(form);
        setTiers((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
        toast.success("Тариф создан");
      }
      setDialogOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(tier: AdminSubscriptionTier) {
    setTogglingId(tier.id);
    try {
      const updated = await updateTier(tier.id, { isActive: !tier.isActive });
      setTiers((prev) => prev.map((t) => t.id === tier.id ? updated : t));
      toast.success(updated.isActive ? "Тариф активирован" : "Тариф деактивирован");
    } catch {
      toast.error("Ошибка изменения статуса");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/30 dark:border-slate-700/60 bg-gradient-to-br from-blue-50/80 via-white/70 to-indigo-50/80 dark:from-slate-900 dark:via-blue-950/25 dark:to-slate-900 p-6 md:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-300/20 blur-3xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Subscriptions</p>
            <h1 className="text-3xl font-semibold tracking-tight">Тарифы подписок</h1>
            <p className="text-sm text-muted-foreground mt-1">Управление семейными пакетами и подписками.</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Создать тариф
          </Button>
        </div>
      </motion.section>

      {/* Stats */}
      {stats && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Активных подписок", value: stats.active, color: "emerald" },
            { label: "Истекших", value: stats.expired, color: "amber" },
            { label: "Отменённых", value: stats.canceled, color: "rose" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-${color}-50/80 to-${color}-100/70 dark:from-slate-900/90 dark:to-${color}-950/30 p-4`}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-semibold text-${color}-900 dark:text-${color}-200`}>{value}</p>
              <CreditCard className={`h-4 w-4 text-${color}-600 dark:text-${color}-300 mt-2`} />
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-white dark:bg-slate-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Цена</TableHead>
              <TableHead>Период</TableHead>
              <TableHead>Макс. заказов</TableHead>
              <TableHead>Скидка</TableHead>
              <TableHead>Порядок</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : tiers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  Тарифы не найдены
                </TableCell>
              </TableRow>
            ) : (
              tiers.map((tier) => (
                <TableRow key={tier.id}>
                  <TableCell>
                    <p className="font-semibold">{tier.name}</p>
                    <p className="text-xs text-muted-foreground">{tier.nameUz}</p>
                  </TableCell>
                  <TableCell>{fmt(tier.price)} UZS</TableCell>
                  <TableCell>{tier.billingDays} дн.</TableCell>
                  <TableCell>{tier.maxOrders}</TableCell>
                  <TableCell>{tier.discountPercent}%</TableCell>
                  <TableCell>{tier.sortOrder}</TableCell>
                  <TableCell>
                    <Switch
                      checked={tier.isActive}
                      disabled={togglingId === tier.id}
                      onCheckedChange={() => handleToggle(tier)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(tier)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Редактировать тариф" : "Создать тариф"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Название (RU) <span className="text-rose-500">*</span></Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Базовый" />
              </div>
              <div className="space-y-2">
                <Label>Название (UZ)</Label>
                <Input value={form.nameUz} onChange={(e) => setForm({ ...form, nameUz: e.target.value })} placeholder="Asosiy" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="5 визитов со скидкой 10%" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Цена (UZS)</Label>
                <Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Math.max(0, Number(e.target.value)) })} />
              </div>
              <div className="space-y-2">
                <Label>Период (дней)</Label>
                <Input type="number" min={1} value={form.billingDays} onChange={(e) => setForm({ ...form, billingDays: Math.max(1, Number(e.target.value)) })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Макс. заказов</Label>
                <Input type="number" min={1} value={form.maxOrders} onChange={(e) => setForm({ ...form, maxOrders: Math.max(1, Number(e.target.value)) })} />
              </div>
              <div className="space-y-2">
                <Label>Скидка (%)</Label>
                <Input type="number" min={0} max={100} value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: Math.min(100, Math.max(0, Number(e.target.value))) })} />
              </div>
              <div className="space-y-2">
                <Label>Порядок</Label>
                <Input type="number" min={1} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Math.max(1, Number(e.target.value)) })} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <Label>Активен</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Сохранение..." : editTarget ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
