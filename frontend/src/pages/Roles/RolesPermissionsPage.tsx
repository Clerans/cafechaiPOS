import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { toast } from "@/components/ui/Toast";
import api from "@/utils/api";

interface Permission {
  id: number;
  name: string;
  code: string;
  description: string | null;
}

interface RolePermissionJoin {
  permissionId: number;
  permission: Permission;
}

interface Role {
  id: number;
  name: string;
  description: string | null;
  permissions: RolePermissionJoin[];
}

export function RolesPermissionsPage() {
  const queryClient = useQueryClient();

  // Queries
  const { data: roles, isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: () => api.get<Role[]>("/api/roles"),
  });

  const { data: permissions, isLoading: permissionsLoading } = useQuery<Permission[]>({
    queryKey: ["permissions"],
    queryFn: () => api.get<Permission[]>("/api/roles/permissions"),
  });

  // Mutation to toggle permission mapping
  const togglePermissionMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: number; permissionIds: number[] }) =>
      api.put(`/api/roles/${roleId}/permissions`, { permissionIds }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      const roleName = roles?.find((r) => r.id === variables.roleId)?.name;
      toast.success("Permissions updated", `Role matrix modified for ${roleName}.`);
    },
    onError: (err: any) => {
      toast.error("Failed to update role permissions", err.message);
    },
  });

  const handleToggle = (role: Role, permId: number, isAssigned: boolean) => {
    // Prevent updating Super Admin
    if (role.name === "Super Admin") {
      toast.info("Super Admin Bypass", "Super Admins always retain all system permissions.");
      return;
    }

    const currentPermissionIds = role.permissions.map((rp) => rp.permissionId);
    let nextPermissionIds: number[];

    if (isAssigned) {
      // Remove
      nextPermissionIds = currentPermissionIds.filter((id) => id !== permId);
    } else {
      // Add
      nextPermissionIds = [...currentPermissionIds, permId];
    }

    togglePermissionMutation.mutate({ roleId: role.id, permissionIds: nextPermissionIds });
  };

  const isLoading = rolesLoading || permissionsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Access Control Matrix</h1>
        <p className="text-sm text-muted-foreground">Map active action permissions to business profile roles</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Role & Permission Assignments
          </CardTitle>
          <CardDescription>
            Toggling checks automatically updates security policy and takes effect on user re-login or session refresh.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
              Loading security matrix...
            </div>
          ) : (
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4">Role</TableHead>
                  {permissions?.map((perm) => (
                    <TableHead key={perm.id} className="text-center text-xs py-3 px-2">
                      <div className="flex flex-col items-center">
                        <span className="font-semibold block">{perm.name}</span>
                        <span className="text-[9px] font-mono text-muted-foreground font-normal mt-0.5">
                          {perm.code}
                        </span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles?.map((role) => {
                  const assignedIds = role.permissions.map((rp) => rp.permissionId);
                  const isSuperAdmin = role.name === "Super Admin";

                  return (
                    <TableRow key={role.id}>
                      <TableCell className="align-middle">
                        <div>
                          <p className="font-semibold text-sm">{role.name}</p>
                          <p className="text-xs text-muted-foreground">{role.description}</p>
                        </div>
                      </TableCell>
                      {permissions?.map((perm) => {
                        const isAssigned = assignedIds.includes(perm.id);
                        const displayChecked = isSuperAdmin || isAssigned;

                        return (
                          <TableCell key={perm.id} className="text-center align-middle">
                            <input
                              type="checkbox"
                              checked={displayChecked}
                              disabled={isSuperAdmin}
                              onChange={() => handleToggle(role, perm.id, isAssigned)}
                              className={`h-4.5 w-4.5 rounded border-gray-300 dark:border-gray-700 text-primary focus:ring-primary ${
                                isSuperAdmin ? "cursor-not-allowed text-primary/40" : "cursor-pointer"
                              }`}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <div className="p-4 bg-muted/30 border rounded-lg flex items-start gap-3 max-w-2xl">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">RBAC Design Note:</span> The Super Admin role cannot be modified. All other roles (Admin, Manager, Cashier, etc.) can be checked or unchecked to custom configure specific access criteria.
        </div>
      </div>
    </div>
  );
}
