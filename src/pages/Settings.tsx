import { useEffect, useRef, useState } from "react";
import { getSettings, updateSettings } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Settings2, CreditCard, Info, Percent } from "lucide-react";
import { useTranslation } from "react-i18next";

const Settings = () => {
  const { t } = useTranslation();
  const [isPaidMode, setIsPaidMode] = useState(false);
  const [commissionRate, setCommissionRate] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRate, setSavingRate] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setIsPaidMode(s.isPaidMode);
        setCommissionRate(s.commissionRate ?? 10);
      })
      .catch(() => toast.error(t("settings.toastLoadError")))
      .finally(() => setLoading(false));
  }, [t]);

  const handleToggle = async (value: boolean) => {
    setSaving(true);
    try {
      const result = await updateSettings({ isPaidMode: value });
      setIsPaidMode(result.isPaidMode);
      toast.success(result.isPaidMode ? t("settings.toastEnabled") : t("settings.toastDisabled"));
    } catch {
      toast.error(t("settings.toastError"));
    } finally {
      setSaving(false);
    }
  };

  const handleRateChange = (value: number[]) => {
    const rate = value[0];
    setCommissionRate(rate);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSavingRate(true);
      try {
        const result = await updateSettings({ commissionRate: rate });
        setCommissionRate(result.commissionRate);
        toast.success(t("settings.toastRateSaved"));
      } catch {
        toast.error(t("settings.toastError"));
      } finally {
        setSavingRate(false);
      }
    }, 500);
  };

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-gradient-to-br from-teal-300/20 to-cyan-300/10 dark:from-teal-700/20 dark:to-cyan-700/10 blur-3xl" />

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/30 dark:border-slate-700/60 bg-gradient-to-br from-teal-50/80 via-white/70 to-cyan-50/80 dark:from-slate-900 dark:via-teal-950/25 dark:to-slate-900 p-6 md:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground dark:text-slate-300">Admin</p>
          <h1 className="text-3xl font-semibold tracking-tight">{t("settings.title")}</h1>
          <p className="text-sm text-muted-foreground dark:text-slate-300 mt-1">{t("settings.subtitle")}</p>
        </div>
      </motion.section>

      <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex-shrink-0">
            <CreditCard className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-base">{t("settings.paidMode")}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{t("settings.paidModeDesc")}</p>
              </div>
              {loading ? (
                <Skeleton className="h-6 w-11 rounded-full" />
              ) : (
                <Switch
                  checked={isPaidMode}
                  onCheckedChange={handleToggle}
                  disabled={saving}
                />
              )}
            </div>

            <div className="mt-4 rounded-xl border border-amber-200/60 dark:border-amber-700/40 bg-amber-50/60 dark:bg-amber-950/20 p-4 flex gap-3">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-medium">{t("settings.paidModeNote")}</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-400">
                  <li>{t("settings.notePoint1")}</li>
                  <li>{t("settings.notePoint2")}</li>
                  <li>{t("settings.notePoint3")}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className={`flex items-start gap-4 transition-opacity duration-200 ${!isPaidMode ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex-shrink-0">
            <Percent className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <p className="font-semibold text-base">{t("settings.commissionRate")}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{t("settings.commissionRateDesc")}</p>
              </div>
              {loading ? (
                <Skeleton className="h-6 w-16 rounded-lg" />
              ) : (
                <span className="inline-flex items-center rounded-lg bg-violet-100 dark:bg-violet-950/50 px-3 py-1 text-sm font-bold text-violet-700 dark:text-violet-300 min-w-[3.5rem] justify-center">
                  {savingRate ? "..." : t("settings.commissionRateValue", { rate: commissionRate })}
                </span>
              )}
            </div>

            {loading ? (
              <Skeleton className="h-5 w-full rounded-full" />
            ) : (
              <Slider
                min={1}
                max={50}
                step={1}
                value={[commissionRate]}
                onValueChange={handleRateChange}
                disabled={!isPaidMode || savingRate}
                className="w-full"
              />
            )}

            {!isPaidMode && (
              <p className="mt-2 text-xs text-muted-foreground italic">
                {t("settings.commissionRateHint")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-6">
        <div className="flex items-center gap-3 mb-3">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <p className="font-medium text-sm">{t("settings.currentState")}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            isPaidMode
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isPaidMode ? "bg-emerald-500" : "bg-slate-400"}`} />
            {isPaidMode ? t("settings.modeActive") : t("settings.modeFree")}
          </span>
          <span className="text-xs text-muted-foreground">{t("settings.modeHint")}</span>
        </div>
      </div>
    </div>
  );
};

export default Settings;
