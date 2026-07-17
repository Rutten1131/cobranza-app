"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface Room {
  id: string;
  number: string;
  type: string;
  price: number;
  status: string;
  occupancyRate?: number;
}

interface RoomType {
  id: string;
  name: string;
}

interface Reservation {
  id: string;
  roomId: string;
  guestName: string;
  guestEmail?: string | null;
  guestPhone: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  amount: number;
  status: string; // pending, paid, cancelled
  adults: number;
  kids: number;
  room?: Room;
}

export default function HabitacionesPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [hotelReservations, setHotelReservations] = useState<Reservation[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [hotelView, setHotelView] = useState<"calendar" | "gantt">("calendar");
  const [selectedHotelRoomId, setSelectedHotelRoomId] = useState<string>("");
  const [hotelRoomSearch, setHotelRoomSearch] = useState("");
  const [hotelTypeFilter, setHotelTypeFilter] = useState("todos");
  const [currentHotelMonth, setCurrentHotelMonth] = useState(new Date(2026, 6, 1)); // Julio 2026

  // Modal Reserva Manual
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedRoomIdForCheckIn, setSelectedRoomIdForCheckIn] = useState<string | null>(null);
  const [checkInForm, setCheckInForm] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    amount: "",
    status: "paid", // "paid" o "pending"
    checkInDate: "",
    checkOutDate: "",
    adults: "2",
    kids: "0",
  });

  // Modal Información de Reserva Existente
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedReservationForInfo, setSelectedReservationForInfo] = useState<Reservation | null>(null);

  // Modal Ajustes Categorías
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

  // Modal Nueva Habitación
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState({
    number: "",
    type: "",
    price: "",
  });

  // Modal Editar Reserva
  const [showEditReservationModal, setShowEditReservationModal] = useState(false);
  const [editReservationForm, setEditReservationForm] = useState({
    id: "",
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    amount: "",
    status: "paid",
    checkInDate: "",
    checkOutDate: "",
    adults: "2",
    kids: "0",
  });

  // Modal Editar Habitación
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [editRoomForm, setEditRoomForm] = useState({
    id: "",
    number: "",
    type: "",
    price: "",
  });

  // Modal Confirmar Borrado de Habitación
  const [showDeleteRoomModal, setShowDeleteRoomModal] = useState(false);
  const [deleteRoomInfo, setDeleteRoomInfo] = useState<{ id: string; number: string; type: string; reservationCount: number } | null>(null);
  const [deleteRoomAction, setDeleteRoomAction] = useState<"migrate" | "force">("migrate");
  const [migrateTargetRoomId, setMigrateTargetRoomId] = useState("");

  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" }[]>([]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Cargar habitaciones, reservas y categorías
  const loadData = async () => {
    try {
      setLoadingData(true);
      
      // Habitaciones
      const resRooms = await fetch("/api/hotel-rooms");
      const dataRooms = await resRooms.json();
      setRooms(dataRooms);

      // Categorías / Tipos
      const resTypes = await fetch("/api/hotel-room-types");
      const dataTypes = await resTypes.json();
      setRoomTypes(dataTypes);

      // Reservas
      const resReservations = await fetch("/api/hotel-reservations");
      const dataReservations = await resReservations.json();
      
      const formattedReservations = dataReservations.map((res: any) => ({
        id: res.id,
        roomId: res.roomId,
        guestName: res.guestName,
        guestEmail: res.guestEmail,
        guestPhone: res.guestPhone,
        startDate: new Date(res.checkInDate).toISOString().split("T")[0],
        endDate: new Date(res.checkOutDate).toISOString().split("T")[0],
        amount: res.amount,
        status: res.status,
        adults: res.adults,
        kids: res.kids,
      }));
      setHotelReservations(formattedReservations);

      if (dataRooms.length > 0 && !selectedHotelRoomId) {
        setSelectedHotelRoomId(dataRooms[0].id);
      }
    } catch (err) {
      showToast("Error al cargar información del hotel", "error");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user) {
      loadData();
    }
  }, [user, authLoading, router]);

  const handleDayClick = (roomId: string, dateStr: string) => {
    const existingRes = hotelReservations.find((res) => {
      return (
        res.roomId === roomId &&
        dateStr >= res.startDate &&
        dateStr < res.endDate
      );
    });

    if (existingRes) {
      setSelectedReservationForInfo(existingRes);
      setShowInfoModal(true);
    } else {
      handleOpenCheckIn(roomId, dateStr);
    }
  };

  const handleOpenCheckIn = (roomId: string, dateStr?: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    
    let nextDayStr = "";
    if (dateStr) {
      const d = new Date(dateStr + "T12:00:00");
      d.setDate(d.getDate() + 1);
      nextDayStr = d.toISOString().split("T")[0];
    } else {
      const today = new Date();
      dateStr = today.toISOString().split("T")[0];
      today.setDate(today.getDate() + 1);
      nextDayStr = today.toISOString().split("T")[0];
    }

    setSelectedRoomIdForCheckIn(roomId);
    setCheckInForm({
      guestName: "",
      guestEmail: "",
      guestPhone: "",
      amount: String(room.price),
      status: "paid",
      checkInDate: dateStr,
      checkOutDate: nextDayStr,
      adults: "2",
      kids: "0",
    });
    setShowCheckInModal(true);
  };

  const handleExecuteCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomIdForCheckIn) return;

    try {
      const res = await fetch("/api/hotel-reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selectedRoomIdForCheckIn,
          guestName: checkInForm.guestName,
          guestEmail: checkInForm.guestEmail,
          guestPhone: checkInForm.guestPhone,
          amount: checkInForm.amount,
          status: checkInForm.status,
          checkInDate: checkInForm.checkInDate,
          checkOutDate: checkInForm.checkOutDate,
          adults: checkInForm.adults,
          kids: checkInForm.kids,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear la reserva");
      }

      showToast("Reserva guardada exitosamente", "success");
      setShowCheckInModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleCancelReservation = async (resId: string) => {
    if (!confirm("¿Seguro que deseas cancelar esta reserva?")) return;
    try {
      const res = await fetch(`/api/hotel-reservations?id=${resId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("No se pudo cancelar");
      showToast("Reserva cancelada exitosamente", "success");
      setShowInfoModal(false);
      setSelectedReservationForInfo(null);
      loadData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/hotel-rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: newRoomForm.number,
          type: newRoomForm.type,
          price: newRoomForm.price,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "No se pudo guardar la habitación");
      }

      showToast("Habitación creada exitosamente", "success");
      setShowAddRoomModal(false);
      setNewRoomForm({ number: "", type: roomTypes[0]?.name || "", price: "" });
      loadData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleAddRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;

    try {
      const res = await fetch("/api/hotel-room-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTypeName }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear la categoría");
      }

      showToast("Categoría agregada exitosamente", "success");
      setNewTypeName("");
      loadData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteRoomType = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar esta categoría?")) return;

    try {
      const res = await fetch(`/api/hotel-room-types?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("No se pudo eliminar");
      showToast("Categoría eliminada", "success");
      loadData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // ======= EDITAR RESERVA =======
  const handleOpenEditReservation = (reservation: Reservation) => {
    setEditReservationForm({
      id: reservation.id,
      guestName: reservation.guestName,
      guestEmail: reservation.guestEmail || "",
      guestPhone: reservation.guestPhone,
      amount: String(reservation.amount),
      status: reservation.status,
      checkInDate: reservation.startDate,
      checkOutDate: reservation.endDate,
      adults: String(reservation.adults),
      kids: String(reservation.kids),
    });
    setShowInfoModal(false);
    setShowEditReservationModal(true);
  };

  const handleSaveEditReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/hotel-reservations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editReservationForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al editar la reserva");
      }
      showToast("Reserva editada exitosamente", "success");
      setShowEditReservationModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // ======= EDITAR HABITACIÓN =======
  const handleOpenEditRoom = (room: Room) => {
    setEditRoomForm({
      id: room.id,
      number: room.number,
      type: room.type,
      price: String(room.price),
    });
    setShowEditRoomModal(true);
  };

  const handleSaveEditRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/hotel-rooms/${editRoomForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: editRoomForm.number,
          type: editRoomForm.type,
          price: editRoomForm.price,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al editar la habitación");
      }
      showToast("Habitación actualizada exitosamente", "success");
      setShowEditRoomModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // ======= BORRAR HABITACIÓN (con verificación de reservas) =======
  const handleDeleteRoom = async (roomId: string) => {
    try {
      // Primero verificar si tiene reservas
      const res = await fetch(`/api/hotel-rooms/${roomId}?action=check`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.hasReservations) {
        // Tiene reservas - mostrar modal de confirmación
        setDeleteRoomInfo({
          id: roomId,
          number: data.roomNumber,
          type: data.roomType,
          reservationCount: data.reservationCount,
        });
        setDeleteRoomAction("migrate");
        setMigrateTargetRoomId("");
        setShowDeleteRoomModal(true);
      } else {
        // No tiene reservas - confirmar borrado simple
        if (confirm(`¿Seguro que deseas eliminar la habitación ${data.roomNumber}?`)) {
          const delRes = await fetch(`/api/hotel-rooms/${roomId}?action=force`, {
            method: "DELETE",
          });
          if (!delRes.ok) throw new Error("Error al eliminar");
          showToast("Habitación eliminada exitosamente", "success");
          loadData();
        }
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleConfirmDeleteRoom = async () => {
    if (!deleteRoomInfo) return;

    try {
      if (deleteRoomAction === "migrate") {
        if (!migrateTargetRoomId) {
          showToast("Selecciona una habitación destino para migrar las reservas", "error");
          return;
        }
        const res = await fetch(
          `/api/hotel-rooms/${deleteRoomInfo.id}?action=migrate&targetRoomId=${migrateTargetRoomId}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Error al migrar y eliminar");
        const data = await res.json();
        showToast(`${data.migratedCount} reservas migradas a hab. ${data.targetRoom}. Habitación eliminada.`, "success");
      } else {
        // force delete
        const res = await fetch(`/api/hotel-rooms/${deleteRoomInfo.id}?action=force`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Error al eliminar");
        const data = await res.json();
        showToast(`Habitación eliminada con ${data.deletedReservations} reservas.`, "success");
      }

      setShowDeleteRoomModal(false);
      setDeleteRoomInfo(null);
      loadData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Calcular tasa de ocupación
  const getOccupancyRate = (roomId: string) => {
    const resCount = hotelReservations.filter(r => r.roomId === roomId).reduce((acc, curr) => {
      const start = new Date(curr.startDate);
      const end = new Date(curr.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return acc + diffDays;
    }, 0);
    return Math.min(Math.round((resCount / 31) * 100), 100);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-sub">Cargando...</p>
      </div>
    );
  }

  const selectedRoomObj = rooms.find((r) => r.id === selectedHotelRoomId);

  return (
    <div className="min-h-screen bg-surface">
      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded shadow-lg text-white text-xs font-semibold flex items-center gap-2 animate-fade-in ${
              t.type === "success" ? "bg-primary" : "bg-danger"
            }`}
          >
            <span>{t.type === "success" ? "✅" : "❌"}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏨</span>
            <span className="text-xl font-display font-bold text-text-main">
              {user?.businessName || "Hotel Control"}
            </span>
            {(Number(user?.hasCobranzas) + Number(user?.hasHabitaciones) + Number(user?.hasBarberia) > 1) && (
              <select
                value="habitaciones"
                onChange={(e) => {
                  if (e.target.value === "cobranzas") {
                    router.push("/app/dashboard");
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
            <Button variant="ghost" size="sm" onClick={logout}>
              Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Header Módulo Habitaciones */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-h2 font-display text-text-main">Panel de Recepción</h2>
              <p className="text-small text-text-sub">Gestión interna de habitaciones y reservas</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowSettingsModal(true)}>
                ⚙️ Configurar Categorías
              </Button>
              <button
                onClick={() => setHotelView("calendar")}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-sm border transition-all ${
                  hotelView === "calendar"
                    ? "bg-primary text-white border-primary"
                    : "bg-card text-text-sub border-border hover:bg-surface"
                }`}
              >
                📅 Calendario Individual
              </button>
              <button
                onClick={() => setHotelView("gantt")}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-sm border transition-all ${
                  hotelView === "gantt"
                    ? "bg-primary text-white border-primary"
                    : "bg-card text-text-sub border-border hover:bg-surface"
                }`}
              >
                📊 Timeline General
              </button>
            </div>
          </div>

          {hotelView === "calendar" ? (
            /* ================= VIEW: CALENDAR POR HABITACIÓN ================= */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* Lateral Izquierdo: Selección y Búsqueda de Habitaciones */}
              <div className="md:col-span-4 bg-card rounded-md border border-border p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Habitaciones</span>
                  <Button size="sm" onClick={() => {
                    setNewRoomForm({ number: "", type: roomTypes[0]?.name || "", price: "" });
                    setShowAddRoomModal(true);
                  }}>
                    + Añadir Hab.
                  </Button>
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="🔍 Buscar hab. o tipo..."
                    value={hotelRoomSearch}
                    onChange={(e) => setHotelRoomSearch(e.target.value)}
                    className="text-small"
                  />
                  <select
                    value={hotelTypeFilter}
                    onChange={(e) => setHotelTypeFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-border rounded-sm text-text-main focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="todos">Todos los tipos</option>
                    {roomTypes.map((type) => (
                      <option key={type.id} value={type.name}>{type.name}</option>
                    ))}
                  </select>
                </div>

                {/* Lista de habitaciones con scroll */}
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {loadingData ? (
                    <p className="text-xs text-text-muted py-4 text-center">Cargando habitaciones...</p>
                  ) : rooms.filter((r) => {
                      const matchesSearch =
                        r.number.includes(hotelRoomSearch) ||
                        r.type.toLowerCase().includes(hotelRoomSearch.toLowerCase());
                      const matchesType =
                        hotelTypeFilter === "todos" || r.type === hotelTypeFilter;
                      return matchesSearch && matchesType;
                    }).length === 0 ? (
                      <p className="text-xs text-text-muted py-4 text-center">No hay habitaciones registradas.</p>
                    ) : rooms
                    .filter((r) => {
                      const matchesSearch =
                        r.number.includes(hotelRoomSearch) ||
                        r.type.toLowerCase().includes(hotelRoomSearch.toLowerCase());
                      const matchesType =
                        hotelTypeFilter === "todos" || r.type === hotelTypeFilter;
                      return matchesSearch && matchesType;
                    })
                    .map((room) => {
                      const isSelected = selectedHotelRoomId === room.id;
                      const occupancy = getOccupancyRate(room.id);
                      return (
                        <div
                          key={room.id}
                          className={`w-full text-left p-3 rounded border transition-all flex flex-col gap-1.5 cursor-pointer ${
                            isSelected
                              ? "bg-primary/5 border-primary shadow-sm"
                              : "bg-card border-border/60 hover:bg-surface hover:border-border"
                          }`}
                          onClick={() => setSelectedHotelRoomId(room.id)}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="font-semibold text-small text-text-main">
                              {room.type} - {room.number}
                            </span>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleOpenEditRoom(room)}
                                className="text-[10px] text-primary hover:underline font-bold"
                                title="Editar habitación"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteRoom(room.id)}
                                className="text-[10px] text-danger hover:underline font-bold"
                                title="Eliminar habitación"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          <div className="w-full space-y-1">
                            <div className="flex justify-between text-[10px] text-text-muted">
                              <span>OCUPACIÓN MES</span>
                              <span>{occupancy}%</span>
                            </div>
                            <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-primary h-full rounded-full"
                                style={{ width: `${occupancy}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-[10px] text-text-muted font-semibold tracking-wide flex justify-between w-full">
                            <span>HABITACIÓN #{room.number}</span>
                            <span>${room.price} / noche</span>
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Lateral Derecho: Calendario Dinámico */}
              <div className="md:col-span-8 bg-card rounded-md border border-border p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-text-main capitalize">
                      {currentHotelMonth.toLocaleDateString("es-ES", {
                        month: "long",
                        year: "numeric",
                      })}
                    </h3>
                    <span className="text-xs text-text-muted">
                      Habitación:{" "}
                      <span className="font-semibold text-primary">
                        {selectedRoomObj ? `${selectedRoomObj.type} - ${selectedRoomObj.number}` : "(Ninguna)"}
                      </span>
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex border border-border rounded-sm overflow-hidden">
                      <button
                        onClick={() =>
                          setCurrentHotelMonth(
                            new Date(
                              currentHotelMonth.getFullYear(),
                              currentHotelMonth.getMonth() - 1,
                              1
                            )
                          )
                        }
                        className="px-3 py-1.5 bg-card hover:bg-surface border-r border-border text-xs font-semibold text-text-sub"
                      >
                        &lt;
                      </button>
                      <button
                        onClick={() =>
                          setCurrentHotelMonth(
                            new Date(
                              currentHotelMonth.getFullYear(),
                              currentHotelMonth.getMonth() + 1,
                              1
                            )
                          )
                        }
                        className="px-3 py-1.5 bg-card hover:bg-surface text-xs font-semibold text-text-sub"
                      >
                        &gt;
                      </button>
                    </div>
                    {selectedHotelRoomId && (
                      <Button size="sm" onClick={() => handleOpenCheckIn(selectedHotelRoomId)}>
                        + NUEVA RESERVA
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-text-muted border-b border-border/60 pb-2">
                  <div>LUNES</div>
                  <div>MARTES</div>
                  <div>MIÉRCOLES</div>
                  <div>JUEVES</div>
                  <div>VIERNES</div>
                  <div>SÁBADO</div>
                  <div>DOMINGO</div>
                </div>

                <div className="grid grid-cols-7 gap-1 bg-border/20 p-0.5 rounded-sm">
                  {(() => {
                    const year = currentHotelMonth.getFullYear();
                    const month = currentHotelMonth.getMonth();
                    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
                    const totalDays = new Date(year, month + 1, 0).getDate();

                    const days = [];
                    for (let i = 0; i < firstDayIndex; i++) {
                      days.push(
                        <div
                          key={`empty-${i}`}
                          className="bg-card/40 min-h-[95px] border border-border/30"
                        />
                      );
                    }

                    for (let day = 1; day <= totalDays; day++) {
                      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
                        day
                      ).padStart(2, "0")}`;

                      // Obtener todas las reservas de esta habitación que tocan este día
                      const dayReservations = hotelReservations.filter((res) => {
                        return (
                          res.roomId === selectedHotelRoomId &&
                          dateStr >= res.startDate &&
                          dateStr <= res.endDate
                        );
                      });

                      days.push(
                        <div
                          key={day}
                          onClick={() => selectedHotelRoomId && handleDayClick(selectedHotelRoomId, dateStr)}
                          className="bg-card min-h-[95px] p-2 border border-border/30 flex flex-col justify-between text-left transition-all hover:bg-primary/5 cursor-pointer"
                        >
                          <span className="font-bold text-text-main text-xs">{day}</span>

                          <div className="flex flex-col gap-1 w-full mt-1">
                            {dayReservations.map((res) => {
                              const isStart = res.startDate === dateStr;
                              const isEnd = res.endDate === dateStr;
                              
                              // Si es día intermedio o check-in o check-out
                              let badgeColor = "bg-primary/10 text-primary border-primary";
                              let label = `👤 ${res.guestName}`;

                              if (isStart) {
                                badgeColor = "bg-primary/20 text-primary border-primary font-bold";
                                label = `🔑 ${res.guestName}`;
                              } else if (isEnd) {
                                badgeColor = "bg-warning/15 text-warning border-warning font-semibold";
                                label = `🚪 ${res.guestName}`;
                              }

                              return (
                                <div
                                  key={res.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDayClick(selectedHotelRoomId, dateStr);
                                  }}
                                  className={`p-1 rounded-sm border-l-2 text-[9px] leading-tight truncate w-full ${badgeColor}`}
                                  title={`${res.guestName} (${res.startDate} a ${res.endDate})`}
                                >
                                  {label}
                                </div>
                              );
                            })}

                            {dayReservations.length === 0 && selectedHotelRoomId && (
                              <span className="text-[9px] text-text-muted opacity-0 hover:opacity-100 transition-all block text-right font-medium mt-auto">
                                + Reservar
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return days;
                  })()}
                </div>
              </div>
            </div>
          ) : (
            /* ================= VIEW: TIMELINE GENERAL (GANTT) ================= */
            <div className="bg-card rounded-md border border-border p-5 space-y-4 overflow-hidden">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="text-lg font-bold text-text-main">Línea de Ocupación</h3>
                  <p className="text-xs text-text-muted">
                    Vista panorámica de todo el hotel durante el mes de Julio 2026
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-border" /> Disponible
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Reservado
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto border border-border rounded-sm">
                <div className="min-w-[1200px]">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-surface border-b border-border">
                        <th className="p-3 font-semibold text-text-main sticky left-0 bg-surface z-10 border-r border-border w-[180px]">
                          Habitación
                        </th>
                        {Array.from({ length: 31 }).map((_, i) => (
                          <th
                            key={i}
                            className="p-2 font-semibold text-center border-r border-border/40 w-[35px]"
                          >
                            {i + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rooms.map((room) => (
                        <tr key={room.id} className="hover:bg-surface/40">
                          <td className="p-3 font-semibold text-text-main sticky left-0 bg-card z-10 border-r border-border font-mono">
                            {room.type} - {room.number}
                          </td>
                          {Array.from({ length: 31 }).map((_, i) => {
                            const day = i + 1;
                            const dateStr = `2026-07-${String(day).padStart(2, "0")}`;

                            const dayRes = hotelReservations.find((res) => {
                              return (
                                res.roomId === room.id &&
                                dateStr >= res.startDate &&
                                dateStr < res.endDate
                              );
                            });

                            return (
                              <td key={i} className="p-1 border-r border-border/40 text-center w-[35px]">
                                {dayRes ? (
                                  <div
                                    onClick={() => handleDayClick(room.id, dateStr)}
                                    className="h-7 w-full bg-primary/10 border-l-2 border-primary flex items-center justify-center cursor-pointer hover:bg-primary/20 rounded-xs"
                                    title={`Reservado por: ${dayRes.guestName}`}
                                  >
                                    <span className="text-[9px] font-bold text-primary">🛎️</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleDayClick(room.id, dateStr)}
                                    className="h-7 w-full border border-dashed border-primary/20 hover:border-primary hover:bg-primary/5 rounded-xs flex items-center justify-center transition-all"
                                    title="Crear reserva"
                                  >
                                    <span className="text-[10px] text-primary font-bold">+</span>
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Reserva Manual (Estilo exacto a la captura de pantalla con marca Azul Marino y Blanco) */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-2xl w-full max-w-lg overflow-hidden border border-border animate-scale-up">
            {/* Header del Modal */}
            <div className="bg-primary text-white p-5 relative font-sans">
              <h2 className="text-xl font-semibold tracking-wide font-display">Reserva Manual</h2>
              <p className="text-xs opacity-90 mt-1 font-mono">
                Habitación: {rooms.find((r) => r.id === selectedRoomIdForCheckIn)?.type}-
                {rooms.find((r) => r.id === selectedRoomIdForCheckIn)?.number}
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowCheckInModal(false);
                  setSelectedRoomIdForCheckIn(null);
                }}
                className="absolute right-5 top-5 text-white/80 hover:text-white text-xl transition-all"
              >
                ✕
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleExecuteCheckIn} className="p-6 space-y-4 text-left font-sans">
              <div>
                <label className="block text-[10px] font-bold text-text-main uppercase tracking-wider mb-1">
                  Nombre del Huésped
                </label>
                <input
                  type="text"
                  required
                  placeholder="Escribe el nombre aquí..."
                  value={checkInForm.guestName}
                  onChange={(e) => setCheckInForm({ ...checkInForm, guestName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-main uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="ejemplo@email.com"
                    value={checkInForm.guestEmail}
                    onChange={(e) => setCheckInForm({ ...checkInForm, guestEmail: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-main uppercase tracking-wider mb-1">
                    WhatsApp / Teléfono
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="099..."
                    value={checkInForm.guestPhone}
                    onChange={(e) => setCheckInForm({ ...checkInForm, guestPhone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-main uppercase tracking-wider mb-1">
                    Precio Total ($)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="Monto total cobrado"
                    value={checkInForm.amount}
                    onChange={(e) => setCheckInForm({ ...checkInForm, amount: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-main uppercase tracking-wider mb-1">
                    Estado de Pago
                  </label>
                  <select
                    value={checkInForm.status}
                    onChange={(e) => setCheckInForm({ ...checkInForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xs bg-white text-text-main focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  >
                    <option value="paid">🟢 OK (PAGADO)</option>
                    <option value="pending">🟡 PENDIENTE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-main uppercase tracking-wider mb-1">
                    Fecha Check-In
                  </label>
                  <input
                    type="date"
                    required
                    value={checkInForm.checkInDate}
                    onChange={(e) => setCheckInForm({ ...checkInForm, checkInDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-main uppercase tracking-wider mb-1">
                    Fecha Check-Out
                  </label>
                  <input
                    type="date"
                    required
                    value={checkInForm.checkOutDate}
                    onChange={(e) => setCheckInForm({ ...checkInForm, checkOutDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-main uppercase tracking-wider mb-1">
                    Adultos
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={checkInForm.adults}
                    onChange={(e) => setCheckInForm({ ...checkInForm, adults: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-main uppercase tracking-wider mb-1">
                    Niños
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={checkInForm.kids}
                    onChange={(e) => setCheckInForm({ ...checkInForm, kids: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowCheckInModal(false);
                    setSelectedRoomIdForCheckIn(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-text-sub bg-surface border border-border rounded-xs hover:bg-border/20 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  💾 Confirmar Reserva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Mostrar Información de la Reserva */}
      {showInfoModal && selectedReservationForInfo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-2xl w-full max-w-md overflow-hidden border border-border animate-scale-up">
            {/* Header */}
            <div className="bg-primary text-white p-5 relative font-sans">
              <h2 className="text-xl font-semibold tracking-wide font-display">Información de Reserva</h2>
              <p className="text-xs opacity-90 mt-1 font-mono">
                Habitación: {rooms.find((r) => r.id === selectedReservationForInfo.roomId)?.type}-
                {rooms.find((r) => r.id === selectedReservationForInfo.roomId)?.number}
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowInfoModal(false);
                  setSelectedReservationForInfo(null);
                }}
                className="absolute right-5 top-5 text-white/80 hover:text-white text-xl transition-all"
              >
                ✕
              </button>
            </div>

            {/* Datos */}
            <div className="p-6 space-y-4 text-xs font-sans text-left text-text-main">
              <div className="grid grid-cols-2 gap-4 border-b border-border/60 pb-3">
                <div>
                  <span className="block font-bold text-[10px] text-text-muted uppercase">Huésped</span>
                  <span className="font-semibold text-small">{selectedReservationForInfo.guestName}</span>
                </div>
                <div>
                  <span className="block font-bold text-[10px] text-text-muted uppercase">Teléfono</span>
                  <span className="font-semibold text-small">{selectedReservationForInfo.guestPhone}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-border/60 pb-3">
                <div>
                  <span className="block font-bold text-[10px] text-text-muted uppercase">Email</span>
                  <span className="font-semibold text-small">{selectedReservationForInfo.guestEmail || "(Sin email)"}</span>
                </div>
                <div>
                  <span className="block font-bold text-[10px] text-text-muted uppercase">Precio Cobrado</span>
                  <span className="font-semibold text-small text-primary font-mono">${selectedReservationForInfo.amount}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-border/60 pb-3">
                <div>
                  <span className="block font-bold text-[10px] text-text-muted uppercase">Fecha Ingreso</span>
                  <span className="font-semibold text-small">{selectedReservationForInfo.startDate}</span>
                </div>
                <div>
                  <span className="block font-bold text-[10px] text-text-muted uppercase">Fecha Salida</span>
                  <span className="font-semibold text-small">{selectedReservationForInfo.endDate}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-b border-border/60 pb-3">
                <div>
                  <span className="block font-bold text-[10px] text-text-muted uppercase">Adultos</span>
                  <span className="font-semibold text-small">{selectedReservationForInfo.adults}</span>
                </div>
                <div>
                  <span className="block font-bold text-[10px] text-text-muted uppercase">Niños</span>
                  <span className="font-semibold text-small">{selectedReservationForInfo.kids}</span>
                </div>
                <div>
                  <span className="block font-bold text-[10px] text-text-muted uppercase">Estado</span>
                  <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-sm mt-0.5 ${
                    selectedReservationForInfo.status === "paid" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"
                  }`}>
                    {selectedReservationForInfo.status === "paid" ? "🟢 OK (PAGADO)" : "🟡 PENDIENTE"}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center gap-2">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="text-danger hover:bg-danger/5 hover:text-danger text-xs font-semibold"
                    onClick={() => handleCancelReservation(selectedReservationForInfo.id)}
                  >
                    🗑️ Cancelar
                  </Button>
                  <Button
                    variant="secondary"
                    className="text-xs font-semibold"
                    onClick={() => handleOpenEditReservation(selectedReservationForInfo)}
                  >
                    ✏️ Editar
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowInfoModal(false);
                    setSelectedReservationForInfo(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xs transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configurar Categorías / Ajustes */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-2xl w-full max-w-md overflow-hidden border border-border animate-scale-up">
            {/* Header */}
            <div className="bg-primary text-white p-5 relative font-sans">
              <h2 className="text-xl font-semibold tracking-wide font-display">Categorías de Habitación</h2>
              <p className="text-xs opacity-90 mt-1">Configura los tipos de habitaciones disponibles en tu hotel</p>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="absolute right-5 top-5 text-white/80 hover:text-white text-xl transition-all"
              >
                ✕
              </button>
            </div>

            {/* Listado y Formulario */}
            <div className="p-6 space-y-4 font-sans text-left">
              {/* Formulario Agregar Tipo */}
              <form onSubmit={handleAddRoomType} className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-text-main uppercase tracking-wider mb-1">
                    Nueva Categoría
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Matrimonial Ejecutiva, Suite Deluxe"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
                <Button type="submit" size="sm">
                  Agregar
                </Button>
              </form>

              {/* Listado */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto border-t border-border/60 pt-4 mt-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Categorías Registradas</span>
                {roomTypes.length === 0 ? (
                  <p className="text-xs text-text-muted py-2 text-center">No hay categorías agregadas aún.</p>
                ) : (
                  roomTypes.map((type) => (
                    <div key={type.id} className="flex justify-between items-center bg-surface p-2 rounded border border-border/50 text-xs">
                      <span className="font-semibold text-text-main">{type.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoomType(type.id)}
                        className="text-danger hover:text-danger/85 font-bold px-1"
                        title="Eliminar categoría"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xs transition-all"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar Habitación */}
      <Modal
        isOpen={showAddRoomModal}
        onClose={() => setShowAddRoomModal(false)}
        title="Añadir Nueva Habitación"
      >
        <form onSubmit={handleCreateRoom} className="space-y-4 text-left font-sans">
          <Input
            label="Número de Habitación *"
            placeholder="Ej: 301, 102B"
            value={newRoomForm.number}
            onChange={(e) => setNewRoomForm({ ...newRoomForm, number: e.target.value })}
            required
          />
          <div className="space-y-1">
            <label className="block text-small font-semibold text-text-main">
              Tipo de Habitación *
            </label>
            {roomTypes.length === 0 ? (
              <div className="p-3 border border-warning/30 bg-warning/5 rounded text-xs text-warning flex flex-col gap-2 items-start">
                <span>Debes configurar al menos una categoría de habitación primero.</span>
                <Button size="sm" type="button" onClick={() => {
                  setShowAddRoomModal(false);
                  setShowSettingsModal(true);
                }}>
                  ⚙️ Configurar Categorías
                </Button>
              </div>
            ) : (
              <select
                value={newRoomForm.type}
                onChange={(e) => setNewRoomForm({ ...newRoomForm, type: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-border rounded-sm bg-white text-text-main focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                required
              >
                <option value="">Selecciona una categoría...</option>
                {roomTypes.map((type) => (
                  <option key={type.id} value={type.name}>{type.name}</option>
                ))}
              </select>
            )}
          </div>
          <Input
            label="Precio por Noche ($) *"
            type="number"
            min="1"
            placeholder="60"
            value={newRoomForm.price}
            onChange={(e) => setNewRoomForm({ ...newRoomForm, price: e.target.value })}
            required
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddRoomModal(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={roomTypes.length === 0}>Agregar Habitación</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Reserva */}
      {showEditReservationModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-2xl w-full max-w-lg overflow-hidden border border-border animate-scale-up">
            {/* Header del Modal */}
            <div className="bg-primary text-white p-5 relative font-sans">
              <h2 className="text-xl font-semibold tracking-wide font-display">Editar Reserva</h2>
              <p className="text-xs opacity-90 mt-1 font-mono">Modifica los detalles del registro</p>
              <button
                type="button"
                onClick={() => {
                  setShowEditReservationModal(false);
                }}
                className="absolute right-5 top-5 text-white/80 hover:text-white text-xl transition-all"
              >
                ✕
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveEditReservation} className="p-6 space-y-4 text-left font-sans">
              <div>
                <label className="block text-[10px] font-bold text-text-main uppercase tracking-wider mb-1">
                  Nombre del Huésped
                </label>
                <input
                  type="text"
                  required
                  value={editReservationForm.guestName}
                  onChange={(e) => setEditReservationForm({ ...editReservationForm, guestName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-main uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editReservationForm.guestEmail}
                    onChange={(e) => setEditReservationForm({ ...editReservationForm, guestEmail: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-main uppercase tracking-wider mb-1">
                    WhatsApp / Teléfono
                  </label>
                  <input
                    type="text"
                    required
                    value={editReservationForm.guestPhone}
                    onChange={(e) => setEditReservationForm({ ...editReservationForm, guestPhone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-main uppercase tracking-wider mb-1">
                    Precio Total ($)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editReservationForm.amount}
                    onChange={(e) => setEditReservationForm({ ...editReservationForm, amount: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-main uppercase tracking-wider mb-1">
                    Estado de Pago
                  </label>
                  <select
                    value={editReservationForm.status}
                    onChange={(e) => setEditReservationForm({ ...editReservationForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xs bg-white text-text-main focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  >
                    <option value="paid">🟢 OK (PAGADO)</option>
                    <option value="pending">🟡 PENDIENTE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-main uppercase tracking-wider mb-1">
                    Fecha Check-In
                  </label>
                  <input
                    type="date"
                    required
                    value={editReservationForm.checkInDate}
                    onChange={(e) => setEditReservationForm({ ...editReservationForm, checkInDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-main uppercase tracking-wider mb-1">
                    Fecha Check-Out
                  </label>
                  <input
                    type="date"
                    required
                    value={editReservationForm.checkOutDate}
                    onChange={(e) => setEditReservationForm({ ...editReservationForm, checkOutDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-main uppercase tracking-wider mb-1">
                    Adultos
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editReservationForm.adults}
                    onChange={(e) => setEditReservationForm({ ...editReservationForm, adults: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-main uppercase tracking-wider mb-1">
                    Niños
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editReservationForm.kids}
                    onChange={(e) => setEditReservationForm({ ...editReservationForm, kids: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowEditReservationModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-text-sub bg-surface border border-border rounded-xs hover:bg-border/20 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Habitación */}
      <Modal
        isOpen={showEditRoomModal}
        onClose={() => setShowEditRoomModal(false)}
        title="Editar Habitación"
      >
        <form onSubmit={handleSaveEditRoom} className="space-y-4 text-left font-sans">
          <Input
            label="Número de Habitación *"
            placeholder="Ej: 301, 102B"
            value={editRoomForm.number}
            onChange={(e) => setEditRoomForm({ ...editRoomForm, number: e.target.value })}
            required
          />
          <div className="space-y-1">
            <label className="block text-small font-semibold text-text-main">
              Tipo de Habitación *
            </label>
            <select
              value={editRoomForm.type}
              onChange={(e) => setEditRoomForm({ ...editRoomForm, type: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-border rounded-sm bg-white text-text-main focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
              required
            >
              {roomTypes.map((type) => (
                <option key={type.id} value={type.name}>{type.name}</option>
              ))}
            </select>
          </div>
          <Input
            label="Precio por Noche ($) *"
            type="number"
            min="1"
            value={editRoomForm.price}
            onChange={(e) => setEditRoomForm({ ...editRoomForm, price: e.target.value })}
            required
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowEditRoomModal(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Guardar Cambios</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Borrado de Habitación (con reservas) */}
      {showDeleteRoomModal && deleteRoomInfo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-2xl w-full max-w-md overflow-hidden border border-border animate-scale-up">
            {/* Header */}
            <div className="bg-danger text-white p-5 relative font-sans">
              <h2 className="text-lg font-semibold tracking-wide font-display">⚠️ Habitación con Reservas</h2>
              <p className="text-xs opacity-90 mt-1">
                La habitación #{deleteRoomInfo.number} ({deleteRoomInfo.type}) tiene {deleteRoomInfo.reservationCount} reservas.
              </p>
            </div>

            {/* Opciones */}
            <div className="p-6 space-y-4 font-sans text-left text-xs">
              <p className="text-text-sub font-medium">
                ¿Qué deseas hacer con las reservas activas asociadas a esta habitación?
              </p>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 border border-border rounded cursor-pointer hover:bg-surface transition-all">
                  <input
                    type="radio"
                    name="deleteAction"
                    value="migrate"
                    checked={deleteRoomAction === "migrate"}
                    onChange={() => setDeleteRoomAction("migrate")}
                    className="mt-0.5 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="block font-bold text-text-main">Migrar reservas a otra habitación</span>
                    <span className="block text-[10px] text-text-muted mt-0.5">
                      Transfiere las {deleteRoomInfo.reservationCount} reservas automáticamente.
                    </span>
                  </div>
                </label>

                {deleteRoomAction === "migrate" && (
                  <div className="pl-6 animate-fade-in space-y-1">
                    <label className="block text-[10px] font-bold text-text-main uppercase tracking-wider mb-1">
                      Seleccionar Habitación Destino
                    </label>
                    <select
                      value={migrateTargetRoomId}
                      onChange={(e) => setMigrateTargetRoomId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-border rounded-xs bg-white text-text-main focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                    >
                      <option value="">Selecciona habitación destino...</option>
                      {rooms
                        .filter((r) => r.id !== deleteRoomInfo.id)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            Hab. {r.number} ({r.type})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <label className="flex items-start gap-3 p-3 border border-border rounded cursor-pointer hover:bg-surface transition-all">
                  <input
                    type="radio"
                    name="deleteAction"
                    value="force"
                    checked={deleteRoomAction === "force"}
                    onChange={() => setDeleteRoomAction("force")}
                    className="mt-0.5 text-danger focus:ring-danger"
                  />
                  <div>
                    <span className="block font-bold text-danger">Borrar todo (Forzar borrado)</span>
                    <span className="block text-[10px] text-text-muted mt-0.5">
                      Eliminará la habitación y cancelará todas las reservas asociadas permanentemente.
                    </span>
                  </div>
                </label>
              </div>

              {deleteRoomAction === "force" && (
                <div className="p-3 bg-danger/5 border border-danger/20 text-danger rounded font-semibold text-[10px]">
                  ⚠️ ¡Atención! Esta acción cancelará las {deleteRoomInfo.reservationCount} reservas activas y no se puede deshacer.
                </div>
              )}

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteRoomModal(false);
                    setDeleteRoomInfo(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-text-sub bg-surface border border-border rounded-xs hover:bg-border/20 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteRoom}
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xs transition-all ${
                    deleteRoomAction === "force" ? "bg-danger hover:bg-danger/90" : "bg-primary hover:bg-primary-dark"
                  }`}
                >
                  {deleteRoomAction === "migrate" ? "Migrar y Eliminar" : "Eliminar Todo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
