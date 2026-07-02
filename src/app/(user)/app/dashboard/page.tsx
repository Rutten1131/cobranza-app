"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button, StatCard, RecordCard, EmptyState, Modal, Input, showToast } from "@/components/ui";
import { Calendar } from "@/components/ui/Calendar";
import { useAuth } from "@/components/providers";

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface Record {
  id: string;
  description: string;
  amount: number | null;
  dueDate: string;
  status: "pending" | "paid" | "overdue";
  reminderSent: boolean;
  client: Client;
}

export default function UserDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [records, setRecords] = useState<Record[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [newRecord, setNewRecord] = useState({
    clientId: "",
    description: "",
    amount: "",
    dueDate: "",
    issueDate: new Date().toISOString().split('T')[0],
  });
  const [newClient, setNewClient] = useState({ name: "", phone: "" });
  const [showNewClient, setShowNewClient] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "overdue">("all");

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
      const [recordsRes, clientsRes] = await Promise.all([
        fetch("/api/records"),
        fetch("/api/clients"),
      ]);

      const recordsData = await recordsRes.json();
      const clientsData = await clientsRes.json();

      if (recordsRes.ok) setRecords(recordsData.records);
      if (clientsRes.ok) setClients(clientsData.clients);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Error al crear registro", "error");
        return;
      }

      showToast("Registro creado exitosamente", "success");
      setShowCreateModal(false);
      setNewRecord({ clientId: "", description: "", amount: "", dueDate: "", issueDate: new Date().toISOString().split('T')[0] });
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
    return records
      .filter((r) => r.status !== "paid")
      .map((r) => {
        let status: "pending" | "overdue" | "today" | "paid" = r.status;
        const dueDate = new Date(r.dueDate);
        const todayObj = new Date();
        todayObj.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);

        if (r.status === "pending") {
          if (dueDate.getTime() === todayObj.getTime()) status = "today";
          else if (dueDate < todayObj) status = "overdue";
        }

        return { id: r.id, title: r.client.name, date: new Date(r.dueDate), status };
      });
  }, [records]);

  const handleDayClick = (date: Date, events: typeof calendarEvents) => {
    if (events.length > 0) setSelectedDate(date);
  };

  const filteredRecords = records.filter((r) => {
    if (r.status === "paid") return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!r.client.name.toLowerCase().includes(term) && !r.description.toLowerCase().includes(term)) return false;
    }
    if (filterDate) {
      const dueDate = new Date(r.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const fDate = new Date(filterDate);
      fDate.setHours(0, 0, 0, 0);
      if (dueDate.getTime() !== fDate.getTime()) return false;
    }
    return true;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-sub">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="text-xl font-display font-bold text-text-main">
              {user?.businessName || "CobrApp"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-small text-text-sub">
              {pendingCount} pendientes
            </span>
            <Button variant="ghost" size="sm" onClick={logout}>
              Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Search and Filters */}
        <div className="space-y-3 mb-4">
          <Input placeholder="Buscar por cliente o descripción..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h2 font-display text-text-main">Pendientes</h2>
          <span className="text-small text-text-muted">{filteredRecords.length} registros</span>
        </div>

        <Button className="w-full mb-4" onClick={() => setShowCreateModal(true)}>
          + Nuevo registro
        </Button>

        {/* Records List */}
        {filteredRecords.length === 0 ? (
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
          <div className="space-y-3">
            {filteredRecords.map((record) => (
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
              />
            ))}
          </div>
        )}

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
                <div key={r.id} className="flex items-center justify-between p-2 bg-surface rounded-sm">
                  <div>
                    <p className="font-medium text-text-main">{r.client.name}</p>
                    <p className="text-small text-text-muted">{r.description}</p>
                  </div>
                  <div className="text-right">
                    {r.amount && <p className="font-mono text-text-main">${Number(r.amount).toFixed(2)}</p>}
                    <p className="text-small text-text-muted capitalize">{r.status}</p>
                  </div>
                </div>
              ))}
              {records.filter(r => { const d = new Date(r.dueDate); d.setHours(0,0,0,0); return d.getTime() === selectedDate.getTime(); }).length === 0 && (
                <p className="text-center text-text-muted py-4">No hay registros para este día</p>
              )}
            </div>
          </div>
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
              <label className="block text-small font-medium text-text-main mb-1.5">
                Cliente
              </label>
              <div className="flex gap-2">
                <select
                  className="flex-1 px-3 py-2 text-body bg-white border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
              label="Fecha de ingreso"
              type="date"
              value={newRecord.issueDate}
              onChange={(e) =>
                setNewRecord({ ...newRecord, issueDate: e.target.value })
              }
              required
            />

            <Input
              label="Fecha de vencimiento"
              type="date"
              value={newRecord.dueDate}
              onChange={(e) =>
                setNewRecord({ ...newRecord, dueDate: e.target.value })
              }
              required
            />
            <p className="text-small text-text-sub -mt-2">
              📱 Se programarán 4 recordatorios: el día del vencimiento + 3 seguimiento cada 2 días
            </p>

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
    </div>
  );
}