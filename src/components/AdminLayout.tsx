import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { hasAdminToken as hasAdminSecret } from "@/lib/api";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { Search, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslation } from "react-i18next";

function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="flex gap-1">
      {(["ru", "uz"] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
            language === lang
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function NavbarInstallButton() {
  const { canInstall, install } = usePWAInstall();
  const { t } = useTranslation();

  if (!canInstall) return null;

  return (
    <button
      onClick={install}
      className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 px-3 py-1.5 text-xs font-semibold hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
    >
      <Download className="h-3.5 w-3.5" />
      {t("common.downloadApp")}
    </button>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();

  if (!hasAdminSecret()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-white via-slate-50/50 to-cyan-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <AdminSidebar />
        <CommandPalette />
        <div className="flex-1 flex flex-col min-w-0 relative">
          <header className="h-14 flex items-center border-b border-white/40 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md px-4 sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <div className="ml-auto flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
              <NavbarInstallButton />
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-muted-foreground bg-white/80 dark:bg-slate-900/80"
                onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">{t("common.search")}</span>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd>
              </Button>
            </div>
          </header>
          <PWAInstallBanner />
          <main className="flex-1 p-6 overflow-auto relative">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function PWAInstallBanner() {
  const { canInstall, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (sessionStorage.getItem("pwa-banner-dismissed")) {
      setDismissed(true);
    }
  }, []);

  if (!canInstall || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem("pwa-banner-dismissed", "1");
    setDismissed(true);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-teal-50 dark:bg-teal-950/40 border-b border-teal-100 dark:border-teal-900">
      <img src="/logo.png" alt="HamshiraGo" className="h-12 w-12 rounded-xl object-cover flex-shrink-0" />
      <p className="text-sm text-teal-800 dark:text-teal-200 flex-1">
        {t("common.installApp")}
      </p>
      <Button size="sm" onClick={install} className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white">
        <Download className="h-3.5 w-3.5" />
        {t("common.install")}
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7 text-teal-600" onClick={handleDismiss}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
