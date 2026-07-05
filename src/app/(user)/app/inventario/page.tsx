"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Input, EmptyState, showToast } from "@/components/ui";
import { useAuth } from "@/components/providers";
import * as XLSX from "xlsx";

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number | null;
  stock: number;
  availableStock: number;
  createdAt: string;
}

export default function InventarioPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "available" | "out">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    sku: "",
    price: "",
    stock: "1",
  });

  useEffect(() => {
    if (!authLoading && user?.role !== "user" && user?.role !== "admin") {
      router.push("/login");
      return;
    }
    if (user) fetchItems();
  }, [user, authLoading, router]);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/inventory");
      const data = await res.json();
      if (res.ok) setItems(data.items);
    } catch {
      console.error("Error fetching inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name) {
      showToast("El nombre es obligatorio", "error");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      if (res.ok) {
        showToast("Producto agregado al inventario", "success");
        setShowCreateModal(false);
        setNewItem({ name: "", description: "", sku: "", price: "", stock: "1" });
        fetchItems();
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

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await fetch(`/api/inventory/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingItem.name,
          description: editingItem.description,
          sku: editingItem.sku,
          price: editingItem.price,
          stock: editingItem.stock,
          availableStock: editingItem.availableStock,
        }),
      });
      if (res.ok) {
        showToast("Producto actualizado", "success");
        setShowEditModal(false);
        setEditingItem(null);
        fetchItems();
      } else {
        const d = await res.json();
        showToast(d.error || "Error al actualizar", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este producto del inventario?")) return;
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Producto eliminado", "success");
        fetchItems();
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

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) {
        showToast("El archivo Excel está vacío", "error");
        setImporting(false);
        return;
      }

      // Map Excel columns to our fields (flexible matching)
      const mapped = rows.map((row) => ({
        name: row["Nombre"] || row["nombre"] || row["Name"] || row["name"] || row["NOMBRE"] || "",
        description: row["Descripción"] || row["descripcion"] || row["Description"] || row["description"] || row["DESCRIPCION"] || "",
        sku: row["SKU"] || row["sku"] || row["Código"] || row["codigo"] || row["CODIGO"] || "",
        price: row["Precio"] || row["precio"] || row["Price"] || row["price"] || row["PRECIO"] || null,
        stock: row["Stock"] || row["stock"] || row["Cantidad"] || row["cantidad"] || row["STOCK"] || row["CANTIDAD"] || 1,
      }));

      const validItems = mapped.filter((item) => item.name);

      if (validItems.length === 0) {
        showToast("No se encontraron productos válidos. Asegúrate de que la columna 'Nombre' esté presente.", "error");
        setImporting(false);
        return;
      }

      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validItems),
      });

      if (res.ok) {
        const result = await res.json();
        showToast(`${result.count} productos importados exitosamente`, "success");
        fetchItems();
      } else {
        showToast("Error al importar productos", "error");
      }
    } catch (err) {
      console.error("Excel import error:", err);
      showToast("Error al procesar el archivo Excel", "error");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !item.name.toLowerCase().includes(term) &&
          !(item.description || "").toLowerCase().includes(term) &&
          !(item.sku || "").toLowerCase().includes(term)
        )
          return false;
      }
      if (stockFilter === "available" && item.availableStock <= 0) return false;
      if (stockFilter === "out" && item.availableStock > 0) return false;
      return true;
    });
  }, [items, searchTerm, stockFilter]);

  const totalStock = items.reduce((sum, i) => sum + i.stock, 0);
  const totalAvailable = items.reduce((sum, i) => sum + i.availableStock, 0);
  const totalLent = totalStock - totalAvailable;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-text-muted">Cargando inventario...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📦</span>
            <span className="text-xl font-display font-bold text-text-main">
              Inventario
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push("/app/dashboard")}>
              💰 Cobranzas
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/app/clientes")}>
              👥 Clientes
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-md shadow-card border border-border p-4">
            <div className="text-small text-text-muted mb-1">Total Artículos</div>
            <div className="text-2xl font-display font-bold text-text-main">{items.length}</div>
            <div className="text-small text-text-sub">{totalStock} unidades</div>
          </div>
          <div className="bg-card rounded-md shadow-card border border-border p-4">
            <div className="text-small text-text-muted mb-1">Disponibles</div>
            <div className="text-2xl font-display font-bold text-accent">{totalAvailable}</div>
            <div className="text-small text-accent/70">En tienda / bodega</div>
          </div>
          <div className="bg-card rounded-md shadow-card border border-border p-4">
            <div className="text-small text-text-muted mb-1">Prestados / Alquilados</div>
            <div className="text-2xl font-display font-bold text-warning">{totalLent}</div>
            <div className="text-small text-warning/70">En la calle</div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Button onClick={() => setShowCreateModal(true)} className="flex-1">
            + Nuevo Producto
          </Button>
          <div className="relative flex-1">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelImport}
              className="hidden"
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full"
            >
              {importing ? "Importando..." : "📄 Importar Excel"}
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Buscar por nombre, SKU o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 text-body bg-white border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            {(["all", "available", "out"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStockFilter(f)}
                className={`px-3 py-2 text-small font-medium rounded-sm border transition-colors ${
                  stockFilter === f
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-text-sub border-border hover:border-primary"
                }`}
              >
                {f === "all" ? "Todos" : f === "available" ? "Disponible" : "Sin Stock"}
              </button>
            ))}
          </div>
        </div>

        {/* Import Help Note */}
        <div className="bg-primary/5 border border-primary/15 rounded-sm p-3 mb-4">
          <p className="text-[12px] text-text-sub leading-relaxed">
            📌 <strong>Para importar desde Excel:</strong> Tu archivo debe tener al menos una columna llamada <strong>&quot;Nombre&quot;</strong>. Columnas opcionales: <strong>&quot;Descripción&quot;</strong>, <strong>&quot;SKU&quot;</strong> o <strong>&quot;Código&quot;</strong>, <strong>&quot;Precio&quot;</strong>, <strong>&quot;Stock&quot;</strong> o <strong>&quot;Cantidad&quot;</strong>.
          </p>
        </div>

        {/* Items List */}
        {filteredItems.length === 0 ? (
          <EmptyState
            icon="📦"
            title="No hay productos en el inventario"
            description="Agrega productos manualmente o importa desde un archivo Excel"
            action={
              <Button onClick={() => setShowCreateModal(true)}>
                + Nuevo Producto
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-card rounded-md shadow-card border border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-semibold text-text-main truncate">
                      {item.name}
                    </h4>
                    {item.sku && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-surface rounded-full font-mono text-text-muted border border-border">
                        {item.sku}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-small text-text-sub mt-0.5 truncate">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    {item.price && (
                      <span className="text-small font-semibold text-primary">
                        ${Number(item.price).toFixed(2)}
                      </span>
                    )}
                    <span className="text-[11px] text-text-muted">
                      Stock: {item.stock}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        item.availableStock > 0
                          ? "bg-accent/15 text-accent"
                          : "bg-danger/15 text-danger"
                      }`}
                    >
                      {item.availableStock > 0
                        ? `${item.availableStock} disponible${item.availableStock > 1 ? "s" : ""}`
                        : "Sin stock"}
                    </span>
                    {item.stock - item.availableStock > 0 && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-warning/15 text-warning">
                        {item.stock - item.availableStock} prestado{item.stock - item.availableStock > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingItem({ ...item });
                      setShowEditModal(true);
                    }}
                  >
                    ✏️ Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    🗑️
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Item Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nuevo Producto"
      >
        <form onSubmit={handleCreateItem} className="space-y-4">
          <Input
            label="Nombre del producto *"
            placeholder="Ej: Traje negro talla M"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            required
          />
          <Input
            label="Descripción (opcional)"
            placeholder="Detalles del producto"
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU / Código (opcional)"
              placeholder="ABC-001"
              value={newItem.sku}
              onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
            />
            <Input
              label="Precio (opcional)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={newItem.price}
              onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
            />
          </div>
          <Input
            label="Stock (cantidad)"
            type="number"
            min="1"
            value={newItem.stock}
            onChange={(e) => setNewItem({ ...newItem, stock: e.target.value })}
            required
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Guardando..." : "Guardar Producto"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingItem(null);
        }}
        title="Editar Producto"
      >
        {editingItem && (
          <form onSubmit={handleEditItem} className="space-y-4">
            <Input
              label="Nombre del producto *"
              value={editingItem.name}
              onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
              required
            />
            <Input
              label="Descripción"
              value={editingItem.description || ""}
              onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="SKU / Código"
                value={editingItem.sku || ""}
                onChange={(e) => setEditingItem({ ...editingItem, sku: e.target.value })}
              />
              <Input
                label="Precio"
                type="number"
                step="0.01"
                value={editingItem.price ? String(editingItem.price) : ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, price: e.target.value ? parseFloat(e.target.value) : null })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Stock total"
                type="number"
                min="0"
                value={String(editingItem.stock)}
                onChange={(e) => setEditingItem({ ...editingItem, stock: parseInt(e.target.value) || 0 })}
              />
              <Input
                label="Disponibles"
                type="number"
                min="0"
                value={String(editingItem.availableStock)}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    availableStock: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">Guardar Cambios</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
