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
  Tag,
  MapPin,
  Image as ImageIcon,
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
  ShoppingCart,
  CreditCard,
  Landmark,
  Smartphone,
  ArrowLeft,
  Minus,
  Plus as PlusIcon,
  Receipt,
  QrCode,
  Barcode,
  AlertCircle,
  Wallet,
  Banknote,
  ArrowRight,
  CheckCircle,
  Loader2,
  CircleDollarSign
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
  sucursal_id: number;
}

interface CarritoItem {
  id: number;
  producto_id: number;
  etiqueta: string;
  nombre: string;
  color: string | null;
  talla: string | null;
  precio: number;
  cantidad: number;
  stock: number;
  imagen: string | null;
  subtotal: number;
}

interface Pago {
  metodo: 'efectivo' | 'tarjeta' | 'transferencia';
  monto: number;
  referencia?: string;
}

export default function VentasPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [sucursalActiva, setSucursalActiva] = useState("");
  const [caja, setCaja] = useState<any>(null);
  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [modoEscaneo, setModoEscaneo] = useState(false);
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [mostrarPago, setMostrarPago] = useState(false);
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'combinado'>('efectivo');
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [montoEfectivo, setMontoEfectivo] = useState("");
  const [montoTarjeta, setMontoTarjeta] = useState("");
  const [montoTransferencia, setMontoTransferencia] = useState("");
  const [referenciaTarjeta, setReferenciaTarjeta] = useState("");
  const [referenciaTransferencia, setReferenciaTransferencia] = useState("");
  const [cambio, setCambio] = useState(0);
  const [restante, setRestante] = useState(0);
  const [pagoCompletado, setPagoCompletado] = useState(false);
  const [ventaActual, setVentaActual] = useState<any>(null);
  const [mostrarTicket, setMostrarTicket] = useState(false);
  const [pasoPago, setPasoPago] = useState(1);
  
  const inputBusquedaRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Calcular totales del carrito (sin IVA)
  const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const total = Math.round(subtotal * 100) / 100; // Redondear a 2 decimales
  const totalProductos = carrito.reduce((sum, item) => sum + item.cantidad, 0);

  // Calcular restante para pagos combinados
  useEffect(() => {
    if (metodoPago === 'combinado') {
      const pagado = pagos.reduce((sum, p) => sum + p.monto, 0);
      setRestante(Math.max(0, Math.round((total - pagado) * 100) / 100));
    }
  }, [pagos, total, metodoPago]);

  // Función para formatear precios
  const formatPrecio = (valor: number | string | undefined): string => {
    if (valor === undefined || valor === null) return '0.00';
    const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
    return isNaN(numero) ? '0.00' : numero.toFixed(2);
  };

  // Función para redondear a 2 decimales
  const redondear = (num: number): number => {
    return Math.round(num * 100) / 100;
  };

  // Función para convertir a centavos (evita problemas de decimales)
  const toCents = (num: number): number => Math.round(num * 100);

  // Cargar datos iniciales
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

  // Cargar productos cuando cambia sucursal
  useEffect(() => {
    if (sucursalActiva) {
      cargarProductos();
      verificarCaja();
    }
  }, [sucursalActiva]);

  // Filtrar productos por búsqueda
  useEffect(() => {
    if (busqueda.trim() === "") {
      setProductosFiltrados([]);
    } else {
      const filtrados = productos.filter(p => 
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.etiqueta.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.color && p.color.toLowerCase().includes(busqueda.toLowerCase())) ||
        (p.talla && p.talla.toLowerCase().includes(busqueda.toLowerCase()))
      );
      setProductosFiltrados(filtrados.slice(0, 10));
    }
  }, [busqueda, productos]);

  // Enfocar input al montar
  useEffect(() => {
    setTimeout(() => {
      inputBusquedaRef.current?.focus();
    }, 100);
  }, []);

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
    if (!sucursalActiva) return;

    setCargando(true);
    try {
      const params = new URLSearchParams({
        sucursal_id: sucursalActiva,
        activo: 'true'
      });

      const res = await fetch(`/api/productos?${params}`);
      const data = await res.json();
      
      const productosConPrecioNumerico = data.map((p: any) => ({
        ...p,
        precio: Number(p.precio)
      }));
      
      setProductos(productosConPrecioNumerico);
    } catch (error) {
      console.error("Error cargando productos:", error);
    } finally {
      setCargando(false);
    }
  };

  const verificarCaja = async () => {
    if (!sucursalActiva) return;

    try {
      const res = await fetch(`/api/caja/activa?sucursal_id=${sucursalActiva}`);
      if (res.ok) {
        const data = await res.json();
        setCaja(data);
      } else {
        setCaja(null);
      }
    } catch (error) {
      console.error("Error verificando caja:", error);
    }
  };

  const cambiarSucursal = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nueva = e.target.value;
    setSucursalActiva(nueva);
    sessionStorage.setItem("sucursalActiva", nueva);
    resetearVenta();
  };

  const resetearVenta = () => {
    setCarrito([]);
    setMostrarResumen(false);
    setMostrarPago(false);
    setPagos([]);
    setMontoEfectivo("");
    setMontoTarjeta("");
    setMontoTransferencia("");
    setReferenciaTarjeta("");
    setReferenciaTransferencia("");
    setPagoCompletado(false);
    setVentaActual(null);
    setMostrarTicket(false);
    setPasoPago(1);
    setMetodoPago('efectivo');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusqueda(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && productosFiltrados.length > 0) {
      agregarAlCarrito(productosFiltrados[0]);
      setBusqueda("");
    } else if (e.key === 'Escape') {
      setBusqueda("");
      setProductosFiltrados([]);
    }
  };

  const agregarAlCarrito = (producto: Producto) => {
    if (producto.stock <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Sin stock',
        text: 'Este producto no tiene stock disponible',
        confirmButtonColor: '#000',
        timer: 1500,
        showConfirmButton: false
      });
      return;
    }

    setCarrito(prev => {
      const existente = prev.find(item => item.producto_id === producto.id);
      
      if (existente) {
        if (existente.cantidad >= producto.stock) {
          Swal.fire({
            icon: 'error',
            title: 'Stock insuficiente',
            text: `Solo hay ${producto.stock} unidades disponibles`,
            confirmButtonColor: '#000',
            timer: 1500,
            showConfirmButton: false
          });
          return prev;
        }
        
        return prev.map(item =>
          item.producto_id === producto.id
            ? { 
                ...item, 
                cantidad: item.cantidad + 1, 
                subtotal: redondear((item.cantidad + 1) * item.precio)
              }
            : item
        );
      } else {
        return [...prev, {
          id: Date.now(),
          producto_id: producto.id,
          etiqueta: producto.etiqueta,
          nombre: producto.nombre,
          color: producto.color,
          talla: producto.talla,
          precio: producto.precio,
          cantidad: 1,
          stock: producto.stock,
          imagen: producto.imagen,
          subtotal: producto.precio
        }];
      }
    });

    const toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
    });
    toast.fire({
      icon: 'success',
      title: `${producto.nombre} agregado`,
    });

    setBusqueda("");
    setProductosFiltrados([]);
    inputBusquedaRef.current?.focus();
  };

  const actualizarCantidad = (itemId: number, nuevaCantidad: number) => {
    setCarrito(prev => {
      const item = prev.find(i => i.id === itemId);
      if (!item) return prev;

      if (nuevaCantidad > item.stock) {
        Swal.fire({
          icon: 'error',
          title: 'Stock insuficiente',
          text: `Solo hay ${item.stock} unidades disponibles`,
          confirmButtonColor: '#000',
          timer: 1500,
          showConfirmButton: false
        });
        return prev;
      }

      if (nuevaCantidad <= 0) {
        return prev.filter(i => i.id !== itemId);
      }

      return prev.map(i =>
        i.id === itemId
          ? { 
              ...i, 
              cantidad: nuevaCantidad, 
              subtotal: redondear(nuevaCantidad * i.precio)
            }
          : i
      );
    });
  };

  const eliminarDelCarrito = (itemId: number) => {
    setCarrito(prev => prev.filter(i => i.id !== itemId));
  };

  const vaciarCarrito = () => {
    if (carrito.length === 0) return;
    
    Swal.fire({
      title: '¿Vaciar carrito?',
      text: 'Se eliminarán todos los productos',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#000',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, vaciar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        resetearVenta();
      }
    });
  };

  const irAResumen = () => {
    if (carrito.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Carrito vacío',
        text: 'Agrega productos al carrito primero',
        confirmButtonColor: '#000',
        timer: 1500,
        showConfirmButton: false
      });
      return;
    }
    setMostrarResumen(true);
  };

  const volverAlCarrito = () => {
    setMostrarResumen(false);
  };

  const irAPago = () => {
    setMostrarPago(true);
    resetearPagos();
    setPasoPago(1);
  };

  const resetearPagos = () => {
    setPagos([]);
    setMontoEfectivo("");
    setMontoTarjeta("");
    setMontoTransferencia("");
    setReferenciaTarjeta("");
    setReferenciaTransferencia("");
    setRestante(0);
  };

  const volverAResumen = () => {
    setMostrarPago(false);
    resetearPagos();
  };

  const handleMetodoPagoChange = (metodo: 'efectivo' | 'tarjeta' | 'transferencia' | 'combinado') => {
    setMetodoPago(metodo);
    resetearPagos();
    setPasoPago(1);
  };

  const calcularCambio = () => {
    if (metodoPago === 'efectivo') {
      const efectivo = parseFloat(montoEfectivo) || 0;
      setCambio(Math.max(0, redondear(efectivo - total)));
    } else {
      setCambio(0);
    }
  };

  useEffect(() => {
    calcularCambio();
  }, [montoEfectivo, total, metodoPago]);

  // Validar pagos combinados
  const validarPagos = (): boolean => {
    if (metodoPago !== 'combinado') return true;

    const montoE = parseFloat(montoEfectivo) || 0;
    const montoT = parseFloat(montoTarjeta) || 0;
    const montoTrans = parseFloat(montoTransferencia) || 0;
    
    // Validar que al menos un método tenga monto
    if (montoE === 0 && montoT === 0 && montoTrans === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Debe ingresar al menos un monto de pago',
        confirmButtonColor: '#000'
      });
      return false;
    }

    // Redondear todos los montos a 2 decimales
    const montoERedondeado = redondear(montoE);
    const montoTRedondeado = redondear(montoT);
    const montoTransRedondeado = redondear(montoTrans);
    
    // Calcular suma redondeada
    const suma = redondear(montoERedondeado + montoTRedondeado + montoTransRedondeado);
    const totalRedondeado = redondear(total);

    console.log('=== VALIDACIÓN DE PAGOS ===');
    console.log('Total:', total, 'redondeado:', totalRedondeado);
    console.log('Efectivo:', montoE, 'redondeado:', montoERedondeado);
    console.log('Tarjeta:', montoT, 'redondeado:', montoTRedondeado);
    console.log('Transferencia:', montoTrans, 'redondeado:', montoTransRedondeado);
    console.log('Suma:', suma);
    
    // Comparar con tolerancia de 1 centavo
    const diferencia = Math.abs(suma - totalRedondeado);
    if (diferencia > 0.01) {
      Swal.fire({
        icon: 'error',
        title: 'Error en pagos',
        html: `
          <div class="text-left">
            <p class="mb-2 font-bold text-red-600">Los montos no coinciden:</p>
            <p class="font-mono">Total: $${formatPrecio(totalRedondeado)}</p>
            <p class="font-mono">Suma: $${formatPrecio(suma)}</p>
            <p class="text-sm text-gray-500 mt-2">Diferencia: $${formatPrecio(diferencia)}</p>
            <div class="border-t border-gray-200 my-2 pt-2">
              <p class="font-medium">Detalle:</p>
              ${montoERedondeado > 0 ? `<p>Efectivo: $${formatPrecio(montoERedondeado)}</p>` : ''}
              ${montoTRedondeado > 0 ? `<p>Tarjeta: $${formatPrecio(montoTRedondeado)}</p>` : ''}
              ${montoTransRedondeado > 0 ? `<p>Transferencia: $${formatPrecio(montoTransRedondeado)}</p>` : ''}
            </div>
          </div>
        `,
        confirmButtonColor: '#000'
      });
      return false;
    }

    // Validar referencias
    if (montoTRedondeado > 0 && !referenciaTarjeta.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ingrese la referencia de la tarjeta',
        confirmButtonColor: '#000'
      });
      return false;
    }

    if (montoTransRedondeado > 0 && !referenciaTransferencia.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ingrese la referencia de la transferencia',
        confirmButtonColor: '#000'
      });
      return false;
    }

    return true;
  };

  // Agregar pago combinado
  const agregarPago = () => {
    if (metodoPago !== 'combinado') return;
    
    if (!validarPagos()) return;

    const montoE = redondear(parseFloat(montoEfectivo) || 0);
    const montoT = redondear(parseFloat(montoTarjeta) || 0);
    const montoTrans = redondear(parseFloat(montoTransferencia) || 0);

    const nuevosPagos: Pago[] = [];
    
    if (montoE > 0) {
      nuevosPagos.push({ 
        metodo: 'efectivo', 
        monto: montoE
      });
    }
    if (montoT > 0) {
      nuevosPagos.push({ 
        metodo: 'tarjeta', 
        monto: montoT,
        referencia: referenciaTarjeta.trim()
      });
    }
    if (montoTrans > 0) {
      nuevosPagos.push({ 
        metodo: 'transferencia', 
        monto: montoTrans,
        referencia: referenciaTransferencia.trim()
      });
    }

    setPagos(nuevosPagos);
    setPasoPago(2);
    
    Swal.fire({
      icon: 'success',
      title: '¡Pagos configurados!',
      text: 'Ya puede proceder a cobrar',
      timer: 1500,
      showConfirmButton: false
    });
  };

  // Procesar venta
