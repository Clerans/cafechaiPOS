import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Mail,
  Edit2,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Drawer } from "@/components/ui/Drawer";
import { Dialog } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import api from "@/utils/api";

interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  groupId: number | null;
  group: { name: string; discountPercent: number } | null;
  membershipLevel: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  loyaltyPoints: number;
  walletBalance: number;
  creditLimit: number;
  birthday: string | null;
  notes: string | null;
}

interface CustomerGroup {
  id: number;
  name: string;
  discountPercent: number;
}

interface Campaign {
  id: number;
  title: string;
  type: "SMS" | "EMAIL";
  message: string;
  discountPercent: number | null;
  couponCode: string | null;
  _count: { logs: number };
  createdAt: string;
}

export function CRMHub() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"customers" | "groups" | "campaigns">("customers");

  // Query variables
  const [search, setSearch] = React.useState("");
  const [groupFilter, setGroupFilter] = React.useState("");

  // Modals / Drawers control
  const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);

  const [isGroupDrawerOpen, setIsGroupDrawerOpen] = React.useState(false);
  const [isCampaignDrawerOpen, setIsCampaignDrawerOpen] = React.useState(false);

  // Profile statement detail drawer
  const [isStatementDrawerOpen, setIsStatementDrawerOpen] = React.useState(false);
  const [statementCustomerId, setStatementCustomerId] = React.useState<number | null>(null);

  const [isWalletDialogOpen, setIsWalletDialogOpen] = React.useState(false);
  const [isRedeemDialogOpen, setIsRedeemDialogOpen] = React.useState(false);

  // Forms states
  const [customerForm, setCustomerForm] = React.useState({
    name: "",
    phone: "",
    email: "",
    groupId: "",
    membershipLevel: "BRONZE",
    creditLimit: "0",
    birthday: "",
    notes: "",
  });

  const [groupForm, setGroupForm] = React.useState({
    name: "",
    discountPercent: "0",
  });

  const [campaignForm, setCampaignForm] = React.useState({
    title: "",
    type: "EMAIL",
    message: "",
    discountPercent: "",
    couponCode: "",
  });

  const [walletForm, setWalletForm] = React.useState({
    type: "DEPOSIT",
    amount: "",
    reference: "",
  });

  const [redeemForm, setRedeemForm] = React.useState({
    pointsToRedeem: "100",
  });

  // Queries
  const { data: customers, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["customers", search, groupFilter],
    queryFn: () => api.get(`/api/crm/customers?search=${search}&groupId=${groupFilter}`),
  });

  const { data: groups } = useQuery<CustomerGroup[]>({
    queryKey: ["customer-groups"],
    queryFn: () => api.get("/api/crm/groups"),
  });

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: () => api.get("/api/crm/campaigns"),
  });

  const { data: activeStatement } = useQuery<any>({
    queryKey: ["customer-statement", statementCustomerId],
    queryFn: () => api.get(`/api/crm/customers/${statementCustomerId}/statement`),
    enabled: !!statementCustomerId && isStatementDrawerOpen,
  });

  // Mutations
  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/crm/customers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsCustomerDrawerOpen(false);
      resetCustomerForm();
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/api/crm/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsCustomerDrawerOpen(false);
      setSelectedCustomer(null);
      resetCustomerForm();
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/crm/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/crm/groups", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      setIsGroupDrawerOpen(false);
      setGroupForm({ name: "", discountPercent: "0" });
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/crm/campaigns", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setIsCampaignDrawerOpen(false);
      setCampaignForm({ title: "", type: "EMAIL", message: "", discountPercent: "", couponCode: "" });
    },
  });

  const walletMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/crm/wallet/adjust", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer-statement", statementCustomerId] });
      setIsWalletDialogOpen(false);
      setWalletForm({ type: "DEPOSIT", amount: "", reference: "" });
    },
  });

  const redeemMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/crm/loyalty/redeem", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer-statement", statementCustomerId] });
      setIsRedeemDialogOpen(false);
      setRedeemForm({ pointsToRedeem: "100" });
    },
  });

  // Helpers
  const resetCustomerForm = () => {
    setCustomerForm({
      name: "",
      phone: "",
      email: "",
      groupId: "",
      membershipLevel: "BRONZE",
      creditLimit: "0",
      birthday: "",
      notes: "",
    });
  };

  const handleEditClick = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerForm({
      name: c.name,
      phone: c.phone || "",
      email: c.email || "",
      groupId: c.groupId?.toString() || "",
      membershipLevel: c.membershipLevel,
      creditLimit: c.creditLimit.toString(),
      birthday: c.birthday ? c.birthday.split("T")[0] : "",
      notes: c.notes || "",
    });
    setIsCustomerDrawerOpen(true);
  };

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...customerForm,
      creditLimit: parseFloat(customerForm.creditLimit),
    };
    if (selectedCustomer) {
      updateCustomerMutation.mutate({ id: selectedCustomer.id, data: payload });
    } else {
      createCustomerMutation.mutate(payload);
    }
  };

  const handleLaunchStatement = (c: Customer) => {
    setStatementCustomerId(c.id);
    setIsStatementDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Customer Relationships (CRM)</h1>
          <p className="text-sm text-muted-foreground">Manage client directories, track loyalty store credits, and launch targeted promos.</p>
        </div>

        <div className="flex gap-2">
          {activeTab === "customers" && (
            <Button size="sm" onClick={() => { setSelectedCustomer(null); resetCustomerForm(); setIsCustomerDrawerOpen(true); }} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Add Customer</span>
            </Button>
          )}
          {activeTab === "groups" && (
            <Button size="sm" onClick={() => setIsGroupDrawerOpen(true)} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Create Group</span>
            </Button>
          )}
          {activeTab === "campaigns" && (
            <Button size="sm" onClick={() => setIsCampaignDrawerOpen(true)} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Launch Campaign</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-2 overflow-x-auto scrollbar-none">
        {(["customers", "groups", "campaigns"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 capitalize transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "customers" ? "Client Directory" : tab === "groups" ? "Membership Groups" : "Marketing Campaigns"}
          </button>
        ))}
      </div>

      {/* Tab contents */}
      {activeTab === "customers" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-card p-4 rounded-xl border">
            <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, phone, email..."
                  className="pl-9 h-9"
                />
              </div>

              <Select
                options={[
                  { label: "All Groups", value: "" },
                  ...(groups || []).map((g) => ({ label: g.name, value: g.id.toString() })),
                ]}
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="h-9 w-40"
              />
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {customersLoading ? (
                <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">Loading directory lists...</div>
              ) : customers && customers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone / Email</TableHead>
                      <TableHead>Group Tiers</TableHead>
                      <TableHead className="text-right">Loyalty Points</TableHead>
                      <TableHead className="text-right">Wallet Balance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((c) => {
                      const tierColors = {
                        BRONZE: "bg-amber-700/10 text-amber-700 border-amber-700/20",
                        SILVER: "bg-gray-400/10 text-gray-500 border-gray-400/20",
                        GOLD: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
                        PLATINUM: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
                      };
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-semibold text-xs flex items-center gap-2">
                            <span>{c.name}</span>
                            <Badge className={`${tierColors[c.membershipLevel]} border text-[8px] py-0 px-1`}>
                              {c.membershipLevel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="block font-medium">{c.phone || "N/A"}</span>
                            <span className="text-[10px] text-muted-foreground block">{c.email || "N/A"}</span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge className="bg-primary/10 text-primary text-[9px] border-0">
                              {c.group?.name || "Standard Tier"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-amber-600">
                            {c.loyaltyPoints} pts
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold">
                            ${c.walletBalance.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button variant="outline" size="sm" onClick={() => handleLaunchStatement(c)} title="Audit balance history statement">
                                Statement
                              </Button>
                              <Button variant="outline" size="icon" onClick={() => handleEditClick(c)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="outline" size="icon" onClick={() => deleteCustomerMutation.mutate(c.id)} className="text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground">No customer records in directory.</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. Customer Groups Tab */}
      {activeTab === "groups" && (
        <Card>
          <CardContent className="p-0">
            {groups && groups.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group Name</TableHead>
                    <TableHead className="text-right">Group Discount Tiers (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-semibold text-xs">{g.name}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-emerald-600">
                        {g.discountPercent}% OFF
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">No customer groups defined.</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. Marketing Campaigns Tab */}
      {activeTab === "campaigns" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns && campaigns.length > 0 ? (
            campaigns.map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-sm font-bold">{c.title}</CardTitle>
                      <CardDescription className="text-[10px] uppercase font-bold tracking-wider text-primary">
                        {c.type}
                      </CardDescription>
                    </div>
                    <Mail className="h-4.5 w-4.5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <p className="text-muted-foreground italic line-clamp-3">"{c.message}"</p>
                  <div className="flex justify-between border-t pt-2 text-[10px] text-muted-foreground font-semibold">
                    <span>Delivered recipients:</span>
                    <span className="text-foreground">{c._count.logs} clients</span>
                  </div>
                  {c.couponCode && (
                    <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                      <span>Promo Coupon:</span>
                      <span className="font-mono text-emerald-600 font-bold">{c.couponCode}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-xs text-muted-foreground bg-card border rounded-xl">
              No marketing campaigns launched yet.
            </div>
          )}
        </div>
      )}

      {/* DRAWERS: Customer accounts CRUD */}
      <Drawer
        isOpen={isCustomerDrawerOpen}
        onClose={() => setIsCustomerDrawerOpen(false)}
        title={selectedCustomer ? "Update Customer Account" : "Add Customer Profile"}
      >
        <form onSubmit={handleCustomerSubmit} className="p-4 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold">Customer Full Name</label>
            <Input
              value={customerForm.name}
              onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
              placeholder="e.g. Robert Jones"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Phone Number</label>
            <Input
              value={customerForm.phone}
              onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
              placeholder="e.g. +1 (555) 901-2834"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Email Address</label>
            <Input
              type="email"
              value={customerForm.email}
              onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
              placeholder="e.g. robert@email.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-bold">Membership Groups</label>
              <Select
                options={[
                  { label: "Standard Group", value: "" },
                  ...(groups || []).map((g) => ({ label: g.name, value: g.id.toString() })),
                ]}
                value={customerForm.groupId}
                onChange={(e) => setCustomerForm({ ...customerForm, groupId: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold">Loyalty Membership</label>
              <Select
                options={[
                  { label: "Bronze", value: "BRONZE" },
                  { label: "Silver", value: "SILVER" },
                  { label: "Gold", value: "GOLD" },
                  { label: "Platinum", value: "PLATINUM" },
                ]}
                value={customerForm.membershipLevel}
                onChange={(e) => setCustomerForm({ ...customerForm, membershipLevel: e.target.value })}
                className="w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-bold">Birthday Date</label>
              <Input
                type="date"
                value={customerForm.birthday}
                onChange={(e) => setCustomerForm({ ...customerForm, birthday: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold">Store Credit Limit ($)</label>
              <Input
                type="number"
                value={customerForm.creditLimit}
                onChange={(e) => setCustomerForm({ ...customerForm, creditLimit: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="font-bold">Customer Notes</label>
            <Input
              value={customerForm.notes}
              onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
              placeholder="e.g. Prefers cold brews"
            />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={createCustomerMutation.isPending || updateCustomerMutation.isPending}>
              {selectedCustomer ? "Update Profile" : "Create Profile"}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DRAWERS: Profile statement audit */}
      <Drawer
        isOpen={isStatementDrawerOpen}
        onClose={() => { setIsStatementDrawerOpen(false); setStatementCustomerId(null); }}
        title="Client statement Profile"
      >
        {activeStatement ? (
          <div className="p-4 space-y-6 text-xs overflow-y-auto max-h-[85vh]">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 bg-accent/20 p-4 rounded-xl border">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Wallet Balance</span>
                <div className="text-lg font-black text-primary">${activeStatement.customer.walletBalance.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Loyalty Points</span>
                <div className="text-lg font-black text-amber-600">{activeStatement.customer.loyaltyPoints} pts</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsWalletDialogOpen(true)} className="flex-1">
                Top up Wallet
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsRedeemDialogOpen(true)} className="flex-1" disabled={activeStatement.customer.loyaltyPoints < 100}>
                Redeem Points
              </Button>
            </div>

            {/* Wallet logs history */}
            <div className="space-y-2">
              <h4 className="font-bold border-b pb-1">Wallet Transaction History</h4>
              {activeStatement.walletTransactions && activeStatement.walletTransactions.length > 0 ? (
                <div className="space-y-2">
                  {activeStatement.walletTransactions.map((wt: any) => (
                    <div key={wt.id} className="flex justify-between border-b pb-1 text-[11px]">
                      <div>
                        <span className="font-bold block">{wt.type}</span>
                        <span className="text-[9px] text-muted-foreground font-mono">{wt.reference || "Adjustments"}</span>
                      </div>
                      <span className={`font-mono font-bold ${wt.type === "DEPOSIT" ? "text-emerald-600" : "text-destructive"}`}>
                        {wt.type === "DEPOSIT" ? "+" : "-"}${wt.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-[10px]">No wallet logs.</div>
              )}
            </div>

            {/* Purchases history */}
            <div className="space-y-2">
              <h4 className="font-bold border-b pb-1">Checkout Purchases History</h4>
              {activeStatement.transactions && activeStatement.transactions.length > 0 ? (
                <div className="space-y-3">
                  {activeStatement.transactions.map((tr: any) => (
                    <div key={tr.id} className="border p-3 rounded-lg bg-card space-y-1">
                      <div className="flex justify-between font-mono text-[10px] font-bold text-primary">
                        <span>{tr.invoiceNumber}</span>
                        <span>${tr.total.toFixed(2)}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground font-medium block">
                        {new Date(tr.createdAt).toLocaleString()}
                      </span>
                      <div className="text-[10px] text-muted-foreground pt-1 border-t">
                        {tr.items.map((it: any) => it.product?.name).join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-[10px]">No purchase transactions logged.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">Loading statement profile...</div>
        )}
      </Drawer>

      {/* DIALOGS: Top up store credit */}
      <Dialog isOpen={isWalletDialogOpen} onClose={() => setIsWalletDialogOpen(false)} title="Adjust Wallet Credits">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            walletMutation.mutate({
              ...walletForm,
              customerId: statementCustomerId,
            });
          }}
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-bold">Action Type</label>
              <Select
                options={[
                  { label: "Deposit Credits", value: "DEPOSIT" },
                  { label: "Withdraw Credits", value: "WITHDRAWAL" },
                ]}
                value={walletForm.type}
                onChange={(e) => setWalletForm({ ...walletForm, type: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold">Amount ($)</label>
              <Input
                type="number"
                value={walletForm.amount}
                onChange={(e) => setWalletForm({ ...walletForm, amount: e.target.value })}
                required
                placeholder="e.g. 50.00"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="font-bold">Reference notes</label>
            <Input
              value={walletForm.reference}
              onChange={(e) => setWalletForm({ ...walletForm, reference: e.target.value })}
              placeholder="e.g. Birthday credit gift"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsWalletDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={walletMutation.isPending}>
              Commit adjustment
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DIALOGS: Redeem loyalty points */}
      <Dialog isOpen={isRedeemDialogOpen} onClose={() => setIsRedeemDialogOpen(false)} title="Redeem Loyalty points">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            redeemMutation.mutate({
              ...redeemForm,
              customerId: statementCustomerId,
            });
          }}
          className="space-y-4 text-xs"
        >
          <div className="space-y-2">
            <p className="text-muted-foreground">Points are redeemed in blocks of 100 points. 100 points yields $1.00 store credit.</p>
            <div className="space-y-1">
              <label className="font-bold">Points block to redeem</label>
              <Select
                options={[
                  { label: "100 Points ($1.00 credit)", value: "100" },
                  { label: "200 Points ($2.00 credit)", value: "200" },
                  { label: "500 Points ($5.00 credit)", value: "500" },
                  { label: "1000 Points ($10.00 credit)", value: "1000" },
                ]}
                value={redeemForm.pointsToRedeem}
                onChange={(e) => setRedeemForm({ pointsToRedeem: e.target.value })}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsRedeemDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={redeemMutation.isPending}>
              Confirm Redemption
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DRAWERS: create groups */}
      <Drawer isOpen={isGroupDrawerOpen} onClose={() => setIsGroupDrawerOpen(false)} title="Create Customer Group">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createGroupMutation.mutate(groupForm);
          }}
          className="p-4 space-y-4 text-xs"
        >
          <div className="space-y-1">
            <label className="font-bold">Group Name</label>
            <Input
              value={groupForm.name}
              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              placeholder="e.g. VIP Club Members"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Discount Tiers (%)</label>
            <Input
              type="number"
              value={groupForm.discountPercent}
              onChange={(e) => setGroupForm({ ...groupForm, discountPercent: e.target.value })}
              placeholder="e.g. 15 (15% off)"
              required
            />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={createGroupMutation.isPending}>
              Create Group
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DRAWERS: launch marketing campaigns */}
      <Drawer isOpen={isCampaignDrawerOpen} onClose={() => setIsCampaignDrawerOpen(false)} title="Draft & Dispatch Campaign">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createCampaignMutation.mutate(campaignForm);
          }}
          className="p-4 space-y-4 text-xs"
        >
          <div className="space-y-1">
            <label className="font-bold">Campaign Title</label>
            <Input
              value={campaignForm.title}
              onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
              placeholder="e.g. Christmas VIP Promo Offer"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-bold">Campaign Channel Type</label>
              <Select
                options={[
                  { label: "SMS Message Campaign", value: "SMS" },
                  { label: "Email Broadcast Campaign", value: "EMAIL" },
                ]}
                value={campaignForm.type}
                onChange={(e) => setCampaignForm({ ...campaignForm, type: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold">Associated Coupon Code</label>
              <Input
                value={campaignForm.couponCode}
                onChange={(e) => setCampaignForm({ ...campaignForm, couponCode: e.target.value })}
                placeholder="e.g. SAVE15"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="font-bold">Message Content template</label>
            <textarea
              value={campaignForm.message}
              onChange={(e) => setCampaignForm({ ...campaignForm, message: e.target.value })}
              placeholder="Write your email/SMS template here..."
              required
              rows={5}
              className="w-full border rounded-lg p-2.5 bg-background text-foreground text-xs leading-relaxed focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={createCampaignMutation.isPending}>
              Send broadcast Campaign
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
export default CRMHub;
