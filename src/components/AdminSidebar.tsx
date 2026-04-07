import {
  LayoutDashboard,
  UserCheck,
  Stethoscope,
  Users,
  ClipboardList,
  Package,
  BarChart2,
  LogOut,
  HeartPulse,
  Star,
  Settings,
  ThumbsUp,
  MessageSquare,
  PieChart,
  Ticket,
  CreditCard,
  ShieldCheck,
  Bot,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { clearAdminToken as clearAdminSecret, getClientErrorStats } from "@/lib/api";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Дашборд", url: "/", icon: LayoutDashboard },
  { title: "Верификация", url: "/verification", icon: UserCheck },
  { title: "Медики", url: "/medics", icon: Stethoscope },
  { title: "Клиенты", url: "/clients", icon: Users },
  { title: "Заказы", url: "/orders", icon: ClipboardList },
  { title: "Услуги", url: "/services", icon: Package },
  { title: "Отчёты", url: "/reports", icon: BarChart2 },
  { title: "Аналитика", url: "/analytics", icon: PieChart },
  { title: "AI Ассистент", url: "/ai-chat", icon: Bot },
  { title: "User Support", url: "/user-support", icon: HeartPulse },
  { title: "Отзывы", url: "/reviews", icon: Star },
  { title: "Консультации", url: "/consultations", icon: MessageSquare },
  { title: "Врачи", url: "/doctors", icon: Stethoscope },
  { title: "NPS", url: "/nps", icon: ThumbsUp },
  { title: "Промо-коды", url: "/promo-codes", icon: Ticket },
  { title: "Подписки", url: "/subscription-tiers", icon: CreditCard },
  { title: "Аудит-лог", url: "/audit-log", icon: ShieldCheck },
  { title: "Настройки", url: "/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const [newErrorsCount, setNewErrorsCount] = useState(0);

  useEffect(() => {
    getClientErrorStats()
      .then((s) => setNewErrorsCount(s.NEW))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    clearAdminSecret();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border dark:border-white/10 dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-slate-950/95 backdrop-blur-md">
      <SidebarContent>
        <div className="px-4 py-5">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg shadow-lg flex-shrink-0 text-white"
                style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}
              >
                <Stethoscope size={20} />
              </div>
              <span className="font-bold text-sidebar-foreground">HamshiraGo</span>
            </div>
          )}
          {collapsed && (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg shadow-lg mx-auto text-white"
              style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}
            >
              <Stethoscope size={20} />
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Навигация</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/80 rounded-md"
                      activeClassName="bg-gradient-to-r from-cyan-500/15 to-teal-500/15 text-teal-700 dark:text-cyan-300 font-medium rounded-md"
                    >
                      <item.icon className="h-4 w-4 mr-2 flex-shrink-0" />
                      {!collapsed && (
                        <span className="flex items-center gap-2 w-full">
                          {item.title}
                          {item.url === "/user-support" && newErrorsCount > 0 && (
                            <span className="ml-auto text-xs font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none">
                              {newErrorsCount}
                            </span>
                          )}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="hover:bg-sidebar-accent text-sidebar-foreground rounded-md">
              <LogOut className="h-4 w-4 mr-2" />
              {!collapsed && <span>Выйти</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