const procesarVenta = async () => {
  if (!caja) {
    Swal.fire({
      icon: 'error',
      title: 'Caja cerrada',
      text: 'Debes abrir la caja antes de vender',
      confirmButtonColor: '#000'
    });
    return;
  }

  // Validar según método de pago
  if (metodoPago === 'efectivo') {
    const efectivo = redondear(parseFloat(montoEfectivo) || 0);
    if (efectivo < total) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'El efectivo debe ser mayor o igual al total',
        confirmButtonColor: '#000'
      });
      return;
    }
  } else if (metodoPago === 'tarjeta') {
    if (!referenciaTarjeta.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ingrese la referencia de la tarjeta',
        confirmButtonColor: '#000'
      });
      return;
    }
  } else if (metodoPago === 'transferencia') {
    if (!referenciaTransferencia.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ingrese la referencia de la transferencia',
        confirmButtonColor: '#000'
      });
      return;
    }
  } else if (metodoPago === 'combinado') {
    if (pagos.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Debe configurar los pagos combinados',
        confirmButtonColor: '#000'
      });
      return;
    }
    
    // Verificar suma de pagos
    const suma = redondear(pagos.reduce((sum, p) => sum + p.monto, 0));
    const totalRedondeado = redondear(total);
    
    console.log('=== VERIFICACIÓN FINAL ===');
    console.log('Pagos:', pagos);
    console.log('Suma:', suma);
    console.log('Total:', totalRedondeado);
    
    if (Math.abs(suma - totalRedondeado) > 0.01) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        html: `
          <div class="text-left">
            <p>Los pagos no suman el total correctamente:</p>
            <p class="font-mono mt-2">Total: $${formatPrecio(totalRedondeado)}</p>
            <p class="font-mono">Suma: $${formatPrecio(suma)}</p>
          </div>
        `,
        confirmButtonColor: '#000'
      });
      return;
    }
  }

  setProcesando(true);

  try {
    // Preparar los productos en el formato que espera la API
    const productosVenta = carrito.map(item => ({
      producto_id: item.producto_id,
      cantidad: item.cantidad
      // La API obtiene el precio de la base de datos, no necesitamos enviarlo
    }));

    // Preparar los pagos según el método
    let pagosData: any[] = [];
    let referenciaTarjetaValue = referenciaTarjeta;
    let referenciaTransferenciaValue = referenciaTransferencia;
    
    if (metodoPago === 'combinado') {
      pagosData = pagos.map(pago => ({
        metodo: pago.metodo,
        monto: pago.monto,
        ...(pago.referencia ? { referencia: pago.referencia.trim() } : {})
      }));
    }

    // Preparar el cuerpo de la petición EXACTAMENTE como lo espera tu API
    const requestBody: any = {
      productos: productosVenta,
      metodo_pago: metodoPago,
      sucursal_id: parseInt(sucursalActiva),
      usuario_id: usuario.id,
      caja_id: caja?.id
    };

    // Agregar campos específicos según el método de pago
    if (metodoPago === 'combinado') {
      requestBody.pagos = pagosData;
    } else if (metodoPago === 'tarjeta') {
      requestBody.referenciaTarjeta = referenciaTarjeta.trim();
    } else if (metodoPago === 'transferencia') {
      requestBody.referenciaTransferencia = referenciaTransferencia.trim();
    }

    console.log('=== ENVIANDO PETICIÓN ===');
    console.log('URL:', '/api/ventas');
    console.log('Body:', JSON.stringify(requestBody, null, 2));

    const res = await fetch('/api/ventas', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    // Leer la respuesta como texto primero para debug
    const responseText = await res.text();
    console.log('Respuesta del servidor (texto):', responseText);

    // Intentar parsear como JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Error al parsear respuesta JSON:', e);
      throw new Error(`Respuesta del servidor no válida: ${responseText.substring(0, 100)}`);
    }

    if (res.ok) {
      setVentaActual(data.venta);
      setPagoCompletado(true);
      setMostrarTicket(true);
      setProcesando(false);
      
      Swal.fire({
        icon: 'success',
        title: '¡Venta realizada con éxito!',
        html: `
          <div class="text-center">
            <p class="text-lg font-bold mb-2">Folio: ${data.venta.folio}</p>
            <p class="text-gray-600">Total: $${formatPrecio(data.venta.total)}</p>
          </div>
        `,
        confirmButtonColor: '#000',
        confirmButtonText: 'Imprimir ticket',
        showCancelButton: true,
        cancelButtonText: 'Nueva venta',
        cancelButtonColor: '#6b7280'
      }).then((result) => {
        if (result.isConfirmed) {
          imprimirTicket(data.venta);
        }
        resetearVenta();
        verificarCaja();
        cargarProductos();
        inputBusquedaRef.current?.focus();
      });
      
    } else {
      // Si hay error, mostrar el mensaje del servidor
      throw new Error(data.error || data.message || 'Error al procesar venta');
    }
  } catch (error: any) {
    setProcesando(false);
    console.error('Error completo:', error);
    
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message || 'Error al procesar venta',
      confirmButtonColor: '#000'
    });
  }
};

  const imprimirTicket = (venta: any) => {
    const ventana = window.open('', '_blank');
    if (!ventana) return;

    const fecha = new Date(venta.fecha).toLocaleString('es-MX');
    const cambioCalculado = metodoPago === 'efectivo' && parseFloat(montoEfectivo) > total 
      ? redondear(parseFloat(montoEfectivo) - total) 
      : 0;

    const contenido = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket - ${venta.folio}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 300px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .header h1 {
            font-size: 18px;
            margin: 0;
          }
          .header p {
            margin: 5px 0;
          }
          .line {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
          .item {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .item-detail {
            font-size: 11px;
            color: #444;
            margin-left: 10px;
          }
          .total {
            font-weight: bold;
            font-size: 14px;
          }
          .pago {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 11px;
          }
          .exito {
            background: #10b981;
            color: white;
            padding: 10px;
            border-radius: 5px;
            text-align: center;
            margin-bottom: 15px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="exito">
          ¡VENTA REALIZADA CON ÉXITO!
        </div>
        
        <div class="header">
          <h1>BLACKS BOUTIQUE</h1>
          <p>${fecha}</p>
          <p>Folio: ${venta.folio}</p>
          <p>Cajero: ${usuario.nombre}</p>
        </div>
        
        <div class="line"></div>
        
        ${venta.productos.map((item: any) => `
          <div>
            <div class="item">
              <span>${item.cantidad} x ${item.producto_nombre}</span>
              <span>$${formatPrecio(item.total)}</span>
            </div>
            ${item.color || item.talla ? `
              <div class="item-detail">
                ${[item.color, item.talla ? `Talla ${item.talla}` : ''].filter(Boolean).join(' - ')}
              </div>
            ` : ''}
          </div>
        `).join('')}
        
        <div class="line"></div>
        
        <div class="item total">
          <span>TOTAL</span>
          <span>$${formatPrecio(venta.total)}</span>
        </div>
        
        <div class="line"></div>
        
        <div class="item">
          <span>Método de pago</span>
          <span>${metodoPago === 'combinado' ? 'Combinado' : 
                  metodoPago === 'efectivo' ? 'Efectivo' :
                  metodoPago === 'tarjeta' ? 'Tarjeta' : 'Transferencia'}</span>
        </div>
        
        ${metodoPago === 'combinado' && venta.pagos ? venta.pagos.map((pago: any) => `
          <div class="pago">
            <span>${pago.metodo === 'efectivo' ? 'Efectivo' :
                     pago.metodo === 'tarjeta' ? 'Tarjeta' : 'Transferencia'}</span>
            <span>$${formatPrecio(pago.monto)}</span>
          </div>
        `).join('') : ''}
        
        ${metodoPago === 'efectivo' && parseFloat(montoEfectivo) > total ? `
          <div class="item">
            <span>Efectivo recibido</span>
            <span>$${formatPrecio(parseFloat(montoEfectivo))}</span>
          </div>
          <div class="item">
            <span>Cambio</span>
            <span>$${formatPrecio(cambioCalculado)}</span>
          </div>
        ` : ''}
        
        ${metodoPago === 'tarjeta' && referenciaTarjeta ? `
          <div class="item">
            <span>Referencia</span>
            <span>${referenciaTarjeta}</span>
          </div>
        ` : ''}
        
        ${metodoPago === 'transferencia' && referenciaTransferencia ? `
          <div class="item">
            <span>Referencia</span>
            <span>${referenciaTransferencia}</span>
          </div>
        ` : ''}
        
        <div class="footer">
          <p>¡Gracias por su compra!</p>
          <p>Ticket de venta</p>
        </div>
      </body>
      </html>
    `;

    ventana.document.write(contenido);
    ventana.document.close();
    ventana.print();
  };

  const nuevaVenta = () => {
    resetearVenta();
    inputBusquedaRef.current?.focus();
  };

  if (!usuario) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar usuario={usuario} onLogout={() => router.push('/login')} />

      <main className="lg:ml-20 min-h-screen transition-all duration-300">
        <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-black"></div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-black">
                Punto de Venta
              </h1>
              {pagoCompletado && (
                <span className="ml-3 px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full animate-pulse">
                  <CheckCircle size={16} className="inline mr-1" />
                  Venta realizada
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {usuario?.rol === "admin" && (
                <select
                  value={sucursalActiva}
                  onChange={cambiarSucursal}
                  className="bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-medium text-black outline-none focus:border-black focus:ring-1 focus:ring-black transition-all w-full sm:w-auto"
                >
                  {sucursales.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              )}
              
              {!caja && (
                <div className="bg-red-100 text-red-700 px-4 py-2.5 rounded-xl text-sm font-medium animate-pulse flex items-center gap-2">
                  <AlertCircle size={16} />
                  Caja cerrada
                </div>
              )}
            </div>
          </div>

          {!caja ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center animate-fadeIn">
              <AlertCircle size={48} className="mx-auto text-yellow-500 mb-4" />
              <p className="text-yellow-800 text-lg mb-2">La caja está cerrada</p>
              <p className="text-sm text-yellow-600">Debes abrir la caja en el dashboard antes de poder vender</p>
            </div>
          ) : pagoCompletado && mostrarTicket ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center animate-scaleIn">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                <CheckCircle size={48} className="text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-black mb-2">¡Venta realizada!</h2>
              <p className="text-gray-600 text-lg mb-2">Folio: {ventaActual?.folio}</p>
              <p className="text-gray-600 text-lg mb-6">Total: ${formatPrecio(ventaActual?.total)}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    imprimirTicket(ventaActual);
                    nuevaVenta();
                  }}
                  className="bg-black text-white px-8 py-3 rounded-xl hover:bg-gray-800 transition-all hover:scale-105 font-medium flex items-center gap-2"
                >
                  <Printer size={18} />
                  Imprimir ticket
                </button>
                <button
                  onClick={nuevaVenta}
                  className="bg-gray-100 text-black px-8 py-3 rounded-xl hover:bg-gray-200 transition-all hover:scale-105 font-medium"
                >
                  Nueva venta
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Columna izquierda - Búsqueda y productos */}
              <div className="lg:col-span-2 space-y-4">
                {/* Buscador */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      {modoEscaneo ? (
                        <QrCode size={20} className="text-gray-500 animate-pulse" />
                      ) : (
                        <Search size={20} className="text-gray-500" />
                      )}
                    </div>
                    <input
                      ref={inputBusquedaRef}
                      type="text"
                      value={busqueda}
                      onChange={handleSearchChange}
                      onKeyDown={handleKeyDown}
                      placeholder={modoEscaneo ? "Escanea un código de barras..." : "Buscar por nombre, etiqueta, color o talla..."}
                      className="w-full pl-10 pr-24 py-3 border border-gray-300 rounded-xl text-black placeholder-gray-500 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                      autoFocus
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <button
                        onClick={() => setModoEscaneo(!modoEscaneo)}
                        className={`p-2 rounded-lg transition-all duration-300 ${
                          modoEscaneo ? 'bg-black text-white scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={modoEscaneo ? "Cambiar a búsqueda" : "Cambiar a escaneo"}
                      >
                        {modoEscaneo ? <Search size={18} /> : <QrCode size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Resultados de búsqueda */}
                  {busqueda && productosFiltrados.length > 0 && (
                    <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden animate-slideDown">
                      {productosFiltrados.map((producto, index) => (
                        <button
                          key={producto.id}
                          onClick={() => agregarAlCarrito(producto)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b last:border-b-0"
                        >
                          <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {producto.imagen ? (
                              <img
                                src={producto.imagen}
                                alt={producto.nombre}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={16} className="text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium text-black">{producto.nombre}</div>
                            <div className="text-xs text-gray-500">
                              #{producto.etiqueta}
                              {producto.color && ` • ${producto.color}`}
                              {producto.talla && ` • Talla ${producto.talla}`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-black">${formatPrecio(producto.precio)}</div>
                            <div className={`text-xs ${producto.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Stock: {producto.stock}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {busqueda && productosFiltrados.length === 0 && (
                    <div className="mt-2 p-8 text-center text-gray-500 border border-gray-200 rounded-lg animate-fadeIn">
                      <Package size={32} className="mx-auto text-gray-300 mb-2" />
                      <p>No se encontraron productos</p>
                    </div>
                  )}
                </div>

                {/* Sugerencias rápidas */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <h3 className="text-sm font-medium text-black mb-3 flex items-center gap-2">
                    <Package size={16} />
                    Productos con poco stock
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {productos
                      .filter(p => p.stock > 0 && p.stock <= 5)
                      .slice(0, 6)
                      .map((producto) => (
                        <button
                          key={producto.id}
                          onClick={() => agregarAlCarrito(producto)}
                          className="p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-left transition-all hover:scale-105 border border-yellow-200"
                        >
                          <div className="font-medium text-sm text-black truncate">{producto.nombre}</div>
                          <div className="text-xs text-gray-500">Stock: {producto.stock}</div>
                          <div className="font-bold text-sm text-black mt-1">${formatPrecio(producto.precio)}</div>
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              {/* Columna derecha - Carrito y Pagos */}
              <div className="lg:col-span-1">
                {!mostrarResumen && !mostrarPago ? (
                  /* Carrito */
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm h-[calc(100vh-12rem)] flex flex-col">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <h2 className="font-medium text-black flex items-center gap-2">
                        <ShoppingCart size={18} />
                        Carrito ({totalProductos})
                      </h2>
                      {carrito.length > 0 && (
                        <button
                          onClick={vaciarCarrito}
                          className="text-sm text-red-600 hover:text-red-700 transition-colors"
                        >
                          Vaciar
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {carrito.length === 0 ? (
                        <div className="text-center py-8">
                          <ShoppingCart size={48} className="mx-auto text-gray-300 mb-3" />
                          <p className="text-gray-500">Carrito vacío</p>
                          <p className="text-xs text-gray-400 mt-1">Busca productos para agregar</p>
                        </div>
                      ) : (
                        carrito.map((item) => (
                          <div key={item.id} className="flex gap-3 border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              {item.imagen ? (
                                <img
                                  src={item.imagen}
                                  alt={item.nombre}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package size={16} className="text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-medium text-sm text-black truncate">{item.nombre}</h4>
                                  <p className="text-xs text-gray-500">
                                    #{item.etiqueta}
                                    {item.color && ` • ${item.color}`}
                                    {item.talla && ` • Talla ${item.talla}`}
                                  </p>
                                </div>
                                <button
                                  onClick={() => eliminarDelCarrito(item.id)}
                                  className="text-gray-400 hover:text-red-600 transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center border border-gray-200 rounded-lg">
                                  <button
                                    onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                                    className="p-1 hover:bg-gray-100 rounded-l-lg transition-colors"
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span className="w-8 text-center text-sm">{item.cantidad}</span>
                                  <button
                                    onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                                    className="p-1 hover:bg-gray-100 rounded-r-lg transition-colors"
                                  >
                                    <PlusIcon size={14} />
                                  </button>
                                </div>
                                <span className="font-bold text-black">
                                  ${formatPrecio(item.precio * item.cantidad)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {carrito.length > 0 && (
                      <div className="p-4 border-t border-gray-200 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="font-medium text-black">${formatPrecio(subtotal)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg">
                          <span className="text-black">Total</span>
                          <span className="text-black">${formatPrecio(total)}</span>
                        </div>
                        <button
                          onClick={irAResumen}
                          className="w-full bg-black text-white py-3 rounded-xl hover:bg-gray-800 transition-all hover:scale-105 font-medium"
                        >
                          Continuar
                        </button>
                      </div>
                    )}
                  </div>
                ) : mostrarResumen && !mostrarPago ? (
                  /* Resumen */
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 animate-slideLeft">
                    <button
                      onClick={volverAlCarrito}
                      className="flex items-center gap-2 text-gray-600 hover:text-black mb-4 transition-colors group"
                    >
                      <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                      <span>Volver al carrito</span>
                    </button>

                    <h2 className="text-lg font-medium text-black mb-4">Resumen de venta</h2>

                    <div className="space-y-4 mb-6 max-h-60 overflow-y-auto">
                      {carrito.map((item) => (
                        <div key={item.id} className="flex justify-between items-start border-b border-gray-100 pb-2">
                          <div>
                            <p className="font-medium text-black">{item.nombre}</p>
                            <p className="text-xs text-gray-500">
                              {item.cantidad} x ${formatPrecio(item.precio)}
                              {item.color && ` • ${item.color}`}
                              {item.talla && ` • Talla ${item.talla}`}
                            </p>
                          </div>
                          <span className="font-medium text-black">${formatPrecio(item.cantidad * item.precio)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-200 pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium text-black">${formatPrecio(subtotal)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg pt-2">
                        <span className="text-black">Total</span>
                        <span className="text-black">${formatPrecio(total)}</span>
                      </div>
                    </div>

                    <button
                      onClick={irAPago}
                      className="w-full bg-black text-white py-3 rounded-xl hover:bg-gray-800 transition-all hover:scale-105 font-medium mt-6"
                    >
                      Proceder al pago
                    </button>
                  </div>
                ) : (
                  /* Panel de Pago */
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 animate-slideLeft">
                    <button
                      onClick={volverAResumen}
                      className="flex items-center gap-2 text-gray-600 hover:text-black mb-4 transition-colors group"
                    >
                      <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                      <span>Volver al resumen</span>
                    </button>

                    <div className="mb-6">
                      <h2 className="text-lg font-medium text-black mb-1">Método de pago</h2>
                      <div className="flex items-baseline justify-between">
                        <p className="text-sm text-gray-500">Total a pagar:</p>
                        <p className="text-2xl font-bold text-black">${formatPrecio(total)}</p>
                      </div>
                    </div>

                    {/* Selector de método */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <button
                        onClick={() => handleMetodoPagoChange('efectivo')}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${
                          metodoPago === 'efectivo' 
                            ? 'border-emerald-500 bg-emerald-50 scale-105 shadow-md' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Banknote size={24} className={metodoPago === 'efectivo' ? 'text-emerald-600' : 'text-gray-500'} />
                        <span className={`text-sm font-medium ${metodoPago === 'efectivo' ? 'text-emerald-700' : 'text-gray-600'}`}>
                          Efectivo
                        </span>
                      </button>

                      <button
                        onClick={() => handleMetodoPagoChange('tarjeta')}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${
                          metodoPago === 'tarjeta' 
                            ? 'border-blue-500 bg-blue-50 scale-105 shadow-md' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <CreditCard size={24} className={metodoPago === 'tarjeta' ? 'text-blue-600' : 'text-gray-500'} />
                        <span className={`text-sm font-medium ${metodoPago === 'tarjeta' ? 'text-blue-700' : 'text-gray-600'}`}>
                          Tarjeta
                        </span>
                      </button>

                      <button
                        onClick={() => handleMetodoPagoChange('transferencia')}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${
                          metodoPago === 'transferencia' 
                            ? 'border-purple-500 bg-purple-50 scale-105 shadow-md' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Landmark size={24} className={metodoPago === 'transferencia' ? 'text-purple-600' : 'text-gray-500'} />
                        <span className={`text-sm font-medium ${metodoPago === 'transferencia' ? 'text-purple-700' : 'text-gray-600'}`}>
                          Transferencia
                        </span>
                      </button>

                      <button
                        onClick={() => handleMetodoPagoChange('combinado')}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${
                          metodoPago === 'combinado' 
                            ? 'border-orange-500 bg-orange-50 scale-105 shadow-md' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Wallet size={24} className={metodoPago === 'combinado' ? 'text-orange-600' : 'text-gray-500'} />
                        <span className={`text-sm font-medium ${metodoPago === 'combinado' ? 'text-orange-700' : 'text-gray-600'}`}>
                          Combinado
                        </span>
                      </button>
                    </div>

                    {/* Contenido según método */}
                    <div className="space-y-4">
                      {/* Efectivo */}
                      {metodoPago === 'efectivo' && (
                        <div className="space-y-4 animate-fadeIn">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Monto recibido
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                              <input
                                type="number"
                                value={montoEfectivo}
                                onChange={(e) => setMontoEfectivo(e.target.value)}
                                placeholder="0.00"
                                min={total}
                                step="0.01"
                                className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                                autoFocus
                              />
                            </div>
                          </div>
                          
                          {parseFloat(montoEfectivo) >= total && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-slideDown">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Cambio:</span>
                                <span className="text-lg font-bold text-green-700">
                                  ${formatPrecio(redondear(parseFloat(montoEfectivo) - total))}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {parseFloat(montoEfectivo) < total && parseFloat(montoEfectivo) > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 animate-slideDown">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Faltan:</span>
                                <span className="text-lg font-bold text-yellow-700">
                                  ${formatPrecio(redondear(total - parseFloat(montoEfectivo)))}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tarjeta */}
                      {metodoPago === 'tarjeta' && (
                        <div className="space-y-4 animate-fadeIn">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Referencia de tarjeta
                            </label>
                            <input
                              type="text"
                              value={referenciaTarjeta}
                              onChange={(e) => setReferenciaTarjeta(e.target.value)}
                              placeholder="Ej: VISA ****1234"
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                              autoFocus
                            />
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Total a pagar:</span>
                              <span className="text-lg font-bold text-blue-700">${formatPrecio(total)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Transferencia */}
                      {metodoPago === 'transferencia' && (
                        <div className="space-y-4 animate-fadeIn">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Referencia de transferencia
                            </label>
                            <input
                              type="text"
                              value={referenciaTransferencia}
                              onChange={(e) => setReferenciaTransferencia(e.target.value)}
                              placeholder="Ej: DEP-123456"
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                              autoFocus
                            />
                          </div>
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Total a pagar:</span>
                              <span className="text-lg font-bold text-purple-700">${formatPrecio(total)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Combinado - Paso 1 */}
                      {metodoPago === 'combinado' && pasoPago === 1 && (
                        <div className="space-y-4 animate-fadeIn">
                          {/* Barra de progreso */}
                          <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 transition-all duration-500"
                              style={{ width: `${Math.min(100, ((total - restante) / total) * 100)}%` }}
                            />
                          </div>
                          
                          <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                            <span className="text-sm text-gray-600">Total a pagar:</span>
                            <span className="text-xl font-bold text-black">${formatPrecio(total)}</span>
                          </div>

                          {/* Efectivo */}
                          <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/30">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <Banknote size={18} className="text-emerald-600" />
                              </div>
                              <span className="font-medium text-emerald-700">Efectivo</span>
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-medium">$</span>
                              <input
                                type="number"
                                value={montoEfectivo}
                                onChange={(e) => setMontoEfectivo(e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="w-full pl-8 pr-4 py-2 bg-white border border-emerald-200 rounded-lg text-black focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                              />
                            </div>
                          </div>

                          {/* Tarjeta */}
                          <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/30">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <CreditCard size={18} className="text-blue-600" />
                              </div>
                              <span className="font-medium text-blue-700">Tarjeta</span>
                            </div>
                            <div className="space-y-2">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 font-medium">$</span>
                                <input
                                  type="number"
                                  value={montoTarjeta}
                                  onChange={(e) => setMontoTarjeta(e.target.value)}
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                  className="w-full pl-8 pr-4 py-2 bg-white border border-blue-200 rounded-lg text-black focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                />
                              </div>
                              <input
                                type="text"
                                value={referenciaTarjeta}
                                onChange={(e) => setReferenciaTarjeta(e.target.value)}
                                placeholder="Referencia de tarjeta"
                                className="w-full px-4 py-2 bg-white border border-blue-200 rounded-lg text-black focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                              />
                            </div>
                          </div>

                          {/* Transferencia */}
                          <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/30">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Landmark size={18} className="text-purple-600" />
                              </div>
                              <span className="font-medium text-purple-700">Transferencia</span>
                            </div>
                            <div className="space-y-2">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-600 font-medium">$</span>
                                <input
                                  type="number"
                                  value={montoTransferencia}
                                  onChange={(e) => setMontoTransferencia(e.target.value)}
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                  className="w-full pl-8 pr-4 py-2 bg-white border border-purple-200 rounded-lg text-black focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                                />
                              </div>
                              <input
                                type="text"
                                value={referenciaTransferencia}
                                onChange={(e) => setReferenciaTransferencia(e.target.value)}
                                placeholder="Referencia de transferencia"
                                className="w-full px-4 py-2 bg-white border border-purple-200 rounded-lg text-black focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                              />
                            </div>
                          </div>

                          <button
                            onClick={agregarPago}
                            className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-all hover:scale-105 font-medium flex items-center justify-center gap-2"
                          >
                            <Check size={18} />
                            Verificar pagos
                          </button>
                        </div>
                      )}

                      {/* Combinado - Paso 2: Resumen */}
                      {metodoPago === 'combinado' && pasoPago === 2 && pagos.length > 0 && (
                        <div className="space-y-4 animate-fadeIn">
                          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                            <h3 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                              <CheckCircle size={18} />
                              Pagos configurados
                            </h3>
                            <div className="space-y-2">
                              {pagos.map((pago, idx) => (
                                <div key={idx} className="flex justify-between items-center py-1 border-b border-green-100 last:border-0">
                                  <span className="text-green-700">
                                    {pago.metodo === 'efectivo' ? 'Efectivo' : 
                                     pago.metodo === 'tarjeta' ? 'Tarjeta' : 'Transferencia'}
                                  </span>
                                  <span className="font-medium text-green-800">${formatPrecio(pago.monto)}</span>
                                </div>
                              ))}
                              <div className="flex justify-between font-bold pt-2 mt-2 border-t border-green-200">
                                <span className="text-green-800">Total</span>
                                <span className="text-green-800">${formatPrecio(total)}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => setPasoPago(1)}
                            className="w-full bg-gray-100 text-black py-2 rounded-lg hover:bg-gray-200 transition-all font-medium text-sm"
                          >
                            Modificar pagos
                          </button>
                        </div>
                      )}

                      {/* Botón de cobrar */}
                      {(metodoPago !== 'combinado' || pasoPago === 2) && (
                        <button
                          onClick={procesarVenta}
                          disabled={procesando}
                          className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-4 rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all hover:scale-105 font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 mt-6 shadow-lg"
                        >
                          {procesando ? (
                            <>
                              <Loader2 size={20} className="animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            <>
                              <CircleDollarSign size={20} />
                              Cobrar ${formatPrecio(total)}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}