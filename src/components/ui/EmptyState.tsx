import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon = "📭",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <span className="text-4xl mb-4">{icon}</span>
      <h3 className="text-h2 font-display text-text-main mb-2">{title}</h3>
      {description && (
        <p className="text-body text-text-sub max-w-sm mb-6">{description}</p>
      )}
      {action}
    </div>
  );
}