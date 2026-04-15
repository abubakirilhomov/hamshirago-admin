import { useCallback, useEffect, useState } from "react";
import {
  getAdminDoctors,
  createDoctor,
  updateDoctor,
  type AdminDoctor,
  type DoctorFormData,
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
import { toast } from "sonner";
import { Pencil, Plus, Star, Stethoscope } from "lucide-react";
import { motion } from "framer-motion";
import MapPicker from "@/components/MapPicker";

const AVATAR_COLORS = ["#0d9488","#0284c7","#7c3aed","#d97706","#dc2626","#059669","#db2777","#9333ea"];
function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const EMPTY_FORM: DoctorFormData = {
  name: "",
  nameUz: "",
  specialization: "",
  specializationUz: "",
  bio: "",
  photoUrl: "",
  pricePerConsultation: 50000,
  phone: "",
  isActive: true,
  lat: null,
  lng: null,
};

export default function Doctors() {
  const [doctors, setDoctors] = useState<AdminDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminDoctor | null>(null);
  const [form, setForm] = useState<DoctorFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminDoctors();
      setDoctors(data);
    } catch {
      toast.error("Ошибка загрузки врачей");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search.trim()
    ? doctors.filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.specialization.toLowerCase().includes(search.toLowerCase())
      )
    : doctors;

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(doc: AdminDoctor) {
    setEditTarget(doc);
    setForm({
      name: doc.name,
      nameUz: doc.nameUz,
      specialization: doc.specialization,
      specializationUz: doc.specializationUz,
      bio: doc.bio ?? "",
      photoUrl: doc.photoUrl ?? "",
      pricePerConsultation: doc.pricePerConsultation,
      phone: doc.phone ?? "",
      isActive: doc.isActive,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.specialization.trim()) {
      toast.error("Введите имя и специализацию");
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        const updated = await updateDoctor(editTarget.id, form);
        setDoctors((prev) => prev.map((d) => d.id === editTarget.id ? updated : d));
        toast.success("Врач обновлён");
      } else {
        const created = await createDoctor(form);
        setDoctors((prev) => [created, ...prev]);
        toast.success("Врач добавлен");
      }
      setDialogOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(doc: AdminDoctor) {
    setTogglingId(doc.id);
    try {
      const updated = await updateDoctor(doc.id, { isActive: !doc.isActive });
      setDoctors((prev) => prev.map((d) => d.id === doc.id ? updated : d));
      toast.success(updated.isActive ? "Врач активирован" : "Врач деактивирован");
    } catch {
      toast.error("Ошибка изменения статуса");
    } finally {
      setTogglingId(null);
    }
  }

  const activeCount = doctors.filter((d) => d.isActive).length;
  const avgRating = doctors.filter((d) => d.rating).length
    ? (doctors.reduce((s, d) => s + Number(d.rating ?? 0), 0) / doctors.filter((d) => d.rating).length).toFixed(1)
    : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/30 dark:border-slate-700/60 bg-gradient-to-br from-teal-50/80 via-white/70 to-cyan-50/80 dark:from-slate-900 dark:via-teal-950/25 dark:to-slate-900 p-6 md:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Consultations</p>
            <h1 className="text-3xl font-semibold tracking-tight">Врачи</h1>
            <p className="text-sm text-muted-foreground mt-1">Управление профилями врачей для онлайн-консультаций.</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Добавить врача
          </Button>
        </div>
      </motion.section>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-teal-50/80 to-cyan-100/70 dark:from-slate-900/90 dark:to-teal-950/30 p-4">
          <p className="text-xs text-muted-foreground">Всего врачей</p>
          <p className="text-2xl font-semibold text-teal-900 dark:text-teal-200">{doctors.length}</p>
          <Stethoscope className="h-4 w-4 text-teal-600 dark:text-teal-300 mt-2" />
        </div>
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-emerald-50/80 to-green-100/70 dark:from-slate-900/90 dark:to-emerald-950/30 p-4">
          <p className="text-xs text-muted-foreground">Активных</p>
          <p className="text-2xl font-semibold text-emerald-900 dark:text-emerald-200">{activeCount}</p>
          <Stethoscope className="h-4 w-4 text-emerald-600 dark:text-emerald-300 mt-2" />
        </div>
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-amber-50/80 to-yellow-100/70 dark:from-slate-900/90 dark:to-amber-950/30 p-4">
          <p className="text-xs text-muted-foreground">Средний рейтинг</p>
          <p className="text-2xl font-semibold text-amber-900 dark:text-amber-200">{avgRating}</p>
          <Star className="h-4 w-4 text-amber-600 dark:text-amber-300 mt-2" />
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Поиск по имени или специализации..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Table */}
      <div className="rounded-xl border bg-white dark:bg-slate-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Врач</TableHead>
              <TableHead>Специализация</TableHead>
              <TableHead>Цена</TableHead>
              <TableHead>Рейтинг</TableHead>
              <TableHead>Консультаций</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Активен</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  Врачи не найдены
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {doc.photoUrl ? (
                        <img src={doc.photoUrl} alt={doc.name} className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                          style={{ background: hashColor(doc.name) }}>
                          {doc.name.trim()[0]?.toUpperCase() ?? <Stethoscope className="h-4 w-4" />}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.nameUz}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p>{doc.specialization}</p>
                    <p className="text-xs text-muted-foreground">{doc.specializationUz}</p>
                  </TableCell>
                  <TableCell>{doc.pricePerConsultation.toLocaleString("ru-RU")} UZS</TableCell>
                  <TableCell>
                    {doc.rating != null ? (
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                        {Number(doc.rating).toFixed(1)}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>{doc.consultationCount}</TableCell>
                  <TableCell className="text-muted-foreground">{doc.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={doc.isActive}
                      disabled={togglingId === doc.id}
                      onCheckedChange={() => handleToggle(doc)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(doc)}>
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Редактировать врача" : "Добавить врача"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Имя (RU) <span className="text-rose-500">*</span></Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Алишер Каримов" />
              </div>
              <div className="space-y-2">
                <Label>Имя (UZ)</Label>
                <Input value={form.nameUz} onChange={(e) => setForm({ ...form, nameUz: e.target.value })} placeholder="Alisher Karimov" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Специализация (RU) <span className="text-rose-500">*</span></Label>
                <Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="Терапевт" />
              </div>
              <div className="space-y-2">
                <Label>Специализация (UZ)</Label>
                <Input value={form.specializationUz} onChange={(e) => setForm({ ...form, specializationUz: e.target.value })} placeholder="Terapevt" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Input value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Опыт 10 лет, кандидат медицинских наук" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Цена консультации (UZS)</Label>
                <Input type="number" min={0} value={form.pricePerConsultation} onChange={(e) => setForm({ ...form, pricePerConsultation: Math.max(0, Number(e.target.value)) })} />
              </div>
              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+998901234567" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Фото (URL)</Label>
              <Input value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} placeholder="https://..." />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <Label>Активен</Label>
            </div>
            <MapPicker
              lat={form.lat ?? null}
              lng={form.lng ?? null}
              onChange={(lat, lng) => setForm({ ...form, lat, lng })}
              label="Местоположение кабинета/клиники"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Сохранение..." : editTarget ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
