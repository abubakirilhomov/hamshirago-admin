import { useCallback, useEffect, useState } from "react";
import {
  getLeadsOverview,
  getAdminLeads,
  type LeadsOverview,
  type AdminLead,
} from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Zap, TrendingUp, Banknote, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

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

export default function SalomatLeads() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<LeadsOverview | null>(null);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [clinicSearch, setClinicSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);

  useEffect(() => {
    getLeadsOverview()
      .then(setOverview)
      .catch(() => {})
      .finally(() => setLoadingOverview(false));
  }, []);

  const loadLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const res = await getAdminLeads(page, 20, undefined, statusFilter || undefined);
      setLeads(res.data);
      setTotal(res.total);
    } catch { /* silent */ }
    setLoadingLeads(false);
  }, [page, statusFilter]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  // Client-side clinic name filter
  const filteredLeads = clinicSearch
    ? leads.filter((l) =>
        (l.clinic?.name ?? "").toLowerCase().includes(clinicSearch.toLowerCase()) ||
        l.patientName.toLowerCase().includes(clinicSearch.toLowerCase())
      )
    : leads;

  const totalPages = Math.ceil(total / 20);

  const kpiCards = [
    {
      label: "Всего лидов",
      value: overview?.totalLeads ?? 0,
      icon: <Users size={18} />,
      color: "from-blue-500 to-blue-600",
    },
    {
      label: "Конверсия",
      value: `${overview?.conversionRate ?? 0}%`,
      icon: <TrendingUp size={18} />,
      color: "from-emerald-500 to-emerald-600",
    },
    {
      label: "Пришли (VISITED)",
      value: overview?.byStatus.find((s) => s.status === "VISITED")?.count ?? 0,
      icon: <Zap size={18} />,
      color: "from-teal-500 to-teal-600",
    },
    {
      label: "Комиссия (сум)",
      value: (overview?.totalCommission ?? 0).toLocaleString(),
      icon: <Banknote size={18} />,
      color: "from-violet-500 to-violet-600",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow"
          style={{ background: "linear-gradient(135deg,#0d9488,#0f766e)" }}>
          <Zap size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Salomat AI Лиды</h1>
          <p className="text-sm text-muted-foreground">Все клиники · {total} лидов</p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border bg-card p-4 space-y-2"
          >
            {loadingOverview ? (
              <Skeleton className="h-14 w-full" />
            ) : (
              <>
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center text-white`}>
                  {card.icon}
                </div>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* Status breakdown */}
      {!loadingOverview && overview && (
        <div className="flex flex-wrap gap-2">
          {overview.byStatus.map((s) => (
            <button
              key={s.status}
              onClick={() => { setStatusFilter(statusFilter === s.status ? "" : s.status); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                statusFilter === s.status
                  ? "ring-2 ring-teal-500 ring-offset-1"
                  : ""
              } ${LEAD_STATUS_COLORS[s.status]}`}
            >
              {LEAD_STATUS_LABELS[s.status]}
              <span className="font-bold">{s.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Поиск по клинике или пациенту..."
          value={clinicSearch}
          onChange={(e) => setClinicSearch(e.target.value)}
          className="w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="">Все статусы</option>
          {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {(clinicSearch || statusFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setClinicSearch(""); setStatusFilter(""); setPage(1); }}>
            Сбросить
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Клиника</TableHead>
              <TableHead>Пациент</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Специализация</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Комиссия</TableHead>
              <TableHead>Дата</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingLeads ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Лиды не найдены
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((l) => (
                <TableRow key={l.id} className="hover:bg-muted/40">
                  <TableCell>
                    <button
                      onClick={() => navigate(`/companies/${l.clinicId}`)}
                      className="font-medium text-teal-600 hover:underline text-left"
                    >
                      {l.clinic?.name ?? "—"}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">{l.patientName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.patientPhone}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.specialization ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className={`${LEAD_STATUS_COLORS[l.status]} border-0`}>
                      {LEAD_STATUS_LABELS[l.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {l.commissionAmount != null
                      ? <span className="text-emerald-600 font-semibold text-sm">{l.commissionAmount.toLocaleString()} сум</span>
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
    </div>
  );
}
