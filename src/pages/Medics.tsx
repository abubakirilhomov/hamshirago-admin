import { useEffect, useMemo, useState } from "react";
import { getAllMedics, blockMedic, topupMedic, type AdminMedic } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { ShieldAlert, Star, Users, UserCheck, Wifi, Wallet, Map, List } from "lucide-react";

const AVATAR_COLORS = ["#0d9488","#0284c7","#7c3aed","#d97706","#dc2626","#059669","#db2777","#9333ea"];
function hashColor(name: string | null): string {
  if (!name) return "#6b7280";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function nameInitial(name: string | null, phone: string): string {
  if (name?.trim()) return name.trim()[0].toUpperCase();
  return phone.slice(-1);
}
import { motion } from "framer-motion";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";

// Fix default leaflet icon issue with bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const Medics = () => {
  const [medics, setMedics] = useState<AdminMedic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlineFilter, setOnlineFilter] = useState<"ALL" | "ONLINE" | "OFFLINE">("ALL");
  const [topupTarget, setTopupTarget] = useState<AdminMedic | null>(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);
  const [tab, setTab] = useState<"table" | "map">("table");

  useEffect(() => {
    async function load() {
      try {
        const first = await getAllMedics(1, 100);
        const allData = [...first.data];
        if (first.totalPages > 1) {
          const rest = await Promise.all(
            Array.from({ length: first.totalPages - 1 }, (_, i) => getAllMedics(i + 2, 100))
          );
          rest.forEach((r) => allData.push(...r.data));
        }
        setMedics(allData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleBlock = async (id: string, isBlocked: boolean) => {
    try {
      await blockMedic(id, isBlocked);
      setMedics((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isBlocked } : m))
      );
      toast.success(isBlocked ? "Медик заблокирован" : "Медик разблокирован");
    } catch (e) {
      toast.error("Ошибка");
    }
  };

  const handleTopup = async () => {
    if (!topupTarget) return;
    const amount = Number(topupAmount);
    if (!topupAmount || isNaN(amount) || amount <= 0) {
      toast.error("Введите корректную сумму");
      return;
    }
    setTopupLoading(true);
    try {
      await topupMedic(topupTarget.id, amount);
      setMedics((prev) =>
        prev.map((m) =>
          m.id === topupTarget.id
            ? { ...m, balance: Number(m.balance) + amount }
            : m
        )
      );
      toast.success(`Баланс пополнен на ${amount.toLocaleString("ru-RU")} UZS`);
      setTopupTarget(null);
      setTopupAmount("");
    } catch {
      toast.error("Ошибка пополнения баланса");
    } finally {
      setTopupLoading(false);
    }
  };

  const filteredMedics = useMemo(() => {
    const q = search.trim().toLowerCase();
    return medics.filter((m) => {
      const bySearch =
        !q ||
        String(m.name ?? "").toLowerCase().includes(q) ||
        String(m.phone ?? "").toLowerCase().includes(q);
      const byOnline =
        onlineFilter === "ALL" ||
        (onlineFilter === "ONLINE" && m.isOnline) ||
        (onlineFilter === "OFFLINE" && !m.isOnline);
      return bySearch && byOnline;
    });
  }, [medics, onlineFilter, search]);

  const onlineCount = medics.filter((m) => m.isOnline).length;
  const blockedCount = medics.filter((m) => m.isBlocked).length;
  const approvedCount = medics.filter((m) => m.verificationStatus === "APPROVED").length;

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-300/20 to-cyan-300/10 dark:from-indigo-700/20 dark:to-cyan-700/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-80 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-300/20 to-blue-300/10 dark:from-emerald-700/20 dark:to-blue-700/10 blur-3xl" />

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/30 dark:border-slate-700/60 bg-gradient-to-br from-indigo-50/80 via-white/70 to-cyan-50/80 dark:from-slate-900 dark:via-indigo-950/25 dark:to-slate-900 p-6 md:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-20 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground dark:text-slate-300">Medic Operations</p>
          <h1 className="text-3xl font-semibold tracking-tight">Все медики</h1>
          <p className="text-sm text-muted-foreground dark:text-slate-300 mt-1">
            Центр управления профилями медиков, статусами верификации и доступностью в реальном времени.
          </p>
        </div>
      </motion.section>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-blue-50/80 to-indigo-100/70 dark:from-slate-900/90 dark:to-blue-950/30 p-4 backdrop-blur-md">
          <p className="text-xs text-muted-foreground dark:text-slate-300">Всего в списке</p>
          <p className="text-2xl font-semibold text-blue-900 dark:text-blue-200">{medics.length}</p>
          <Users className="h-4 w-4 text-blue-700 dark:text-blue-300 mt-2" />
        </div>
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-emerald-50/80 to-teal-100/70 dark:from-slate-900/90 dark:to-emerald-950/30 p-4 backdrop-blur-md">
          <p className="text-xs text-muted-foreground dark:text-slate-300">Онлайн</p>
          <p className="text-2xl font-semibold text-emerald-900 dark:text-emerald-200">{onlineCount}</p>
          <Wifi className="h-4 w-4 text-emerald-700 dark:text-emerald-300 mt-2" />
        </div>
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-cyan-50/80 to-sky-100/70 dark:from-slate-900/90 dark:to-cyan-950/30 p-4 backdrop-blur-md">
          <p className="text-xs text-muted-foreground dark:text-slate-300">APPROVED</p>
          <p className="text-2xl font-semibold text-cyan-900 dark:text-cyan-200">{approvedCount}</p>
          <UserCheck className="h-4 w-4 text-cyan-700 dark:text-cyan-300 mt-2" />
        </div>
        <div className="rounded-xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-rose-50/80 to-orange-100/70 dark:from-slate-900/90 dark:to-rose-950/30 p-4 backdrop-blur-md">
          <p className="text-xs text-muted-foreground dark:text-slate-300">Заблокированы</p>
          <p className="text-2xl font-semibold text-rose-900 dark:text-rose-200">{blockedCount}</p>
          <ShieldAlert className="h-4 w-4 text-rose-700 dark:text-rose-300 mt-2" />
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <Button
          variant={tab === "table" ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => setTab("table")}
        >
          <List className="h-4 w-4" />
          Таблица
        </Button>
        <Button
          variant={tab === "map" ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => setTab("map")}
        >
          <Map className="h-4 w-4" />
          Карта
        </Button>
      </div>

      {tab === "table" && (
        <>
          <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по имени или телефону"
                className="sm:max-w-sm bg-white/80 dark:bg-slate-900/80"
              />
              <Select value={onlineFilter} onValueChange={(v: "ALL" | "ONLINE" | "OFFLINE") => setOnlineFilter(v)}>
                <SelectTrigger className="sm:w-44 bg-white/80 dark:bg-slate-900/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Все</SelectItem>
                  <SelectItem value="ONLINE">Только онлайн</SelectItem>
                  <SelectItem value="OFFLINE">Только оффлайн</SelectItem>
                </SelectContent>
              </Select>
              <span className="status-badge status-created sm:ml-auto">Показано: {filteredMedics.length}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 z-20 bg-white/85 dark:bg-slate-900/85 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-slate-900/70">
                <TableRow>
                  <TableHead>Имя</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Онлайн</TableHead>
                  <TableHead>Рейтинг</TableHead>
                  <TableHead>Баланс</TableHead>
                  <TableHead>Заблокирован</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredMedics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Нет данных
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMedics.map((m) => (
                    <TableRow key={m.id} className="hover:bg-white/70 dark:hover:bg-slate-900/60">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {m.facePhotoUrl ? (
                            <img src={m.facePhotoUrl} alt={m.name ?? ""} className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                              style={{ background: hashColor(m.name) }}>
                              {nameInitial(m.name, m.phone)}
                            </div>
                          )}
                          <span className="font-medium">{m.name ?? "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{m.phone}</TableCell>
                      <TableCell><StatusBadge status={m.verificationStatus} /></TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-2 text-xs font-medium rounded-full px-2 py-1 ${
                          m.isOnline ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          <span className={`inline-block h-2 w-2 rounded-full ${m.isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {m.isOnline ? "Online" : "Offline"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                          {m.rating ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>{m.balance != null ? `${Number(m.balance).toLocaleString("ru-RU")} UZS` : "—"}</TableCell>
                      <TableCell>
                        <Switch
                          checked={m.isBlocked || false}
                          onCheckedChange={(v) => handleBlock(m.id, v)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => { setTopupTarget(m); setTopupAmount(""); }}
                        >
                          <Wallet className="h-3.5 w-3.5" />
                          Пополнить
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {tab === "map" && (
        <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md overflow-hidden h-[500px]">
          <MapContainer
            center={[41.2995, 69.2401]}
            zoom={12}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {medics
              .filter((m) => m.workZoneLat != null && m.workZoneLng != null)
              .map((m) => (
                <span key={m.id}>
                  <Marker position={[m.workZoneLat!, m.workZoneLng!]}>
                    <Popup>
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold">{m.name ?? "—"}</p>
                        <p className="text-muted-foreground">{m.phone}</p>
                        <p>
                          <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ${
                            m.isOnline ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}>
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${m.isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                            {m.isOnline ? "Online" : "Offline"}
                          </span>
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                  {m.workZoneRadius != null && (
                    <Circle
                      center={[m.workZoneLat!, m.workZoneLng!]}
                      radius={m.workZoneRadius * 1000}
                      pathOptions={{ color: "#0d9488", fillColor: "#0d9488", fillOpacity: 0.12, weight: 2 }}
                    />
                  )}
                </span>
              ))
            }
          </MapContainer>
        </div>
      )}

      {/* Topup dialog */}
      <Dialog open={!!topupTarget} onOpenChange={(open) => { if (!open) { setTopupTarget(null); setTopupAmount(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-500" />
              Пополнить баланс медика
            </DialogTitle>
          </DialogHeader>
          {topupTarget && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Медик: <span className="font-semibold text-foreground">{topupTarget.name ?? topupTarget.phone}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Текущий баланс:{" "}
                <span className="font-semibold text-foreground">
                  {Number(topupTarget.balance).toLocaleString("ru-RU")} UZS
                </span>
              </p>
              <div className="space-y-2">
                <Label htmlFor="topupAmount">Сумма пополнения (UZS)</Label>
                <Input
                  id="topupAmount"
                  type="number"
                  min={1}
                  step={1000}
                  placeholder="10000"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleTopup(); }}
                  autoFocus
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTopupTarget(null); setTopupAmount(""); }} disabled={topupLoading}>
              Отмена
            </Button>
            <Button onClick={handleTopup} disabled={topupLoading}>
              {topupLoading ? "Пополнение..." : "Пополнить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Medics;
