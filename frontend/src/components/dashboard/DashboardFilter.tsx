import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, GitBranch, RefreshCw } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import api from "@/utils/api";

export interface FilterState {
  branchId: string;
  dateRange: string;
  startDate: string;
  endDate: string;
}

interface Branch {
  id: number;
  name: string;
  code: string;
}

interface DashboardFilterProps {
  value: FilterState;
  onChange: (value: FilterState) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function DashboardFilter({ value, onChange, onRefresh, isRefreshing }: DashboardFilterProps) {
  // Query branches list to load selector
  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/api/branches"),
    retry: false,
  });

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...value,
      branchId: e.target.value,
    });
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const range = e.target.value;
    const now = new Date();
    let start = new Date();
    const end = now.toISOString();

    switch (range) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "yesterday":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const yestEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        onChange({
          branchId: value.branchId,
          dateRange: range,
          startDate: start.toISOString(),
          endDate: yestEnd.toISOString(),
        });
        return;
      case "7days":
        start.setDate(now.getDate() - 7);
        break;
      case "30days":
        start.setDate(now.getDate() - 30);
        break;
      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        start.setDate(now.getDate() - 30);
    }

    onChange({
      branchId: value.branchId,
      dateRange: range,
      startDate: start.toISOString(),
      endDate: end,
    });
  };

  const branchOptions = [
    { label: "All Branches", value: "" },
    ...(branches || []).map((b) => ({ label: `${b.name} (${b.code})`, value: b.id.toString() })),
  ];

  const dateOptions = [
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "Last 7 Days", value: "7days" },
    { label: "Last 30 Days", value: "30days" },
    { label: "This Month", value: "month" },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-card p-4 rounded-xl border shadow-sm">
      <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
        <div className="flex items-center gap-2 w-full sm:w-60">
          <GitBranch className="h-4.5 w-4.5 text-primary shrink-0" />
          <Select
            options={branchOptions}
            value={value.branchId}
            onChange={handleBranchChange}
            className="h-9 py-1"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-56">
          <Calendar className="h-4.5 w-4.5 text-primary shrink-0" />
          <Select
            options={dateOptions}
            value={value.dateRange}
            onChange={handleDateRangeChange}
            className="h-9 py-1"
          />
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        isLoading={isRefreshing}
        className="w-full sm:w-auto flex items-center gap-2"
      >
        {!isRefreshing && <RefreshCw className="h-3.5 w-3.5" />}
        <span>Refresh Dashboard</span>
      </Button>
    </div>
  );
}
