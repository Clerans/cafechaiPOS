import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
}: DrawerProps) {
  // Listen for Escape key to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <>
      {/* Overlay Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Slide-over Sheet Panel */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 h-full w-full bg-card p-6 shadow-2xl border-l flex flex-col transition-transform duration-300 ease-in-out",
          sizes[size],
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header section */}
        <div className="flex items-start justify-between pb-4 border-b">
          <div className="space-y-1 pr-8">
            <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto py-4 -mx-6 px-6">
          {children}
        </div>
      </div>
    </>
  );
}
