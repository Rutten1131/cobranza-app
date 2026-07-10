"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Modal, showToast, EmptyState } from "@/components/ui";
import { useAuth } from "@/components/providers";

interface Client {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
  createdAt: string;
  _count: {
    records: number;
  };
}

export default function ClientsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", notes: "" });

  useEffect(() => {
    if (!authLoading && user?.role !== "user" && user?.role !== "admin") {
      router.push("/login");
      return;
    }
    if (user) {
      fetchClients();
    }
  }, [user, authLoading, router]);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      if (res.ok) setClients(data.clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
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
      setShowCreateModal(false);
      setNewClient({ name: "", phone: "", notes: "" });
      fetchClients();
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm("¿Estás seguro de eliminar este cliente?")) return;

    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });

      if (res.ok) {
        showToast("Cliente eliminado", "success");
        fetchClients();
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-sub">Cargando...</p>
      </div>
    );
  }

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-background-secondary/80 backdrop-blur-md border-b border-glass sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/app/dashboard")} className="text-text-sub hover:text-white">
              ←
            </button>
            <span className="text-xl font-display font-bold text-white">
              Clientes
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            Salir
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex gap-3 mb-6">
          <Input
            placeholder="Buscar por nombre o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button onClick={() => setShowCreateModal(true)}>+ Nuevo</Button>
        </div>

        {filteredClients.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No hay clientes"
            description="Agrega tu primer cliente para comenzar"
            action={
              <Button onClick={() => setShowCreateModal(true)}>
                + Agregar cliente
              </Button>
            }
          />
        ) : (
          <div className="card-float divide-y divide-glass">
            {filteredClients.map((client) => (
              <div key={client.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{client.name}</p>
                  <p className="text-small text-text-sub font-mono">
                    {client.phone}
                  </p>
                  <p className="text-small text-text-muted">
                    {client._count.records} registros
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteClient(client.id)}
                >
                  Eliminar
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Client Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nuevo cliente"
      >
        <form onSubmit={handleCreateClient} className="space-y-4">
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

          <div>
            <label className="block text-small font-medium text-text-sub mb-2">
              Notas (opcional)
            </label>
            <textarea
              className="w-full px-4 py-3 text-body bg-surface-card border border-glass rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none text-white"
              rows={3}
              placeholder="Notas adicionales..."
              value={newClient.notes}
              onChange={(e) =>
                setNewClient({ ...newClient, notes: e.target.value })
              }
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Creando..." : "Crear cliente"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}