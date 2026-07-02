"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, StatusBadge, showToast, EmptyState } from "@/components/ui";
import { useAuth } from "@/components/providers";
import { formatDate } from "@/lib/utils";

interface Record {
  id: string;
  description: string;
  amount: number | null;
  dueDate: string;
  status: "pending" | "paid" | "overdue";
  client: {
    id: string;
    name: string;
    phone: string;
  };
}

export default function HistorialPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("all");

  useEffect(() => {
    if (!authLoading && user?.role !== "user" && user?.role !== "admin") {
      router.push("/login");
      return;
    }
    if (user) {
      fetchRecords();
    }
  }, [user, authLoading, router]);

  const fetchRecords = async () => {
    try {
      const res = await fetch("/api/records");
      const data = await res.json();
      if (res.ok) setRecords(data.records);
    } catch (error) {
      console.error("Error fetching records:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-sub">Cargando...</p>
      </div>
    );
  }

  const filteredRecords = records.filter((r) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "paid") return r.status === "paid";
    return r.status === "pending" || r.status === "overdue";
  });

  const paidRecords = records.filter((r) => r.status === "paid");
  const pendingRecords = records.filter(
    (r) => r.status === "pending" || r.status === "overdue"
  );

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/app/dashboard")}
              className="text-text-sub hover:text-text-main"
            >
              ←
            </button>
            <span className="text-xl font-display font-bold text-text-main">
              Historial
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            Salir
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card rounded-md p-4 shadow-card border border-border">
            <p className="text-small text-text-sub mb-1">Pendientes</p>
            <p className="text-2xl font-bold text-warning">
              {pendingRecords.length}
            </p>
          </div>
          <div className="bg-card rounded-md p-4 shadow-card border border-border">
            <p className="text-small text-text-sub mb-1">Pagados</p>
            <p className="text-2xl font-bold text-accent">{paidRecords.length}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {(["all", "pending", "paid"] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "primary" : "secondary"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status === "all"
                ? "Todos"
                : status === "pending"
                ? "Pendientes"
                : "Pagados"}
            </Button>
          ))}
        </div>

        {/* Records List */}
        {filteredRecords.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No hay registros"
            description="Los registros que marques como pagados aparecerán aquí"
          />
        ) : (
          <div className="bg-card rounded-md shadow-card border border-border divide-y divide-border">
            {filteredRecords.map((record) => (
              <div key={record.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={record.status} />
                    </div>
                    <p className="font-medium text-text-main">
                      {record.client.name}
                    </p>
                    <p className="text-small text-text-sub truncate">
                      {record.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-small text-text-muted font-mono">
                      <span>📅 {formatDate(record.dueDate)}</span>
                      {record.amount != null && String(record.amount).trim() !== '' && <span>${Number(record.amount).toFixed(2)}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}