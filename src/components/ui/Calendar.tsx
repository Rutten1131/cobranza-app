"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  status: "pending" | "overdue" | "today" | "paid";
}

interface CalendarProps {
  events: CalendarEvent[];
  onDayClick?: (date: Date, events: CalendarEvent[]) => void;
  className?: string;
}

export function Calendar({ events, onDayClick, className }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((event) => {
      const key = format(event.date, "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(event);
    });
    return map;
  }, [events]);

  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const getStatusColor = (status: CalendarEvent["status"]) => {
    switch (status) {
      case "overdue":
        return "bg-danger/20 text-danger border-danger";
      case "today":
        return "bg-warning/20 text-warning border-warning";
      case "paid":
        return "bg-accent/20 text-accent border-accent";
      default:
        return "bg-primary/10 text-primary border-primary";
    }
  };

  return (
    <div className={cn("card-float p-5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-white/5 rounded-md transition-colors text-text-sub"
        >
          ←
        </button>
        <h3 className="text-h2 font-display text-white capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-white/5 rounded-md transition-colors text-text-sub"
        >
          →
        </button>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-small font-medium text-text-muted py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay[key] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isDayToday = isToday(day);

          return (
            <button
              key={key}
              onClick={() => onDayClick?.(day, dayEvents)}
              disabled={!isCurrentMonth}
              className={cn(
                "min-h-[60px] p-1 rounded-sm border text-left transition-all",
                isCurrentMonth ? "bg-surface" : "bg-surface/50",
                isDayToday && "border-primary ring-1 ring-primary",
                isCurrentMonth && "hover:border-primary cursor-pointer hover:bg-surface/80",
                !isCurrentMonth && "cursor-default"
              )}
            >
              <span
                className={cn(
                  "text-small font-mono",
                  isCurrentMonth ? "text-text-main" : "text-text-muted",
                  isDayToday && "font-bold"
                )}
              >
                {format(day, "d")}
              </span>
              {dayEvents.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map((event, idx) => (
                    <div
                      key={event.id}
                      className={cn(
                        "text-[10px] px-1 py-0.5 rounded border truncate",
                        getStatusColor(event.status)
                      )}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-text-muted text-center">
                      +{dayEvents.length - 2}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-danger/20 border border-danger" />
          <span className="text-small text-text-sub">Vencido</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-warning/20 border border-warning" />
          <span className="text-small text-text-sub">Hoy</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-primary/10 border border-primary" />
          <span className="text-small text-text-sub">Pendiente</span>
        </div>
      </div>
    </div>
  );
}