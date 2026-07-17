"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Button, StatCard, RecordCard, EmptyState, Modal, Input, showToast } from "@/components/ui";
import { Calendar } from "@/components/ui/Calendar";
import { useAuth } from "@/components/providers";
import * as XLSX from "xlsx";

interface Client {
  id: string;
  name: string;
  phone: string;
  notes?: string | null;
}

interface Record {
  id: string;
  description: string;
  amount: number | null;
  dueDate: string;
  status: "pending" | "paid" | "overdue";
  reminderSent: boolean;
  client: Client;
  inventoryItemId?: string | null;
  reminderSchedule?: any[];
}

export default function UserDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<"dashboard" | "clientes">("dashboard");

  // General States
  const [records, setRecords] = useState<Record[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterDate, setFilterDate] = useState<Date | null>(null);

  // New Client Specific States (standalone client management tab)
  const [clientSearch, setClientSearch] = useState("");
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [clientForm, setClientForm] = useState({ name: "", phone: "", notes: "" });

  // Inventory Specific States (standalone inventory tab)
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryStockFilter, setInventoryStockFilter] = useState<"all" | "available" | "out">("all");
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
  const [showEditInventoryModal, setShowEditInventoryModal] = useState(false);
  const [editingInventoryItem, setEditingInventoryItem] = useState<any | null>(null);
  const [inventoryForm, setInventoryForm] = useState({
    name: "",
    description: "",
    sku: "",
    price: "",
    stock: "1",
  });
  const [importingExcel, setImportingExcel] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Smart Excel Mapper States
  const [showExcelMapperModal, setShowExcelMapperModal] = useState(false);
  const [excelRawRows, setExcelRawRows] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelMapping, setExcelMapping] = useState<{ [key: string]: string }>({
    name: "",
    description: "",
    sku: "",
    price: "",
    stock: "",
  });
  const [selectedCustomCols, setSelectedCustomCols] = useState<string[]>([]);

  // Manual custom fields builder state for Create/Edit item forms
  const [manualCustomFields, setManualCustomFields] = useState<{ key: string; value: string }[]>([]);

  // Pause & Clock Modals States
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pausingRecordId, setPausingRecordId] = useState<string | null>(null);
  const [pauseDays, setPauseDays] = useState("3");

  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timingRecordId, setTimingRecordId] = useState<string | null>(null);
  const [newSendTime, setNewSendTime] = useState("08:00");

  const [newRecord, setNewRecord] = useState({
    clientId: "",
    description: "",
    amount: "",
    dueDate: "",
    issueDate: new Date().toISOString().split('T')[0],
    customMessage: "",
    inventoryItemId: "",
  });
  const [reminderDates, setReminderDates] = useState<string[]>([]);
  const [newReminderDate, setNewReminderDate] = useState("");
  const [newClient, setNewClient] = useState({ name: "", phone: "" });
  const [showNewClient, setShowNewClient] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "overdue">("all");
  const [whatsappStatus, setWhatsappStatus] = useState<"loading" | "connected" | "disconnected" | "connecting">("loading");
  const [whatsappQR, setWhatsappQR] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [detailedRecord, setDetailedRecord] = useState<any | null>(null);
  const [loadingDetailedRecord, setLoadingDetailedRecord] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCustomMessage, setEditCustomMessage] = useState("");
  const [editReminderDates, setEditReminderDates] = useState<string[]>([]);
  const [newEditReminderDate, setNewEditReminderDate] = useState("");
  const [newEditReminderTime, setNewEditReminderTime] = useState("08:00");
  const [isEditingDetailedRecord, setIsEditingDetailedRecord] = useState(false);
  const [currentSystem, setCurrentSystem] = useState<"cobranzas" | "habitaciones">("cobranzas");

  useEffect(() => {
    if (!authLoading && user?.role !== "user" && user?.role !== "admin") {
      router.push("/login");
      return;
    }
    if (user) {
      fetchData();
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    try {
      const [recordsRes, clientsRes, inventoryRes] = await Promise.all([
        fetch("/api/records"),
        fetch("/api/clients"),
        fetch("/api/inventory"),
      ]);

      const recordsData = await recordsRes.json();
      const clientsData = await clientsRes.json();
      const inventoryData = await inventoryRes.json();

      if (recordsRes.ok) setRecords(recordsData.records);
      if (clientsRes.ok) setClients(clientsData.clients);
      if (inventoryRes.ok) setInventoryItems(inventoryData.items || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedRecord = async (id: string) => {
    setLoadingDetailedRecord(true);
    try {
      const res = await fetch(`/api/records/${id}`);
      const data = await res.json();
      if (res.ok) {
        setDetailedRecord(data.record);
      } else {
        showToast(data.error || "Error al cargar detalles del registro", "error");
      }
    } catch {
      showToast("Error de conexión al cargar detalles", "error");
    } finally {
      setLoadingDetailedRecord(false);
    }
  };

  const startEditingRecord = () => {
    if (!detailedRecord) return;
    setEditDescription(detailedRecord.description);
    setEditAmount(detailedRecord.amount ? String(detailedRecord.amount) : "");
    setEditCustomMessage(detailedRecord.customMessage || "");
    const dates = detailedRecord.reminderSchedule?.map((s: any) => {
      const d = new Date(s.scheduledDate);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }) || [];
    setEditReminderDates(dates);
    setIsEditingDetailedRecord(false); // Empezar desactivado por si acaso, pero lo seteamos a true inmediatamente en UI
    setIsEditingDetailedRecord(true);
  };

  const handleAddEditReminder = () => {
    if (!newEditReminderDate) return;
    const combined = `${newEditReminderDate}T${newEditReminderTime || "08:00"}`;
    if (editReminderDates.includes(combined)) {
      showToast("Esta fecha ya está en el cronograma", "error");
      return;
    }
    const updated = [...editReminderDates, combined].sort();
    setEditReminderDates(updated);
    setNewEditReminderDate("");
  };

  const handleRemoveEditReminder = (dateToRemove: string) => {
    setEditReminderDates(editReminderDates.filter(d => d !== dateToRemove));
  };

  const handleSaveEditedRecord = async () => {
    if (!selectedRecordId) return;
    if (!editDescription) {
      showToast("La descripción es obligatoria", "error");
      return;
    }
    if (editReminderDates.length === 0) {
      showToast("Debe haber al menos un aviso programado", "error");
      return;
    }

    try {
      const res = await fetch(`/api/records/${selectedRecordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editDescription,
          amount: editAmount ? parseFloat(editAmount) : null,
          reminderSchedule: editReminderDates.map(dateStr => ({ scheduledDate: dateStr })),
          customMessage: editCustomMessage || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Registro actualizado exitosamente", "success");
        setIsEditingDetailedRecord(false);
        fetchData();
        fetchDetailedRecord(selectedRecordId);
      } else {
        showToast(data.error || "Error al actualizar registro", "error");
      }
    } catch {
      showToast("Error de conexión al actualizar", "error");
    }
  };

  const fetchWhatsAppStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp");
      const data = await res.json();
      console.log("[Dashboard] WhatsApp status response:", data.status, "QR:", data.qrcode ? "YES" : "NO");
      if (res.ok) {
        if (data.status === "connected" || data.status === "open") {
          setWhatsappStatus("connected");
          setWhatsappQR(null);
        } else {
          setWhatsappStatus("disconnected");
          setWhatsappQR(data.qrcode || null);
        }
      } else {
        setWhatsappStatus("disconnected");
      }
    } catch {
      setWhatsappStatus("disconnected");
    }
  };

  const handleWhatsAppDisconnect = async () => {
    try {
      setWhatsappStatus("loading"); // mostrar loading mientras desconecta
      const res = await fetch("/api/whatsapp", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("WhatsApp desconectado", "success");
        setWhatsappStatus("disconnected");
        setWhatsappQR(data.qrcode || null);
      } else {
        showToast("Error al desconectar", "error");
        fetchWhatsAppStatus();
      }
    } catch {
      showToast("Error de conexión", "error");
      fetchWhatsAppStatus();
    }
  };

  useEffect(() => {
    if (user) {
      fetchWhatsAppStatus();
    }
  }, [user]);

  // Auto-refresh WhatsApp status when not connected (to detect connection after scan)
  useEffect(() => {
    if (user && whatsappStatus !== "connected") {
      const interval = setInterval(() => {
        console.log("[Dashboard] Auto-checking WhatsApp status...");
        fetchWhatsAppStatus();
      }, 4000); // Check every 4 seconds
      
      return () => clearInterval(interval);
    }
  }, [user, whatsappStatus]);

  const [newReminderTime, setNewReminderTime] = useState("08:00");
  const [showConfig, setShowConfig] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"avisos" | "whatsapp" | "inventario">("avisos");
  const [cfgDays, setCfgDays] = useState(5);
  const [cfgTime, setCfgTime] = useState("08:00");
  const [cfgMessage, setCfgMessage] = useState("");
  const [savingCfg, setSavingCfg] = useState(false);

  // Sync config states with authenticated user
  useEffect(() => {
    if (user) {
      setCfgDays(user.defaultReminderDays ?? 5);
      setCfgTime(user.defaultReminderTime ?? "08:00");
      setCfgMessage(user.defaultReminderMessage ?? "");
    }
  }, [user]);

  // Poller automático en background para mandar recordatorios según la hora exacta programada
  useEffect(() => {
    if (!user) return;

    // Ejecuta una revisión inicial
    fetch("/api/cron/reminders")
      .then(res => res.json())
      .then(data => {
        if (data.sent > 0) {
          console.log(`[Auto-Cron] Se enviaron ${data.sent} recordatorios de forma automática.`);
          fetchData(); // Refrescar UI si se enviaron mensajes
        }
      })
      .catch(err => console.error("[Auto-Cron Error]", err));

    // Ejecuta la revisión cada 60 segundos
    const interval = setInterval(() => {
      fetch("/api/cron/reminders")
        .then(res => res.json())
        .then(data => {
          if (data.sent > 0) {
            console.log(`[Auto-Cron] Se enviaron ${data.sent} recordatorios de forma automática.`);
            fetchData();
          }
        })
        .catch(err => console.error("[Auto-Cron Error]", err));
    }, 60000);

    return () => clearInterval(interval);
  }, [user]);

  // Helper to initialize default reminder dates consecutively starting from dateStr with user defaults
  const initializeDefaultReminders = (dateStr: string) => {
    if (!dateStr) return;
    const dates = [];
    const totalDays = user?.defaultReminderDays ?? 5;
    const timeVal = user?.defaultReminderTime ?? "08:00";
    
    for (let i = 0; i < totalDays; i++) {
      const start = new Date(dateStr + "T00:00:00");
      start.setDate(start.getDate() + i);
      const datePart = start.toISOString().split("T")[0];
      dates.push(`${datePart}T${timeVal}`);
    }
    setReminderDates(dates);
  };

  // Sync default reminders whenever issueDate (primer aviso) changes
  const handleIssueDateChange = (dateStr: string) => {
    setNewRecord(prev => ({ ...prev, issueDate: dateStr, dueDate: dateStr }));
    initializeDefaultReminders(dateStr);
  };

  const handleAddReminderDate = () => {
    if (!newReminderDate) return;
    const combined = `${newReminderDate}T${newReminderTime || "08:00"}`;
    if (reminderDates.includes(combined)) {
      showToast("Esta fecha y hora ya están agregadas", "error");
      return;
    }
    const updated = [...reminderDates, combined].sort();
    setReminderDates(updated);
    setNewReminderDate("");
  };

  const handleRemoveReminderDate = (dateToRemove: string) => {
    setReminderDates(reminderDates.filter(d => d !== dateToRemove));
  };

  // Initialize today's reminders if empty
  useEffect(() => {
    if (showCreateModal && reminderDates.length === 0) {
      const todayStr = new Date().toISOString().split("T")[0];
      setNewRecord(prev => ({ ...prev, issueDate: todayStr, dueDate: todayStr }));
      initializeDefaultReminders(todayStr);
    }
  }, [showCreateModal]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCfg(true);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultReminderDays: cfgDays, defaultReminderTime: cfgTime, defaultReminderMessage: cfgMessage || null }),
      });
      if (res.ok) {
        showToast("Configuración predeterminada guardada", "success");
        if (user) {
          user.defaultReminderDays = cfgDays;
          user.defaultReminderTime = cfgTime;
          user.defaultReminderMessage = cfgMessage || undefined;
        }
        setShowConfig(false);
      } else {
        const d = await res.json();
        showToast(d.error || "Error al guardar", "error");
      }
    } catch {
      showToast("Error de red", "error");
    } finally {
      setSavingCfg(false);
    }
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reminderDates.length === 0) {
      showToast("Debes configurar al menos una fecha de aviso", "error");
      return;
    }
    setCreating(true);

    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newRecord,
          // La dueDate en DB será la última fecha de recordatorios
          dueDate: reminderDates[reminderDates.length - 1],
          reminderDates,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Error al crear registro", "error");
        return;
      }

      showToast("Registro creado exitosamente", "success");
      setShowCreateModal(false);
      setNewRecord({ clientId: "", description: "", amount: "", dueDate: "", issueDate: new Date().toISOString().split('T')[0], customMessage: "", inventoryItemId: "" });
      setReminderDates([]);
      setShowNewClient(false);
      fetchData();
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClient),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Error al crear cliente", "error");
        return;
      }

      showToast("Cliente creado exitosamente", "success");
      setNewClient({ name: "", phone: "" });
      setShowNewClient(false);
      setNewRecord({ ...newRecord, clientId: data.client.id });
      fetchData();
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleRemind = async (recordId: string) => {
    try {
      const res = await fetch(`/api/records/${recordId}/remind`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, "success");
        fetchData();
        if (selectedRecordId === recordId) {
          fetchDetailedRecord(recordId);
        }
      } else {
        showToast(data.error || "Error al enviar recordatorio", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  };

  const handleMarkPaid = async (recordId: string) => {
    try {
      const res = await fetch(`/api/records/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });

      if (res.ok) {
        showToast("Registrado como pagado", "success");
        fetchData();
        if (selectedRecordId === recordId) {
          fetchDetailedRecord(recordId);
        }
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm("¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/records/${recordId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Registro eliminado correctamente", "success");
        if (selectedRecordId === recordId) {
          setSelectedRecordId(null);
          setDetailedRecord(null);
        }
        fetchData();
      } else {
        showToast("Error al eliminar el registro", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  };

  const executePauseRecord = async () => {
    if (!pausingRecordId) return;
    const days = parseInt(pauseDays);
    if (isNaN(days) || days <= 0) {
      showToast("Ingresa un número de días válido", "error");
      return;
    }

    try {
      // Obtener el registro detallado o buscar en el estado local de records
      const targetRecord = records.find(r => r.id === pausingRecordId);
      if (!targetRecord) {
        showToast("Registro no encontrado", "error");
        return;
      }

      // Si no tiene cronograma, no hay nada que pausar
      if (!targetRecord.reminderSchedule || targetRecord.reminderSchedule.length === 0) {
        showToast("El registro no tiene cronograma de avisos programados", "error");
        return;
      }

      // Desplazar fechas de avisos pendientes
      const updatedSchedule = targetRecord.reminderSchedule.map((schedule: any) => {
        const d = new Date(schedule.scheduledDate);
        // Solo sumamos días a los que siguen pendientes
        if (schedule.status === "pending") {
          d.setDate(d.getDate() + days);
        }
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");

        return {
          scheduledDate: `${year}-${month}-${day}T${hours}:${minutes}`,
          status: schedule.status
        };
      });

      const res = await fetch(`/api/records/${pausingRecordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reminderSchedule: updatedSchedule
        })
      });

      if (res.ok) {
        showToast(`Avisos pausados y aplazados por ${days} días`, "success");
        setShowPauseModal(false);
        setPausingRecordId(null);
        fetchData();
        if (selectedRecordId === pausingRecordId) {
          fetchDetailedRecord(pausingRecordId);
        }
      } else {
        showToast("Error al pausar avisos", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  };

  const executeAdjustRecordTime = async () => {
    if (!timingRecordId) return;
    if (!newSendTime) {
      showToast("Selecciona una hora de envío", "error");
      return;
    }

    try {
      const targetRecord = records.find(r => r.id === timingRecordId);
      if (!targetRecord) {
        showToast("Registro no encontrado", "error");
        return;
      }

      if (!targetRecord.reminderSchedule || targetRecord.reminderSchedule.length === 0) {
        showToast("El registro no tiene avisos programados", "error");
        return;
      }

      // Cambiar la hora de los avisos pendientes
      const [newHours, newMinutes] = newSendTime.split(":");
      const updatedSchedule = targetRecord.reminderSchedule.map((schedule: any) => {
        const d = new Date(schedule.scheduledDate);
        if (schedule.status === "pending") {
          d.setHours(parseInt(newHours), parseInt(newMinutes), 0, 0);
        }
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");

        return {
          scheduledDate: `${year}-${month}-${day}T${hours}:${minutes}`,
          status: schedule.status
        };
      });

      const res = await fetch(`/api/records/${timingRecordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reminderSchedule: updatedSchedule
        })
      });

      if (res.ok) {
        showToast(`Hora de envío actualizada a las ${newSendTime}`, "success");
        setShowTimeModal(false);
        setTimingRecordId(null);
        fetchData();
        if (selectedRecordId === timingRecordId) {
          fetchDetailedRecord(timingRecordId);
        }
      } else {
        showToast("Error al ajustar la hora", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  };

  // Inventory & Client Tab Helper Handlers
  const handleCreateInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryForm.name) {
      showToast("El nombre es obligatorio", "error");
      return;
    }
    setCreating(true);

    // Transformar manualCustomFields en un objeto
    const customFieldsObj: { [key: string]: string } = {};
    manualCustomFields.forEach((f) => {
      if (f.key.trim()) {
        customFieldsObj[f.key.trim()] = f.value;
      }
    });

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...inventoryForm,
          customFields: Object.keys(customFieldsObj).length > 0 ? customFieldsObj : null,
        }),
      });
      if (res.ok) {
        showToast("Producto agregado al inventario", "success");
        setShowAddInventoryModal(false);
        setInventoryForm({ name: "", description: "", sku: "", price: "", stock: "1" });
        setManualCustomFields([]);
        fetchData();
      } else {
        const d = await res.json();
        showToast(d.error || "Error al crear producto", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleEditInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInventoryItem) return;

    // Transformar manualCustomFields en un objeto
    const customFieldsObj: { [key: string]: string } = {};
    manualCustomFields.forEach((f) => {
      if (f.key.trim()) {
        customFieldsObj[f.key.trim()] = f.value;
      }
    });

    try {
      const res = await fetch(`/api/inventory/${editingInventoryItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingInventoryItem.name,
          description: editingInventoryItem.description,
          sku: editingInventoryItem.sku,
          price: editingInventoryItem.price,
          stock: editingInventoryItem.stock,
          availableStock: editingInventoryItem.availableStock,
          customFields: Object.keys(customFieldsObj).length > 0 ? customFieldsObj : null,
        }),
      });
      if (res.ok) {
        showToast("Producto actualizado", "success");
        setShowEditInventoryModal(false);
        setEditingInventoryItem(null);
        setManualCustomFields([]);
        fetchData();
      } else {
        const d = await res.json();
        showToast(d.error || "Error al actualizar", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  };

  const handleDeleteInventoryItem = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este producto del inventario?")) return;
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Producto eliminado", "success");
        fetchData();
      } else {
        showToast("Error al eliminar", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingExcel(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) {
        showToast("El archivo Excel está vacío", "error");
        setImportingExcel(false);
        return;
      }

      // Obtener todas las claves únicas (headers) de las filas
      const headers = Array.from(
        new Set(rows.flatMap((r) => Object.keys(r)))
      );
      setExcelHeaders(headers);
      setExcelRawRows(rows);

      // Autodetectar mejores emparejamientos
      const mapping: { [key: string]: string } = {
        name: "",
        description: "",
        sku: "",
        price: "",
        stock: "",
      };

      headers.forEach((h) => {
        const lower = h.toLowerCase().trim();
        if (!mapping.name && ["nombre", "name", "producto", "artículo", "articulo", "item", "prenda", "título", "titulo"].includes(lower)) {
          mapping.name = h;
        } else if (!mapping.description && ["descripción", "descripcion", "description", "detalle", "detalles", "observación", "observacion", "nota", "notas"].includes(lower)) {
          mapping.description = h;
        } else if (!mapping.sku && ["sku", "código", "codigo", "code", "ref", "referencia", "id"].includes(lower)) {
          mapping.sku = h;
        } else if (!mapping.price && ["precio", "price", "alquiler", "costo", "monto", "valor", "cost"].includes(lower)) {
          mapping.price = h;
        } else if (!mapping.stock && ["stock", "cantidad", "stock total", "stock_total", "existencias", "cant", "qty", "quantity"].includes(lower)) {
          mapping.stock = h;
        }
      });

      // Si no autodetectó Nombre, asigna la primera columna por defecto
      if (!mapping.name && headers.length > 0) {
        mapping.name = headers[0];
      }

      setExcelMapping(mapping);
      setSelectedCustomCols([]);
      setShowExcelMapperModal(true);
    } catch (err) {
      console.error("Excel import error:", err);
      showToast("Error al procesar el archivo Excel", "error");
    } finally {
      setImportingExcel(false);
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  const handleExecuteMappedImport = async () => {
    if (!excelMapping.name) {
      showToast("Debes seleccionar obligatoriamente una columna para el Nombre", "error");
      return;
    }

    setImportingExcel(true);
    try {
      const mapped = excelRawRows.map((row) => {
        const nameVal = row[excelMapping.name] ? String(row[excelMapping.name]).trim() : "";
        const descVal = excelMapping.description && row[excelMapping.description] ? String(row[excelMapping.description]).trim() : "";
        const skuVal = excelMapping.sku && row[excelMapping.sku] ? String(row[excelMapping.sku]).trim() : "";
        
        let priceVal = null;
        if (excelMapping.price && row[excelMapping.price] !== undefined) {
          const parsed = parseFloat(String(row[excelMapping.price]).replace(/[^0-9.-]/g, ""));
          if (!isNaN(parsed)) priceVal = parsed;
        }

        let stockVal = 1;
        if (excelMapping.stock && row[excelMapping.stock] !== undefined) {
          const parsed = parseInt(String(row[excelMapping.stock]).replace(/[^0-9]/g, ""));
          if (!isNaN(parsed)) stockVal = parsed;
        }

        // Construir campos personalizados dinámicos seleccionados
        const customFieldsObj: { [key: string]: any } = {};
        selectedCustomCols.forEach((col) => {
          if (row[col] !== undefined) {
            customFieldsObj[col] = row[col];
          }
        });

        return {
          name: nameVal,
          description: descVal || null,
          sku: skuVal || null,
          price: priceVal,
          stock: stockVal,
          customFields: Object.keys(customFieldsObj).length > 0 ? customFieldsObj : null,
        };
      });

      const validItems = mapped.filter((item) => item.name);

      if (validItems.length === 0) {
        showToast("No se encontraron productos con nombre válido para importar.", "error");
        return;
      }

      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validItems),
      });

      if (res.ok) {
        const result = await res.json();
        showToast(`${result.count} productos importados de forma inteligente`, "success");
        setShowExcelMapperModal(false);
        setExcelRawRows([]);
        setExcelHeaders([]);
        fetchData();
      } else {
        showToast("Error al procesar la importación", "error");
      }
    } catch (err) {
      console.error("Execute import error:", err);
      showToast("Error de conexión", "error");
    } finally {
      setImportingExcel(false);
    }
  };

  const handleCreateStandaloneClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Cliente creado exitosamente", "success");
        setShowAddClientModal(false);
        setClientForm({ name: "", phone: "", notes: "" });
        fetchData();
      } else {
        showToast(data.error || "Error al crear cliente", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteStandaloneClient = async (clientId: string) => {
    if (!confirm("¿Estás seguro de eliminar este cliente?")) return;
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Cliente eliminado", "success");
        fetchData();
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueCount = records.filter(
    (r) => r.status === "overdue" || (r.status === "pending" && new Date(r.dueDate) < today)
  ).length;

  const todayCount = records.filter((r) => {
    const due = new Date(r.dueDate);
    due.setHours(0, 0, 0, 0);
    return due.getTime() === today.getTime() && r.status === "pending";
  }).length;

  const paidCount = records.filter((r) => r.status === "paid").length;
  const pendingCount = records.filter((r) => r.status === "pending" || r.status === "overdue").length;

  const calendarEvents = useMemo(() => {
    const events: { id: string; title: string; date: Date; status: "pending" | "overdue" | "today" | "paid" }[] = [];
    
    // Paso 1: Recolectar avisos individuales por día (solo pendientes)
    const dayClientMap: { [dateKey: string]: { [clientName: string]: { count: number; worstStatus: "pending" | "overdue" | "today" } } } = {};
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);

    records.forEach((r) => {
      // Solo pendientes en el calendario
      if (r.status === "paid") return;

      if (r.reminderSchedule && r.reminderSchedule.length > 0) {
        r.reminderSchedule.forEach((schedule: any) => {
          const sDate = new Date(schedule.scheduledDate);
          sDate.setHours(0, 0, 0, 0);
          const dateKey = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, "0")}-${String(sDate.getDate()).padStart(2, "0")}`;

          let eventStatus: "pending" | "overdue" | "today" = "pending";
          if (sDate.getTime() === todayObj.getTime()) eventStatus = "today";
          else if (sDate < todayObj) eventStatus = "overdue";

          if (!dayClientMap[dateKey]) dayClientMap[dateKey] = {};
          if (!dayClientMap[dateKey][r.client.name]) {
            dayClientMap[dateKey][r.client.name] = { count: 0, worstStatus: "pending" };
          }
          dayClientMap[dateKey][r.client.name].count++;

          // Mantener el peor status (overdue > today > pending)
          const priority = { overdue: 3, today: 2, pending: 1 };
          if (priority[eventStatus] > priority[dayClientMap[dateKey][r.client.name].worstStatus]) {
            dayClientMap[dateKey][r.client.name].worstStatus = eventStatus;
          }
        });
      } else {
        // Fallback: usar dueDate si no hay schedule
        const dueDate = new Date(r.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const dateKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;

        let eventStatus: "pending" | "overdue" | "today" = "pending";
        if (dueDate.getTime() === todayObj.getTime()) eventStatus = "today";
        else if (dueDate < todayObj) eventStatus = "overdue";

        if (!dayClientMap[dateKey]) dayClientMap[dateKey] = {};
        if (!dayClientMap[dateKey][r.client.name]) {
          dayClientMap[dateKey][r.client.name] = { count: 0, worstStatus: "pending" };
        }
        dayClientMap[dateKey][r.client.name].count++;
        const priority = { overdue: 3, today: 2, pending: 1 };
        if (priority[eventStatus] > priority[dayClientMap[dateKey][r.client.name].worstStatus]) {
          dayClientMap[dateKey][r.client.name].worstStatus = eventStatus;
        }
      }
    });

    // Paso 2: Convertir en eventos agrupados
    Object.entries(dayClientMap).forEach(([dateKey, clients]) => {
      const clientNames = Object.keys(clients);
      const date = new Date(dateKey + "T00:00:00");
      const MAX_VISIBLE_CLIENTS = 4;

      if (clientNames.length <= MAX_VISIBLE_CLIENTS) {
        // Mostrar nombres individuales agrupados por cliente
        clientNames.forEach((clientName) => {
          const data = clients[clientName];
          events.push({
            id: `${dateKey}-${clientName}`,
            title: data.count > 1 ? `🔔 ${clientName} (${data.count})` : `🔔 ${clientName}`,
            date,
            status: data.worstStatus,
          });
        });
      } else {
        // Demasiados clientes: colapsar a un solo badge
        const totalAvisos = Object.values(clients).reduce((sum, c) => sum + c.count, 0);
        // Determinar peor status del día
        let worstStatus: "pending" | "overdue" | "today" = "pending";
        const priority = { overdue: 3, today: 2, pending: 1 };
        Object.values(clients).forEach((c) => {
          if (priority[c.worstStatus] > priority[worstStatus]) {
            worstStatus = c.worstStatus;
          }
        });

        events.push({
          id: `${dateKey}-summary`,
          title: `📌 ${totalAvisos} avisos (${clientNames.length} clientes)`,
          date,
          status: worstStatus,
        });
      }
    });

    return events;
  }, [records]);

  const handleDayClick = (date: Date, events: typeof calendarEvents) => {
    // Si ya está seleccionada la misma fecha, quitamos el filtro, si no, la filtramos
    if (filterDate && isSameDay(date, new Date(filterDate))) {
      setFilterDate(null);
    } else {
      setFilterDate(date);
    }
  };

  const filteredRecords = useMemo(() => {
    let result = records.filter((r) => {
      // Si no hay búsqueda ni filtro de fecha, ocultamos los pagados
      if (!searchTerm && !filterDate && r.status === "paid") return false;
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = r.client.name.toLowerCase().includes(term);
        const matchesPhone = r.client.phone.includes(term);
        const matchesDesc = r.description.toLowerCase().includes(term);
        if (!matchesName && !matchesPhone && !matchesDesc) return false;
      }

      if (filterDate) {
        const fDate = new Date(filterDate);
        fDate.setHours(0, 0, 0, 0);

        if (r.reminderSchedule && r.reminderSchedule.length > 0) {
          const hasReminderOnDay = r.reminderSchedule.some((schedule: any) => {
            const sDate = new Date(schedule.scheduledDate);
            sDate.setHours(0, 0, 0, 0);
            return sDate.getTime() === fDate.getTime();
          });
          if (!hasReminderOnDay) return false;
        } else {
          const dueDate = new Date(r.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate.getTime() !== fDate.getTime()) return false;
        }
      }
      return true;
    });

    // Ordenar: No Pagados (pendientes/vencidos) van primero, Pagados van al final
    return result.sort((a, b) => {
      if (a.status !== "paid" && b.status === "paid") return -1;
      if (a.status === "paid" && b.status !== "paid") return 1;
      // Mantener orden cronológico por fecha de vencimiento dentro del mismo grupo
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [records, searchTerm, filterDate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-sub">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="bg-background-secondary/80 backdrop-blur-md border-b border-glass sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="text-xl font-display font-bold text-white">
              {user?.businessName || "CobrApp"}
            </span>
            {/* System Switcher */}
            {(Number(user?.hasCobranzas) + Number(user?.hasHabitaciones) + Number(user?.hasBarberia) > 1) && (
              <select
                value="cobranzas"
                onChange={(e) => {
                  if (e.target.value === "habitaciones") {
                    router.push("/app/habitaciones");
                  } else if (e.target.value === "barberia") {
                    router.push("/app/barberia");
                  }
                }}
                className="ml-2 text-xs font-semibold px-2 py-1 rounded-sm border border-primary/30 bg-primary/5 text-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
              >
                {user?.hasCobranzas && <option value="cobranzas">💰 Cobranzas</option>}
                {user?.hasHabitaciones && <option value="habitaciones">🏨 Habitaciones</option>}
                {user?.hasBarberia && <option value="barberia">✂️ Barbería</option>}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-small text-text-sub mr-1">
              {pendingCount} pendientes
            </span>
            <Button variant="ghost" size="sm" onClick={logout}>
              Salir
            </Button>
          </div>
        </div>
        {/* Navigation Tabs Bar */}
        <div className="border-t border-border bg-card">
          <div className="max-w-3xl mx-auto px-4 flex">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex-1 sm:flex-initial px-5 py-3.5 text-small font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
                activeTab === "dashboard"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-sub hover:text-text-main"
              }`}
            >
              📅 Calendario
            </button>

            <button
              onClick={() => setActiveTab("clientes")}
              className={`flex-1 sm:flex-initial px-5 py-3.5 text-small font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
                activeTab === "clientes"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-sub hover:text-text-main"
              }`}
            >
              👥 Clientes
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* ======================== TAB: DASHBOARD ======================== */}
        {activeTab === "dashboard" && (
          <>
        {/* Search and Filters */}
        <div className="space-y-3 mb-4">
          <Input placeholder="Buscar por nombre, teléfono o descripción..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <div className="flex gap-2 flex-wrap items-center">
            <Input
              type="date"
              value={filterDate ? format(filterDate, "yyyy-MM-dd") : ""}
              onChange={(e) => setFilterDate(e.target.value ? new Date(e.target.value) : null)}
              className="max-w-[200px]"
            />
            {(searchTerm || filterDate) && (
              <Button variant="secondary" size="sm" onClick={() => { setSearchTerm(""); setFilterDate(null); }}>Limpiar</Button>
            )}
          </div>
        </div>

        {/* Pending Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-h2 font-display text-text-main">
              {filterDate 
                ? `Avisos del ${format(new Date(filterDate), "d 'de' MMMM", { locale: es })}`
                : "Avisos Pendientes"}
            </h2>
            {filterDate && (
              <button
                onClick={() => setFilterDate(null)}
                className="text-[11px] px-2 py-0.5 rounded-full bg-danger/10 text-danger hover:bg-danger/20 transition-colors flex items-center gap-1 font-semibold"
                title="Quitar filtro de fecha"
              >
                Filtrado ✕
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-small text-text-muted">{filteredRecords.length} registros</span>
            <button
              onClick={() => setShowConfig(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-small font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-sm transition-colors"
              title="Configurar avisos por defecto"
            >
              ⚙️ Ajustes de Avisos
            </button>
          </div>
        </div>

        <Button className="w-full mb-4" onClick={() => setShowCreateModal(true)}>
          + Nuevo registro
        </Button>

        {/* Records List — Sectioned */}
        {(() => {
          const pendingRecords = filteredRecords.filter(r => r.status !== "paid");
          const paidRecords = filteredRecords.filter(r => r.status === "paid");
          const showPaidSection = (searchTerm || filterDate) && paidRecords.length > 0;

          return (
            <>
              {/* Pending Section */}
              {pendingRecords.length === 0 && !showPaidSection ? (
                <EmptyState
                  icon="📋"
                  title="No hay registros pendientes"
                  description="Crea un nuevo registro para comenzar a gestionar tus cobros"
                  action={
                    <Button onClick={() => setShowCreateModal(true)}>
                      + Nuevo registro
                    </Button>
                  }
                />
              ) : (
                <>
                  {pendingRecords.length > 0 && (
                    <div className="space-y-3">
                      <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">⏳ Pendientes ({pendingRecords.length})</span>
                      {pendingRecords.map((record) => (
                        <RecordCard
                          key={record.id}
                          id={record.id}
                          clientName={record.client.name}
                          description={record.description}
                          amount={record.amount}
                          dueDate={record.dueDate}
                          status={record.status}
                          onRemind={() => handleRemind(record.id)}
                          onMarkPaid={() => handleMarkPaid(record.id)}
                          onDelete={() => handleDeleteRecord(record.id)}
                          onPause={() => {
                            setPausingRecordId(record.id);
                            setShowPauseModal(true);
                          }}
                          onAdjustTime={() => {
                            setTimingRecordId(record.id);
                            setShowTimeModal(true);
                          }}
                          onView={() => {
                            setSelectedRecordId(record.id);
                            fetchDetailedRecord(record.id);
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Paid / History Section */}
                  {showPaidSection && (
                    <div className="space-y-3 mt-6 pt-4 border-t border-border/60">
                      <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">✅ Pagados — Historial ({paidRecords.length})</span>
                      {paidRecords.map((record) => (
                        <RecordCard
                          key={record.id}
                          id={record.id}
                          clientName={record.client.name}
                          description={record.description}
                          amount={record.amount}
                          dueDate={record.dueDate}
                          status={record.status}
                          onDelete={() => handleDeleteRecord(record.id)}
                          onView={() => {
                            setSelectedRecordId(record.id);
                            fetchDetailedRecord(record.id);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          );
        })()}

        {/* Calendar */}
        <Calendar events={calendarEvents} onDayClick={handleDayClick} className="mt-8 mb-6" />

        {/* Day Summary */}
        {selectedDate && (
          <div className="bg-card rounded-md shadow-card border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h2 font-display text-text-main">📅 {format(selectedDate, "dd 'de' MMMM yyyy")}</h3>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { 
                  setNewRecord({ ...newRecord, dueDate: format(selectedDate, 'yyyy-MM-dd') }); 
                  setShowCreateModal(true); 
                }}>
                  + Agregar registro
                </Button>
                <button onClick={() => setSelectedDate(null)} className="text-text-muted hover:text-text-main">✕</button>
              </div>
            </div>
            
            {/* Stats for selected day */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-danger/10 border border-danger/20 rounded-sm p-3 text-center">
                <p className="text-small text-text-muted">Vencido</p>
                <p className="text-h1 font-display text-danger">{records.filter(r => { const d = new Date(r.dueDate); d.setHours(0,0,0,0); return d.getTime() === selectedDate.getTime() && (r.status === 'overdue' || (r.status === 'pending' && d < today)); }).length}</p>
              </div>
              <div className="bg-warning/10 border border-warning/20 rounded-sm p-3 text-center">
                <p className="text-small text-text-muted">Hoy</p>
                <p className="text-h1 font-display text-warning">{records.filter(r => { const d = new Date(r.dueDate); d.setHours(0,0,0,0); return d.getTime() === selectedDate.getTime() && r.status === 'pending'; }).length}</p>
              </div>
              <div className="bg-primary/10 border border-primary/20 rounded-sm p-3 text-center">
                <p className="text-small text-text-muted">Pendiente</p>
                <p className="text-h1 font-display text-primary">{records.filter(r => { const d = new Date(r.dueDate); d.setHours(0,0,0,0); return d.getTime() === selectedDate.getTime() && r.status === 'pending'; }).length}</p>
              </div>
              <div className="bg-accent/10 border border-accent/20 rounded-sm p-3 text-center">
                <p className="text-small text-text-muted">Pagado</p>
                <p className="text-h1 font-display text-accent">{records.filter(r => { const d = new Date(r.dueDate); d.setHours(0,0,0,0); return d.getTime() === selectedDate.getTime() && r.status === 'paid'; }).length}</p>
              </div>
            </div>

            {/* Records for selected day */}
            <div className="space-y-2">
              {records.filter(r => { const d = new Date(r.dueDate); d.setHours(0,0,0,0); return d.getTime() === selectedDate.getTime(); }).map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedRecordId(r.id);
                    fetchDetailedRecord(r.id);
                  }}
                  className="w-full flex items-center justify-between p-3 bg-surface hover:bg-primary/5 border border-border hover:border-primary/30 rounded-sm text-left transition-all"
                >
                  <div>
                    <p className="font-semibold text-text-main">{r.client.name}</p>
                    <p className="text-small text-text-sub mt-0.5">{r.description}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    {r.amount && <p className="font-mono font-bold text-text-main">${Number(r.amount).toFixed(2)}</p>}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${r.status === 'paid' ? 'bg-accent/15 text-accent' : r.status === 'overdue' ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning'}`}>
                      {r.status === 'paid' ? 'Pagado' : r.status === 'overdue' ? 'Vencido' : 'Pendiente'}
                    </span>
                  </div>
                </button>
              ))}
              {records.filter(r => { const d = new Date(r.dueDate); d.setHours(0,0,0,0); return d.getTime() === selectedDate.getTime(); }).length === 0 && (
                <p className="text-center text-text-muted py-4">No hay registros para este día</p>
              )}
            </div>
          </div>
        )}
          </>
        )}


        {/* ======================== TAB: CLIENTES ======================== */}
        {activeTab === "clientes" && (
          <>
            <div className="flex gap-3 mb-6">
              <Input
                placeholder="Buscar por nombre o teléfono..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="flex-1"
              />
              <Button onClick={() => setShowAddClientModal(true)}>+ Nuevo</Button>
            </div>

            {(() => {
              const filtered = clients.filter(
                (c: any) =>
                  c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                  c.phone.includes(clientSearch)
              );
              return filtered.length === 0 ? (
                <EmptyState
                  icon="👥"
                  title="No hay clientes"
                  description="Agrega tu primer cliente para comenzar"
                  action={
                    <Button onClick={() => setShowAddClientModal(true)}>
                      + Agregar cliente
                    </Button>
                  }
                />
              ) : (
                <div className="bg-card rounded-md shadow-card border border-border divide-y divide-border">
                  {filtered.map((client: any) => (
                    <div key={client.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-text-main">{client.name}</p>
                        <p className="text-small text-text-sub font-mono">
                          {client.phone}
                        </p>
                        <p className="text-small text-text-muted">
                          {client._count?.records ?? 0} registros
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteStandaloneClient(client.id)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </>
        )}
      </main>

      {/* Create Record Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowNewClient(false);
        }}
        title="Nuevo registro"
      >
        {!showNewClient ? (
          <form onSubmit={handleCreateRecord} className="space-y-4">
            <div>
              <label className="block text-small font-medium text-text-sub mb-2">
                Cliente
              </label>
              <div className="flex gap-2">
                <select
                  className="flex-1 px-4 py-3 text-body bg-surface-card border border-glass rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-white"
                  value={newRecord.clientId}
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, clientId: e.target.value })
                  }
                  required
                >
                  <option value="">Seleccionar cliente...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.phone})
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowNewClient(true)}
                >
                  + Nuevo
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-small font-medium text-text-sub mb-2">
                Vincular Artículo de Inventario (Opcional)
              </label>
              <select
                className="w-full px-4 py-3 text-body bg-surface-card border border-glass rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-white"
                value={newRecord.inventoryItemId}
                onChange={(e) => {
                  const itemId = e.target.value;
                  const item = inventoryItems.find(i => i.id === itemId);
                  setNewRecord(prev => ({
                    ...prev,
                    inventoryItemId: itemId,
                    description: item ? item.name : prev.description,
                    amount: item && item.price ? String(item.price) : prev.amount
                  }));
                }}
              >
                <option value="">-- No vincular ningún artículo --</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id} disabled={item.availableStock <= 0}>
                    {item.name} {item.sku ? `(${item.sku})` : ""} - Stock disp: {item.availableStock} {item.availableStock <= 0 ? "(AGOTADO)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Descripción"
              placeholder="Traje negro talla M, boda García"
              value={newRecord.description}
              onChange={(e) =>
                setNewRecord({ ...newRecord, description: e.target.value })
              }
              required
            />

            <Input
              label="Monto (opcional)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={newRecord.amount}
              onChange={(e) =>
                setNewRecord({ ...newRecord, amount: e.target.value })
              }
            />

            <Input
              label="Fecha de primer aviso"
              type="date"
              value={newRecord.issueDate}
              onChange={(e) => handleIssueDateChange(e.target.value)}
              required
            />
             {/* Custom Reminder Dates Panel */}
            <div className="bg-surface-card border border-glass rounded-md p-4 space-y-3">
              <label className="block text-small font-semibold text-white">
                Cronograma de Avisos (WhatsApp)
              </label>
              
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto p-1.5 bg-background-secondary rounded-md border border-glass">
                {reminderDates.length === 0 ? (
                  <span className="text-small text-text-muted p-1 text-center">No hay avisos programados</span>
                ) : (
                  reminderDates.map((dateWithTime, idx) => {
                    const [datePart, timePart] = dateWithTime.split("T");
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-surface-card rounded-md border border-glass">
                        <span className="text-small font-semibold text-text-muted">🔔 #{idx + 1}</span>
                        <div className="flex gap-1.5 flex-1">
                          <input
                            type="date"
                            value={datePart}
                            onChange={(e) => {
                              const newDate = e.target.value;
                              if (newDate) {
                                const updated = [...reminderDates];
                                updated[idx] = `${newDate}T${timePart || "08:00"}`;
                                setReminderDates(updated);
                              }
                            }}
                            className="flex-1 min-w-[120px] px-3 py-2 text-[13px] bg-surface-card border border-glass rounded-md focus:outline-none text-white"
                          />
                          <input
                            type="time"
                            value={timePart || "08:00"}
                            onChange={(e) => {
                              const newTime = e.target.value;
                              if (newTime) {
                                const updated = [...reminderDates];
                                updated[idx] = `${datePart}T${newTime}`;
                                setReminderDates(updated);
                              }
                            }}
                            className="w-[90px] px-3 py-2 text-[13px] bg-surface-card border border-glass rounded-md focus:outline-none text-white"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveReminderDate(dateWithTime)}
                          className="text-danger font-semibold px-2 text-md hover:scale-110"
                          title="Eliminar aviso"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Custom Date Control */}
              <div className="flex flex-col sm:flex-row gap-2 items-end pt-1 bg-background-secondary/50 p-3 rounded-md border border-glass">
                <div className="flex-1 w-full">
                  <span className="text-[10px] text-text-muted block mb-1">Agregar fecha:</span>
                  <input
                    type="date"
                    value={newReminderDate}
                    onChange={(e) => setNewReminderDate(e.target.value)}
                    className="w-full px-3 py-2 text-small bg-surface-card border border-glass rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-white"
                  />
                </div>
                <div className="w-full sm:w-[90px]">
                  <span className="text-[10px] text-text-muted block mb-1">Hora:</span>
                  <input
                    type="time"
                    value={newReminderTime}
                    onChange={(e) => setNewReminderTime(e.target.value)}
                    className="w-full px-3 py-2 text-small bg-surface-card border border-glass rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-white"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddReminderDate}
                  className="w-full sm:w-auto"
                >
                  Agregar
                </Button>
              </div>
              <p className="text-[11px] text-text-muted mt-1 leading-normal">
                ✓ El cronograma predeterminado se autocompleta usando tu configuración predeterminada (días y hora). Puedes modificar cada aviso a tu gusto.
              </p>
            </div>

            <div>
              <label className="block text-small font-semibold text-white mb-2">
                Mensaje personalizado para este cobro (opcional)
              </label>
              <textarea
                value={newRecord.customMessage}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, customMessage: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 text-body bg-surface-card border border-glass rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none text-white"
                placeholder={user?.defaultReminderMessage || `¡Hola {nombre}! 👋\n\nTe contactamos desde {negocio} para recordarte que hoy ({fecha}) corresponde la devolución de **{descripcion}**.\n\n¿Podrías confirmarnos la hora aproximada de entrega? Nos ayuda a tener todo preparado para recibirlo.\n\n¡Gracias por tu tiempo!\n\nSaludos,\n{negocio}`}
              />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {["{nombre}", "{descripcion}", "{monto}", "{negocio}", "{fecha}"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      setNewRecord({
                        ...newRecord,
                        customMessage: newRecord.customMessage
                          ? newRecord.customMessage + " " + v
                          : v,
                      })
                    }
                    className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 font-mono transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-text-muted mt-1 block">
                Personaliza el mensaje que se enviará en este cobro usando las variables de arriba.
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={creating || !newRecord.clientId}>
                {creating ? "Creando..." : "Crear registro"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCreateClient} className="space-y-4">
            <p className="text-small text-text-sub mb-4">
              Crear nuevo cliente primero
            </p>

            <Input
              label="Nombre"
              placeholder="Juan Pérez"
              value={newClient.name}
              onChange={(e) =>
                setNewClient({ ...newClient, name: e.target.value })
              }
              required
            />

            <Input
              label="Teléfono WhatsApp"
              placeholder="+5491112345678"
              value={newClient.phone}
              onChange={(e) =>
                setNewClient({ ...newClient, phone: e.target.value })
              }
              required
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowNewClient(false)}
              >
                Volver
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creando..." : "Crear cliente"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Defaults Settings Modal */}
      <Modal
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        title="⚙️ Ajustes y Configuración"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          {/* Tabs header inside modal */}
          <div className="flex border-b border-border bg-surface rounded-t-sm p-1 gap-1">
            <button
              type="button"
              onClick={() => setSettingsTab("avisos")}
              className={`flex-1 py-2 text-xs font-bold rounded transition-all text-center ${
                settingsTab === "avisos"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-sub hover:bg-border/30 hover:text-text-main"
              }`}
            >
              📋 Avisos por Defecto
            </button>
            <button
              type="button"
              onClick={() => setSettingsTab("whatsapp")}
              className={`flex-1 py-2 text-xs font-bold rounded transition-all text-center ${
                settingsTab === "whatsapp"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-sub hover:bg-border/30 hover:text-text-main"
              }`}
            >
              📱 WhatsApp Web
            </button>
            <button
              type="button"
              onClick={() => setSettingsTab("inventario")}
              className={`flex-1 py-2 text-xs font-bold rounded transition-all text-center ${
                settingsTab === "inventario"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-sub hover:bg-border/30 hover:text-text-main"
              }`}
            >
              📦 Inventario
            </button>
          </div>

          {/* TAB CONTENT: AVISOS POR DEFECTO */}
          {settingsTab === "avisos" && (
            <form onSubmit={handleSaveConfig} className="space-y-5 text-left">
              <div className="bg-primary/5 border border-primary/15 rounded-sm p-3.5">
                <p className="text-small text-text-main leading-relaxed">
                  📌 Cada vez que crees un nuevo registro de cobro, se generará automáticamente un cronograma de avisos por WhatsApp. Aquí defines <strong>cuántos días seguidos</strong> se enviarán y <strong>a qué hora</strong>.
                </p>
              </div>

              <div>
                <label className="block text-small font-semibold text-white mb-2">
                  ¿Cuántos días seguidos enviar aviso?
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={cfgDays}
                  onChange={(e) => setCfgDays(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 text-body bg-surface-card border border-glass rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-white"
                  required
                />
                <span className="text-[11px] text-text-muted mt-1 block">
                  Ejemplo: si pones <strong>{cfgDays}</strong>, se enviarán <strong>{cfgDays} avisos</strong>, uno por cada día consecutivo desde la fecha que elijas al crear el registro.
                </span>
              </div>

              <div>
                <label className="block text-small font-semibold text-white mb-2">
                  ¿A qué hora enviar los avisos?
                </label>
                <input
                  type="time"
                  value={cfgTime}
                  onChange={(e) => setCfgTime(e.target.value)}
                  className="w-full px-4 py-3 text-body bg-surface-card border border-glass rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-white"
                  required
                />
                <span className="text-[11px] text-text-muted mt-1 block">
                  Todos los avisos se programarán a las <strong>{cfgTime || "08:00"}</strong>. Puedes cambiarlo individualmente en cada registro.
                </span>
              </div>

              <div>
                <label className="block text-small font-semibold text-white mb-2">
                  Mensaje del recordatorio (opcional)
                </label>
                <textarea
                  value={cfgMessage}
                  onChange={(e) => setCfgMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 text-body bg-surface-card border border-glass rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none text-white"
                  placeholder={`¡Hola {nombre}! 👋\n\nTe contactamos desde {negocio} para recordarte que hoy ({fecha}) corresponde la devolución de **{descripcion}**.\n\n¿Podrías confirmarnos la hora aproximada de entrega? Nos ayuda a tener todo preparado para recibirlo.\n\n¡Gracias por tu tiempo!\n\nSaludos,\n{negocio}`}
                />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {["{nombre}", "{descripcion}", "{monto}", "{negocio}", "{fecha}"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setCfgMessage(prev => (prev ? prev + " " + v : v))}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 font-mono transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-text-muted mt-1.5 block">
                  Usa las variables de arriba para personalizar el mensaje. Si lo dejas vacío, se usará el mensaje predeterminado del sistema.
                </span>
              </div>

              {/* Live Preview */}
              <div className="bg-surface-card border border-glass rounded-md p-4">
                <p className="text-small font-semibold text-white mb-2">👁️ Vista previa — Si crearas un registro hoy:</p>
                <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto">
                  {Array.from({ length: Math.min(cfgDays, 15) }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    const dayName = d.toLocaleDateString("es-EC", { weekday: "short" });
                    const dateStr = d.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
                    return (
                      <div key={i} className="flex items-center gap-2 text-small text-text-sub">
                        <span className="text-primary">🔔</span>
                        <span className="font-medium capitalize">{dayName}</span>
                        <span>{dateStr}</span>
                        <span className="text-text-muted">a las</span>
                        <span className="font-semibold text-text-main">{cfgTime || "08:00"}</span>
                      </div>
                    );
                  })}
                  {cfgDays > 15 && (
                    <span className="text-[11px] text-text-muted text-center">...y {cfgDays - 15} avisos más</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowConfig(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingCfg}>
                  {savingCfg ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          )}

          {/* TAB CONTENT: WHATSAPP WEB */}
          {settingsTab === "whatsapp" && (
            <div className="space-y-4 text-left">
              <div className="bg-card rounded-md border border-border p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">📱</span>
                    <div>
                      <h3 className="font-display font-semibold text-text-main text-lg">WhatsApp Web</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2.5 h-2.5 rounded-full ${whatsappStatus === "connected" ? "bg-accent" : whatsappStatus === "loading" ? "bg-warning animate-pulse" : "bg-danger"}`}></span>
                        <span className="text-small font-medium text-text-muted capitalize">
                          {whatsappStatus === "loading" ? "Procesando..." : whatsappStatus === "connected" ? "Conectado" : "Desconectado"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {whatsappStatus === "connected" && (
                      <Button variant="danger" size="sm" onClick={handleWhatsAppDisconnect}>
                        Desconectar Cuenta
                      </Button>
                    )}
                    {whatsappStatus !== "connected" && (
                      <Button variant="secondary" size="sm" onClick={fetchWhatsAppStatus} disabled={whatsappStatus === "loading"}>
                        {whatsappStatus === "loading" ? "Generando..." : "🔄 Actualizar QR"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Connected State View */}
                {whatsappStatus === "connected" && (
                  <div className="mt-4 p-3 bg-accent/10 border border-accent/20 rounded-sm">
                    <p className="text-small text-accent font-medium flex items-center gap-2">
                      <span>✓</span> Tu cuenta de WhatsApp está vinculada correctamente. Los recordatorios automáticos de cobro se enviarán desde tu número.
                    </p>
                  </div>
                )}

                {/* Loading State View */}
                {whatsappStatus === "loading" && (
                  <div className="mt-4 p-8 flex flex-col items-center justify-center border border-dashed border-border rounded-sm bg-surface">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-small text-text-muted">Por favor, espera un momento...</p>
                  </div>
                )}

                {/* Disconnected State View with QR Code */}
                {whatsappStatus === "disconnected" && (
                  <div className="mt-5 border-t border-border pt-4">
                    {whatsappQR ? (
                      <div className="flex flex-col items-center justify-center p-4 bg-surface-card rounded-md border border-glass">
                        <div className="bg-white p-3 rounded-md shadow-sm border border-border mb-3">
                          <img src={whatsappQR} alt="WhatsApp QR Code" className="w-56 h-56 object-contain" />
                        </div>
                        <h4 className="font-semibold text-white text-body mb-1">Escanea el código QR</h4>
                        <p className="text-small text-text-muted text-center max-w-md">
                          Abre WhatsApp en tu teléfono, ve a **Dispositivos vinculados** y selecciona **Vincular un dispositivo** para conectar tu cuenta.
                        </p>
                      </div>
                    ) : (
                      <div className="p-6 text-center border border-dashed border-border rounded-sm bg-surface">
                        <p className="text-small text-text-muted mb-3">
                          No se pudo cargar el código QR de conexión de manera automática.
                        </p>
                        <Button variant="primary" size="sm" onClick={fetchWhatsAppStatus}>
                          Generar Código QR
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => setShowConfig(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}

          {/* TAB CONTENT: INVENTARIO */}
          {settingsTab === "inventario" && (
            <div className="space-y-4 text-left">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card-float p-4">
                  <div className="text-small text-text-muted mb-1">Total Artículos</div>
                  <div className="text-2xl font-display font-bold text-white">{inventoryItems.length}</div>
                  <div className="text-small text-text-sub">{inventoryItems.reduce((s, i) => s + i.stock, 0)} uds.</div>
                </div>
                <div className="card-float p-4">
                  <div className="text-small text-text-muted mb-1">Disponibles</div>
                  <div className="text-2xl font-display font-bold text-accent">{inventoryItems.reduce((s, i) => s + i.availableStock, 0)}</div>
                  <div className="text-small text-accent/70">En tienda / bodega</div>
                </div>
                <div className="card-float p-4">
                  <div className="text-small text-text-muted mb-1">Prestados / Alquilados</div>
                  <div className="text-2xl font-display font-bold text-warning">{inventoryItems.reduce((s, i) => s + (i.stock - i.availableStock), 0)}</div>
                  <div className="text-small text-warning/70">En uso</div>
                </div>
              </div>

              {/* Actions Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => setShowAddInventoryModal(true)} className="flex-1">
                  + Nuevo Producto
                </Button>
                <div className="flex-1">
                  <input
                    type="file"
                    ref={excelInputRef}
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelImport}
                    className="hidden"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => excelInputRef.current?.click()}
                    disabled={importingExcel}
                    className="w-full"
                  >
                    {importingExcel ? "Importando..." : "📄 Importar Excel"}
                  </Button>
                </div>
              </div>

              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Buscar por nombre, SKU o descripción..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="flex-1 px-4 py-3 text-xs bg-surface-card border border-glass rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-white"
                />
                <div className="flex gap-2 shrink-0">
                  {(["all", "available", "out"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setInventoryStockFilter(f)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                        inventoryStockFilter === f
                          ? "bg-primary text-white border-primary"
                          : "bg-surface-card text-text-sub border-glass hover:border-primary"
                      }`}
                    >
                      {f === "all" ? "Todos" : f === "available" ? "Disponibles" : "Sin Stock"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items List inside scroll container */}
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {(() => {
                  const filtered = inventoryItems.filter((item) => {
                    if (inventorySearch) {
                      const term = inventorySearch.toLowerCase();
                      if (
                        !item.name.toLowerCase().includes(term) &&
                        !(item.description || "").toLowerCase().includes(term) &&
                        !(item.sku || "").toLowerCase().includes(term)
                      ) return false;
                    }
                    if (inventoryStockFilter === "available" && item.availableStock <= 0) return false;
                    if (inventoryStockFilter === "out" && item.availableStock > 0) return false;
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <p className="text-center py-8 text-xs text-text-muted bg-surface-card rounded border border-dashed border-glass">
                        No hay productos que coincidan.
                      </p>
                    );
                  }

                  return filtered.map((item) => (
                    <div
                      key={item.id}
                      className="bg-card rounded border border-border p-3 flex justify-between items-center gap-3 hover:border-primary/30 transition-colors text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-text-main truncate">{item.name}</span>
                          {item.sku && (
                            <span className="text-[9px] px-1 bg-surface rounded font-mono text-text-muted border border-border">
                              {item.sku}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-text-sub truncate mt-0.5">{item.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-text-muted">
                          <span>Precio: ${Number(item.price || 0).toFixed(2)}</span>
                          <span>•</span>
                          <span className="font-semibold text-primary">{item.availableStock} de {item.stock} disp.</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingInventoryItem({ ...item });
                            if (item.customFields && typeof item.customFields === "object") {
                              const mapped = Object.entries(item.customFields).map(([k, v]) => ({
                                key: k,
                                value: String(v)
                              }));
                              setManualCustomFields(mapped);
                            } else {
                              setManualCustomFields([]);
                            }
                            setShowEditInventoryModal(true);
                          }}
                          className="px-2 py-1 text-[10px] font-semibold bg-primary/10 text-primary rounded hover:bg-primary/20"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteInventoryItem(item.id)}
                          className="p-1 text-danger hover:bg-danger/5 rounded"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => setShowConfig(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Detailed Record Modal */}
      <Modal
        isOpen={selectedRecordId !== null}
        onClose={() => {
          setSelectedRecordId(null);
          setDetailedRecord(null);
          setIsEditingDetailedRecord(false);
        }}
        title={isEditingDetailedRecord ? "✏️ Editar Registro de Cobro" : "📋 Detalles del Registro de Cobro"}
        className="max-w-lg"
      >
        {loadingDetailedRecord && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-small text-text-muted">Cargando información del registro...</p>
          </div>
        )}

        {!loadingDetailedRecord && detailedRecord && (
          <div className="space-y-5">
            {isEditingDetailedRecord ? (
              // Mode: EDITING
              <div className="space-y-4">
                <Input
                  label="Descripción"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  required
                />
                
                <Input
                  label="Monto (opcional)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />

                {/* Edit Reminder Dates Section */}
                <div className="bg-surface-card border border-glass rounded-md p-4 space-y-3">
                  <label className="block text-small font-semibold text-white">
                    Modificar Cronograma de Avisos
                  </label>

                  <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto p-1.5 bg-background-secondary rounded-md border border-glass">
                    {editReminderDates.length === 0 ? (
                      <span className="text-small text-text-muted p-1 text-center">No hay avisos en el cronograma</span>
                    ) : (
                      editReminderDates.map((dateWithTime, idx) => {
                        const [datePart, timePart] = dateWithTime.split("T");
                        return (
                          <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-surface-card rounded-md border border-glass">
                            <span className="text-small font-semibold text-text-muted">🔔 #{idx + 1}</span>
                            <div className="flex items-center gap-1.5 flex-1 justify-end">
                              <input
                                type="date"
                                value={datePart}
                                onChange={(e) => {
                                  const updated = [...editReminderDates];
                                  updated[idx] = `${e.target.value}T${timePart || "08:00"}`;
                                  setEditReminderDates(updated.sort());
                                }}
                                className="px-3 py-2 text-small bg-surface-card border border-glass rounded-md focus:outline-none focus:ring-1 focus:ring-primary font-mono text-white"
                              />
                              <input
                                type="time"
                                value={timePart || "08:00"}
                                onChange={(e) => {
                                  const updated = [...editReminderDates];
                                  updated[idx] = `${datePart}T${e.target.value}`;
                                  setEditReminderDates(updated.sort());
                                }}
                                className="px-3 py-2 text-small bg-surface-card border border-glass rounded-md focus:outline-none focus:ring-1 focus:ring-primary font-mono text-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveEditReminder(dateWithTime)}
                                className="text-danger hover:bg-danger/10 p-1.5 rounded-md text-small font-bold"
                                title="Eliminar aviso"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add new date to schedule */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-glass/50">
                    <div className="flex-1 flex gap-1">
                      <input
                        type="date"
                        className="flex-1 px-3 py-2 text-small bg-surface-card border border-glass rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-white"
                        value={newEditReminderDate}
                        onChange={(e) => setNewEditReminderDate(e.target.value)}
                      />
                      <input
                        type="time"
                        className="w-[90px] px-3 py-2 text-small bg-surface-card border border-glass rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-white"
                        value={newEditReminderTime}
                        onChange={(e) => setNewEditReminderTime(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddEditReminder}
                    >
                      + Agregar Aviso
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-small font-semibold text-text-main mb-1.5">
                    Mensaje personalizado para este cobro (opcional)
                  </label>
                  <textarea
                    value={editCustomMessage}
                    onChange={(e) => setEditCustomMessage(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-body bg-white border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder={user?.defaultReminderMessage || `¡Hola {nombre}! 👋\n\nTe contactamos desde {negocio} para recordarte que hoy ({fecha}) corresponde la devolución de **{descripcion}**.\n\n¿Podrías confirmarnos la hora aproximada de entrega? Nos ayuda a tener todo preparado para recibirlo.\n\n¡Gracias por tu tiempo!\n\nSaludos,\n{negocio}`}
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {["{nombre}", "{descripcion}", "{monto}", "{negocio}", "{fecha}"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setEditCustomMessage(prev => (prev ? prev + " " + v : v))}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 font-mono transition-colors"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-text-muted mt-1 block">
                    Usa las variables de arriba para personalizar el mensaje de este cobro específico.
                  </span>
                </div>

                {/* Footer Buttons for Edit mode */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsEditingDetailedRecord(false)}
                  >
                    Volver
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSaveEditedRecord}
                  >
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            ) : (
              // Mode: VIEWING DETAILS (READ ONLY)
              <>
                {/* Client and Debt Info Header */}
                <div className="p-4 bg-surface border border-border rounded-sm space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Cliente</span>
                      <h3 className="font-display font-bold text-text-main text-lg">{detailedRecord.client.name}</h3>
                      <a
                        href={`https://wa.me/${detailedRecord.client.phone.replace(/[^\d]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-small text-primary hover:underline flex items-center gap-1.5 mt-0.5"
                      >
                        💬 {detailedRecord.client.phone}
                      </a>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                      detailedRecord.status === 'paid' ? 'bg-accent/15 text-accent' : 
                      detailedRecord.status === 'overdue' ? 'bg-danger/15 text-danger' : 
                      'bg-warning/15 text-warning'
                    }`}>
                      {detailedRecord.status === 'paid' ? '✓ Pagado' : detailedRecord.status === 'overdue' ? '⌛ Vencido' : '🔔 Pendiente'}
                    </span>
                  </div>

                  <div className="border-t border-border/60 pt-2.5 flex justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Descripción</span>
                      <p className="text-body font-medium text-text-main truncate mt-0.5">{detailedRecord.description}</p>
                    </div>
                    {detailedRecord.amount && (
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Monto</span>
                        <p className="text-body font-mono font-bold text-text-main mt-0.5">
                          ${Number(detailedRecord.amount).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reminder Schedule */}
                <div className="space-y-2">
                  <span className="text-small font-bold text-text-main block">📅 Cronograma de Avisos (Programados)</span>
                  <div className="border border-border rounded-sm divide-y divide-border max-h-[160px] overflow-y-auto bg-white">
                    {detailedRecord.reminderSchedule && detailedRecord.reminderSchedule.length > 0 ? (
                      detailedRecord.reminderSchedule.map((schedule: any) => {
                        const scheduled = new Date(schedule.scheduledDate);
                        return (
                          <div key={schedule.id} className="flex justify-between items-center p-2.5 text-small">
                            <div className="flex items-center gap-2">
                              <span className="text-text-muted">🔔 #{schedule.reminderNumber}</span>
                              <span className="text-text-sub font-mono">
                                {scheduled.toLocaleDateString("es-EC", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                              schedule.status === 'sent' ? 'bg-accent/10 text-accent' :
                              schedule.status === 'failed' ? 'bg-danger/10 text-danger' :
                              'bg-surface-dark border border-border text-text-muted'
                            }`}>
                              {schedule.status === 'sent' ? 'Enviado' : schedule.status === 'failed' ? 'Fallido' : 'Pendiente'}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center text-text-muted py-4 text-small">No hay cronograma de avisos</p>
                    )}
                  </div>
                </div>

                {/* Message Log History */}
                <div className="space-y-2">
                  <span className="text-small font-bold text-text-main block">💬 Historial de Mensajes Enviados</span>
                  <div className="border border-border rounded-sm divide-y divide-border max-h-[160px] overflow-y-auto bg-white">
                    {detailedRecord.logs && detailedRecord.logs.length > 0 ? (
                      detailedRecord.logs.map((log: any) => {
                        const sentTime = new Date(log.sentAt);
                        return (
                          <div key={log.id} className="p-2.5 space-y-1 text-small">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-text-muted font-mono">
                                {sentTime.toLocaleDateString("es-EC", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                log.status === 'sent' ? 'bg-accent/10 text-accent' : 'bg-danger/10 text-danger'
                              }`}>
                                {log.status === 'sent' ? 'Enviado' : 'Fallido'}
                              </span>
                            </div>
                            <p className="text-text-sub leading-relaxed whitespace-pre-line text-small font-sans bg-surface/50 p-2 rounded-sm border border-border/40">
                              {log.messageText}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center text-text-muted py-4 text-small">No se han enviado mensajes aún</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between gap-3 pt-4 border-t border-border">
                  <div className="flex gap-2">
                    {detailedRecord.status !== 'paid' && (
                      <Button
                        variant="ghost"
                        onClick={() => handleMarkPaid(detailedRecord.id)}
                      >
                        ✓ Registrar Pago
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={startEditingRecord}
                    >
                      ✏️ Editar
                    </Button>
                    {detailedRecord.status !== 'paid' && (
                      <>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setPausingRecordId(detailedRecord.id);
                            setShowPauseModal(true);
                          }}
                        >
                          ⏸️ Pausar
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setTimingRecordId(detailedRecord.id);
                            setShowTimeModal(true);
                          }}
                        >
                          🕒 Hora
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => handleDeleteRecord(detailedRecord.id)}
                      className="text-danger hover:bg-danger/10"
                    >
                      🗑️ Eliminar
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    {detailedRecord.status !== 'paid' && (
                      <Button
                        variant="primary"
                        onClick={() => handleRemind(detailedRecord.id)}
                      >
                        📱 Enviar Recordatorio
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedRecordId(null);
                        setDetailedRecord(null);
                      }}
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* =================== Inventory Modals =================== */}
      {/* Create Inventory Item Modal */}
      <Modal
        isOpen={showAddInventoryModal}
        onClose={() => setShowAddInventoryModal(false)}
        title="Nuevo Producto"
      >
        <form onSubmit={handleCreateInventoryItem} className="space-y-4">
          <Input
            label="Nombre del producto *"
            placeholder="Ej: Traje negro talla M"
            value={inventoryForm.name}
            onChange={(e) => setInventoryForm({ ...inventoryForm, name: e.target.value })}
            required
          />
          <Input
            label="Descripción (opcional)"
            placeholder="Detalles del producto"
            value={inventoryForm.description}
            onChange={(e) => setInventoryForm({ ...inventoryForm, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU / Código (opcional)"
              placeholder="ABC-001"
              value={inventoryForm.sku}
              onChange={(e) => setInventoryForm({ ...inventoryForm, sku: e.target.value })}
            />
            <Input
              label="Precio (opcional)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={inventoryForm.price}
              onChange={(e) => setInventoryForm({ ...inventoryForm, price: e.target.value })}
            />
          </div>
          <Input
            label="Stock (cantidad)"
            type="number"
            min="1"
            value={inventoryForm.stock}
            onChange={(e) => setInventoryForm({ ...inventoryForm, stock: e.target.value })}
            required
          />

          {/* Constructor de Campos Personalizados */}
          <div className="space-y-2 border-t border-border/60 pt-4">
            <span className="text-small font-semibold text-text-main block">Campos Personalizados (Opcional)</span>
            <p className="text-[11px] text-text-muted">Agrega detalles únicos como Talla, Color, Ubicación, etc.</p>
            <div className="space-y-2">
              {manualCustomFields.map((field, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Ej: Talla"
                    value={field.key}
                    onChange={(e) => {
                      const updated = [...manualCustomFields];
                      updated[idx].key = e.target.value;
                      setManualCustomFields(updated);
                    }}
                    className="flex-1 px-3 py-1.5 text-small bg-white border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="text"
                    placeholder="Ej: M"
                    value={field.value}
                    onChange={(e) => {
                      const updated = [...manualCustomFields];
                      updated[idx].value = e.target.value;
                      setManualCustomFields(updated);
                    }}
                    className="flex-1 px-3 py-1.5 text-small bg-white border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setManualCustomFields(manualCustomFields.filter((_, i) => i !== idx));
                    }}
                    className="p-2 hover:bg-danger/10 text-danger rounded-sm transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setManualCustomFields([...manualCustomFields, { key: "", value: "" }])}
                className="w-full text-center py-1"
              >
                + Añadir fila de datos
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="secondary" onClick={() => { setShowAddInventoryModal(false); setManualCustomFields([]); }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Guardando..." : "Guardar Producto"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Inventory Item Modal */}
      <Modal
        isOpen={showEditInventoryModal}
        onClose={() => {
          setShowEditInventoryModal(false);
          setEditingInventoryItem(null);
          setManualCustomFields([]);
        }}
        title="Editar Producto"
      >
        {editingInventoryItem && (
          <form onSubmit={handleEditInventoryItem} className="space-y-4">
            <Input
              label="Nombre del producto *"
              value={editingInventoryItem.name}
              onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, name: e.target.value })}
              required
            />
            <Input
              label="Descripción"
              value={editingInventoryItem.description || ""}
              onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="SKU / Código"
                value={editingInventoryItem.sku || ""}
                onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, sku: e.target.value })}
              />
              <Input
                label="Precio"
                type="number"
                step="0.01"
                value={editingInventoryItem.price ? String(editingInventoryItem.price) : ""}
                onChange={(e) =>
                  setEditingInventoryItem({ ...editingInventoryItem, price: e.target.value ? parseFloat(e.target.value) : null })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Stock total"
                type="number"
                min="0"
                value={String(editingInventoryItem.stock)}
                onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, stock: parseInt(e.target.value) || 0 })}
              />
              <Input
                label="Disponibles"
                type="number"
                min="0"
                value={String(editingInventoryItem.availableStock)}
                onChange={(e) =>
                  setEditingInventoryItem({
                    ...editingInventoryItem,
                    availableStock: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            {/* Constructor de Campos Personalizados en Edición */}
            <div className="space-y-2 border-t border-border/60 pt-4">
              <span className="text-small font-semibold text-text-main block">Campos Personalizados (Opcional)</span>
              <p className="text-[11px] text-text-muted">Modifica o añade detalles únicos como Talla, Color, Ubicación, etc.</p>
              <div className="space-y-2">
                {manualCustomFields.map((field, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Ej: Talla"
                      value={field.key}
                      onChange={(e) => {
                        const updated = [...manualCustomFields];
                        updated[idx].key = e.target.value;
                        setManualCustomFields(updated);
                      }}
                      className="flex-1 px-3 py-1.5 text-small bg-white border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      type="text"
                      placeholder="Ej: M"
                      value={field.value}
                      onChange={(e) => {
                        const updated = [...manualCustomFields];
                        updated[idx].value = e.target.value;
                        setManualCustomFields(updated);
                      }}
                      className="flex-1 px-3 py-1.5 text-small bg-white border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setManualCustomFields(manualCustomFields.filter((_, i) => i !== idx));
                      }}
                      className="p-2 hover:bg-danger/10 text-danger rounded-sm transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setManualCustomFields([...manualCustomFields, { key: "", value: "" }])}
                  className="w-full text-center py-1"
                >
                  + Añadir fila de datos
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowEditInventoryModal(false);
                  setEditingInventoryItem(null);
                  setManualCustomFields([]);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">Guardar Cambios</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* =================== Client Modal =================== */}
      <Modal
        isOpen={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        title="Nuevo cliente"
      >
        <form onSubmit={handleCreateStandaloneClient} className="space-y-4">
          <Input
            label="Nombre"
            placeholder="Juan Pérez"
            value={clientForm.name}
            onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
            required
          />
          <Input
            label="Teléfono WhatsApp"
            placeholder="+5931112345678"
            value={clientForm.phone}
            onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
            required
          />
          <div>
            <label className="block text-small font-medium text-text-main mb-1.5">
              Notas (opcional)
            </label>
            <textarea
              className="w-full px-3 py-2 text-body bg-white border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
              placeholder="Notas adicionales..."
              value={clientForm.notes}
              onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowAddClientModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Creando..." : "Crear cliente"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* =================== Excel Smart Mapper Modal =================== */}
      <Modal
        isOpen={showExcelMapperModal}
        onClose={() => {
          setShowExcelMapperModal(false);
          setExcelRawRows([]);
          setExcelHeaders([]);
        }}
        title="Mapeo Inteligente de Excel"
      >
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <div className="bg-primary/5 p-3 rounded-sm border border-primary/10">
            <p className="text-small text-text-sub">
              Vincula las columnas de tu archivo Excel con los campos del sistema. El sistema ha intentado autodetectar algunas columnas por ti.
            </p>
          </div>

          {/* Tabla de Vista Previa */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">Vista previa de tu Excel (Primeras 3 filas)</span>
            <div className="overflow-x-auto border border-border rounded-sm bg-white">
              <table className="min-w-full divide-y divide-border text-left">
                <thead className="bg-surface">
                  <tr>
                    {excelHeaders.map((header) => (
                      <th key={header} className="px-3 py-2 text-small font-semibold text-text-main border-r border-border">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-[11px] text-text-sub">
                  {excelRawRows.slice(0, 3).map((row, rIdx) => (
                    <tr key={rIdx}>
                      {excelHeaders.map((header) => (
                        <td key={header} className="px-3 py-1.5 border-r border-border truncate max-w-[150px]">
                          {row[header] !== undefined ? String(row[header]) : "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bindings Mapeo */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">Emparejar Columnas</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface p-3 rounded-sm border border-border">
              <div>
                <label className="block text-small font-medium text-text-main mb-1">Nombre del Producto *</label>
                <select
                  value={excelMapping.name}
                  onChange={(e) => setExcelMapping({ ...excelMapping, name: e.target.value })}
                  className="w-full px-2 py-1.5 text-small bg-white border border-border rounded-sm"
                  required
                >
                  <option value="">-- Seleccionar --</option>
                  {excelHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-small font-medium text-text-main mb-1">Precio / Renta (Opcional)</label>
                <select
                  value={excelMapping.price}
                  onChange={(e) => setExcelMapping({ ...excelMapping, price: e.target.value })}
                  className="w-full px-2 py-1.5 text-small bg-white border border-border rounded-sm"
                >
                  <option value="">-- No vincular / Ignorar --</option>
                  {excelHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-small font-medium text-text-main mb-1">SKU / Código (Opcional)</label>
                <select
                  value={excelMapping.sku}
                  onChange={(e) => setExcelMapping({ ...excelMapping, sku: e.target.value })}
                  className="w-full px-2 py-1.5 text-small bg-white border border-border rounded-sm"
                >
                  <option value="">-- No vincular / Ignorar --</option>
                  {excelHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-small font-medium text-text-main mb-1">Stock / Cantidad (Opcional)</label>
                <select
                  value={excelMapping.stock}
                  onChange={(e) => setExcelMapping({ ...excelMapping, stock: e.target.value })}
                  className="w-full px-2 py-1.5 text-small bg-white border border-border rounded-sm"
                >
                  <option value="">-- Por defecto: 1 unidad --</option>
                  {excelHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-small font-medium text-text-main mb-1">Descripción (Opcional)</label>
                <select
                  value={excelMapping.description}
                  onChange={(e) => setExcelMapping({ ...excelMapping, description: e.target.value })}
                  className="w-full px-2 py-1.5 text-small bg-white border border-border rounded-sm"
                >
                  <option value="">-- No vincular / Ignorar --</option>
                  {excelHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Custom Fields Extra Checkbox Selection */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">Importar Columnas Extra como Campos Personalizados</span>
            <p className="text-[11px] text-text-muted">Las columnas marcadas se guardarán de forma inteligente en el producto.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white p-3 border border-border rounded-sm max-h-[140px] overflow-y-auto">
              {excelHeaders
                .filter(h => h !== excelMapping.name && h !== excelMapping.description && h !== excelMapping.sku && h !== excelMapping.price && h !== excelMapping.stock)
                .map((header) => (
                  <label key={header} className="flex items-center gap-2 text-small text-text-sub select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCustomCols.includes(header)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCustomCols([...selectedCustomCols, header]);
                        } else {
                          setSelectedCustomCols(selectedCustomCols.filter((c) => c !== header));
                        }
                      }}
                      className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                    />
                    <span className="truncate">{header}</span>
                  </label>
                ))}
              {excelHeaders.filter(h => h !== excelMapping.name && h !== excelMapping.description && h !== excelMapping.sku && h !== excelMapping.price && h !== excelMapping.stock).length === 0 && (
                <p className="text-center text-text-muted py-2 text-xs col-span-full">No quedan columnas libres para personalizar</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowExcelMapperModal(false);
                setExcelRawRows([]);
                setExcelHeaders([]);
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleExecuteMappedImport} disabled={importingExcel}>
              {importingExcel ? "Importando..." : "Confirmar e Importar"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* =================== Pause Reminders Modal =================== */}
      <Modal
        isOpen={showPauseModal}
        onClose={() => {
          setShowPauseModal(false);
          setPausingRecordId(null);
        }}
        title="Pausar Avisos de Cobro"
      >
        <div className="space-y-4">
          <p className="text-small text-text-sub">
            ¿Cuántos días deseas pausar los recordatorios pendientes de este cobro? Las fechas de envío se desplazarán hacia adelante esa cantidad de días de forma automática.
          </p>
          <Input
            label="Días a pausar"
            type="number"
            min="1"
            value={pauseDays}
            onChange={(e) => setPauseDays(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowPauseModal(false);
                setPausingRecordId(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={executePauseRecord}>
              Confirmar Pausa
            </Button>
          </div>
        </div>
      </Modal>

      {/* =================== Adjust Warning Time Modal =================== */}
      <Modal
        isOpen={showTimeModal}
        onClose={() => {
          setShowTimeModal(false);
          setTimingRecordId(null);
        }}
        title="Ajustar Hora de Envío"
      >
        <div className="space-y-4">
          <p className="text-small text-text-sub">
            Alinea de forma masiva la hora de envío de todos los avisos de recordatorio pendientes en el cronograma de este cobro.
          </p>
          <Input
            label="Hora de envío global"
            type="time"
            value={newSendTime}
            onChange={(e) => setNewSendTime(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowTimeModal(false);
                setTimingRecordId(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={executeAdjustRecordTime}>
              Actualizar Hora
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}