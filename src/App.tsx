import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import SplashScreen from "@/components/SplashScreen";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/context/LanguageContext";
import "@/i18n";
import { useEffect } from "react";
import posthog from "posthog-js";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Verification from "./pages/Verification";
import Medics from "./pages/Medics";
import Clients from "./pages/Clients";
import Orders from "./pages/Orders";
import Services from "./pages/Services";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function PageTracker() {
  const location = useLocation();
  useEffect(() => {
    posthog.capture("$pageview");
  }, [location.pathname]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <LanguageProvider>
      <TooltipProvider>
        <SplashScreen />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PageTracker />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<AdminLayout><Dashboard /></AdminLayout>} />
            <Route path="/verification" element={<AdminLayout><Verification /></AdminLayout>} />
            <Route path="/medics" element={<AdminLayout><Medics /></AdminLayout>} />
            <Route path="/clients" element={<AdminLayout><Clients /></AdminLayout>} />
            <Route path="/orders" element={<AdminLayout><Orders /></AdminLayout>} />
            <Route path="/services" element={<AdminLayout><Services /></AdminLayout>} />
            <Route path="/reports" element={<AdminLayout><Reports /></AdminLayout>} />
            <Route path="/settings" element={<AdminLayout><Settings /></AdminLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
