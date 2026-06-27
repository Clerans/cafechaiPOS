import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, Trash2, Home, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Dialog } from "@/components/ui/Dialog";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { toast } from "@/components/ui/Toast";
import api from "@/utils/api";

const branchFormSchema = z.object({
  name: z.string().min(1, "Branch name is required"),
  code: z.string().min(1, "Branch code is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(1, "Phone number is required"),
  managerId: z.coerce.number().int().nullable().optional(),
});

type BranchFormFields = z.infer<typeof branchFormSchema>;

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface Branch {
  id: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  managerId: number | null;
  manager: User | null;
}

export function Branches() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingBranch, setEditingBranch] = React.useState<Branch | null>(null);

  // Queries
  const { data: branches, isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/api/branches"),
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => api.get<User[]>("/api/users"),
    // Fail silently or disable query depending on permission to manage employees
    retry: false,
  });

  // React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchFormFields>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: {
      name: "",
      code: "",
      address: "",
      phone: "",
      managerId: null,
    },
  });

  const handleCreateOpen = () => {
    setEditingBranch(null);
    reset({
      name: "",
      code: "",
      address: "",
      phone: "",
      managerId: null,
    });
    setIsDialogOpen(true);
  };

  const handleEditOpen = (branch: Branch) => {
    setEditingBranch(branch);
    reset({
      name: branch.name,
      code: branch.code,
      address: branch.address,
      phone: branch.phone,
      managerId: branch.managerId,
    });
    setIsDialogOpen(true);
  };

  // Mutations
  const createBranchMutation = useMutation({
    mutationFn: (data: BranchFormFields) => api.post("/api/branches", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch created", "Storefront code registered.");
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error("Failed to create branch", err.message);
    },
  });

  const updateBranchMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: BranchFormFields }) =>
      api.put(`/api/branches/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch updated", "Branch settings saved.");
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error("Failed to update branch", err.message);
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/branches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch deleted", "Branch record removed.");
    },
    onError: (err: any) => {
      toast.error("Failed to delete branch", err.message);
    },
  });

  const onSubmit = (data: BranchFormFields) => {
    if (editingBranch) {
      updateBranchMutation.mutate({ id: editingBranch.id, data });
    } else {
      createBranchMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this branch?")) {
      deleteBranchMutation.mutate(id);
    }
  };

  const managerOptions = [
    { label: "Unassigned", value: "" },
    ...(users || []).map((u) => ({ label: `${u.firstName} ${u.lastName} (${u.email})`, value: u.id })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Branches Registry</h1>
          <p className="text-sm text-muted-foreground">Manage operating locations and store assignments</p>
        </div>
        <Button onClick={handleCreateOpen} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>Add Branch</span>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {branchesLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
              Loading storefront registry...
            </div>
          ) : branches && branches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-semibold flex items-center gap-2">
                      <Home className="h-4 w-4 text-primary shrink-0" />
                      {branch.name}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-secondary text-secondary-foreground rounded border">
                        {branch.code}
                      </span>
                    </TableCell>
                    <TableCell>{branch.address}</TableCell>
                    <TableCell>{branch.phone}</TableCell>
                    <TableCell>
                      {branch.manager ? (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {branch.manager.firstName} {branch.manager.lastName}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditOpen(branch)}>
                        <Edit2 className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(branch.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No branches operating. Click "Add Branch" to register a storefront.
            </div>
          )}
        </CardContent>
      </Card>

      {/* CRUD dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingBranch ? "Edit Branch" : "Add Branch"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Branch Name</Label>
            <Input id="name" type="text" error={errors.name?.message} {...register("name")} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="code">Branch Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="e.g. HQ001, SF002"
              error={errors.code?.message}
              {...register("code")}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="address">Full Address</Label>
            <Input id="address" type="text" error={errors.address?.message} {...register("address")} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone">Contact Number</Label>
            <Input id="phone" type="text" error={errors.phone?.message} {...register("phone")} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="managerId">Assigned Storefront Manager</Label>
            <Select
              id="managerId"
              options={managerOptions}
              placeholder="Select active staff member"
              error={errors.managerId?.message}
              {...register("managerId")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createBranchMutation.isPending || updateBranchMutation.isPending}>
              {editingBranch ? "Save Changes" : "Create Branch"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
