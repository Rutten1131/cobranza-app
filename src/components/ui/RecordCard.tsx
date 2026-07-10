import { cn, formatDate, isOverdue, isDueToday } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { Button } from "./Button";

interface RecordCardProps {
  id: string;
  clientName: string;
  description: string;
  amount?: number | null;
  dueDate: string;
  status: "pending" | "paid" | "overdue" | "today";
  onRemind?: () => void;
  onMarkPaid?: () => void;
  onView?: () => void;
  onDelete?: () => void;
  loading?: boolean;
  className?: string;
}

export function RecordCard({
  clientName,
  description,
  amount,
  dueDate,
  status,
  onRemind,
  onMarkPaid,
  onView,
  onDelete,
  onPause,
  onAdjustTime,
  loading,
  className,
}: RecordCardProps & { onPause?: () => void; onAdjustTime?: () => void }) {
  const overdue = isOverdue(dueDate);
  const today = isDueToday(dueDate);

  let displayStatus = status;
  if (overdue && status === "pending") displayStatus = "overdue";
  if (today && status === "pending") displayStatus = "today";

  return (
    <div
      className={cn(
        "card-float p-5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={displayStatus} />
          </div>
          <h3 className="font-semibold text-white truncate">{clientName}</h3>
          <p className="text-small text-text-sub truncate mt-1">{description}</p>
          <div className="flex items-center gap-4 mt-3 text-small">
            <span className="text-text-muted font-mono">
              📅 {formatDate(dueDate)}
            </span>
            {amount != null && String(amount).trim() !== '' && (
              <span className="text-text-muted font-mono">
                ${Number(amount).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        {onRemind && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onRemind}
            disabled={loading}
          >
            📱 Recordar
          </Button>
        )}
        {onMarkPaid && status !== "paid" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkPaid}
            disabled={loading}
          >
            ✓ Pagado
          </Button>
        )}
        {onView && (
          <Button variant="ghost" size="sm" onClick={onView}>
            Ver
          </Button>
        )}
        
        {/* Pause and Time Adjust Quick Actions */}
        {status !== "paid" && onPause && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onPause}
            title="Pausar y aplazar avisos"
            className="hover:bg-primary/5 text-primary"
          >
            ⏸️ Pausar
          </Button>
        )}
        {status !== "paid" && onAdjustTime && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAdjustTime}
            title="Ajustar hora de envío"
            className="hover:bg-warning/5 text-warning"
          >
            🕒 Hora
          </Button>
        )}

        {onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-danger hover:bg-danger/10 ml-auto">
            🗑️
          </Button>
        )}
      </div>
    </div>
  );
}