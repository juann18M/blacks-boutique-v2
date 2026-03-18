"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  Package,
  Search,
  MapPin,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Edit,
  X,
  Check,
  Filter,
  Download,
  FileSpreadsheet,
  Grid3X3,
  List,
  ArrowRightLeft,
  ArrowRight,
  Truck
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";

interface Producto {
  id: number;
  etiqueta: string;
  nombre: string;
  color: string | null;
  talla: string | null;
  precio: number;
  stock: number;
  ubicacion: string | null;
  sucursal_id: number;
}

interface Sucursal {
  id: number;
  nombre: string;
}

interface Traslado {
  id: number;
  folio: string;
  producto_id: number;
  producto_nombre: string;
  etiqueta: string;
  cantidad: number;
  sucursal_origen_id: number;
  sucursal_origen_nombre: string;
  sucursal_destino_id: number;
  sucursal_destino_nombre: string;
  usuario_nombre: string;
  imagen: string | null;
  motivo: string | null;
  created_at: string;
}

export default function TrasladosPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [sucursalActiva, setSucursalActiva] = useState("");
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalesCargadas, setSucursalesCargadas] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [traslados, setTraslados] = useState<Traslado[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  
  // Estado para nuevo traslado
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [sucursalDestino, setSucursalDestino] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    const user = sessionStorage.getItem("usuario");
    if (!user) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(user);
    setUsuario(parsed);

    cargarSucursales().then(() => {
      if (parsed.rol === "admin") {
        const guardada = sessionStorage.getItem("sucursalActiva");
        if (guardada) {
          setSucursalActiva(guardada);
        }
      } else {
        setSucursalActiva(parsed.sucursal_id.toString());
      }
    });
  }, [router]);

  useEffect(() => {
    if (sucursalActiva && sucursalesCargadas) {
      cargarProductos();
      cargarTraslados();
    }
  }, [sucursalActiva, sucursalesCargadas]);

  const cargarSucursales = async () => {
    try {
      const res = await fetch("/api/sucursales");
      const data = await res.json();
      setSucursales(data);
      setSucursalesCargadas(true);
    } catch (error) {
      console.error("Error cargando sucursales:", error);
    }
  };

  const cargarProductos = async () => {
    try {
      const res = await fetch(`/api/inventario/productos?sucursal_id=${sucursalActiva}`);
      const data = await res.json();
      setProductos(data);
      setProductosFiltrados(data);
    } catch (error) {
      console.error("Error cargando productos:", error);
    }
  };

  const cargarTraslados = async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/traslados?sucursal_id=${sucursalActiva}`);
      const data = await res.json();
      setTraslados(data);
    } catch (error) {
      console.error("Error cargando traslados:", error);
    } finally {
      setCargando(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBusqueda(value);
    
    if (value.trim() === "") {
      setProductosFiltrados(productos);
    } else {
      const filtrados = productos.filter(p => 
        p.nombre.toLowerCase().includes(value.toLowerCase()) ||
        p.etiqueta.toLowerCase().includes(value.toLowerCase()) ||
        (p.color && p.color.toLowerCase().includes(value.toLowerCase())) ||
        (p.talla && p.talla.toLowerCase().includes(value.toLowerCase()))
      );
      setProductosFiltrados(filtrados);
    }
  };

  const abrirModalTraslado = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setSucursalDestino("");
    setCantidad("");
    setMotivo("");
    setMostrarModal(true);
  };

  const realizarTraslado = async () => {
    if (!productoSeleccionado) return;
    if (!sucursalDestino) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Selecciona la sucursal de destino',
        confirmButtonColor: '#000'
      });
      return;
    }
    if (!cantidad || parseInt(cantidad) <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ingresa una cantidad válida',
        confirmButtonColor: '#000'
      });
      return;
    }
    if (parseInt(cantidad) > productoSeleccionado.stock) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Stock insuficiente. Disponible: ${productoSeleccionado.stock}`,
        confirmButtonColor: '#000'
      });
      return;
    }

    try {
      const res = await fetch('/api/traslados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: productoSeleccionado.id,
          cantidad: parseInt(cantidad),
          sucursal_origen_id: parseInt(sucursalActiva),
          sucursal_destino_id: parseInt(sucursalDestino),
          usuario_id: usuario.id,
          motivo: motivo || null
        })
      });

      if (res.ok) {
        setMostrarModal(false);
        await cargarProductos();
        await cargarTraslados();
        
        Swal.fire({
          icon: 'success',
          title: 'Traslado realizado',
          text: 'El producto se ha trasladado correctamente',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        const error = await res.json();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error || 'Error al realizar traslado',
          confirmButtonColor: '#000'
        });
      }
    } catch (error) {
      console.error("Error en traslado:", error);
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!usuario) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar usuario={usuario} onLogout={() => router.push('/login')} />

      <main className="lg:ml-20 min-h-screen transition-all duration-300">
        <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto">
          {/* Header con animación */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-black"></div>
              <h1 className="text-3xl sm:text-4xl font-light text-black">
                Traslados
              </h1>
              {cargando && (
                <RefreshCw size={20} className="text-black animate-spin ml-2" />
              )}
            </div>

            <button
              onClick={cargarTraslados}
              className="p-2.5 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-all hover:scale-105"
              title="Actualizar"
            >
              <RefreshCw size={18} className="text-black" />
            </button>
          </div>

          {/* Buscador con animación */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm hover:shadow-md transition-all animate-slideDown">
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-black" />
              <input
                type="text"
                value={busqueda}
                onChange={handleSearch}
                placeholder="Buscar producto para trasladar..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-black placeholder-gray-500 focus:outline-none focus:border-black transition-all"
              />
            </div>

            {/* Resultados de búsqueda con animación */}
            {busqueda && productosFiltrados.length > 0 && (
              <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden animate-slideDown">
                {productosFiltrados.map((producto, index) => (
                  <button
                    key={producto.id}
                    onClick={() => abrirModalTraslado(producto)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-all border-b last:border-b-0 animate-fadeIn"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <Package size={18} className="text-black" />
                      <div className="text-left">
                        <span className="font-medium text-black">{producto.nombre}</span>
                        <span className="text-xs text-black ml-2">#{producto.etiqueta}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-black">Stock: {producto.stock}</span>
                      <ArrowRight size={16} className="text-black" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lista de traslados recientes */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-fadeIn">
            <h2 className="text-xl font-medium text-black mb-4 flex items-center gap-2">
              <Truck size={20} className="text-black" />
              Traslados recientes
            </h2>

            {traslados.length === 0 ? (
              <div className="text-center py-16 animate-fadeIn">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ArrowRightLeft size={32} className="text-black" />
                </div>
                <p className="text-black text-lg mb-2">No hay traslados registrados</p>
                <p className="text-black text-sm">Busca un producto para comenzar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {traslados.map((t, index) => (
                  <div
                    key={t.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all hover:shadow-md animate-slideRight"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                        TRASLADO
                      </span>
                      <span className="font-semibold text-black">{t.producto_nombre}</span>
                      <span className="text-xs text-black">#{t.etiqueta}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg">
                        <span className="font-medium text-black">{t.sucursal_origen_nombre}</span>
                        <ArrowRight size={14} className="text-black" />
                        <span className="font-medium text-black">{t.sucursal_destino_nombre}</span>
                      </div>
                      
                      <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
                        {t.cantidad} uds
                      </span>
                      
                      {t.motivo && (
                        <span className="text-xs text-black italic bg-white px-3 py-1.5 rounded-lg">
                          "{t.motivo}"
                        </span>
                      )}
                      
                      <div className="flex items-center gap-3 text-xs text-black">
                        <span>{formatFecha(t.created_at)}</span>
                        <span className="w-1 h-1 bg-black rounded-full"></span>
                        <span>Por: {t.usuario_nombre}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal de traslado con animaciones */}
      {mostrarModal && productoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-5 flex items-center justify-between">
              <h2 className="text-xl font-medium text-black">Trasladar producto</h2>
              <button
                onClick={() => setMostrarModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-110"
              >
                <X size={20} className="text-black" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="bg-gray-100 p-4 rounded-xl">
                <p className="font-semibold text-black text-lg">{productoSeleccionado.nombre}</p>
                <p className="text-sm text-black mt-1">#{productoSeleccionado.etiqueta}</p>
                <div className="flex items-center gap-3 mt-3 text-sm text-black">
                  <MapPin size={14} className="text-black" />
                  <span>Origen: {sucursales.find(s => s.id.toString() === sucursalActiva)?.nombre || 'Cargando...'}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Package size={14} className="text-black" />
                  <span className="text-black">Stock disponible: <span className="font-bold">{productoSeleccionado.stock}</span></span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-black">
                  Sucursal destino
                </label>
                <select
                  value={sucursalDestino}
                  onChange={(e) => setSucursalDestino(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                >
                  <option value="" className="text-black">Seleccionar sucursal</option>
                  {sucursales
                    .filter(s => s.id.toString() !== sucursalActiva)
                    .map(s => (
                      <option key={s.id} value={s.id} className="text-black">{s.nombre}</option>
                    ))
                  }
                </select>
                {sucursales.length === 0 && (
                  <p className="text-xs text-black mt-1">Cargando sucursales...</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-black">
                  Cantidad a trasladar
                </label>
                <input
                  type="number"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  min="1"
                  max={productoSeleccionado.stock}
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-black placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  placeholder={`Máx: ${productoSeleccionado.stock}`}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-black">
                  Motivo <span className="font-normal text-black">(opcional)</span>
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: Reabastecer sucursal, venta especial, etc."
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-black placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all resize-none"
                />
              </div>

              {cantidad && parseInt(cantidad) > 0 && (
                <div className="bg-blue-100 border border-blue-300 rounded-xl p-4 animate-pulse">
                  <p className="text-sm text-blue-700 font-medium">
                    Se trasladarán {cantidad} unidades a la sucursal seleccionada
                  </p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-5 flex justify-end gap-3">
              <button
                onClick={() => setMostrarModal(false)}
                className="px-6 py-2.5 bg-gray-200 text-black font-medium rounded-xl hover:bg-gray-300 transition-all hover:scale-105"
              >
                Cancelar
              </button>
              <button
                onClick={realizarTraslado}
                className="px-6 py-2.5 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-all hover:scale-105"
              >
                Realizar traslado
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
        
        .animate-slideRight {
          animation: slideRight 0.3s ease-out forwards;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}