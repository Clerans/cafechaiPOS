import { ArrowDownLeft, ArrowUpRight, Shuffle, AlertCircle } from "lucide-react";

export interface TimelineEvent {
  id: number;
  type: string; // IN, OUT, ADJUSTMENT, TRANSFER
  quantity: number;
  reason?: string | null;
  createdAt: string;
  variant?: { name: string } | null;
}

interface TimelineWidgetProps {
  events: TimelineEvent[];
  isLoading?: boolean;
}

export function TimelineWidget({ events, isLoading }: TimelineWidgetProps) {
  if (isLoading) {
    return <div className="text-center text-xs py-6 text-muted-foreground animate-pulse">Gathering history timeline logs...</div>;
  }

  if (!events || events.length === 0) {
    return <div className="text-center text-xs py-6 text-muted-foreground">No stock logs tracked for this item yet.</div>;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "IN":
        return <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />;
      case "OUT":
        return <ArrowUpRight className="h-3.5 w-3.5 text-destructive" />;
      case "TRANSFER":
        return <Shuffle className="h-3.5 w-3.5 text-blue-500" />;
      default:
        return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
    }
  };

  const getBadgeClass = (type: string) => {
    switch (type) {
      case "IN":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-600";
      case "OUT":
        return "bg-destructive/10 border-destructive/20 text-destructive";
      case "TRANSFER":
        return "bg-blue-500/10 border-blue-500/20 text-blue-600";
      default:
        return "bg-amber-500/10 border-amber-500/20 text-amber-600";
    }
  };

  return (
    <div className="relative border-l pl-4 ml-3 space-y-6">
      {events.map((event) => (
        <div key={event.id} className="relative">
          {/* Vertical line indicator icon bubble */}
          <span className="absolute -left-[27px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border bg-card shadow-sm">
            {getIcon(event.type)}
          </span>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${getBadgeClass(event.type)}`}>
                {event.type}
              </span>
              <span className="text-xs font-bold">
                {event.type === "OUT" ? "-" : "+"}
                {event.quantity} units
              </span>
              {event.variant && (
                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                  {event.variant.name}
                </span>
              )}
            </div>
            {event.reason && <p className="text-xs text-foreground font-medium">{event.reason}</p>}
            <span className="text-[10px] text-muted-foreground">
              {new Date(event.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
