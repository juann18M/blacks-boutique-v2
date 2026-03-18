"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  MapPin,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Printer,
  Camera,
  Calendar,
  Grid,
  List,
  Layers,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Check,
  Tag,
  Image as ImageIcon,
  Filter,
  ArrowUpDown,
  Eye,
  EyeOff
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
  imagen: string | null;
  descripcion: string | null;
  fecha_registro: string;
  fecha_actualizacion: string;
  sucursal_id: number;
  usuario_registro_id: number;
  activo: boolean;
  usuario_registro_nombre?: string;
}

interface GrupoUbicacion {
  nombre: string;
  productos: Producto[];
  expandido: boolean;
  totalProductos: number;
  totalStock: number;
  totalValor: number;
}

export default function ProductosPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [grupos, setGrupos] = useState<GrupoUbicacion[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [sucursalActiva, setSucursalActiva] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [vista, setVista] = useState<'grupos' | 'lista'>('grupos');
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenError, setImagenError] = useState<Record<number, boolean>>({});
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date>(new Date());
  const [actualizando, setActualizando] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroStock, setFiltroStock] = useState<'todos' | 'bajo' | 'agotado' | 'normal'>('todos');
  
  // Estados para autocompletado de ubicación
  const [sugerenciasUbicacion, setSugerenciasUbicacion] = useState<string[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [ubicacionesExistentes, setUbicacionesExistentes] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ubicacionInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Refs para polling
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  
  // Estados para el formulario
  const [formData, setFormData] = useState({
    nombre: "",
    color: "",
    talla: "",
    precio: "",
    stock: "",
    ubicacion: "",
    descripcion: ""
  });

  const itemsPorPagina = 12;

  // Función para obtener URL correcta de imagen
  const getImageUrl = (imagen: string | null): string => {
    if (!imagen) return '';
    if (imagen.startsWith('http')) return imagen;
    if (imagen.startsWith('/uploads')) return imagen;
    return `/uploads/productos/${imagen}`;
  };

  // Función para filtrar productos por stock
  const filtrarPorStock = (productos: Producto[]) => {
    switch (filtroStock) {
      case 'bajo':
        return productos.filter(p => p.stock > 0 && p.stock <= 3);
      case 'agotado':
        return productos.filter(p => p.stock === 0);
      case 'normal':
        return productos.filter(p => p.stock > 3);
      default:
        return productos;
    }
  };

  // Función para cargar productos
  const cargarProductos = useCallback(async (mostrarIndicator = false) => {
    if (!sucursalActiva || !mountedRef.current) return;

    if (mostrarIndicator) {
      setCargando(true);
    }
    
    try {
      const params = new URLSearchParams({
        sucursal_id: sucursalActiva,
        ...(busqueda && { search: busqueda })
      });

      const res = await fetch(`/api/productos?${params}`);
      const data = await res.json();
      
      if (!mountedRef.current) return;
      
      // Aplicar filtro de stock
      const productosFiltrados = filtrarPorStock(data);
      
      const total = productosFiltrados.length;
      setTotalPaginas(Math.ceil(total / itemsPorPagina));
      
      const inicio = (pagina - 1) * itemsPorPagina;
      const fin = inicio + itemsPorPagina;
      setProductos(productosFiltrados.slice(inicio, fin));
      setUltimaActualizacion(new Date());
      
      // Extraer ubicaciones únicas para autocompletado
      const ubicaciones = data
        .map((p: Producto) => p.ubicacion)
        .filter((ub: string | null): ub is string => ub !== null && ub !== "Sin ubicación");
      const ubicacionesUnicas = [...new Set<string>(ubicaciones)].sort();
      setUbicacionesExistentes(ubicacionesUnicas);
      
      // Limpiar errores de imagen
      setImagenError({});
    } catch (error) {
      console.error("Error cargando productos:", error);
      if (mostrarIndicator && mountedRef.current) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los productos',
          confirmButtonColor: '#000'
        });
      }
    } finally {
      if (mostrarIndicator && mountedRef.current) {
        setCargando(false);
      }
    }
  }, [sucursalActiva, busqueda, pagina, filtroStock]);

  // Función para actualizar todos los datos
  const actualizarTodosLosDatos = useCallback(async (mostrarIndicator = false) => {
    if (!sucursalActiva || !mountedRef.current) return;
    
    if (mostrarIndicator) {
      setActualizando(true);
    }
    
    await cargarProductos(false);
    
    if (mostrarIndicator && mountedRef.current) {
      setActualizando(false);
    }
  }, [sucursalActiva, cargarProductos]);

  // Iniciar polling periódico (aumentado a 30 segundos para reducir actualizaciones)
  const iniciarPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Actualizar cada 30 segundos en lugar de 5
    pollingIntervalRef.current = setInterval(() => {
      if (mountedRef.current && sucursalActiva && document.visibilityState === 'visible') {
        cargarProductos(false);
      }
    }, 30000);
    
    console.log("Polling iniciado - actualizando cada 30 segundos");
  }, [sucursalActiva, cargarProductos]);

  // Limpiar polling al desmontar
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

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
      if (guardada) {
        setSucursalActiva(guardada);
      }
    } else {
      setSucursalActiva(parsed.sucursal_id.toString());
    }
  }, [router]);

  // Efecto para cargar datos cuando cambia la sucursal activa
  useEffect(() => {
    if (sucursalActiva) {
      console.log("Sucursal activa cambió a:", sucursalActiva);
      cargarProductos(true);
      iniciarPolling();
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [sucursalActiva, iniciarPolling, cargarProductos]);

  // Organizar productos por ubicación cuando cambian
  useEffect(() => {
    if (productos.length > 0) {
      organizarPorUbicacion();
    } else {
      setGrupos([]);
    }
  }, [productos]);

  const organizarPorUbicacion = () => {
    const gruposMap = new Map<string, Producto[]>();
    
    // Agrupar productos por ubicación
    productos.forEach(producto => {
      const ubicacion = producto.ubicacion || "Sin ubicación";
      if (!gruposMap.has(ubicacion)) {
        gruposMap.set(ubicacion, []);
      }
      gruposMap.get(ubicacion)?.push(producto);
    });

    // Convertir a array con cálculos de totales
    const gruposArray: GrupoUbicacion[] = Array.from(gruposMap.entries())
      .map(([nombre, productos]) => {
        const totalProductos = productos.length;
        const totalStock = productos.reduce((sum, p) => sum + p.stock, 0);
        const totalValor = productos.reduce((sum, p) => sum + (p.precio * p.stock), 0);
        
        return {
          nombre,
          productos: productos.sort((a, b) => a.nombre.localeCompare(b.nombre)),
          expandido: true,
          totalProductos,
          totalStock,
          totalValor
        };
      })
      .sort((a, b) => {
        if (a.nombre === "Sin ubicación") return 1;
        if (b.nombre === "Sin ubicación") return -1;
        return a.nombre.localeCompare(b.nombre);
      });

    setGrupos(gruposArray);
  };

  const toggleGrupo = (index: number) => {
    setGrupos(prev => prev.map((g, i) => 
      i === index ? { ...g, expandido: !g.expandido } : g
    ));
  };

  const expandirTodos = () => {
    setGrupos(prev => prev.map(g => ({ ...g, expandido: true })));
  };

  const colapsarTodos = () => {
    setGrupos(prev => prev.map(g => ({ ...g, expandido: false })));
  };

  const cargarSucursales = async () => {
    try {
      const res = await fetch("/api/sucursales");
      const data = await res.json();
      setSucursales(data);
    } catch (error) {
      console.error("Error cargando sucursales:", error);
    }
  };

  // Manejador para cambios en el input de ubicación con autocompletado
  const handleUbicacionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, ubicacion: value });
    
    // Generar sugerencias basadas en ubicaciones existentes
    if (value.trim().length > 0) {
      const filtradas = ubicacionesExistentes
        .filter(ub => ub.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5);
      setSugerenciasUbicacion(filtradas);
      setMostrarSugerencias(filtradas.length > 0);
    } else {
      setSugerenciasUbicacion([]);
      setMostrarSugerencias(false);
    }
  };

  const seleccionarUbicacion = (ubicacion: string) => {
    setFormData({ ...formData, ubicacion });
    setMostrarSugerencias(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'ubicacion') {
      handleUbicacionChange(e as React.ChangeEvent<HTMLInputElement>);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Solo se permiten imágenes JPEG, PNG o WEBP',
          confirmButtonColor: '#000'
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'La imagen no puede ser mayor a 5MB',
          confirmButtonColor: '#000'
        });
        return;
      }

      setImagenFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageError = (productoId: number) => {
    setImagenError(prev => ({ ...prev, [productoId]: true }));
  };

  const abrirModalNuevo = () => {
    setProductoEditando(null);
    setFormData({
      nombre: "",
      color: "",
      talla: "",
      precio: "",
      stock: "",
      ubicacion: "",
      descripcion: ""
    });
    setImagenPreview(null);
    setImagenFile(null);
    setMostrarModal(true);
  };

  const abrirModalEditar = (producto: Producto) => {
    if (usuario?.rol !== 'admin') {
      Swal.fire({
        icon: 'error',
        title: 'Acceso denegado',
        text: 'Solo los administradores pueden editar productos',
        confirmButtonColor: '#000'
      });
      return;
    }
    
    setProductoEditando(producto);
    setFormData({
      nombre: producto.nombre,
      color: producto.color || "",
      talla: producto.talla || "",
      precio: producto.precio.toString(),
      stock: producto.stock.toString(),
      ubicacion: producto.ubicacion || "",
      descripcion: producto.descripcion || ""
    });
    setImagenPreview(producto.imagen);
    setImagenFile(null);
    setMostrarModal(true);
  };

  const guardarProducto = async () => {
    if (!formData.nombre.trim()) {
      return Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'El nombre es requerido',
        confirmButtonColor: '#000'
      });
    }

    if (!formData.precio || Number(formData.precio) < 0) {
      return Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Precio inválido',
        confirmButtonColor: '#000'
      });
    }

    if (!formData.stock || Number(formData.stock) < 0) {
      return Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Stock inválido',
        confirmButtonColor: '#000'
      });
    }

    try {
      Swal.fire({
        title: 'Guardando...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const url = productoEditando 
        ? `/api/productos/${productoEditando.id}`
        : '/api/productos';

      const formDataToSend = new FormData();
      formDataToSend.append('nombre', formData.nombre.trim());
      formDataToSend.append('color', formData.color.trim());
      formDataToSend.append('talla', formData.talla.trim());
      formDataToSend.append('precio', formData.precio);
      formDataToSend.append('stock', formData.stock);
      formDataToSend.append('ubicacion', formData.ubicacion.trim() || 'Sin ubicación');
      formDataToSend.append('descripcion', formData.descripcion.trim());
      formDataToSend.append('sucursal_id', sucursalActiva);
      formDataToSend.append('usuario_registro_id', usuario.id.toString());
      
      if (imagenFile) {
        formDataToSend.append('imagen', imagenFile);
      }

      const res = await fetch(url, {
        method: productoEditando ? 'PUT' : 'POST',
        body: formDataToSend
      });

      if (res.ok) {
        setMostrarModal(false);
        await cargarProductos(true);
        
        Swal.fire({
          icon: 'success',
          title: productoEditando ? 'Producto actualizado' : 'Producto creado',
          text: productoEditando 
            ? 'El producto se actualizó correctamente'
            : 'Producto creado exitosamente',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        const error = await res.json();
        throw new Error(error.error);
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al guardar producto',
        confirmButtonColor: '#000'
      });
    }
  };

  const eliminarProducto = async (id: number) => {
    if (usuario?.rol !== 'admin') {
      Swal.fire({
        icon: 'error',
        title: 'Acceso denegado',
        text: 'Solo los administradores pueden eliminar productos',
        confirmButtonColor: '#000'
      });
      return;
    }

    const result = await Swal.fire({
      title: '¿Eliminar producto?',
      text: 'Esta acción marcará el producto como inactivo',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#000',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({
          title: 'Eliminando...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const res = await fetch(`/api/productos/${id}`, {
          method: 'DELETE'
        });

        if (res.ok) {
          await cargarProductos(true);
          
          Swal.fire({
            icon: 'success',
            title: 'Eliminado',
            text: 'Producto eliminado correctamente',
            timer: 1500,
            showConfirmButton: false
          });
        } else {
          throw new Error('Error al eliminar');
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo eliminar el producto',
          confirmButtonColor: '#000'
        });
      }
    }
  };

  const cambiarSucursal = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nueva = e.target.value;
    setSucursalActiva(nueva);
    sessionStorage.setItem("sucursalActiva", nueva);
    setPagina(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusqueda(e.target.value);
    setPagina(1);
  };

  const recargarManualmente = () => {
    cargarProductos(true);
    Swal.fire({
      icon: 'success',
      title: 'Actualizado',
      text: 'Datos actualizados manualmente',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatMoneda = (cantidad: number) => {
    return cantidad.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { color: 'bg-red-100 text-red-800 border-red-200', icon: 'bg-red-500' };
    if (stock <= 3) return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: 'bg-yellow-500' };
    if (stock <= 10) return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: 'bg-blue-500' };
    return { color: 'bg-green-100 text-green-800 border-green-200', icon: 'bg-green-500' };
  };

  const imprimirEtiqueta = (producto: Producto) => {
    const ventanaImpresion = window.open('', '_blank');
    if (!ventanaImpresion) return;

    const contenido = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiqueta - ${producto.nombre}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f3f4f6;
          }
          .etiqueta {
            width: 380px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
            overflow: hidden;
          }
          .etiqueta-header {
            background: linear-gradient(135deg, #000 0%, #1a1a1a 100%);
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          .etiqueta-body {
            padding: 25px;
          }
          .etiqueta-imagen {
            width: 200px;
            height: 200px;
            margin: 0 auto 20px;
            background: #f9f9f9;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #eee;
          }
          .etiqueta-imagen img {
            max-width: 180px;
            max-height: 180px;
            object-fit: contain;
          }
          .etiqueta-tag {
            font-size: 32px;
            font-weight: bold;
            color: #000;
            margin: 10px 0;
            letter-spacing: 3px;
            background: #f3f4f6;
            padding: 10px;
            border-radius: 12px;
            text-align: center;
            font-family: monospace;
          }
          .etiqueta-nombre {
            font-size: 24px;
            font-weight: bold;
            margin: 15px 0;
            color: #000;
            text-align: center;
          }
          .etiqueta-detalle {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin: 15px 0;
            font-size: 16px;
            color: #666;
          }
          .etiqueta-precio {
            font-size: 36px;
            font-weight: bold;
            color: #059669;
            margin: 20px 0;
            background: #f0fdf4;
            padding: 15px;
            border-radius: 12px;
            text-align: center;
          }
          .etiqueta-footer {
            margin-top: 20px;
            font-size: 14px;
            color: #666;
            border-top: 2px solid #eee;
            padding-top: 15px;
            text-align: center;
          }
          .barcode {
            font-family: 'Libre Barcode 39', cursive;
            font-size: 48px;
            margin: 15px 0;
            color: #000;
            text-align: center;
          }
        </style>
        <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet">
      </head>
      <body>
        <div class="etiqueta">
          <div class="etiqueta-header">
            BLACKS BOUTIQUE
          </div>
          <div class="etiqueta-body">
            <div class="etiqueta-imagen">
              ${producto.imagen ? `<img src="${getImageUrl(producto.imagen)}" alt="${producto.nombre}" />` : '<div style="font-size: 48px;">👕</div>'}
            </div>
            <div class="etiqueta-tag">#${producto.etiqueta}</div>
            <div class="etiqueta-nombre">${producto.nombre.toUpperCase()}</div>
            <div class="etiqueta-detalle">
              ${producto.color ? `<span>${producto.color}</span>` : ''}
              ${producto.talla ? `<span>Talla: ${producto.talla}</span>` : ''}
            </div>
            <div class="etiqueta-precio">
              $${producto.precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <div class="barcode">*${producto.etiqueta}*</div>
            <div class="etiqueta-footer">
              <div>Stock: ${producto.stock} unidades</div>
              <div style="font-size: 12px; margin-top: 8px;">${new Date().toLocaleDateString('es-MX')}</div>
            </div>
          </div>
        </div>
        <script>
          window.onload = () => setTimeout(() => window.print(), 500);
        </script>
      </body>
      </html>
    `;

    ventanaImpresion.document.write(contenido);
    ventanaImpresion.document.close();
  };

  if (!usuario) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar usuario={usuario} onLogout={() => router.push('/login')} />

      <main className="lg:ml-20 min-h-screen transition-all duration-300">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Indicador de actualización en tiempo real */}
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
            {actualizando && (
              <div className="bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-800 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-pulse">
                <div className="relative">
                  <RefreshCw size={18} className="animate-spin text-black" />
                </div>
                <span className="text-sm font-medium">Actualizando...</span>
              </div>
            )}
            {!actualizando && ultimaActualizacion && (
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-600 px-4 py-2 rounded-xl shadow-lg text-xs">
                Última actualización: {ultimaActualizacion.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-10 bg-black rounded-full"></div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-light text-black tracking-tight">
                  Productos
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {productos.length} productos • {productos.reduce((sum, p) => sum + p.stock, 0)} piezas
                </p>
              </div>
              {cargando && (
                <div className="ml-2">
                  <RefreshCw size={20} className="text-black animate-spin" />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {usuario?.rol === "admin" && (
                <select
                  value={sucursalActiva}
                  onChange={cambiarSucursal}
                  className="bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-medium text-black outline-none focus:border-black focus:ring-1 focus:ring-black transition-all w-full sm:w-48"
                >
                  {sucursales.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              )}

              <button
                onClick={abrirModalNuevo}
                className="flex items-center justify-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98] font-medium shadow-lg hover:shadow-xl"
              >
                <Plus size={20} />
                <span>Nuevo producto</span>
              </button>

              <button
                onClick={recargarManualmente}
                className="p-2.5 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 hover:border-gray-400 transition-all hover:scale-105 active:scale-95"
                title="Actualizar manualmente"
              >
                <RefreshCw size={18} className="text-gray-700" />
              </button>
            </div>
          </div>

          {/* Buscador y filtros */}
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-5 mb-6 shadow-lg">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={18} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar por nombre, etiqueta o descripción..."
                    value={busqueda}
                    onChange={handleSearch}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-black placeholder-gray-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setMostrarFiltros(!mostrarFiltros)}
                    className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 ${
                      mostrarFiltros || filtroStock !== 'todos'
                        ? 'bg-black text-white border-black' 
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Filter size={18} />
                    <span className="hidden sm:inline">Filtros</span>
                    {(filtroStock !== 'todos') && (
                      <span className="w-2 h-2 bg-white rounded-full ml-1 animate-pulse"></span>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setVista('grupos')}
                    className={`p-3 rounded-xl border transition-all ${
                      vista === 'grupos' 
                        ? 'bg-black text-white border-black shadow-md' 
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                    title="Vista por ubicación"
                  >
                    <Layers size={18} />
                  </button>
                  
                  <button
                    onClick={() => setVista('lista')}
                    className={`p-3 rounded-xl border transition-all ${
                      vista === 'lista' 
                        ? 'bg-black text-white border-black shadow-md' 
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                    title="Vista lista"
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>

              {/* Panel de filtros expandible */}
              {mostrarFiltros && (
                <div className="pt-4 border-t border-gray-200 animate-slideDown">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Stock:</span>
                    <button
                      onClick={() => setFiltroStock('todos')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        filtroStock === 'todos'
                          ? 'bg-black text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setFiltroStock('normal')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        filtroStock === 'normal'
                          ? 'bg-green-600 text-white shadow-md'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      Normal (&gt;3)
                    </button>
                    <button
                      onClick={() => setFiltroStock('bajo')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        filtroStock === 'bajo'
                          ? 'bg-yellow-600 text-white shadow-md'
                          : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                      }`}
                    >
                      Stock bajo (1-3)
                    </button>
                    <button
                      onClick={() => setFiltroStock('agotado')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        filtroStock === 'agotado'
                          ? 'bg-red-600 text-white shadow-md'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      Agotado (0)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controles para vista de grupos */}
          {vista === 'grupos' && grupos.length > 0 && (
            <div className="flex justify-end gap-3 mb-4">
              <button
                onClick={expandirTodos}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black hover:bg-gray-100 rounded-xl transition-all flex items-center gap-2"
              >
                <ChevronDown size={16} />
                Expandir todos
              </button>
              <button
                onClick={colapsarTodos}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black hover:bg-gray-100 rounded-xl transition-all flex items-center gap-2"
              >
                <ChevronUp size={16} />
                Colapsar todos
              </button>
            </div>
          )}

          {/* Vista por grupos/ubicación */}
          {vista === 'grupos' && (
            <div className="space-y-4">
              {grupos.map((grupo, index) => (
                <div key={grupo.nombre} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                  <button
                    onClick={() => toggleGrupo(index)}
                    className="w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                        <MapPin size={18} className="text-gray-700" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">{grupo.nombre}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {grupo.totalProductos} {grupo.totalProductos === 1 ? 'producto' : 'productos'} • {grupo.totalStock} piezas
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Valor total</p>
                        <p className="font-bold text-gray-900">${formatMoneda(grupo.totalValor)}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {grupo.productos.some(p => p.stock === 0) && (
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Hay productos agotados"></span>
                        )}
                        {grupo.productos.some(p => p.stock > 0 && p.stock <= 3) && (
                          <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" title="Hay productos con stock bajo"></span>
                        )}
                      </div>
                      
                      {grupo.expandido ? (
                        <ChevronUp size={20} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-400" />
                      )}
                    </div>
                  </button>

                  {grupo.expandido && (
                    <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {grupo.productos.map((producto) => {
                          const stockStatus = getStockStatus(producto.stock);
                          return (
                            <div
                              key={producto.id}
                              className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                            >
                              <div className="relative">
                                <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                                  {producto.imagen && !imagenError[producto.id] ? (
                                    <img
                                      src={getImageUrl(producto.imagen)}
                                      alt={producto.nombre}
                                      className="w-full h-full object-contain transition-transform group-hover:scale-110 duration-300"
                                      onError={() => handleImageError(producto.id)}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Package size={48} className="text-gray-300" />
                                    </div>
                                  )}
                                  
                                  <div className="absolute top-3 left-3 bg-black/90 text-white px-2.5 py-1 rounded-lg text-xs font-mono shadow-lg backdrop-blur-sm">
                                    #{producto.etiqueta}
                                  </div>
                                  
                                  <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${stockStatus.icon} shadow-lg animate-pulse`}></div>
                                </div>
                              </div>

                              <div className="p-4 space-y-3">
                                <div>
                                  <h4 className="font-semibold text-gray-900 line-clamp-1">{producto.nombre}</h4>
                                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    {producto.color && (
                                      <span className="px-2 py-0.5 bg-gray-100 rounded-full">{producto.color}</span>
                                    )}
                                    {producto.talla && (
                                      <span className="px-2 py-0.5 bg-gray-100 rounded-full">Talla {producto.talla}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-2xl font-bold text-gray-900">
                                      ${formatMoneda(producto.precio)}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {formatFecha(producto.fecha_registro)}
                                    </p>
                                  </div>
                                  <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${stockStatus.color} border`}>
                                    {producto.stock} uds
                                  </span>
                                </div>

                                <div className="flex gap-2 pt-2 border-t border-gray-100">
                                  <button
                                    onClick={() => imprimirEtiqueta(producto)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 hover:text-black transition-all hover:scale-105 active:scale-95 text-sm"
                                  >
                                    <Printer size={14} />
                                    <span>Etiqueta</span>
                                  </button>
                                  
                                  {usuario?.rol === 'admin' && (
                                    <>
                                      <button
                                        onClick={() => abrirModalEditar(producto)}
                                        className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 hover:text-black transition-all hover:scale-110 active:scale-90"
                                        title="Editar"
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button
                                        onClick={() => eliminarProducto(producto.id)}
                                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all hover:scale-110 active:scale-90"
                                        title="Eliminar"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Vista lista */}
          {vista === 'lista' && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                    <tr>
                      <th className="text-left p-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Producto</th>
                      <th className="text-left p-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Detalles</th>
                      <th className="text-right p-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Precio</th>
                      <th className="text-right p-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Stock</th>
                      <th className="text-left p-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Ubicación</th>
                      <th className="text-left p-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Fecha</th>
                      <th className="text-center p-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {productos.map((producto) => {
                      const stockStatus = getStockStatus(producto.stock);
                      return (
                        <tr key={producto.id} className="hover:bg-gray-50/80 transition-colors group">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden flex items-center justify-center">
                                {producto.imagen && !imagenError[producto.id] ? (
                                  <img
                                    src={getImageUrl(producto.imagen)}
                                    alt={producto.nombre}
                                    className="w-full h-full object-cover"
                                    onError={() => handleImageError(producto.id)}
                                  />
                                ) : (
                                  <Package size={20} className="text-gray-400" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{producto.nombre}</div>
                                <div className="text-xs text-gray-500 font-mono mt-0.5">#{producto.etiqueta}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              {producto.color && (
                                <span className="text-xs text-gray-600">Color: {producto.color}</span>
                              )}
                              {producto.talla && (
                                <span className="text-xs text-gray-600">Talla: {producto.talla}</span>
                              )}
                              {producto.descripcion && (
                                <span className="text-xs text-gray-400 line-clamp-1">{producto.descripcion}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right font-bold text-gray-900">
                            ${formatMoneda(producto.precio)}
                          </td>
                          <td className="p-4 text-right">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${stockStatus.color} border`}>
                              {producto.stock}
                            </span>
                          </td>
                          <td className="p-4">
                            {producto.ubicacion && (
                              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                <MapPin size={14} className="text-gray-400" />
                                <span className="truncate max-w-[120px]">{producto.ubicacion}</span>
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-sm text-gray-500">
                            {formatFecha(producto.fecha_registro)}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => imprimirEtiqueta(producto)}
                                className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 hover:text-black transition-all hover:scale-110 active:scale-90"
                                title="Imprimir etiqueta"
                              >
                                <Printer size={14} />
                              </button>
                              
                              {usuario?.rol === 'admin' && (
                                <>
                                  <button
                                    onClick={() => abrirModalEditar(producto)}
                                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 hover:text-black transition-all hover:scale-110 active:scale-90"
                                    title="Editar"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => eliminarProducto(producto.id)}
                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all hover:scale-110 active:scale-90"
                                    title="Eliminar"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mensaje cuando no hay productos */}
          {productos.length === 0 && !cargando && (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-lg">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Package size={48} className="text-gray-400" />
              </div>
              <h3 className="text-2xl font-light text-gray-900 mb-3">No hay productos</h3>
              <p className="text-gray-500 mb-8">Comienza agregando tu primer producto al inventario</p>
              <button
                onClick={abrirModalNuevo}
                className="inline-flex items-center gap-2 bg-black text-white px-8 py-3 rounded-xl hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 font-medium shadow-lg hover:shadow-xl"
              >
                <Plus size={20} />
                Agregar producto
              </button>
            </div>
          )}

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="p-3 bg-white border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-gray-100 hover:border-gray-300 transition-all hover:scale-110 active:scale-90 text-gray-700 shadow-sm"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 shadow-sm">
                Página {pagina} de {totalPaginas}
              </span>
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="p-3 bg-white border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-gray-100 hover:border-gray-300 transition-all hover:scale-110 active:scale-90 text-gray-700 shadow-sm"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Modal para crear/editar producto */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-light text-black">
                {productoEditando ? 'Editar producto' : 'Nuevo producto'}
              </h2>
              <button
                onClick={() => setMostrarModal(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all hover:scale-110 active:scale-90"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Selector de imagen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imagen del producto
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-black hover:bg-gray-50 transition-all group"
                >
                  {imagenPreview ? (
                    <div className="relative inline-block">
                      <img 
                        src={imagenPreview.startsWith('data:') ? imagenPreview : getImageUrl(imagenPreview)} 
                        alt="Preview" 
                        className="max-h-48 rounded-lg shadow-lg group-hover:shadow-xl transition-all"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setImagenPreview(null);
                          setImagenFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg hover:scale-110 transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                        <Camera size={32} className="text-gray-500 group-hover:text-black transition-colors" />
                      </div>
                      <div>
                        <p className="text-base text-black font-medium">
                          Haz clic para seleccionar una imagen
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          PNG, JPG, WEBP • Máximo 5MB
                        </p>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del producto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Ej: Camisa casual"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-black placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  required
                />
              </div>

              {/* Color y Talla */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <input
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    placeholder="Ej: Azul marino"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-black placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Talla
                  </label>
                  <input
                    type="text"
                    name="talla"
                    value={formData.talla}
                    onChange={handleInputChange}
                    placeholder="Ej: M, L, XL"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-black placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  />
                </div>
              </div>

              {/* Precio y Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio <span className="text-red-500">*</span> ($)
                  </label>
                  <input
                    type="number"
                    name="precio"
                    value={formData.precio}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-black placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-black placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                    required
                  />
                </div>
              </div>

              {/* Ubicación con autocompletado */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ubicación en tienda
                </label>
                <input
                  ref={ubicacionInputRef}
                  type="text"
                  name="ubicacion"
                  value={formData.ubicacion}
                  onChange={handleUbicacionChange}
                  onFocus={() => {
                    if (formData.ubicacion.trim().length > 0) {
                      const filtradas = ubicacionesExistentes
                        .filter(ub => ub.toLowerCase().includes(formData.ubicacion.toLowerCase()))
                        .slice(0, 5);
                      setSugerenciasUbicacion(filtradas);
                      setMostrarSugerencias(filtradas.length > 0);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setMostrarSugerencias(false), 200);
                  }}
                  placeholder="Escribe la ubicación (ej: Pared derecha, Estante 3...)"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-black placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
                
                {/* Sugerencias de autocompletado */}
                {mostrarSugerencias && sugerenciasUbicacion.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto animate-slideDown">
                    {sugerenciasUbicacion.map((sugerencia, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="w-full px-4 py-3 text-left text-sm text-black hover:bg-gray-50 transition-colors flex items-center gap-2 border-b last:border-0"
                        onClick={() => seleccionarUbicacion(sugerencia)}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <MapPin size={14} className="text-gray-400" />
                        {sugerencia}
                        {ubicacionesExistentes.includes(sugerencia) && (
                          <span className="ml-auto text-xs text-green-600 flex items-center gap-1">
                            <Check size={12} />
                            Existente
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                
                {formData.ubicacion.trim() && !ubicacionesExistentes.includes(formData.ubicacion) && (
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <Check size={12} />
                    Se creará la nueva ubicación: "{formData.ubicacion}"
                  </p>
                )}
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Descripción detallada del producto..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-black placeholder-gray-400 resize-none focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
              </div>

              {/* Información adicional para edición */}
              {productoEditando && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl space-y-2 border border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Etiqueta:</span>
                    <span className="font-mono font-bold text-black bg-white px-3 py-1 rounded-lg border border-gray-200">#{productoEditando.etiqueta}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Fecha registro:</span>
                    <span className="text-black">{formatFecha(productoEditando.fecha_registro)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Registrado por:</span>
                    <span className="font-medium text-black">{productoEditando.usuario_registro_nombre || 'Sistema'}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-end gap-3">
              <button
                onClick={() => setMostrarModal(false)}
                className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all hover:scale-105 active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={guardarProducto}
                className="px-8 py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
              >
                {productoEditando ? 'Actualizar' : 'Guardar'}
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
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}