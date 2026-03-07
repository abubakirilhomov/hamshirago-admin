import { useEffect, useMemo, useState } from "react";
import { getServices, createService, updateService, deleteService, type AdminService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList, Eye, Filter, Layers3, Pencil, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const emptyForm = {
  title: "",
  description: "",
  category: "",
  price: 0,
  durationMinutes: 15,
  sortOrder: 0,
};

const Services = () => {
  const { t } = useTranslation();
  const [services, setServices] = useState<AdminService[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  const load = async () => {
    try {
      const data = await getServices();
      setServices(data);
    } catch {
      toast.error(t("services.toastLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (s: AdminService) => {
    setEditingId(s.id);
    setForm({
      title: s.title,
      description: s.description || "",
      category: s.category || "",
      price: s.price,
      durationMinutes: s.durationMinutes,
      sortOrder: s.sortOrder || 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateService(editingId, form);
        toast.success(t("services.toastUpdated"));
      } else {
        await createService(form);
        toast.success(t("services.toastCreated"));
      }
      setDialogOpen(false);
      load();
    } catch {
      toast.error(t("services.toastError"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("services.confirmDelete"))) return;
    try {
      await deleteService(id);
      toast.success(t("services.toastDeleted"));
      load();
    } catch {
      toast.error(t("services.toastDeleteError"));
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateService(id, { isActive });
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, isActive } : s)));
    } catch {
      toast.error(t("services.toastToggleError"));
    }
  };

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => {
      return (
        String(s.title ?? "").toLowerCase().includes(q) ||
        String(s.category ?? "").toLowerCase().includes(q) ||
        String(s.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [search, services]);

  const activeCount = services.filter((s) => s.isActive).length;
  const totalPrice = services.reduce((sum, s) => sum + Number(s.price || 0), 0);

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-gradient-to-br from-violet-300/20 to-fuchsia-300/10 dark:from-violet-700/20 dark:to-fuchsia-700/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-80 h-72 w-72 rounded-full bg-gradient-to-br from-cyan-300/20 to-blue-300/10 dark:from-cyan-700/20 dark:to-blue-700/10 blur-3xl" />

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/30 dark:border-slate-700/60 bg-gradient-to-br from-violet-50/80 via-white/70 to-cyan-50/80 dark:from-slate-900 dark:via-violet-950/25 dark:to-slate-900 p-6 md:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-20 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground dark:text-slate-300">Service Catalog</p>
            <h1 className="text-3xl font-semibold tracking-tight">{t("services.catalog")}</h1>
            <p className="text-sm text-muted-foreground dark:text-slate-300 mt-1">
              {t("services.subtitle")}
            </p>
          </div>
          <Button onClick={openCreate} className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white border-0">
            <Plus className="h-4 w-4 mr-1" /> {t("services.add")}
          </Button>
        </div>
      </motion.section>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-blue-50/80 to-indigo-100/70 dark:from-slate-900/90 dark:to-blue-950/30 p-4 backdrop-blur-md">
          <p className="text-xs text-muted-foreground dark:text-slate-300">{t("services.totalServices")}</p>
          <p className="text-2xl font-semibold text-blue-900 dark:text-blue-200">{services.length}</p>
          <ClipboardList className="h-4 w-4 text-blue-700 dark:text-blue-300 mt-2" />
        </div>
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-emerald-50/80 to-teal-100/70 dark:from-slate-900/90 dark:to-emerald-950/30 p-4 backdrop-blur-md">
          <p className="text-xs text-muted-foreground dark:text-slate-300">{t("services.activeServices")}</p>
          <p className="text-2xl font-semibold text-emerald-900 dark:text-emerald-200">{activeCount}</p>
          <Eye className="h-4 w-4 text-emerald-700 dark:text-emerald-300 mt-2" />
        </div>
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-violet-50/80 to-fuchsia-100/70 dark:from-slate-900/90 dark:to-violet-950/30 p-4 backdrop-blur-md">
          <p className="text-xs text-muted-foreground dark:text-slate-300">{t("services.categories")}</p>
          <p className="text-2xl font-semibold text-violet-900 dark:text-violet-200">{new Set(services.map((s) => s.category || t("services.noCategory"))).size}</p>
          <Layers3 className="h-4 w-4 text-violet-700 dark:text-violet-300 mt-2" />
        </div>
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-cyan-50/80 to-sky-100/70 dark:from-slate-900/90 dark:to-cyan-950/30 p-4 backdrop-blur-md">
          <p className="text-xs text-muted-foreground dark:text-slate-300">{t("services.totalPrice")}</p>
          <p className="text-2xl font-semibold text-cyan-900 dark:text-cyan-200">{totalPrice.toLocaleString("ru-RU")} UZS</p>
          <Filter className="h-4 w-4 text-cyan-700 dark:text-cyan-300 mt-2" />
        </div>
      </div>

      <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("services.searchPlaceholder")}
            className="sm:max-w-sm bg-white/80 dark:bg-slate-900/80"
          />
          <span className="status-badge status-created sm:ml-auto">{t("services.shown")}: {filteredServices.length}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md overflow-hidden">
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-white/85 dark:bg-slate-900/85 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-slate-900/70">
            <TableRow>
              <TableHead>{t("services.colTitle")}</TableHead>
              <TableHead>{t("services.colCategory")}</TableHead>
              <TableHead>{t("services.colPrice")}</TableHead>
              <TableHead>{t("services.colDuration")}</TableHead>
              <TableHead>{t("services.colOrder")}</TableHead>
              <TableHead>{t("services.colActive")}</TableHead>
              <TableHead>{t("services.colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredServices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {t("services.noServices")}
                </TableCell>
              </TableRow>
            ) : (
              filteredServices.map((s) => (
                <TableRow key={s.id} className="hover:bg-white/70 dark:hover:bg-slate-900/60">
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell className="text-sm">{s.category}</TableCell>
                  <TableCell>{Number(s.price).toLocaleString("ru-RU")} UZS</TableCell>
                  <TableCell>{s.durationMinutes} {t("services.minutes")}</TableCell>
                  <TableCell>{s.sortOrder}</TableCell>
                  <TableCell>
                    <Switch
                      checked={s.isActive}
                      onCheckedChange={(v) => handleToggleActive(s.id, v)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white border-0"
                        onClick={() => handleDelete(s.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-white/40 dark:border-slate-700/60 bg-white/85 dark:bg-slate-900/90 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle>{editingId ? t("services.editDialog") : t("services.newDialog")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("services.labelTitle")}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{t("services.labelDesc")}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("services.labelCategory")}</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("services.labelPrice")}</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("services.labelDuration")}</Label>
                <Input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>{t("services.labelSortOrder")}</Label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
              </div>
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white border-0">
              {editingId ? t("services.save") : t("services.create")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Services;
