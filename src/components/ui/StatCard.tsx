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
        "card-float p-5",
        className
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xl">{icons[variant]}</span>
        <span className={cn("text-3xl font-bold font-display", colors[variant])}>
          {value}
        </span>
      </div>
      <p className="text-small text-text-sub">{title}</p>
    </div>
  );
}