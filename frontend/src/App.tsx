import * as React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Pages
import { Login } from "@/pages/Auth/Login";
import { ForgotPassword } from "@/pages/Auth/ForgotPassword";
import { ResetPassword } from "@/pages/Auth/ResetPassword";
import { DashboardOverview } from "@/pages/Dashboard/DashboardOverview";
import { Employees } from "@/pages/Users/Employees";
import { Branches } from "@/pages/Branches/Branches";
import { CompanySettingsPage } from "@/pages/Settings/CompanySettingsPage";
import { RolesPermissionsPage } from "@/pages/Roles/RolesPermissionsPage";
import { ShieldAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

// 1. Private Route Wrapper
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// 2. Permission Route Wrapper
function PermissionRoute({
  children,
  permission,
}: {
  children: React.ReactNode;
  permission: string;
}) {
  const { hasPermission } = useAuthStore();

  if (!hasPermission(permission)) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="max-w-md border-destructive/20 bg-destructive/5">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-12 w-12 bg-destructive/10 text-destructive flex items-center justify-center rounded-full mb-2">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg font-bold text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            You do not possess the required credentials or permission code (<code>{permission}</code>) to view this system screen. If you believe this is in error, contact your system administrator.
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected Dashboard Pages */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <DashboardOverview />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <PermissionRoute permission="manage:employees">
                <Employees />
              </PermissionRoute>
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/branches"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <PermissionRoute permission="manage:branches">
                <Branches />
              </PermissionRoute>
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <PermissionRoute permission="manage:settings">
                <RolesPermissionsPage />
              </PermissionRoute>
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <PermissionRoute permission="manage:settings">
                <CompanySettingsPage />
              </PermissionRoute>
            </DashboardLayout>
          </PrivateRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
export default App;
