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
  List
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import * as XLSX from 'xlsx';

interface Producto {
  id: number;
  etiqueta: string;
  nombre: string;
  color: string | null;
  talla: string | null;
  precio: number;
  stock: number;
  ubicacion: string | null;
  imagen: string | null;
  veces_vendido: number;
  total_vendido: number;
}

interface ResumenGeneral {
  total_productos: number;
  total_piezas: number;
  valor_total_inventario: number;
  productos_agotados: number;
  productos_stock_bajo: number;
  precio_promedio: number;
}

interface ResumenUbicacion {
  ubicacion: string;
  total_productos: number;
  total_piezas: number;
  valor_total: number;
  agotados: number;
  stock_bajo: number;
}

interface Movimiento {
  tipo: 'venta' | 'ajuste' | 'traslado';
  referencia: string;
  cantidad: number;
  producto: string;
  fecha: string;
  usuario_nombre?: string;
  motivo?: string;
  origen?: string;  // ← NUEVO
  destino?: string; // ← NUEVO
}

export default function InventarioPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [sucursalActiva, setSucursalActiva] = useState("");
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [todosLosProductos, setTodosLosProductos] = useState<Producto[]>([]); // ← NUEVO
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [resumenGeneral, setResumenGeneral] = useState<ResumenGeneral | null>(null);
  const [ubicaciones, setUbicaciones] = useState<ResumenUbicacion[]>([]);
  const [ultimosMovimientos, setUltimosMovimientos] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState<string>("");
  const [expandirUbicacion, setExpandirUbicacion] = useState<string | null>(null);
  const [mostrarAjuste, setMostrarAjuste] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [motivoAjuste, setMotivoAjuste] = useState("");
  const [nuevoStock, setNuevoStock] = useState("");
  const [vista, setVista] = useState<'tabla' | 'tarjetas'>('tabla');
  const [ordenarPor, setOrdenarPor] = useState<'nombre' | 'precio' | 'stock' | 'vendidos'>('nombre');
  const [ordenDireccion, setOrdenDireccion] = useState<'asc' | 'desc'>('asc');

  // Función para formatear precios
  const formatPrecio = (valor: number | string | undefined): string => {
    if (valor === undefined || valor === null) return '0.00';
    const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
    return isNaN(numero) ? '0.00' : numero.toFixed(2);
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
      cargarDatos();
    }
  }, [sucursalActiva]);

  const cargarSucursales = async () => {
    try {
      const res = await fetch("/api/sucursales");
      const data = await res.json();
      setSucursales(data);
    } catch (error) {
      console.error("Error cargando sucursales:", error);
    }
  };

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const resResumen = await fetch(`/api/inventario/resumen?sucursal_id=${sucursalActiva}`);
      const dataResumen = await resResumen.json();
      setResumenGeneral(dataResumen.general);
      setUbicaciones(dataResumen.ubicaciones || []);
      setUltimosMovimientos(dataResumen.ultimosMovimientos || []);
      await cargarProductos();
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setCargando(false);
    }
  };

 const cargarProductos = async (ubicacion?: string) => {
  try {
    const url = `/api/inventario/productos?sucursal_id=${sucursalActiva}${ubicacion ? `&ubicacion=${encodeURIComponent(ubicacion)}` : ''}`;
    const res = await fetch(url);
    const data = await res.json();

    if (ubicacion) {
      // 👉 SOLO para esa ubicación
      setProductosFiltrados(data);
    } else {
      // 👉 todos los productos
      setTodosLosProductos(data);
      setProductosFiltrados(data);
    }

    setProductos(data);
  } catch (error) {
    console.error("Error cargando productos:", error);
  }
};

  const ordenarProductos = (productos: Producto[]) => {
    return [...productos].sort((a, b) => {
      let valorA, valorB;
      
      switch (ordenarPor) {
        case 'nombre':
          valorA = a.nombre.toLowerCase();
          valorB = b.nombre.toLowerCase();
          break;
        case 'precio':
          valorA = a.precio;
          valorB = b.precio;
          break;
        case 'stock':
          valorA = a.stock;
          valorB = b.stock;
          break;
        case 'vendidos':
          valorA = a.total_vendido || 0;
          valorB = b.total_vendido || 0;
          break;
        default:
          valorA = a.nombre.toLowerCase();
          valorB = b.nombre.toLowerCase();
      }

      if (ordenDireccion === 'asc') {
        return valorA > valorB ? 1 : -1;
      } else {
        return valorA < valorB ? 1 : -1;
      }
    });
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
      setProductosFiltrados(ordenarProductos(filtrados));
    }
  };

  useEffect(() => {
  setProductosFiltrados(prev => ordenarProductos(prev));
}, [ordenarPor, ordenDireccion]);

  const toggleUbicacion = async (ubicacion: string) => {
  if (expandirUbicacion === ubicacion) {
    setExpandirUbicacion(null);

    // 🔥 NO metas todos aquí
    setProductosFiltrados([]);

  } else {
    setExpandirUbicacion(ubicacion);
    await cargarProductos(ubicacion);
  }

  setUbicacionSeleccionada(ubicacion);
};

  const cambiarSucursal = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nueva = e.target.value;
    setSucursalActiva(nueva);
    sessionStorage.setItem("sucursalActiva", nueva);
    setExpandirUbicacion(null);
  };

  const abrirModalAjuste = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setNuevoStock(producto.stock.toString());
    setMotivoAjuste("");
    setMostrarAjuste(true);
  };

  const realizarAjuste = async () => {
    if (!productoSeleccionado) return;
    if (!motivoAjuste.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ingresa el motivo del ajuste'
      });
      return;
    }

    const nuevaCantidad = parseInt(nuevoStock);
    if (isNaN(nuevaCantidad) || nuevaCantidad < 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ingresa una cantidad válida'
      });
      return;
    }

    try {
      const res = await fetch('/api/inventario/ajustes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: productoSeleccionado.id,
          cantidad_nueva: nuevaCantidad,
          motivo: motivoAjuste,
          usuario_id: usuario.id,
          sucursal_id: parseInt(sucursalActiva)
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMostrarAjuste(false);
        await cargarDatos();
        
        Swal.fire({
          icon: 'success',
          title: 'Ajuste realizado',
          html: `
            <div class="text-left">
              <p>${productoSeleccionado.nombre}</p>
              <p class="text-sm text-gray-600">Anterior: ${data.anterior} | Nuevo: ${data.nuevo}</p>
              <p class="text-sm text-gray-600">Diferencia: ${data.diferencia > 0 ? '+' : ''}${data.diferencia}</p>
            </div>
          `,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        const error = await res.json();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error || 'Error al realizar ajuste'
        });
      }
    } catch (error) {
      console.error("Error en ajuste:", error);
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { color: 'text-red-600', bg: 'bg-red-100', label: 'Agotado' };
    if (stock <= 3) return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Stock bajo' };
    return { color: 'text-green-600', bg: 'bg-green-100', label: 'Normal' };
  };

  const exportarAExcel = () => {
  const wb = XLSX.utils.book_new();

  let data: any[] = [];

  /* =========================
     🧠 ENCABEZADO
  ========================= */
  data.push(["REPORTE DE INVENTARIO"]);
  data.push(["Fecha:", new Date().toLocaleString("es-MX")]);
  data.push([]);

  /* =========================
     📊 RESUMEN GENERAL
  ========================= */
  if (resumenGeneral) {
    data.push(["RESUMEN GENERAL"]);
    data.push(["Total productos", resumenGeneral.total_productos]);
    data.push(["Total piezas", resumenGeneral.total_piezas]);
    data.push(["Valor inventario", resumenGeneral.valor_total_inventario]);
    data.push(["Stock bajo", resumenGeneral.productos_stock_bajo]);
    data.push(["Agotados", resumenGeneral.productos_agotados]);
    data.push(["Precio promedio", resumenGeneral.precio_promedio]);
    data.push([]);
  }

  /* =========================
     📦 PRODUCTOS
  ========================= */
  data.push(["PRODUCTOS"]);
  data.push([
    'CÓDIGO',
    'PRODUCTO',
    'COLOR',
    'TALLA',
    'PRECIO',
    'STOCK',
    'UBICACIÓN',
    'VENDIDOS'
  ]);

  todosLosProductos.forEach(p => {
    data.push([
      p.etiqueta,
      p.nombre,
      p.color || '-',
      p.talla || '-',
      p.precio,
      p.stock,
      p.ubicacion || 'Sin ubicación',
      p.total_vendido || 0
    ]);
  });

  data.push([]);

  /* =========================
     📍 UBICACIONES
  ========================= */
  data.push(["UBICACIONES"]);
  data.push([
    'UBICACIÓN',
    'PRODUCTOS',
    'PIEZAS',
    'VALOR TOTAL',
    'STOCK BAJO',
    'AGOTADOS'
  ]);

  ubicaciones.forEach(u => {
    data.push([
      u.ubicacion,
      u.total_productos,
      u.total_piezas,
      u.valor_total,
      u.stock_bajo,
      u.agotados
    ]);
  });

  data.push([]);

  /* =========================
     🔄 MOVIMIENTOS
  ========================= */
  data.push(["MOVIMIENTOS"]);
  data.push([
    'TIPO',
    'PRODUCTO',
    'REFERENCIA',
    'CANTIDAD',
    'USUARIO',
    'MOTIVO',
    'FECHA'
  ]);

  ultimosMovimientos.forEach(m => {
    data.push([
      m.tipo === 'venta' ? 'VENTA' : 'AJUSTE',
      m.producto,
      m.referencia,
      m.cantidad,
      m.usuario_nombre || 'Sistema',
      m.motivo || '-',
      new Date(m.fecha).toLocaleString('es-MX')
    ]);
  });

  /* =========================
     📄 CREAR HOJA ÚNICA
  ========================= */
  const ws = XLSX.utils.aoa_to_sheet(data);

  ws["!cols"] = [
    { wch: 15 },
    { wch: 30 },
    { wch: 15 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 20 },
    { wch: 15 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Inventario");

  const fecha = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `inventario_completo_${fecha}.xlsx`);
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
                Inventario
              </h1>
              {cargando && <RefreshCw size={18} className="text-gray-400 animate-spin" />}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {usuario?.rol === "admin" && (
                <select
                  value={sucursalActiva}
                  onChange={cambiarSucursal}
                  className="bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-medium text-black outline-none focus:border-black w-full sm:w-auto"
                >
                  {sucursales.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              )}
              
              <button
                onClick={exportarAExcel}
                className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <FileSpreadsheet size={16} />
                <span className="hidden sm:inline">Exportar Excel</span>
              </button>

              <button
                onClick={cargarDatos}
                className="p-2.5 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors"
                title="Actualizar"
              >
                <RefreshCw size={18} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Resumen general */}
          {resumenGeneral && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Total productos</p>
                <p className="text-xl sm:text-2xl font-bold text-black">{resumenGeneral.total_productos}</p>
                <p className="text-xs text-gray-400 mt-1">{resumenGeneral.total_piezas} piezas</p>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Valor inventario</p>
                <p className="text-xl sm:text-2xl font-bold text-black">${formatPrecio(resumenGeneral.valor_total_inventario)}</p>
                <p className="text-xs text-gray-400 mt-1">Promedio: ${formatPrecio(resumenGeneral.precio_promedio)}</p>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Stock bajo</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600">{resumenGeneral.productos_stock_bajo}</p>
                <p className="text-xs text-gray-400 mt-1">Productos con ≤ 3 unidades</p>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Agotados</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{resumenGeneral.productos_agotados}</p>
                <p className="text-xs text-gray-400 mt-1">Sin stock</p>
              </div>
            </div>
          )}

          {/* Buscador y controles */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={handleSearch}
                  placeholder="Buscar por nombre, código, color o talla..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-black"
                />
              </div>
              
              <div className="flex gap-2">
                <select
                  value={ordenarPor}
                  onChange={(e) => setOrdenarPor(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black"
                >
                  <option value="nombre">Ordenar por nombre</option>
                  <option value="precio">Ordenar por precio</option>
                  <option value="stock">Ordenar por stock</option>
                  <option value="vendidos">Ordenar por vendidos</option>
                </select>
                
                <button
                  onClick={() => setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {ordenDireccion === 'asc' ? '↑' : '↓'}
                </button>

                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setVista('tabla')}
                    className={`p-2 ${vista === 'tabla' ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    <List size={18} />
                  </button>
                  <button
                    onClick={() => setVista('tarjetas')}
                    className={`p-2 ${vista === 'tarjetas' ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Grid3X3 size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Inventario por ubicaciones */}
          <div className="space-y-4">
            {ubicaciones.map((ubicacion) => (
              <div key={ubicacion.ubicacion} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Cabecera de ubicación */}
                <button
                  onClick={() => toggleUbicacion(ubicacion.ubicacion)}
                  className="w-full px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <MapPin size={16} className="text-gray-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-black">{ubicacion.ubicacion}</h3>
                      <p className="text-xs text-gray-500">{ubicacion.total_productos} productos • {ubicacion.total_piezas} piezas</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Valor</p>
                      <p className="font-bold text-black">${formatPrecio(ubicacion.valor_total)}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      {ubicacion.stock_bajo > 0 && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full whitespace-nowrap">
                          {ubicacion.stock_bajo} bajo
                        </span>
                      )}
                      {ubicacion.agotados > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full whitespace-nowrap">
                          {ubicacion.agotados} agot
                        </span>
                      )}
                    </div>
                    
                    {expandirUbicacion === ubicacion.ubicacion ? (
                      <ChevronUp size={20} className="text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-500 flex-shrink-0" />
                    )}
                  </div>
                </button>

                {/* Productos de la ubicación */}
                {expandirUbicacion === ubicacion.ubicacion && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    {vista === 'tabla' ? (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                          <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                              <th className="text-left p-3 text-xs font-medium text-gray-600">Producto</th>
                              <th className="text-left p-3 text-xs font-medium text-gray-600">Código</th>
                              <th className="text-left p-3 text-xs font-medium text-gray-600">Talla</th>
                              <th className="text-left p-3 text-xs font-medium text-gray-600">Color</th>
                              <th className="text-right p-3 text-xs font-medium text-gray-600">Precio</th>
                              <th className="text-center p-3 text-xs font-medium text-gray-600">Stock</th>
                              <th className="text-center p-3 text-xs font-medium text-gray-600">Vendidos</th>
                              <th className="text-center p-3 text-xs font-medium text-gray-600">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {ordenarProductos(productosFiltrados).map((producto) => {
                              const status = getStockStatus(producto.stock);
                              return (
                                <tr key={producto.id} className="hover:bg-white transition-colors">
                                  <td className="p-3">
                                    <div className="font-medium text-black">{producto.nombre}</div>
                                  </td>
                                  <td className="p-3 text-sm text-gray-600">#{producto.etiqueta}</td>
                                  <td className="p-3 text-sm text-gray-600">{producto.talla || '-'}</td>
                                  <td className="p-3 text-sm text-gray-600">{producto.color || '-'}</td>
                                  <td className="p-3 text-right font-medium text-black">${formatPrecio(producto.precio)}</td>
                                  <td className="p-3 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                                      {producto.stock}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center text-sm text-gray-600">{producto.total_vendido || 0}</td>
                                  <td className="p-3 text-center">
                                    <button
                                      onClick={() => abrirModalAjuste(producto)}
                                      className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                                      title="Ajustar stock"
                                    >
                                      <Edit size={14} className="text-gray-600" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {ordenarProductos(productosFiltrados).map((producto) => {
                          const status = getStockStatus(producto.stock);
                          return (
                            <div key={producto.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-medium text-black">{producto.nombre}</h4>
                                  <p className="text-xs text-gray-500">#{producto.etiqueta}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                                  {producto.stock}
                                </span>
                              </div>
                              
                              <div className="space-y-1 text-sm mb-3">
                                {producto.talla && <p className="text-gray-600">Talla: {producto.talla}</p>}
                                {producto.color && <p className="text-gray-600">Color: {producto.color}</p>}
                                <p className="text-gray-600">Vendidos: {producto.total_vendido || 0}</p>
                              </div>
                              
                              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <span className="font-bold text-black">${formatPrecio(producto.precio)}</span>
                                <button
                                  onClick={() => abrirModalAjuste(producto)}
                                  className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                  title="Ajustar stock"
                                >
                                  <Edit size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {productosFiltrados.length === 0 && (
                      <div className="text-center py-12">
                        <Package size={48} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">No hay productos en esta ubicación</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {ubicaciones.length === 0 && (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
                <Package size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No hay ubicaciones registradas</p>
              </div>
            )}
          </div>

          {/* Últimos movimientos */}
          {ultimosMovimientos.length > 0 && (
            <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              <h3 className="text-sm font-medium text-black mb-3 flex items-center gap-2">
                <TrendingUp size={16} />
                Últimos movimientos
              </h3>
              <div className="space-y-2">
                {ultimosMovimientos.slice(0, 10).map((mov, idx) => {
                  const fecha = new Date(mov.fecha);
                  const fechaFormateada = fecha.toLocaleDateString('es-MX');
                  const horaFormateada = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg px-2 transition-colors">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          mov.tipo === 'venta' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {mov.tipo === 'venta' ? 'VENTA' : 'AJUSTE'}
                        </span>
                        
                        <span className="font-medium text-black">{mov.producto}</span>
                        
                        <span className="text-gray-500 text-xs">{mov.referencia}</span>
                        
                        {mov.tipo === 'ajuste' && mov.motivo && (
                          <span className="text-gray-500 text-xs italic">"{mov.motivo}"</span>
                        )}
                        
                        {mov.tipo === 'ajuste' && (
                          <span className="text-gray-500 text-xs">
                            Por: {mov.usuario_nombre || 'Sistema'}
                          </span>
                        )}
                        {mov.tipo === 'traslado' && (
  <span className="text-gray-500 text-xs">
    {mov.origen} → {mov.destino}
  </span>
)}
                      </div>
                      
                      <div className="flex items-center gap-4 ml-auto">
                        <span className={`font-medium ${
                          mov.tipo === 'venta' ? 'text-red-600' : mov.cantidad > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {mov.tipo === 'venta' ? '-' : mov.cantidad > 0 ? '+' : ''}{mov.cantidad}
                        </span>
                        
                        <div className="text-right text-xs text-gray-400 whitespace-nowrap">
                          <span>{fechaFormateada} {horaFormateada}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal de ajuste de stock */}
      {mostrarAjuste && productoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-black">Ajustar stock</h2>
              <button
                onClick={() => setMostrarAjuste(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium text-black">{productoSeleccionado.nombre}</p>
                <p className="text-xs text-gray-500">#{productoSeleccionado.etiqueta}</p>
                <p className="text-xs text-gray-500 mt-1">Ubicación: {productoSeleccionado.ubicacion || 'Sin ubicación'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock actual
                </label>
                <p className="text-lg font-bold text-black">{productoSeleccionado.stock}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nuevo stock
                </label>
                <input
                  type="number"
                  value={nuevoStock}
                  onChange={(e) => setNuevoStock(e.target.value)}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo del ajuste
                </label>
                <textarea
                  value={motivoAjuste}
                  onChange={(e) => setMotivoAjuste(e.target.value)}
                  placeholder="Ej: Corrección por conteo, producto dañado, etc."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black resize-none"
                />
              </div>

              {nuevoStock && parseInt(nuevoStock) !== productoSeleccionado.stock && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-700">
                    Diferencia: {parseInt(nuevoStock) - productoSeleccionado.stock > 0 ? '+' : ''}
                    {parseInt(nuevoStock) - productoSeleccionado.stock} unidades
                  </p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end gap-3">
              <button
                onClick={() => setMostrarAjuste(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={realizarAjuste}
                className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Guardar ajuste
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}