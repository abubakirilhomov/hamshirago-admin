import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getCompany,
  getCompanyStaff,
  getCompanyMonthlyStats,
  getAdminLeads,
  type Company,
  type CompanyStaffMember,
  type AdminLead,
} from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building2,
  Users,
  BarChart2,
  Zap,
  Phone,
  MapPin,
  FileText,
  Calendar,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Tab = "overview" | "staff" | "leads" | "stats";

const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "Новый",
  CONTACTED: "Связались",
  BOOKED: "Записан",
  VISITED: "Пришёл",
  MISSED: "Не пришёл",
};

const LEAD_STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-yellow-100 text-yellow-700",
  BOOKED: "bg-purple-100 text-purple-700",
  VISITED: "bg-emerald-100 text-emerald-700",
  MISSED: "bg-red-100 text-red-700",
};

const ROLE_LABELS: Record<string, string> = {
  CEO: "CEO",
  RECEPTION: "Ресепшн",
  DOCTOR: "Врач",
};

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");

  const [company, setCompany] = useState<Company | null>(null);
  const [staff, setStaff] = useState<CompanyStaffMember[]>([]);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsStatus, setLeadsStatus] = useState("");
  const [monthly, setMonthly] = useState<Array<{ month: string; patientCount: number }>>([]);

  const [loadingCompany, setLoadingCompany] = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);

  // Load company info once
  useEffect(() => {
    if (!id) return;
    getCompany(id)
      .then(setCompany)
      .catch(() => {})
      .finally(() => setLoadingCompany(false));
  }, [id]);

  // Load tab data on tab change
  const loadTab = useCallback(async () => {
    if (!id) return;
    setLoadingTab(true);
    try {
      if (tab === "staff") {
        const data = await getCompanyStaff(id);
        setStaff(data);
      } else if (tab === "leads") {
        const res = await getAdminLeads(leadsPage, 20, id, leadsStatus || undefined);
        setLeads(res.data);
        setLeadsTotal(res.total);
      } else if (tab === "stats") {
        const data = await getCompanyMonthlyStats(id);
        setMonthly(data);
      }
    } catch { /* silent */ }
    setLoadingTab(false);
  }, [id, tab, leadsPage, leadsStatus]);

  useEffect(() => { loadTab(); }, [loadTab]);

  const leadsTotalPages = Math.ceil(leadsTotal / 20);

  if (loadingCompany) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Клиника не найдена
        <Button variant="link" onClick={() => navigate("/companies")}>Назад</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/companies")}
          className="gap-2 text-muted-foreground">
          <ArrowLeft size={16} /> Клиники
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow"
            style={{ background: "linear-gradient(135deg,#0d9488,#0f766e)" }}>
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{company.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {company.isVerified ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Подтверждена</Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">Ожидает верификации</Badge>
              )}
              {!company.isActive && (
                <Badge variant="destructive" className="text-xs">Заблокирована</Badge>
              )}
              {company.pilotEnded && (
                <Badge className="bg-violet-100 text-violet-700 border-0 text-xs">Пилот завершён</Badge>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["overview", "staff", "leads", "stats"] as Tab[]).map((t) => {
          const labels: Record<Tab, string> = {
            overview: "Обзор",
            staff: "Сотрудники",
            leads: "Лиды",
            stats: "Статистика",
          };
          const icons: Record<Tab, React.ReactNode> = {
            overview: <Building2 size={14} />,
            staff: <Users size={14} />,
            leads: <Zap size={14} />,
            stats: <BarChart2 size={14} />,
          };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {icons[t]} {labels[t]}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {loadingTab ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Основная информация</p>
                <InfoRow icon={<Building2 size={15} />} label="Название" value={company.name} />
                {company.legalName && <InfoRow icon={<FileText size={15} />} label="Юр. название" value={company.legalName} />}
                <InfoRow icon={<Phone size={15} />} label="Телефон" value={company.phone} />
                {company.city && <InfoRow icon={<MapPin size={15} />} label="Город" value={company.city} />}
                {company.address && <InfoRow icon={<MapPin size={15} />} label="Адрес" value={company.address} />}
              </div>
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Лицензия</p>
                <InfoRow icon={<FileText size={15} />} label="Номер" value={company.licenseNumber ?? "—"} />
                <InfoRow
                  icon={<Calendar size={15} />}
                  label="Срок действия"
                  value={company.licenseExpiry
                    ? new Date(company.licenseExpiry).toLocaleDateString("ru-RU")
                    : "—"}
                />
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Статусы</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={company.isVerified ? "bg-emerald-100 text-emerald-700 border-0" : "bg-amber-100 text-amber-700 border-0"}>
                      {company.isVerified ? "Верифицирована" : "Не верифицирована"}
                    </Badge>
                    <Badge className={company.isActive ? "bg-blue-100 text-blue-700 border-0" : "bg-red-100 text-red-700 border-0"}>
                      {company.isActive ? "Активна" : "Заблокирована"}
                    </Badge>
                    <Badge className={company.pilotEnded ? "bg-violet-100 text-violet-700 border-0" : "bg-slate-100 text-slate-600 border-0"}>
                      {company.pilotEnded ? "Пилот завершён" : "Пилот активен"}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Создана: {new Date(company.createdAt).toLocaleDateString("ru-RU")}
                </p>
              </div>
            </div>
          )}

          {/* ── STAFF ── */}
          {tab === "staff" && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Добавлен</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        Сотрудники не найдены
                      </TableCell>
                    </TableRow>
                  ) : (
                    staff.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.phone}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ROLE_LABELS[s.role] ?? s.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {s.isActive
                            ? <Badge className="bg-emerald-100 text-emerald-700 border-0">Активен</Badge>
                            : <Badge variant="destructive">Неактивен</Badge>
                          }
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(s.createdAt).toLocaleDateString("ru-RU")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* ── LEADS ── */}
          {tab === "leads" && (
            <div className="space-y-4">
              {/* KPI row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(["NEW", "BOOKED", "VISITED", "MISSED"] as const).map((s) => {
                  const count = leads.filter((l) => l.status === s).length;
                  return (
                    <div key={s} className={`rounded-xl p-4 ${LEAD_STATUS_COLORS[s].replace("text-", "border-").replace("bg-", "bg-")}`}>
                      <p className="text-xs font-semibold text-muted-foreground">{LEAD_STATUS_LABELS[s]}</p>
                      <p className="text-2xl font-bold mt-1">{count}</p>
                    </div>
                  );
                })}
              </div>

              {/* Filter */}
              <select
                value={leadsStatus}
                onChange={(e) => { setLeadsStatus(e.target.value); setLeadsPage(1); }}
                className="border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="">Все статусы</option>
                {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              <div className="rounded-xl border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Пациент</TableHead>
                      <TableHead>Телефон</TableHead>
                      <TableHead>Специализация</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Комиссия</TableHead>
                      <TableHead>Дата</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          Лиды не найдены
                        </TableCell>
                      </TableRow>
                    ) : (
                      leads.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="font-medium">{l.patientName}</TableCell>
                          <TableCell>{l.patientPhone}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{l.specialization ?? "—"}</TableCell>
                          <TableCell>
                            <Badge className={`${LEAD_STATUS_COLORS[l.status]} border-0`}>
                              {LEAD_STATUS_LABELS[l.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {l.commissionAmount != null
                              ? <span className="text-emerald-600 font-semibold">{l.commissionAmount.toLocaleString()} сум</span>
                              : <span className="text-muted-foreground">—</span>
                            }
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(l.createdAt).toLocaleDateString("ru-RU")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {leadsTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={leadsPage === 1}
                    onClick={() => setLeadsPage(p => p - 1)}>Назад</Button>
                  <span className="text-sm text-muted-foreground">{leadsPage} / {leadsTotalPages}</span>
                  <Button variant="outline" size="sm" disabled={leadsPage >= leadsTotalPages}
                    onClick={() => setLeadsPage(p => p + 1)}>Вперёд</Button>
                </div>
              )}
            </div>
          )}

          {/* ── STATS ── */}
          {tab === "stats" && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-5">
                <p className="text-sm font-semibold text-foreground mb-4">Пациентов за 12 месяцев</p>
                {monthly.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground text-sm">Нет данных</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickFormatter={(v: string) => {
                          const [y, m] = v.split("-");
                          return `${m}/${y.slice(2)}`;
                        }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <Tooltip
                        formatter={(value: number) => [`${value} пациентов`, ""]}
                        labelFormatter={(label: string) => {
                          const [y, m] = label.split("-");
                          const months = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
                          return `${months[parseInt(m) - 1]} ${y}`;
                        }}
                      />
                      <Bar dataKey="patientCount" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}
