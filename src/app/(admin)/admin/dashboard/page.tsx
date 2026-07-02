"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Modal, showToast, EmptyState } from "@/components/ui";
import { useAuth } from "@/components/providers";

interface User {
  id: string;
  email: string;
  businessName: string | null;
  businessType: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    records: number;
    clients: number;
  };
}

const BUSINESS_TYPES = [
  { value: "alquiler_trajes", label: "Alquiler de Trajes" },
  { value: "herramientas", label: "Herramientas" },
  { value: "equipos", label: "Equipos" },
  { value: "vestidos_novia", label: "Vestidos de Novia" },
  { value: "utileria", label: "Utilería" },
  { value: "otro", label: "Otro" },
];

export default function AdminDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    businessName: "",
    businessType: "",
    whatsappSender: "",
  });

  useEffect(() => {
    if (!authLoading && user?.role !== "admin") {
      router.push("/app/dashboard");
      return;
    }
    if (user) {
      fetchUsers();
    }
  }, [user, authLoading, router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Error al crear usuario", "error");
        return;
      }

      showToast("Usuario creado exitosamente", "success");
      setShowCreateModal(false);
      setNewUser({
        email: "",
        password: "",
        businessName: "",
        businessType: "",
        whatsappSender: "",
      });
      fetchUsers();
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });

      if (res.ok) {
        showToast(
          currentActive ? "Usuario desactivado" : "Usuario activado",
          "success"
        );
        fetchUsers();
      }
    } catch {
      showToast("Error al actualizar usuario", "error");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-sub">Cargando...</p>
      </div>
    );
  }

  const activeUsers = users.filter((u) => u.isActive).length;
  const totalRecords = users.reduce((acc, u) => acc + u._count.records, 0);

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="text-xl font-display font-bold text-text-main">
              CobrApp
            </span>
            <span className="text-small text-text-sub ml-2">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={logout}>
              Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-md p-4 shadow-card border border-border">
            <p className="text-small text-text-sub mb-1">Usuarios activos</p>
            <p className="text-2xl font-bold text-text-main">{activeUsers}</p>
          </div>
          <div className="bg-card rounded-md p-4 shadow-card border border-border">
            <p className="text-small text-text-sub mb-1">Total usuarios</p>
            <p className="text-2xl font-bold text-text-main">{users.length}</p>
          </div>
          <div className="bg-card rounded-md p-4 shadow-card border border-border">
            <p className="text-small text-text-sub mb-1">Total registros</p>
            <p className="text-2xl font-bold text-text-main">{totalRecords}</p>
          </div>
        </div>

        {/* Create User Button */}
        <Button
          className="mb-6"
          onClick={() => setShowCreateModal(true)}
        >
          + Crear nuevo usuario
        </Button>

        {/* Users List */}
        <div className="bg-card rounded-md shadow-card border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-h2 font-display text-text-main">Usuarios</h2>
          </div>

          {users.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon="👥"
                title="No hay usuarios"
                description="Crea tu primer usuario para comenzar"
              />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((u) => (
                <div key={u.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👤</span>
                    <div>
                      <p className="font-medium text-text-main">
                        {u.businessName || "Sin nombre"}
                      </p>
                      <p className="text-small text-text-sub">{u.email}</p>
                      <p className="text-small text-text-muted font-mono">
                        {u._count.clients} clientes · {u._count.records} registros
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        u.isActive ? "bg-accent" : "bg-text-muted"
                      }`}
                    />
                    <span className="text-small text-text-sub">
                      {u.isActive ? "Activo" : "Inactivo"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(u.id, u.isActive)}
                    >
                      {u.isActive ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Crear nuevo usuario"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Nombre del negocio"
            placeholder="Trajes Don Luis"
            value={newUser.businessName}
            onChange={(e) =>
              setNewUser({ ...newUser, businessName: e.target.value })
            }
            required
          />

          <div>
            <label className="block text-small font-medium text-text-main mb-1.5">
              Tipo de negocio
            </label>
            <select
              className="w-full px-3 py-2 text-body bg-white border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={newUser.businessType}
              onChange={(e) =>
                setNewUser({ ...newUser, businessType: e.target.value })
              }
              required
            >
              <option value="">Seleccionar tipo...</option>
              {BUSINESS_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Usuario"
            type="text"
            placeholder="Cobranzas"
            value={newUser.email}
            onChange={(e) =>
              setNewUser({ ...newUser, email: e.target.value })
            }
            required
          />

          <Input
            label="Contraseña temporal"
            type="password"
            placeholder="••••••••"
            value={newUser.password}
            onChange={(e) =>
              setNewUser({ ...newUser, password: e.target.value })
            }
            required
          />

          <Input
            label="WhatsApp del negocio (opcional)"
            placeholder="+5491112345678"
            value={newUser.whatsappSender}
            onChange={(e) =>
              setNewUser({ ...newUser, whatsappSender: e.target.value })
            }
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Creando..." : "Crear usuario"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}