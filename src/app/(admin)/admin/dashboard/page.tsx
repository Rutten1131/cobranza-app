"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Modal, showToast, EmptyState } from "@/components/ui";
import { useAuth } from "@/components/providers";

// Helper to generate username from business name
const generateUsername = (businessName: string): string => {
  if (!businessName) return "";
  const clean = businessName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);
  return clean || "";
};

// Helper to generate random password
const generatePassword = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

interface User {
  id: string;
  email: string;
  businessName: string | null;
  businessType: string | null;
  isActive: boolean;
  hasCobranzas: boolean;
  hasHabitaciones: boolean;
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
    hasCobranzas: true,
    hasHabitaciones: false,
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [updating, setUpdating] = useState(false);

  // Delete confirmation states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

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
        hasCobranzas: true,
        hasHabitaciones: false,
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

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUpdating(true);

    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: editingUser.businessName,
          businessType: editingUser.businessType,
          whatsappSender: editingUser.whatsappSender,
          hasCobranzas: editingUser.hasCobranzas,
          hasHabitaciones: editingUser.hasHabitaciones,
          password: newPassword || undefined,
        }),
      });

      if (res.ok) {
        showToast("Configuración de usuario actualizada", "success");
        setShowEditModal(false);
        setEditingUser(null);
        fetchUsers();
      } else {
        const data = await res.json();
        showToast(data.error || "Error al actualizar configuración", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = (u: User) => {
    setUserToDelete(u);
    setDeleteConfirmName("");
    setShowDeleteModal(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    if (deleteConfirmName.toLowerCase() !== userToDelete.businessName?.toLowerCase()) {
      showToast("El nombre no coincide. Escribe el nombre exacto del negocio para confirmar.", "error");
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showToast("Usuario eliminado correctamente", "success");
        setShowDeleteModal(false);
        setUserToDelete(null);
        setDeleteConfirmName("");
        fetchUsers();
      } else {
        const data = await res.json();
        showToast(data.error || "Error al eliminar usuario", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setDeleting(false);
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
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="bg-background-secondary/80 backdrop-blur-md border-b border-glass sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="text-xl font-display font-bold text-white">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="card-float p-5">
            <p className="text-small text-text-sub mb-1">Usuarios activos</p>
            <p className="text-2xl font-bold text-white">{activeUsers}</p>
          </div>
          <div className="card-float p-5">
            <p className="text-small text-text-sub mb-1">Total usuarios</p>
            <p className="text-2xl font-bold text-white">{users.length}</p>
          </div>
          <div className="card-float p-5">
            <p className="text-small text-text-sub mb-1">Total registros</p>
            <p className="text-2xl font-bold text-white">{totalRecords}</p>
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
        <div className="card-float overflow-hidden">
          <div className="p-4 border-b border-glass">
            <h2 className="text-h2 font-display text-white">Usuarios</h2>
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
            <div className="divide-y divide-glass">
              {users.map((u) => (
                <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">👤</span>
                    <div>
                      <p className="font-medium text-white">
                        {u.businessName || "Sin nombre"}
                      </p>
                      <p className="text-small text-text-sub">{u.email}</p>
                      <p className="text-small text-text-muted font-mono">
                        {u._count.clients} clientes · {u._count.records} registros
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {u.hasCobranzas && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            💰 Cobranzas
                          </span>
                        )}
                        {u.hasHabitaciones && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
                            🏨 Habitaciones
                          </span>
                        )}
                        {!u.hasCobranzas && !u.hasHabitaciones && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-danger/10 text-danger border border-danger/20">
                            Ninguno
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
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
                      onClick={() => {
                        setEditingUser({ ...u });
                        setShowEditModal(true);
                      }}
                    >
                      ✏️
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(u.id, u.isActive)}
                    >
                      {u.isActive ? "Desact" : "Activar"}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteClick(u)}
                    >
                      🗑️
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
            onChange={(e) => {
              setNewUser({ ...newUser, businessName: e.target.value });
              // Auto-generate username from business name
              if (!newUser.email || newUser.email === generateUsername(newUser.businessName)) {
                setNewUser((prev) => ({ ...prev, email: generateUsername(e.target.value) }));
              }
            }}
            required
          />

          <div>
            <label className="block text-small font-medium text-text-sub mb-2">
              Tipo de negocio
            </label>
            <select
              className="w-full px-4 py-3 text-body bg-surface-card border border-glass rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-white"
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

          <div>
            <label className="block text-small font-medium text-text-sub mb-2">
              Usuario
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="usuario_negocio"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                className="flex-1 px-4 py-3 text-body bg-surface-card border border-glass rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-white"
                required
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setNewUser((prev) => ({ ...prev, email: generateUsername(prev.businessName) }))}
              >
                🔄
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-small font-medium text-text-sub mb-2">
              Contraseña
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Contraseña"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
                className="flex-1 px-4 py-3 text-body bg-surface-card border border-glass rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-white"
                required
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setNewUser((prev) => ({ ...prev, password: generatePassword() }))}
              >
                🔑
              </Button>
            </div>
          </div>

          <Input
            label="WhatsApp del negocio (opcional)"
            placeholder="+5491112345678"
            value={newUser.whatsappSender}
            onChange={(e) =>
              setNewUser({ ...newUser, whatsappSender: e.target.value })
            }
          />

          <div className="space-y-2 border-t border-glass pt-4">
            <span className="text-small font-semibold text-white block">Sistemas Activos Asignados</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-small text-text-sub select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={newUser.hasCobranzas}
                  onChange={(e) => setNewUser({ ...newUser, hasCobranzas: e.target.checked })}
                  className="rounded border-glass text-primary focus:ring-primary w-4 h-4"
                />
                <span>💰 Sistema de Cobranzas</span>
              </label>
              <label className="flex items-center gap-2 text-small text-text-sub select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={newUser.hasHabitaciones}
                  onChange={(e) => setNewUser({ ...newUser, hasHabitaciones: e.target.checked })}
                  className="rounded border-glass text-primary focus:ring-primary w-4 h-4"
                />
                <span>🏨 Sistema de Habitaciones</span>
              </label>
            </div>
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
              {creating ? "Creando..." : "Crear usuario"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingUser(null);
          setNewPassword("");
        }}
        title="Configurar Usuario"
      >
        {editingUser && (
          <form onSubmit={handleEditUserSubmit} className="space-y-4">
            <Input
              label="Nombre del negocio"
              value={editingUser.businessName || ""}
              onChange={(e) => setEditingUser({ ...editingUser, businessName: e.target.value })}
              required
            />

            <div>
              <label className="block text-small font-medium text-text-sub mb-2">
                Tipo de negocio
              </label>
              <select
                className="w-full px-4 py-3 text-body bg-surface-card border border-glass rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-white"
                value={editingUser.businessType || ""}
                onChange={(e) => setEditingUser({ ...editingUser, businessType: e.target.value })}
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
              label="WhatsApp del negocio (opcional)"
              placeholder="+5491112345678"
              value={editingUser.whatsappSender || ""}
              onChange={(e) => setEditingUser({ ...editingUser, whatsappSender: e.target.value })}
            />

            <div className="border-t border-glass pt-4 mt-4">
              <p className="text-small font-semibold text-white mb-3">Cambiar Contraseña</p>
              <Input
                label="Nueva contraseña (dejar vacío para no cambiar)"
                type="password"
                placeholder="Ingrese nueva contraseña"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2 border-t border-glass pt-4">
              <span className="text-small font-semibold text-white block">Sistemas Activos Asignados</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-small text-text-sub select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingUser.hasCobranzas}
                    onChange={(e) => setEditingUser({ ...editingUser, hasCobranzas: e.target.checked })}
                    className="rounded border-glass text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>💰 Sistema de Cobranzas</span>
                </label>
                <label className="flex items-center gap-2 text-small text-text-sub select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingUser.hasHabitaciones}
                    onChange={(e) => setEditingUser({ ...editingUser, hasHabitaciones: e.target.checked })}
                    className="rounded border-glass text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>🏨 Sistema de Habitaciones</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-glass">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updating}>
                {updating ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal - Double Security */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setUserToDelete(null);
          setDeleteConfirmName("");
        }}
        title="⚠️ Eliminar Usuario"
      >
        {userToDelete && (
          <div className="space-y-4">
            <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg">
              <p className="text-danger font-semibold mb-2">¡Esta acción es irreversible!</p>
              <p className="text-small text-text-sub">
                Se eliminará al usuario <strong className="text-white">{userToDelete.businessName}</strong> y todos sus datos asociados.
              </p>
              <p className="text-small text-text-sub mt-2">
                {userToDelete._count.clients} clientes y {userToDelete._count.records} registros serán eliminados permanentemente.
              </p>
            </div>

            <div className="p-3 bg-surface-card rounded-lg border border-glass">
              <p className="text-small text-text-sub mb-2">
                Para confirmar, escribe el nombre del negocio exactamente:
              </p>
              <p className="text-white font-bold text-lg">{userToDelete.businessName}</p>
            </div>

            <Input
              label="Confirmar nombre del negocio"
              type="text"
              placeholder={userToDelete.businessName}
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-glass">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                  setDeleteConfirmName("");
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDeleteUser}
                disabled={deleting || deleteConfirmName.toLowerCase() !== userToDelete.businessName?.toLowerCase()}
              >
                {deleting ? "Eliminando..." : "Eliminar Usuario"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}