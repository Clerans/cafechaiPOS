import * as React from "react";
import { ArrowUpRight, ArrowDownRight, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/utils/cn";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  growth?: number;
  growthSubtext?: string;
  subtext?: string;
  isLoading?: boolean;
  isError?: boolean;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  growth,
  growthSubtext = "since last month",
  subtext,
  isLoading,
  isError,
}: StatCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow relative overflow-hidden bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {title}
        </CardTitle>
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Icon className="h-4.5 w-4.5" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2 mt-1">
            <div className="h-7 w-28 bg-muted animate-pulse rounded" />
            <div className="h-4 w-40 bg-muted animate-pulse rounded" />
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 text-destructive mt-1">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs font-medium">Failed to load</span>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
            
            {(growth !== undefined || subtext) && (
              <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5">
                {growth !== undefined && (
                  <span
                    className={cn(
                      "font-semibold flex items-center shrink-0",
                      growth >= 0
                        ? "text-emerald-500"
                        : "text-destructive"
                    )}
                  >
                    {growth >= 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />
                    )}
                    {Math.abs(growth)}%
                  </span>
                )}
                <span className="truncate">{growth !== undefined ? growthSubtext : subtext}</span>
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
