import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, Trash2, Shield, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Dialog } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { toast } from "@/components/ui/Toast";
import api from "@/utils/api";

const userFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  roleId: z.coerce.number().int(),
  branchId: z.coerce.number().int().nullable().optional(),
});

type UserFormFields = z.infer<typeof userFormSchema>;

interface Branch {
  id: number;
  name: string;
  code: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roleId: number;
  branchId: number | null;
  role: Role;
  branch: Branch | null;
}

export function Employees() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  // Queries
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => api.get<User[]>("/api/users"),
  });

  const { data: roles } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: () => api.get<Role[]>("/api/roles"),
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/api/branches"),
  });

  // React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormFields>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      status: "ACTIVE",
      roleId: 0,
      branchId: null,
    },
  });

  // Open modal for Create
  const handleCreateOpen = () => {
    setEditingUser(null);
    reset({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      status: "ACTIVE",
      roleId: roles?.[0]?.id || 0,
      branchId: null,
    });
    setIsDialogOpen(true);
  };

  // Open modal for Edit
  const handleEditOpen = (user: User) => {
    setEditingUser(user);
    reset({
      email: user.email,
      password: "", // blank for editing (optional)
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status as any,
      roleId: user.roleId,
      branchId: user.branchId,
    });
    setIsDialogOpen(true);
  };

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: (data: UserFormFields) => api.post("/api/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Employee created", "Staff member was added successfully.");
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error("Failed to create employee", err.message);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserFormFields }) =>
      api.put(`/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Employee updated", "Staff settings saved.");
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error("Failed to update employee", err.message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Employee deleted", "Staff record deleted successfully.");
    },
    onError: (err: any) => {
      toast.error("Failed to delete employee", err.message);
    },
  });

  const onSubmit = (data: UserFormFields) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data });
    } else {
      if (!data.password || data.password.length < 6) {
        toast.error("Validation error", "Password is required for new employees (min 6 chars).");
        return;
      }
      createUserMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      deleteUserMutation.mutate(id);
    }
  };

  // Maps options for selection tags
  const roleOptions = (roles || []).map((r) => ({ label: r.name, value: r.id }));
  const branchOptions = [
    { label: "None (Unassigned / Remote)", value: "" },
    ...(branches || []).map((b) => ({ label: `${b.name} (${b.code})`, value: b.id })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Directory</h1>
          <p className="text-sm text-muted-foreground">Manage accounts, assign roles and branches</p>
        </div>
        <Button onClick={handleCreateOpen} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>Add Employee</span>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
              Loading employees records...
            </div>
          ) : users && users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-semibold">
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                        <Shield className="h-3 w-3" />
                        {user.role.name}
                      </span>
                    </TableCell>
                    <TableCell>{user.branch ? user.branch.name : "Remote / Unassigned"}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === "ACTIVE" ? "success" : "destructive"}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditOpen(user)}>
                        <Edit2 className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No employees registered. Click "Add Employee" to create one.
            </div>
          )}
        </CardContent>
      </Card>

      {/* CRUD dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingUser ? "Edit Employee" : "Add Employee"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                error={errors.firstName?.message}
                {...register("firstName")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                error={errors.lastName?.message}
                {...register("lastName")}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" error={errors.email?.message} {...register("email")} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Password {editingUser && "(Leave blank to keep current)"}</Label>
            <div className="relative flex items-center">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={editingUser ? "••••••••" : ""}
                error={errors.password?.message}
                {...register("password")}
              />
              <button
                type="button"
                className="absolute right-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="roleId">Role Assignment</Label>
              <Select id="roleId" options={roleOptions} error={errors.roleId?.message} {...register("roleId")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="branchId">Branch Assignment</Label>
              <Select id="branchId" options={branchOptions} error={errors.branchId?.message} {...register("branchId")} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="status">Profile Status</Label>
            <Select
              id="status"
              options={[
                { label: "Active", value: "ACTIVE" },
                { label: "Inactive", value: "INACTIVE" },
              ]}
              error={errors.status?.message}
              {...register("status")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createUserMutation.isPending || updateUserMutation.isPending}>
              {editingUser ? "Save Changes" : "Register Employee"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
