import * as React from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/utils/cn";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

// Global emitter mechanism
type Listener = (messages: ToastMessage[]) => void;
let listeners: Listener[] = [];
let messages: ToastMessage[] = [];

const emit = () => {
  listeners.forEach((listener) => listener([...messages]));
};

export const toast = {
  success: (title: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    messages.push({ id, title, description, type: "success" });
    emit();
    setTimeout(() => toast.dismiss(id), 4000);
  },
  error: (title: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    messages.push({ id, title, description, type: "error" });
    emit();
    setTimeout(() => toast.dismiss(id), 4000);
  },
  info: (title: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    messages.push({ id, title, description, type: "info" });
    emit();
    setTimeout(() => toast.dismiss(id), 4000);
  },
  dismiss: (id: string) => {
    messages = messages.filter((m) => m.id !== id);
    emit();
  },
};

export function ToastContainer() {
  const [activeMessages, setActiveMessages] = React.useState<ToastMessage[]>([]);

  React.useEffect(() => {
    const listener = (newMessages: ToastMessage[]) => {
      setActiveMessages(newMessages);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {activeMessages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            "p-4 rounded-lg border shadow-lg flex gap-3 items-start pointer-events-auto transition-all transform duration-350 ease-out translate-y-0",
            {
              "bg-card text-foreground border-border": msg.type === "info",
              "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20": msg.type === "success",
              "bg-destructive/10 text-destructive border-destructive/20": msg.type === "error",
            }
          )}
        >
          {msg.type === "success" && <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />}
          {msg.type === "error" && <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />}
          {msg.type === "info" && <Info className="h-5 w-5 shrink-0 text-primary" />}

          <div className="flex-1">
            <h4 className="font-semibold text-sm">{msg.title}</h4>
            {msg.description && <p className="text-xs mt-0.5 opacity-90">{msg.description}</p>}
          </div>

          <button
            onClick={() => toast.dismiss(msg.id)}
            className="opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
