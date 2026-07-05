import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function isOverdue(dueDate: Date | string): boolean {
  const d = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

export function isDueToday(dueDate: Date | string): boolean {
  const d = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() === today.getTime();
}

/**
 * Formatea un número de teléfono para que use el prefijo de Ecuador (593)
 * sin el símbolo '+' y sin espacios ni guiones.
 */
export function formatEcuadorPhone(phone: string): string {
  // Eliminar todo lo que no sea número o el símbolo +
  let clean = phone.replace(/[^\d+]/g, "");

  // Si tiene el símbolo +, se lo quitamos
  if (clean.startsWith("+")) {
    clean = clean.substring(1);
  }

  // Si ya tiene el prefijo de Ecuador
  if (clean.startsWith("593")) {
    return clean;
  }

  // Si empieza con 0 y tiene 10 dígitos (ej: 0967491847) -> quitar el 0 inicial y poner 593
  if (clean.startsWith("0") && clean.length === 10) {
    return "593" + clean.substring(1);
  }

  // Si tiene 9 dígitos (ej: 967491847) -> anteponer 593
  if (clean.length === 9) {
    return "593" + clean;
  }

  // En cualquier otro caso devolvemos el número limpio
  return clean;
}