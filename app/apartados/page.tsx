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
  User,
  Phone,
  Calendar,
  Clock,
  Wallet,
  CreditCard,
  Landmark,
  MessageSquare,
  ShoppingBag
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
  imagen: string | null;
}

interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  email?: string;
  direccion?: string;
}

interface Apartado {
  id: number;
  folio: string;
  cliente_id: number;
  cliente_nombre: string;
  cliente_telefono: string;
  producto_id: number;
  producto_nombre: string;
  producto_etiqueta: string;
  producto_imagen: string | null;
  cantidad: number;
  precio_apartado: number;
  anticipo: number;
  anticipo_metodo?: string;
  saldo_pendiente: number;
  fecha_apartado: string;
  fecha_limite: string;
  estado: 'activo' | 'completado' | 'cancelado' | 'vencido';
  notas: string | null;
  usuario_nombre: string;
  created_at: string;
}

export default function ApartadosPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [sucursalActiva, setSucursalActiva] = useState("");
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [apartados, setApartados] = useState<Apartado[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("activo");
  
  // Estados para nuevo apartado
  const [mostrarModal, setMostrarModal] = useState(false);
  const [paso, setPaso] = useState(1);
  
  // Datos del cliente
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  
  // Datos del producto
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState("1");
  const [anticipo, setAnticipo] = useState("");
  const [anticipoMetodo, setAnticipoMetodo] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
  const [notas, setNotas] = useState("");

  // Función para formatear precios
  const formatPrecio = (valor: number | string | undefined): string => {
    if (valor === undefined || valor === null) return '0.00';
    const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
    return isNaN(numero) ? '0.00' : numero.toFixed(2);
  };

  // Función para obtener nombre del método de pago
  const getMetodoPagoNombre = (metodo: string) => {
    const metodos: Record<string, string> = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia'
    };
    return metodos[metodo] || metodo;
  };

  useEffect(() => {
    const user = sessionStorage.getItem("usuario");
    if (!user) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(user);
    setUsuario(parsed);

    if (parsed.rol === "admin") {
      cargarSucursales();
      const guardada = sessionStorage.getItem("sucursalActiva");
      if (guardada) setSucursalActiva(guardada);
    } else {
      setSucursalActiva(parsed.sucursal_id.toString());
    }
  }, [router]);

  useEffect(() => {
    if (sucursalActiva) {
      cargarProductos();
      cargarApartados();
    }
  }, [sucursalActiva, filtroEstado]);

  const cargarSucursales = async () => {
    try {
      const res = await fetch("/api/sucursales");
      const data = await res.json();
      setSucursales(data);
    } catch (error) {
      console.error("Error cargando sucursales:", error);
    }
  };

  const cargarProductos = async () => {
    try {
      const res = await fetch(`/api/inventario/productos?sucursal_id=${sucursalActiva}`);
      const data = await res.json();
      
      const productosConPrecioNumerico = data.map((p: any) => ({
        ...p,
        precio: Number(p.precio)
      }));
      
      setProductos(productosConPrecioNumerico);
      setProductosFiltrados(productosConPrecioNumerico);
    } catch (error) {
      console.error("Error cargando productos:", error);
    }
  };

  const cargarApartados = async () => {
    setCargando(true);
    try {
      const url = `/api/apartados?sucursal_id=${sucursalActiva}${filtroEstado ? `&estado=${filtroEstado}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      setApartados(data);
    } catch (error) {
      console.error("Error cargando apartados:", error);
    } finally {
      setCargando(false);
    }
  };

  const handleSearchProducto = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const abrirModal = () => {
    setPaso(1);
    setClienteNombre("");
    setClienteTelefono("");
    setClienteEmail("");
    setClienteDireccion("");
    setProductoSeleccionado(null);
    setCantidad("1");
    setAnticipo("");
    setAnticipoMetodo('efectivo');
    setNotas("");
    setMostrarModal(true);
  };

  const seleccionarProducto = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setPaso(2);
  };

  const crearApartado = async () => {
    if (!clienteNombre || !clienteTelefono) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'El nombre y teléfono del cliente son obligatorios'
      });
      return;
    }

    if (!productoSeleccionado) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Selecciona un producto'
      });
      return;
    }

    const cantidadNum = parseInt(cantidad);
    if (cantidadNum > productoSeleccionado.stock) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Solo hay ${productoSeleccionado.stock} unidades disponibles`
      });
      return;
    }

    const anticipoNum = parseFloat(anticipo) || 0;
    const total = productoSeleccionado.precio * cantidadNum;
    
    if (anticipoNum > total) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'El anticipo no puede ser mayor al total'
      });
      return;
    }

    try {
      const res = await fetch('/api/apartados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_nombre: clienteNombre,
          cliente_telefono: clienteTelefono,
          cliente_email: clienteEmail || null,
          cliente_direccion: clienteDireccion || null,
          producto_id: productoSeleccionado.id,
          cantidad: cantidadNum,
          anticipo: anticipoNum,
          anticipo_metodo: anticipoNum > 0 ? anticipoMetodo : null,
          notas: notas || null,
          usuario_id: usuario.id,
          sucursal_id: parseInt(sucursalActiva)
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMostrarModal(false);
        await cargarApartados();
        
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + 30);
        
        Swal.fire({
          icon: 'success',
          title: '¡Apartado creado!',
          html: `
            <div class="text-left text-black">
              <p class="mb-1"><strong>Folio:</strong> ${data.apartado.folio}</p>
              <p class="mb-1"><strong>Cliente:</strong> ${clienteNombre}</p>
              <p class="mb-1"><strong>Producto:</strong> ${productoSeleccionado.nombre} x${cantidadNum}</p>
              <p class="mb-1"><strong>Total:</strong> $${formatPrecio(total)}</p>
              ${anticipoNum > 0 ? `
                <p class="mb-1"><strong>Anticipo:</strong> $${formatPrecio(anticipoNum)} (${getMetodoPagoNombre(anticipoMetodo)})</p>
              ` : ''}
              <p class="mb-1"><strong>Saldo:</strong> $${formatPrecio(total - anticipoNum)}</p>
              <p class="mb-3"><strong>Fecha límite:</strong> ${fechaLimite.toLocaleDateString('es-MX')} (30 días)</p>
              ${data.whatsapp?.link ? `
                <div class="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p class="text-sm text-green-700 mb-2 flex items-center gap-2">
                    <MessageSquare size={16} />
                    Mensaje enviado al cliente
                  </p>
                  <a 
                    href="${data.whatsapp.link}" 
                    target="_blank"
                    class="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                  >
                    Abrir WhatsApp
                  </a>
                </div>
              ` : ''}
            </div>
          `,
          confirmButtonColor: '#000',
          confirmButtonText: 'OK'
        });
      } else {
        const error = await res.json();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error || 'Error al crear apartado'
        });
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const liquidarApartado = async (apartado: Apartado) => {
    const { value: formValues } = await Swal.fire({
      title: 'Registrar pago',
      html: `
        <div class="space-y-4 text-left text-black">
          <p class="text-sm bg-gray-50 p-2 rounded">
            <span class="font-medium">Folio:</span> ${apartado.folio}<br>
            <span class="font-medium">Producto:</span> ${apartado.producto_nombre}<br>
            <span class="font-medium">Saldo pendiente:</span> $${formatPrecio(apartado.saldo_pendiente)}
          </p>
          
          <div>
            <label class="block text-sm font-medium text-black mb-1">Monto a pagar</label>
            <input id="monto" type="number" class="w-full p-2 border border-gray-300 rounded-lg focus:border-black" value="${apartado.saldo_pendiente}" step="0.01">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-black mb-1">Método de pago</label>
            <select id="metodo" class="w-full p-2 border border-gray-300 rounded-lg focus:border-black">
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-black mb-1">Referencia <span class="font-normal text-gray-500">(opcional)</span></label>
            <input id="referencia" type="text" class="w-full p-2 border border-gray-300 rounded-lg focus:border-black" placeholder="Ej: VISA ****1234">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Pagar',
      confirmButtonColor: '#000',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const monto = (document.getElementById('monto') as HTMLInputElement)?.value;
        const metodo = (document.getElementById('metodo') as HTMLSelectElement)?.value;
        const referencia = (document.getElementById('referencia') as HTMLInputElement)?.value;
        
        if (!monto || parseFloat(monto) <= 0) {
          Swal.showValidationMessage('Ingresa un monto válido');
          return false;
        }
        
        return { monto: parseFloat(monto), metodo, referencia };
      }
    });

    if (formValues) {
      try {
        const res = await fetch(`/api/apartados?id=${apartado.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            monto: formValues.monto,
            metodo_pago: formValues.metodo,
            referencia: formValues.referencia,
            usuario_id: usuario.id
          })
        });

        if (res.ok) {
          const data = await res.json();
          await cargarApartados();
          
          const mensaje = data.message === 'Apartado liquidado' 
            ? '¡Apartado liquidado! Se ha enviado un mensaje al cliente.'
            : 'Abono registrado. Se ha enviado un mensaje al cliente.';
          
          Swal.fire({
            icon: 'success',
            title: data.message,
            text: mensaje,
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          const error = await res.json();
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.error
          });
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  const cancelarApartado = async (id: number) => {
    const result = await Swal.fire({
      title: '¿Cancelar apartado?',
      text: 'El stock será devuelto al inventario',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#000',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/apartados?id=${id}&usuario_id=${usuario.id}`, {
          method: 'DELETE'
        });

        if (res.ok) {
          await cargarApartados();
          Swal.fire({
            icon: 'success',
            title: 'Apartado cancelado',
            timer: 1500,
            showConfirmButton: false
          });
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activo': return 'bg-green-100 text-green-700';
      case 'completado': return 'bg-blue-100 text-blue-700';
      case 'cancelado': return 'bg-gray-100 text-gray-700';
      case 'vencido': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getDiasRestantes = (fechaLimite: string) => {
    const hoy = new Date();
    const limite = new Date(fechaLimite);
    const diff = limite.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-MX');
  };

  if (!usuario) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar usuario={usuario} onLogout={() => router.push('/login')} />

      <main className="lg:ml-20 min-h-screen transition-all duration-300">
        <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-black"></div>
              <h1 className="text-2xl sm:text-3xl font-light text-black">
                Apartados
              </h1>
              {cargando && <RefreshCw size={18} className="text-black animate-spin" />}
            </div>

            <div className="flex items-center gap-3">
              {usuario?.rol === "admin" && (
                <select
                  value={sucursalActiva}
                  onChange={(e) => setSucursalActiva(e.target.value)}
                  className="bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-medium text-black outline-none focus:border-black"
                >
                  {sucursales.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              )}
              
              <button
                onClick={abrirModal}
                className="bg-black text-white px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <ShoppingBag size={16} />
                Nuevo apartado
              </button>

              <button
                onClick={cargarApartados}
                className="p-2.5 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <RefreshCw size={18} className="text-black" />
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFiltroEstado('activo')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroEstado === 'activo' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Activos
              </button>
              <button
                onClick={() => setFiltroEstado('completado')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroEstado === 'completado' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Completados
              </button>
              <button
                onClick={() => setFiltroEstado('cancelado')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroEstado === 'cancelado' 
                    ? 'bg-gray-300 text-gray-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Cancelados
              </button>
              <button
                onClick={() => setFiltroEstado('vencido')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroEstado === 'vencido' 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Vencidos
              </button>
              <button
                onClick={() => setFiltroEstado('')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroEstado === '' 
                    ? 'bg-black text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
            </div>
          </div>

          {/* Lista de apartados */}
          {apartados.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <ShoppingBag size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-black text-lg mb-2">No hay apartados</p>
              <p className="text-black text-sm">Crea un nuevo apartado para comenzar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apartados.map((a) => {
                const diasRestantes = getDiasRestantes(a.fecha_limite);
                const total = a.cantidad * a.precio_apartado;
                
                return (
                  <div
                    key={a.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Info principal */}
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {a.producto_imagen ? (
                            <img
                              src={a.producto_imagen}
                              alt={a.producto_nombre}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={20} className="text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getEstadoColor(a.estado)}`}>
                              {a.estado.toUpperCase()}
                            </span>
                            <span className="font-mono text-sm text-black">{a.folio}</span>
                          </div>
                          
                          <h3 className="font-medium text-black mt-1">{a.producto_nombre}</h3>
                          
                          <div className="flex flex-wrap items-center gap-3 text-xs text-black mt-1">
                            <span className="flex items-center gap-1">
                              <User size={12} />
                              {a.cliente_nombre}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone size={12} />
                              {a.cliente_telefono}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              Límite: {formatFecha(a.fecha_limite)}
                            </span>
                            {a.estado === 'activo' && (
                              <span className={`flex items-center gap-1 ${
                                diasRestantes <= 2 ? 'text-red-600 font-bold' : 
                                diasRestantes <= 5 ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                                <Clock size={12} />
                                {diasRestantes} días
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Montos */}
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-black">Total</p>
                          <p className="font-bold text-black">${formatPrecio(total)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-black">Anticipo</p>
                          <p className="font-medium text-green-600">${formatPrecio(a.anticipo)}</p>
                          {a.anticipo_metodo && a.anticipo > 0 && (
                            <p className="text-xs text-black">{getMetodoPagoNombre(a.anticipo_metodo)}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-black">Saldo</p>
                          <p className="font-bold text-blue-600">${formatPrecio(a.saldo_pendiente)}</p>
                        </div>
                        
                        {/* Acciones */}
                        <div className="flex gap-2">
                          {a.estado === 'activo' && (
                            <>
                              <button
                                onClick={() => liquidarApartado(a)}
                                className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                title="Registrar pago"
                              >
                                <DollarSign size={16} />
                              </button>
                              <button
                                onClick={() => cancelarApartado(a.id)}
                                className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                title="Cancelar apartado"
                              >
                                <X size={16} />
                              </button>
                            </>
                          )}
                          <a
                            href={`https://wa.me/${a.cliente_telefono.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            title="Enviar WhatsApp"
                          >
                            <MessageSquare size={16} />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Notas */}
                    {a.notas && (
                      <div className="mt-2 text-xs text-black bg-gray-50 p-2 rounded">
                        📝 {a.notas}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal de nuevo apartado */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-black">
                {paso === 1 ? 'Seleccionar producto' : 'Nuevo apartado'}
              </h2>
              <button
                onClick={() => setMostrarModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={18} className="text-black" />
              </button>
            </div>

            <div className="p-4">
              {paso === 1 ? (
                /* Paso 1: Selección de producto */
                <div className="space-y-4">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-black" />
                    <input
                      type="text"
                      value={busqueda}
                      onChange={handleSearchProducto}
                      placeholder="Buscar producto..."
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black text-black placeholder-gray-500"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {productosFiltrados.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => seleccionarProducto(p)}
                        className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-left"
                      >
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {p.imagen ? (
                            <img
                              src={p.imagen}
                              alt={p.nombre}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={20} className="text-black" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-black">{p.nombre}</div>
                          <div className="text-xs text-black">#{p.etiqueta}</div>
                          <div className="text-sm font-bold text-black mt-1">${formatPrecio(p.precio)}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded text-black">
                            Stock: {p.stock}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Paso 2: Datos del apartado */
                <div className="space-y-4">
                  {/* Producto seleccionado */}
                  <div className="bg-gray-100 p-3 rounded-lg flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-lg overflow-hidden flex-shrink-0">
                      {productoSeleccionado?.imagen ? (
                        <img
                          src={productoSeleccionado.imagen}
                          alt={productoSeleccionado.nombre}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={20} className="text-black" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-black">{productoSeleccionado?.nombre}</p>
                      <p className="text-xs text-black">#{productoSeleccionado?.etiqueta}</p>
                      <p className="text-sm font-bold text-black mt-1">${formatPrecio(productoSeleccionado?.precio || 0)}</p>
                    </div>
                    <button
                      onClick={() => setPaso(1)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Cambiar
                    </button>
                  </div>

                  {/* Datos del cliente */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-black mb-1">
                        Nombre del cliente *
                      </label>
                      <input
                        type="text"
                        value={clienteNombre}
                        onChange={(e) => setClienteNombre(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black text-black"
                        placeholder="Ej: Juan Pérez"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">
                        Teléfono WhatsApp *
                      </label>
                      <input
                        type="tel"
                        value={clienteTelefono}
                        onChange={(e) => setClienteTelefono(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black text-black"
                        placeholder="Ej: 5512345678"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={clienteEmail}
                        onChange={(e) => setClienteEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black text-black"
                        placeholder="opcional"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-black mb-1">
                        Dirección
                      </label>
                      <input
                        type="text"
                        value={clienteDireccion}
                        onChange={(e) => setClienteDireccion(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black text-black"
                        placeholder="opcional"
                      />
                    </div>
                  </div>

                  {/* Detalles del apartado */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">
                        Cantidad *
                      </label>
                      <input
                        type="number"
                        value={cantidad}
                        onChange={(e) => setCantidad(e.target.value)}
                        min="1"
                        max={productoSeleccionado?.stock}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black text-black"
                      />
                      <p className="text-xs text-black mt-1">
                        Stock disponible: {productoSeleccionado?.stock}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">
                        Anticipo ($)
                      </label>
                      <input
                        type="number"
                        value={anticipo}
                        onChange={(e) => setAnticipo(e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black text-black"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Método de pago del anticipo */}
                  {anticipo && parseFloat(anticipo) > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        Método de pago del anticipo
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setAnticipoMetodo('efectivo')}
                          className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                            anticipoMetodo === 'efectivo' 
                              ? 'border-green-500 bg-green-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className={`text-sm font-medium ${anticipoMetodo === 'efectivo' ? 'text-green-700' : 'text-black'}`}>
                            Efectivo
                          </span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setAnticipoMetodo('tarjeta')}
                          className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                            anticipoMetodo === 'tarjeta' 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className={`text-sm font-medium ${anticipoMetodo === 'tarjeta' ? 'text-blue-700' : 'text-black'}`}>
                            Tarjeta
                          </span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setAnticipoMetodo('transferencia')}
                          className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                            anticipoMetodo === 'transferencia' 
                              ? 'border-purple-500 bg-purple-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className={`text-sm font-medium ${anticipoMetodo === 'transferencia' ? 'text-purple-700' : 'text-black'}`}>
                            Transferencia
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Notas */}
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Notas
                    </label>
                    <textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black text-black resize-none"
                      placeholder="Ej: Talla especial, color específico, etc."
                    />
                  </div>

                  {/* Resumen */}
                  {productoSeleccionado && cantidad && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-blue-800 mb-2">Resumen del apartado</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Precio unitario:</span>
                          <span className="font-medium text-blue-800">${formatPrecio(productoSeleccionado.precio)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Cantidad:</span>
                          <span className="font-medium text-blue-800">{cantidad}</span>
                        </div>
                        <div className="flex justify-between font-bold pt-1 border-t border-blue-200">
                          <span className="text-blue-800">Total:</span>
                          <span className="text-blue-800">
                            ${formatPrecio(productoSeleccionado.precio * parseInt(cantidad || '0'))}
                          </span>
                        </div>
                        {anticipo && parseFloat(anticipo) > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Anticipo ({getMetodoPagoNombre(anticipoMetodo)}):</span>
                            <span>${formatPrecio(parseFloat(anticipo))}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-blue-800">
                          <span>Saldo a pagar (30 días):</span>
                          <span>
                            ${formatPrecio(productoSeleccionado.precio * parseInt(cantidad || '0') - (parseFloat(anticipo) || 0))}
                          </span>
                        </div>
                        <div className="text-xs text-blue-600 mt-2">
                          ⏰ Fecha límite: {new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('es-MX')}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setPaso(1)}
                      className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={crearApartado}
                      className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Crear apartado
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}