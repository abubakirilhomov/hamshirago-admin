import { useCallback, useEffect, useState } from "react";
import {
  getCompanies,
  createCompany,
  verifyCompany,
  blockCompany,
  type Company,
  type CreateCompanyDto,
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
import { Building2, Plus, CheckCircle, XCircle, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import MapPicker from "@/components/MapPicker";

const EMPTY_FORM: CreateCompanyDto = {
  name: "",
  legalName: "",
  phone: "",
  address: "",
  city: "",
  licenseNumber: "",
  licenseExpiry: "",
  ceoName: "",
  ceoPhone: "",
  ceoPassword: "",
  lat: null,
  lng: null,
};

export default function Companies() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [cityFilter, setCityFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState<"" | "true" | "false">("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateCompanyDto>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCompanies(
        page,
        20,
        cityFilter || undefined,
        verifiedFilter !== "" ? verifiedFilter === "true" : undefined,
      );
      setCompanies(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Ошибка загрузки клиник");
    }
    setLoading(false);
  }, [page, cityFilter, verifiedFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!form.name || !form.phone || !form.ceoName || !form.ceoPhone || !form.ceoPassword) {
      toast.error("Заполните обязательные поля");
      return;
    }
    setSaving(true);
    try {
      await createCompany(form);
      toast.success("Клиника создана");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    }
    setSaving(false);
  }

  async function handleVerify(id: string, isVerified: boolean) {
    try {
      await verifyCompany(id, isVerified);
      toast.success(isVerified ? "Клиника подтверждена" : "Верификация снята");
      load();
    } catch {
      toast.error("Ошибка");
    }
  }

  async function handleBlock(id: string, isActive: boolean) {
    try {
      await blockCompany(id, isActive);
      toast.success(isActive ? "Клиника разблокирована" : "Клиника заблокирована");
      load();
    } catch {
      toast.error("Ошибка");
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow"
            style={{ background: "linear-gradient(135deg,#0d9488,#0f766e)" }}>
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Клиники</h1>
            <p className="text-sm text-muted-foreground">Всего: {total}</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
          <Plus size={16} /> Создать клинику
        </Button>
      </motion.div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Фильтр по городу..."
          value={cityFilter}
          onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
          className="w-52"
        />
        <select
          value={verifiedFilter}
          onChange={(e) => { setVerifiedFilter(e.target.value as "" | "true" | "false"); setPage(1); }}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="">Все статусы</option>
          <option value="true">Подтверждённые</option>
          <option value="false">Не подтверждённые</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Город</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Лицензия</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Врачей</TableHead>
              <TableHead>Лидов</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  Клиники не найдены
                </TableCell>
              </TableRow>
            ) : (
              companies.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/40">
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.city ?? "—"}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.licenseNumber ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {c.isVerified ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0">Подтверждена</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">Ожидает</Badge>
                      )}
                      {!c.isActive && (
                        <Badge variant="destructive">Заблокирована</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{c._count?.staff ?? 0}</TableCell>
                  <TableCell>{c._count?.salomatLeads ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => navigate(`/companies/${c.id}`)}
                        title="Детали"
                      >
                        <Eye size={15} />
                      </Button>
                      {!c.isVerified ? (
                        <Button
                          size="sm" variant="ghost"
                          className="text-emerald-600 hover:text-emerald-700"
                          onClick={() => handleVerify(c.id, true)}
                          title="Подтвердить"
                        >
                          <CheckCircle size={15} />
                        </Button>
                      ) : (
                        <Button
                          size="sm" variant="ghost"
                          className="text-amber-500 hover:text-amber-600"
                          onClick={() => handleVerify(c.id, false)}
                          title="Снять верификацию"
                        >
                          <CheckCircle size={15} />
                        </Button>
                      )}
                      <Button
                        size="sm" variant="ghost"
                        className={c.isActive ? "text-red-500 hover:text-red-600" : "text-teal-600 hover:text-teal-700"}
                        onClick={() => handleBlock(c.id, !c.isActive)}
                        title={c.isActive ? "Заблокировать" : "Разблокировать"}
                      >
                        <XCircle size={15} />
                      </Button>
                    </div>
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
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Назад
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Вперёд
          </Button>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Создать клинику</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Клиника</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Название *</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="МедЦентр Шифо" />
              </div>
              <div className="space-y-1">
                <Label>Юридическое название</Label>
                <Input value={form.legalName} onChange={(e) => setForm(f => ({ ...f, legalName: e.target.value }))} placeholder="ООО МедЦентр" />
              </div>
              <div className="space-y-1">
                <Label>Телефон клиники *</Label>
                <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+998901234567" />
              </div>
              <div className="space-y-1">
                <Label>Город</Label>
                <Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Ташкент" />
              </div>
              <div className="space-y-1">
                <Label>Адрес</Label>
                <Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} placeholder="ул. Навои, 5" />
              </div>
              <div className="space-y-1">
                <Label>Номер лицензии</Label>
                <Input value={form.licenseNumber} onChange={(e) => setForm(f => ({ ...f, licenseNumber: e.target.value }))} placeholder="МЛ-2024-001" />
              </div>
              <div className="space-y-1">
                <Label>Срок лицензии</Label>
                <Input type="date" value={form.licenseExpiry} onChange={(e) => setForm(f => ({ ...f, licenseExpiry: e.target.value }))} />
              </div>
            </div>

            <div className="border-t pt-4">
              <MapPicker
                lat={form.lat ?? null}
                lng={form.lng ?? null}
                onChange={(lat, lng) => setForm(f => ({ ...f, lat, lng }))}
                label="Местоположение клиники"
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">CEO аккаунт</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Имя CEO *</Label>
                  <Input value={form.ceoName} onChange={(e) => setForm(f => ({ ...f, ceoName: e.target.value }))} placeholder="Алишер Каримов" />
                </div>
                <div className="space-y-1">
                  <Label>Телефон CEO *</Label>
                  <Input value={form.ceoPhone} onChange={(e) => setForm(f => ({ ...f, ceoPhone: e.target.value }))} placeholder="+998901234567" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Пароль CEO *</Label>
                  <Input type="password" value={form.ceoPassword} onChange={(e) => setForm(f => ({ ...f, ceoPassword: e.target.value }))} placeholder="Минимум 6 символов" />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
