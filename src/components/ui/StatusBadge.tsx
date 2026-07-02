import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "pending" | "paid" | "overdue" | "today";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = {
    pending: "bg-surface text-text-sub border-border",
    paid: "bg-accent/10 text-accent border-accent/20",
    overdue: "bg-danger/10 text-danger border-danger/20",
    today: "bg-warning/10 text-warning border-warning/20",
  };

  const labels = {
    pending: "Pendiente",
    paid: "Pagado",
    overdue: "Vencido",
    today: "Hoy",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-pill text-small font-medium border",
        styles[status],
        className
      )}
    >
      {labels[status]}
    </span>
  );
}