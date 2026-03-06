import {
  LayoutDashboard,
  UserCheck,
  Stethoscope,
  Users,
  ClipboardList,
  Package,
  BarChart2,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { clearAdminToken as clearAdminSecret } from "@/lib/api";
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
import { useTranslation } from "react-i18next";

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { t } = useTranslation();

  const navItems = [
    { key: "dashboard", url: "/", icon: LayoutDashboard },
    { key: "verification", url: "/verification", icon: UserCheck },
    { key: "medics", url: "/medics", icon: Stethoscope },
    { key: "clients", url: "/clients", icon: Users },
    { key: "orders", url: "/orders", icon: ClipboardList },
    { key: "services", url: "/services", icon: Package },
    { key: "reports", url: "/reports", icon: BarChart2 },
  ];

  const handleLogout = () => {
    clearAdminSecret();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border dark:border-white/10 dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-slate-950/95 backdrop-blur-md">
      <SidebarContent>
        {!collapsed && (
          <div className="px-4 py-5">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg shadow-lg flex-shrink-0 text-white"
                style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}
              >
                <Stethoscope size={20} />
              </div>
              <span className="font-bold text-sidebar-foreground">HamshiraGo</span>
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.dashboard") ? "" : "Navigation"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/80 rounded-md"
                      activeClassName="bg-gradient-to-r from-cyan-500/15 to-teal-500/15 text-teal-700 dark:text-cyan-300 font-medium rounded-md"
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {!collapsed && <span>{t(`nav.${item.key}`)}</span>}
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
              {!collapsed && <span>{t("nav.logout")}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
