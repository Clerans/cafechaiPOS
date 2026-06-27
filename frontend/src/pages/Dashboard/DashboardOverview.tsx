import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Users,
  GitBranch,
  Percent,
  Settings,
  ShieldAlert,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { useAuthStore } from "@/store/authStore";
import api from "@/utils/api";

interface Branch {
  id: number;
  name: string;
  code: string;
  phone: string;
  address: string;
}

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  role: { name: string };
  branch: { name: string } | null;
}

interface CompanySettings {
  companyName: string;
  currency: string;
  taxRate: number;
}

export function DashboardOverview() {
  const { user, hasPermission } = useAuthStore();

  // Queries to load metrics
  const { data: settings } = useQuery<CompanySettings>({
    queryKey: ["settings"],
    queryFn: () => api.get<CompanySettings>("/api/settings"),
    // Fail silently on auth issues
    retry: false,
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/api/branches"),
    retry: false,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => api.get<User[]>("/api/users"),
    enabled: hasPermission("manage:employees"),
    retry: false,
  });

  const currencySymbol = settings?.currency === "USD" ? "$" : settings?.currency || "$";
  const taxRate = settings?.taxRate !== undefined ? `${settings.taxRate}%` : "8.25%";

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-sm text-muted-foreground">
          Here is a summary of your enterprise status and quick actions.
        </p>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Sales Mock Widget */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Sales volume (Today)
            </CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencySymbol}14,284.50
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-500 font-semibold inline-flex items-center gap-0.5">
                +12%
              </span>{" "}
              from yesterday
            </p>
          </CardContent>
        </Card>

        {/* Employees Metric */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Active Employees
            </CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users ? users.filter((u) => u.status === "ACTIVE").length : "--"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {hasPermission("manage:employees") ? (
                <span>Total members registered: {users?.length || 0}</span>
              ) : (
                <span className="text-amber-500 flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Requires Staff Access
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Branches Metric */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Operating Branches
            </CardTitle>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
              <GitBranch className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branches?.length ?? 1}</div>
            <p className="text-xs text-muted-foreground mt-1">
              HQ Location: {branches?.[0]?.code || "HQ001"}
            </p>
          </CardContent>
        </Card>

        {/* Company Settings Tax Rate */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Sales Tax Rate
            </CardTitle>
            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
              <Percent className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxRate}</div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Business: {settings?.companyName || "Enterprise Solutions"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main grids */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Branch Status details list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Branch Registry</CardTitle>
            <CardDescription>Active operating storefronts and locations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {branches && branches.length > 0 ? (
                branches.slice(0, 4).map((br) => (
                  <div key={br.id} className="flex justify-between items-center border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-semibold">{br.name}</p>
                      <p className="text-xs text-muted-foreground">{br.address}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                        {br.code}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-4">No branch locations registered yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Operations panel based on RBAC permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">System Utilities</CardTitle>
            <CardDescription>Operations allowed for your profile role</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {hasPermission("manage:employees") ? (
              <a
                href="/employees"
                className="flex flex-col p-4 rounded-xl border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all text-left"
              >
                <Users className="h-5 w-5 text-primary mb-2" />
                <span className="text-sm font-semibold">Staff Management</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">Manage employee list</span>
              </a>
            ) : (
              <div className="flex flex-col p-4 rounded-xl border bg-muted/30 opacity-60 text-left cursor-not-allowed">
                <Users className="h-5 w-5 text-muted-foreground mb-2" />
                <span className="text-sm font-semibold">Staff Management</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">Access Restricted</span>
              </div>
            )}

            {hasPermission("manage:branches") ? (
              <a
                href="/branches"
                className="flex flex-col p-4 rounded-xl border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all text-left"
              >
                <GitBranch className="h-5 w-5 text-primary mb-2" />
                <span className="text-sm font-semibold">Manage Branches</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">Add & Edit locations</span>
              </a>
            ) : (
              <div className="flex flex-col p-4 rounded-xl border bg-muted/30 opacity-60 text-left cursor-not-allowed">
                <GitBranch className="h-5 w-5 text-muted-foreground mb-2" />
                <span className="text-sm font-semibold">Manage Branches</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">Access Restricted</span>
              </div>
            )}

            {hasPermission("manage:settings") ? (
              <a
                href="/settings"
                className="flex flex-col p-4 rounded-xl border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all text-left"
              >
                <Settings className="h-5 w-5 text-primary mb-2" />
                <span className="text-sm font-semibold">System Settings</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">Manage currency, tax</span>
              </a>
            ) : (
              <div className="flex flex-col p-4 rounded-xl border bg-muted/30 opacity-60 text-left cursor-not-allowed">
                <Settings className="h-5 w-5 text-muted-foreground mb-2" />
                <span className="text-sm font-semibold">System Settings</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">Access Restricted</span>
              </div>
            )}

            <div className="flex flex-col p-4 rounded-xl border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all text-left cursor-pointer">
              <TrendingUp className="h-5 w-5 text-primary mb-2" />
              <span className="text-sm font-semibold">Sales Registers</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">Mock terminal transaction</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
