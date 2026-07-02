import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  variant: "danger" | "warning" | "accent";
  className?: string;
}

export function StatCard({ title, value, variant, className }: StatCardProps) {
  const colors = {
    danger: "text-danger",
    warning: "text-warning",
    accent: "text-accent",
  };

  const icons = {
    danger: "🔴",
    warning: "🟡",
    accent: "🟢",
  };

  return (
    <div
      className={cn(
        "bg-card rounded-md p-4 shadow-card border border-border",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icons[variant]}</span>
        <span className="text-2xl font-bold font-display text-text-main">
          {value}
        </span>
      </div>
      <p className="text-small text-text-sub">{title}</p>
    </div>
  );
}