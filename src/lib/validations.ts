import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "El usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const createUserSchema = z.object({
  email: z.string().min(2, "El usuario es requerido"),
  password: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
  businessName: z.string().min(2, "El nombre del negocio es requerido"),
  businessType: z.string().min(1, "Selecciona un tipo de negocio"),
  whatsappSender: z.string().optional(),
});

export const createClientSchema = z.object({
  name: z.string().min(2, "El nombre es requerido"), // Acepta nombres cortos sin forzar dos palabras
  phone: z.string().min(8, "El teléfono es requerido"),
  notes: z.string().optional(),
});

export const createRecordSchema = z.object({
  clientId: z.string().uuid("Selecciona un cliente"),
  description: z.string().min(3, "La descripción es requerida"),
  amount: z.string().optional().transform((v) => (v ? parseFloat(v) : undefined)),
  dueDate: z.string().min(1, "La fecha de vencimiento es requerida"),
  issueDate: z.string().min(1, "La fecha de ingreso es requerida"),
  notes: z.string().optional(),
  reminderDates: z.array(z.string()).optional(), // Array de fechas de avisos personalizadas
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type CreateRecordInput = z.infer<typeof createRecordSchema>;