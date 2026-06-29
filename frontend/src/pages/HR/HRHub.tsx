import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Clock,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Drawer } from "@/components/ui/Drawer";
import { Badge } from "@/components/ui/Badge";
import api from "@/utils/api";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface Department {
  id: number;
  name: string;
  code: string;
}

interface Designation {
  id: number;
  name: string;
}

interface Attendance {
  id: number;
  userId: number;
  user: { firstName: string; lastName: string; email: string };
  clockIn: string;
  clockOut: string | null;
  status: "PRESENT" | "LATE" | "ABSENT";
}

interface Leave {
  id: number;
  userId: number;
  user: { firstName: string; lastName: string; email: string };
  leaveType: "CASUAL" | "SICK" | "ANNUAL";
  startDate: string;
  endDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string | null;
}

interface Payroll {
  id: number;
  userId: number;
  user: { firstName: string; lastName: string; email: string };
  month: string;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: "PENDING" | "PAID";
  paidAt: string | null;
}

interface Shift {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  employeeShifts: any[];
}

export function HRHub() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"dashboard" | "attendance" | "leaves" | "payroll" | "shifts" | "org">("dashboard");

  // Drawer toggles
  const [isDeptDrawerOpen, setIsDeptDrawerOpen] = React.useState(false);
  const [isDesigDrawerOpen, setIsDesigDrawerOpen] = React.useState(false);
  const [isLeaveDrawerOpen, setIsLeaveDrawerOpen] = React.useState(false);
  const [isPayrollDrawerOpen, setIsPayrollDrawerOpen] = React.useState(false);
  const [isShiftDrawerOpen, setIsShiftDrawerOpen] = React.useState(false);
  const [isAssignShiftDrawerOpen, setIsAssignShiftDrawerOpen] = React.useState(false);

  // Forms states
  const [deptForm, setDeptForm] = React.useState({ name: "", code: "" });
  const [desigForm, setDesigForm] = React.useState({ name: "" });
  
  const [leaveForm, setLeaveForm] = React.useState({
    leaveType: "SICK",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const [payrollForm, setPayrollForm] = React.useState({
    userId: "",
    month: "June",
    year: "2026",
    basicSalary: "",
    allowances: "0",
    deductions: "0",
  });

  const [shiftForm, setShiftForm] = React.useState({
    name: "",
    startTime: "09:00",
    endTime: "17:00",
  });

  const [assignForm, setAssignForm] = React.useState({
    userId: "",
    shiftId: "",
    date: "",
  });

  // Queries
  const { data: stats } = useQuery<any>({
    queryKey: ["hr-stats"],
    queryFn: () => api.get("/api/hr/dashboard"),
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: () => api.get("/api/hr/departments"),
  });

  const { data: designations } = useQuery<Designation[]>({
    queryKey: ["designations"],
    queryFn: () => api.get("/api/hr/designations"),
  });

  const { data: attendances, isLoading: attendancesLoading } = useQuery<Attendance[]>({
    queryKey: ["attendances"],
    queryFn: () => api.get("/api/hr/attendance"),
  });

  const { data: leaves, isLoading: leavesLoading } = useQuery<Leave[]>({
    queryKey: ["leaves"],
    queryFn: () => api.get("/api/hr/leaves"),
  });

  const { data: payrolls, isLoading: payrollsLoading } = useQuery<Payroll[]>({
    queryKey: ["payrolls"],
    queryFn: () => api.get("/api/hr/payroll"),
  });

  const { data: shifts } = useQuery<Shift[]>({
    queryKey: ["shifts"],
    queryFn: () => api.get("/api/hr/shifts"),
  });

  const { data: employees } = useQuery<User[]>({
    queryKey: ["employees-list"],
    queryFn: () => api.get("/api/users"),
  });

  // Mutations
  const deptMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/hr/departments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setIsDeptDrawerOpen(false);
      setDeptForm({ name: "", code: "" });
    },
  });

  const desigMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/hr/designations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designations"] });
      setIsDesigDrawerOpen(false);
      setDesigForm({ name: "" });
    },
  });

  const clockMutation = useMutation({
    mutationFn: () => api.post("/api/hr/attendance/clock", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendances"] });
      queryClient.invalidateQueries({ queryKey: ["hr-stats"] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/hr/leaves", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["hr-stats"] });
      setIsLeaveDrawerOpen(false);
      setLeaveForm({ leaveType: "SICK", startDate: "", endDate: "", reason: "" });
    },
  });

  const approveLeaveMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.put(`/api/hr/leaves/${id}/approve`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["hr-stats"] });
    },
  });

  const payrollMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/hr/payroll", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
      queryClient.invalidateQueries({ queryKey: ["hr-stats"] });
      setIsPayrollDrawerOpen(false);
      setPayrollForm({ userId: "", month: "June", year: "2026", basicSalary: "", allowances: "0", deductions: "0" });
    },
  });

  const payMutation = useMutation({
    mutationFn: (id: number) => api.put(`/api/hr/payroll/${id}/pay`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
      queryClient.invalidateQueries({ queryKey: ["hr-stats"] });
    },
  });

  const shiftMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/hr/shifts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setIsShiftDrawerOpen(false);
      setShiftForm({ name: "", startTime: "09:00", endTime: "17:00" });
    },
  });

  const assignShiftMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/hr/shifts/assign", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setIsAssignShiftDrawerOpen(false);
      setAssignForm({ userId: "", shiftId: "", date: "" });
    },
  });

  // Check today's clock in status
  const checkedInToday = React.useMemo(() => {
    if (!attendances) return false;
    const today = new Date().toLocaleDateString();
    return attendances.some((a) => new Date(a.clockIn).toLocaleDateString() === today && !a.clockOut);
  }, [attendances]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Human Resources (HR)</h1>
          <p className="text-sm text-muted-foreground">Manage employee rosters, daily clock-ins, leave plans, and payroll generation.</p>
        </div>

        <div className="flex gap-2">
          {activeTab === "attendance" && (
            <Button size="sm" onClick={() => clockMutation.mutate()} className="flex items-center gap-1.5 bg-primary">
              <Clock className="h-4 w-4" />
              <span>{checkedInToday ? "Clock Out" : "Clock In"}</span>
            </Button>
          )}
          {activeTab === "leaves" && (
            <Button size="sm" onClick={() => setIsLeaveDrawerOpen(true)} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Apply for Leave</span>
            </Button>
          )}
          {activeTab === "payroll" && (
            <Button size="sm" onClick={() => setIsPayrollDrawerOpen(true)} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Generate Salary Invoice</span>
            </Button>
          )}
          {activeTab === "shifts" && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setIsShiftDrawerOpen(true)} variant="outline" className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                <span>Add Shift</span>
              </Button>
              <Button size="sm" onClick={() => setIsAssignShiftDrawerOpen(true)} className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>Assign Shift</span>
              </Button>
            </div>
          )}
          {activeTab === "org" && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setIsDeptDrawerOpen(true)} variant="outline">
                + Dept
              </Button>
              <Button size="sm" onClick={() => setIsDesigDrawerOpen(true)}>
                + Designation
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-2 overflow-x-auto scrollbar-none">
        {(["dashboard", "attendance", "leaves", "payroll", "shifts", "org"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 capitalize transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "org" ? "Org Structure" : tab}
          </button>
        ))}
      </div>

      {/* 1. Dashboard Tab */}
      {activeTab === "dashboard" && stats && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Active Employees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-primary">{stats.employeesCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Present Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-emerald-600">{stats.presentCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Pending Leaves</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-amber-600">{stats.pendingLeaves}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Pending Payroll obligation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-destructive">${stats.pendingPayrollSum.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Upcoming Leaves list</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {leaves && leaves.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaves.slice(0, 5).map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs font-semibold">{l.user?.firstName} {l.user?.lastName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-primary/10 text-primary border-0 text-[9px]">{l.leaveType}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">No leave logs.</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Recent Clock-in Records</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {attendances && attendances.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendances.slice(0, 5).map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-xs font-semibold">{a.user?.firstName} {a.user?.lastName}</TableCell>
                          <TableCell className="text-xs font-mono">{new Date(a.clockIn).toLocaleTimeString()}</TableCell>
                          <TableCell>
                            <Badge className={`${a.status === "PRESENT" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"} border text-[9px]`}>
                              {a.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">No clock-ins.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 2. Attendance registry */}
      {activeTab === "attendance" && (
        <Card>
          <CardContent className="p-0">
            {attendancesLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">Loading logs...</div>
            ) : attendances && attendances.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendances.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs font-semibold">{a.user?.firstName} {a.user?.lastName}</TableCell>
                      <TableCell className="text-xs">{new Date(a.clockIn).toLocaleDateString()}</TableCell>
                      <TableCell className="font-mono text-xs">{new Date(a.clockIn).toLocaleTimeString()}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {a.clockOut ? new Date(a.clockOut).toLocaleTimeString() : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${a.status === "PRESENT" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"} border text-[9px]`}>
                          {a.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">No attendances clock-ins logged yet.</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. Leave management */}
      {activeTab === "leaves" && (
        <Card>
          <CardContent className="p-0">
            {leavesLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">Loading leave records...</div>
            ) : leaves && leaves.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Duration Dates</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((l) => {
                    const statusColors = {
                      PENDING: "bg-amber-500/10 text-amber-600 border-amber-500/20",
                      APPROVED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                      REJECTED: "bg-destructive/10 text-destructive border-destructive/20",
                    };
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs font-semibold">{l.user?.firstName} {l.user?.lastName}</TableCell>
                        <TableCell className="text-xs font-bold text-primary">{l.leaveType}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs italic">"{l.reason || "Personal work"}"</TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[l.status]} border text-[9px]`}>{l.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {l.status === "PENDING" && (
                            <div className="flex justify-end gap-1.5">
                              <Button variant="outline" size="sm" onClick={() => approveLeaveMutation.mutate({ id: l.id, status: "APPROVED" })} className="text-emerald-600 hover:bg-emerald-50">
                                Approve
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => approveLeaveMutation.mutate({ id: l.id, status: "REJECTED" })} className="text-destructive hover:bg-red-50">
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">No leave request records.</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. Payroll registry */}
      {activeTab === "payroll" && (
        <Card>
          <CardContent className="p-0">
            {payrollsLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">Loading payroll bills...</div>
            ) : payrolls && payrolls.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Billing Month</TableHead>
                    <TableHead className="text-right">Basic Salary</TableHead>
                    <TableHead className="text-right">Net Payable</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.map((p) => {
                    const statusColors = {
                      PENDING: "bg-amber-500/10 text-amber-600 border-amber-500/20",
                      PAID: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                    };
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs font-semibold">{p.user?.firstName} {p.user?.lastName}</TableCell>
                        <TableCell className="text-xs font-bold">{p.month} {p.year}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">${p.basicSalary.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-primary">${p.netSalary.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[p.status]} border text-[9px]`}>{p.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {p.status === "PENDING" && (
                            <Button size="sm" onClick={() => payMutation.mutate(p.id)} className="bg-emerald-600 text-white hover:bg-emerald-700">
                              Disburse Salary
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">No payroll invoices drafted. Click Generate above.</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5. Shifts scheduler */}
      {activeTab === "shifts" && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Shifts definitions list */}
          <div className="col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Shift Schedule Templates</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {shifts && shifts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shift Name</TableHead>
                        <TableHead>Time Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shifts.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs font-bold">{s.name}</TableCell>
                          <TableCell className="text-xs font-mono">{s.startTime} - {s.endTime}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-6 text-center text-xs text-muted-foreground">No shifts configured.</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Shifts calendars logs */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Assigned Daily Shifts roster</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {shifts && shifts.some((s) => s.employeeShifts.length > 0) ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Shift Roster</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shifts.flatMap((s) =>
                        s.employeeShifts.map((es, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(es.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-xs font-semibold">{es.user?.firstName} {es.user?.lastName}</TableCell>
                            <TableCell className="text-xs font-bold text-primary">{s.name}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-12 text-center text-xs text-muted-foreground">No shift slots allocated.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 6. Org structure */}
      {activeTab === "org" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Departments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Organization Departments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {departments && departments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dept Code</TableHead>
                      <TableHead>Department Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs font-bold text-primary">{d.code}</TableCell>
                        <TableCell className="text-xs font-semibold">{d.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">No departments registered.</div>
              )}
            </CardContent>
          </Card>

          {/* Designations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Professional Designations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {designations && designations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Designation Title</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {designations.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-xs font-bold text-primary">{d.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">No designations registered.</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* DRAWERS: Department */}
      <Drawer isOpen={isDeptDrawerOpen} onClose={() => setIsDeptDrawerOpen(false)} title="Create Department">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            deptMutation.mutate(deptForm);
          }}
          className="p-4 space-y-4 text-xs"
        >
          <div className="space-y-1">
            <label className="font-bold">Department Name</label>
            <Input
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              placeholder="e.g. Sales & Checkout"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Department Code</label>
            <Input
              value={deptForm.code}
              onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
              placeholder="e.g. DEPT-SALES"
              required
            />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={deptMutation.isPending}>
              Create Department
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DRAWERS: Designation */}
      <Drawer isOpen={isDesigDrawerOpen} onClose={() => setIsDesigDrawerOpen(false)} title="Create Designation">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            desigMutation.mutate(desigForm);
          }}
          className="p-4 space-y-4 text-xs"
        >
          <div className="space-y-1">
            <label className="font-bold">Designation Title Name</label>
            <Input
              value={desigForm.name}
              onChange={(e) => setDesigForm({ name: e.target.value })}
              placeholder="e.g. Senior Cashier Officer"
              required
            />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={desigMutation.isPending}>
              Create Designation
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DRAWERS: Leave Application */}
      <Drawer isOpen={isLeaveDrawerOpen} onClose={() => setIsLeaveDrawerOpen(false)} title="Request Leave plan">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            leaveMutation.mutate(leaveForm);
          }}
          className="p-4 space-y-4 text-xs"
        >
          <div className="space-y-1">
            <label className="font-bold">Leave Type</label>
            <Select
              options={[
                { label: "Sick Leave", value: "SICK" },
                { label: "Casual Leave", value: "CASUAL" },
                { label: "Annual Leave", value: "ANNUAL" },
              ]}
              value={leaveForm.leaveType}
              onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-bold">Start Date</label>
              <Input
                type="date"
                value={leaveForm.startDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold">End Date</label>
              <Input
                type="date"
                value={leaveForm.endDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="font-bold">Reason of absence</label>
            <Input
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              placeholder="e.g. Medical diagnosis check"
            />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={leaveMutation.isPending}>
              Submit Request
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DRAWERS: Payroll invoicing */}
      <Drawer isOpen={isPayrollDrawerOpen} onClose={() => setIsPayrollDrawerOpen(false)} title="Generate Payroll Salary">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            payrollMutation.mutate(payrollForm);
          }}
          className="p-4 space-y-4 text-xs"
        >
          <div className="space-y-1">
            <label className="font-bold">Employee Account</label>
            <Select
              options={[
                { label: "-- Select Staff --", value: "" },
                ...(employees || []).map((emp) => ({ label: `${emp.firstName} ${emp.lastName}`, value: emp.id.toString() })),
              ]}
              value={payrollForm.userId}
              onChange={(e) => setPayrollForm({ ...payrollForm, userId: e.target.value })}
              required
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-bold">Salary Month</label>
              <Select
                options={[
                  { label: "June", value: "June" },
                  { label: "July", value: "July" },
                  { label: "August", value: "August" },
                ]}
                value={payrollForm.month}
                onChange={(e) => setPayrollForm({ ...payrollForm, month: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold">Year</label>
              <Input
                type="number"
                value={payrollForm.year}
                onChange={(e) => setPayrollForm({ ...payrollForm, year: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="font-bold">Basic Pay salary ($)</label>
            <Input
              type="number"
              value={payrollForm.basicSalary}
              onChange={(e) => setPayrollForm({ ...payrollForm, basicSalary: e.target.value })}
              placeholder="e.g. 3500.00"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-bold">Allowances ($)</label>
              <Input
                type="number"
                value={payrollForm.allowances}
                onChange={(e) => setPayrollForm({ ...payrollForm, allowances: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold">Deductions ($)</label>
              <Input
                type="number"
                value={payrollForm.deductions}
                onChange={(e) => setPayrollForm({ ...payrollForm, deductions: e.target.value })}
              />
            </div>
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={payrollMutation.isPending}>
              Generate Payroll invoice
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DRAWERS: Add shift */}
      <Drawer isOpen={isShiftDrawerOpen} onClose={() => setIsShiftDrawerOpen(false)} title="Add Shift hours">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            shiftMutation.mutate(shiftForm);
          }}
          className="p-4 space-y-4 text-xs"
        >
          <div className="space-y-1">
            <label className="font-bold">Shift Schedule Name</label>
            <Input
              value={shiftForm.name}
              onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
              placeholder="e.g. Morning Opening Shift"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-bold">Start hours time</label>
              <Input
                value={shiftForm.startTime}
                onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                placeholder="e.g. 08:00"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold">End hours time</label>
              <Input
                value={shiftForm.endTime}
                onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                placeholder="e.g. 16:00"
                required
              />
            </div>
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={shiftMutation.isPending}>
              Create Shift
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DRAWERS: Assign Shift */}
      <Drawer isOpen={isAssignShiftDrawerOpen} onClose={() => setIsAssignShiftDrawerOpen(false)} title="Assign Shift to employee">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            assignShiftMutation.mutate(assignForm);
          }}
          className="p-4 space-y-4 text-xs"
        >
          <div className="space-y-1">
            <label className="font-bold">Employee Account</label>
            <Select
              options={[
                { label: "-- Select Staff --", value: "" },
                ...(employees || []).map((emp) => ({ label: `${emp.firstName} ${emp.lastName}`, value: emp.id.toString() })),
              ]}
              value={assignForm.userId}
              onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })}
              required
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Shift Schedule template</label>
            <Select
              options={[
                { label: "-- Select Shift --", value: "" },
                ...(shifts || []).map((s) => ({ label: `${s.name} (${s.startTime}-${s.endTime})`, value: s.id.toString() })),
              ]}
              value={assignForm.shiftId}
              onChange={(e) => setAssignForm({ ...assignForm, shiftId: e.target.value })}
              required
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Date Slot</label>
            <Input
              type="date"
              value={assignForm.date}
              onChange={(e) => setAssignForm({ ...assignForm, date: e.target.value })}
              required
            />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={assignShiftMutation.isPending}>
              Assign Shift
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
export default HRHub;
