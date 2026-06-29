import * as React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  Bell,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  Users,
  Settings,
  GitBranch,
  ShieldCheck,
  ChevronRight,
  ShoppingBag,
  Package,
  Truck,
  Warehouse,
  ClipboardList,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { Button } from "@/components/ui/Button";

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
  permission?: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "POS Checkout", path: "/pos", icon: ShoppingBag, permission: "manage:sales" },
  { name: "CRM Relationships", path: "/crm", icon: Users, permission: "manage:sales" },
  { name: "Inventory", path: "/inventory", icon: Package, permission: "view:products" },
  { name: "Warehouse", path: "/warehouse", icon: Warehouse, permission: "view:products" },
  { name: "Purchasing", path: "/purchasing", icon: Truck, permission: "manage:purchases" },
  { name: "HR Management", path: "/hr", icon: ClipboardList, permission: "manage:employees" },
  { name: "Finance & Reports", path: "/finance", icon: ClipboardList, permission: "manage:settings" },
  { name: "Employees", path: "/employees", icon: Users, permission: "manage:employees" },
  { name: "Branches", path: "/branches", icon: GitBranch, permission: "manage:branches" },
  { name: "Role Matrix", path: "/roles", icon: ShieldCheck, permission: "manage:settings" },
  { name: "Settings", path: "/settings", icon: Settings, permission: "manage:settings" },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = React.useState(false);

  const { user, logout, hasPermission } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Close overlays on navigation
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowProfileDropdown(false);
    setShowNotifications(false);
  }, [location.pathname]);

  // Compute breadcrumbs
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = [
    { name: "Home", path: "/" },
    ...pathSegments.map((segment, idx) => {
      const path = `/${pathSegments.slice(0, idx + 1).join("/")}`;
      return {
        name: segment.charAt(0).toUpperCase() + segment.slice(1),
        path,
      };
    }),
  ];

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      {/* 1. Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r bg-card transition-all duration-300 ${
          isSidebarOpen ? "w-64" : "w-20"
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-9 w-9 bg-primary flex items-center justify-center rounded-lg text-primary-foreground shrink-0 shadow-md shadow-primary/20">
              <ShoppingBag className="h-5 w-5" />
            </div>
            {isSidebarOpen && (
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent truncate">
                Apex POS
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {SIDEBAR_ITEMS.map((item) => {
            if (item.permission && !hasPermission(item.permission)) return null;
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {isSidebarOpen && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t shrink-0">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={`w-full flex items-center gap-4 ${
              isSidebarOpen ? "justify-start" : "justify-center"
            }`}
          >
            <LogOut className="h-5 w-5 text-destructive" />
            {isSidebarOpen && <span className="text-destructive font-medium">Log Out</span>}
          </Button>
        </div>
      </aside>

      {/* 2. Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div className="fixed inset-0 bg-background/85 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative z-50 w-64 bg-card border-r flex flex-col p-6 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-primary flex items-center justify-center rounded-lg text-primary-foreground shadow-md">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent">
                  Apex POS
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="flex-1 space-y-1">
              {SIDEBAR_ITEMS.map((item) => {
                if (item.permission && !hasPermission(item.permission)) return null;
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== "/" && location.pathname.startsWith(item.path));

                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto pt-6 border-t">
              <Button variant="destructive" className="w-full flex items-center justify-center gap-3" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* 3. Main Dashboard Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 shrink-0 z-30">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Breadcrumb Navigation */}
            <nav className="hidden sm:flex items-center gap-1 text-sm font-medium text-muted-foreground">
              {breadcrumbs.map((bc, idx) => (
                <React.Fragment key={bc.path}>
                  {idx > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
                  {idx === breadcrumbs.length - 1 ? (
                    <span className="text-foreground font-semibold truncate max-w-[120px]">{bc.name}</span>
                  ) : (
                    <Link to={bc.path} className="hover:text-foreground transition-colors shrink-0">
                      {bc.name}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>

            {/* Notification Bell */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-full"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1.5 h-2.5 w-2.5 bg-destructive rounded-full border-2 border-card" />
              </Button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-card rounded-lg border shadow-lg py-2 z-50 animate-in fade-in-50 slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b flex justify-between items-center">
                    <span className="font-semibold text-sm">Notifications</span>
                    <span className="text-xs text-primary font-medium cursor-pointer hover:underline">Mark all read</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto px-2 py-1">
                    <div className="p-3 hover:bg-accent rounded-md cursor-pointer transition-colors">
                      <p className="text-xs font-semibold">HQ001 Settings Updated</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Admin updated tax rates to 8.25%</p>
                    </div>
                    <div className="p-3 hover:bg-accent rounded-md cursor-pointer transition-colors">
                      <p className="text-xs font-semibold">New Cashier Assigned</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Cashier was added to Chicago branch</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-3 text-left focus:outline-none"
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 border flex items-center justify-center text-primary font-semibold text-sm shadow-inner shrink-0">
                  {user?.firstName?.charAt(0)}
                  {user?.lastName?.charAt(0)}
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-semibold leading-tight">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground leading-none">{user?.role}</p>
                </div>
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg border shadow-lg py-2 z-50 animate-in fade-in-50 slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b">
                    <p className="text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    <p className="text-[10px] bg-primary/15 text-primary rounded-full px-2 py-0.5 inline-block font-medium mt-1">
                      {user?.role}
                    </p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => navigate("/settings")}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <UserIcon className="h-4 w-4" />
                      <span>Edit Settings</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page content */}
        <main className="flex-1 overflow-auto bg-muted/20 p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in-50 duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
