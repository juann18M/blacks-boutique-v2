"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { 
  MapPin,
  DollarSign,
  ShoppingCart,
  LogOut,
  PlusCircle,
  Pencil,
  X,
  Clock,
  ArrowUpRight,
  Trash2,
  RefreshCw,
  CreditCard,
  Landmark,
  Wallet,
  FileSpreadsheet,
  Package,
  TrendingUp,
  Calendar,
  Printer,
  Download
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import * as XLSX from 'xlsx';

export default function Dashboard() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [sucursalActiva, setSucursalActiva] = useState("");
  const [sucursalNombre, setSucursalNombre] = useState("");
  const [saludo, setSaludo] = useState("");
  const [caja, setCaja] = useState<any>(null);
  const [mostrarModalCaja, setMostrarModalCaja] = useState(false);
  const [montoInicial, setMontoInicial] = useState("");
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [ventasCaja, setVentasCaja] = useState<any[]>([]);
  const [resumenPagos, setResumenPagos] = useState({
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
    total: 0,
    cantidad: 0
  });
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date>(new Date());
  const [actualizando, setActualizando] = useState(false);
  const [productosVendidos, setProductosVendidos] = useState<any[]>([]);
  
  // Estados para inventario
  const [inventarioGeneral, setInventarioGeneral] = useState<any>(null);
  const [inventarioUbicaciones, setInventarioUbicaciones] = useState<any[]>([]);
  const [todosLosProductos, setTodosLosProductos] = useState<any[]>([]);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Función para formatear precios
  const formatPrecio = (valor: number | string | undefined): string => {
    if (valor === undefined || valor === null) return '0.00';
    const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
    return isNaN(numero) ? '0.00' : numero.toFixed(2);
  };

  // Función para cargar inventario completo
  const cargarInventarioCompleto = useCallback(async () => {
    if (!sucursalActiva) return;

    try {
      // Cargar resumen de inventario
      const resResumen = await fetch(`/api/inventario/resumen?sucursal_id=${sucursalActiva}`);
      if (resResumen.ok) {
        const data = await resResumen.json();
        setInventarioGeneral(data.general);
        setInventarioUbicaciones(data.ubicaciones || []);
      }

      // Cargar todos los productos
      const resProductos = await fetch(`/api/inventario/productos?sucursal_id=${sucursalActiva}`);
      if (resProductos.ok) {
        const data = await resProductos.json();
        setTodosLosProductos(data);
      }
    } catch (error) {
      console.error("Error cargando inventario:", error);
    }
  }, [sucursalActiva]);

  // Función para cargar ventas de la caja actual
  const cargarVentasCaja = useCallback(async () => {
    if (!sucursalActiva || !caja) return;

    try {
      const res = await fetch(`/api/ventas?sucursal_id=${sucursalActiva}`);
      
      if (res.ok) {
        const data = await res.json();
        
        const ventasFiltradas = data.filter((venta: any) => 
          venta.caja_id === caja.id && 
          venta.estado === 'completada'
        );
        
        setVentasCaja(ventasFiltradas);
        
        const resumen = {
          efectivo: 0,
          tarjeta: 0,
          transferencia: 0,
          total: 0,
          cantidad: ventasFiltradas.length
        };

        // Calcular productos vendidos
        const productos: any[] = [];
        
        ventasFiltradas.forEach((venta: any) => {
          resumen.total += Number(venta.total);
          
          if (venta.pagos && venta.pagos.length > 0) {
            venta.pagos.forEach((pago: any) => {
              const monto = Number(pago.monto);
              if (pago.metodo === 'efectivo') resumen.efectivo += monto;
              else if (pago.metodo === 'tarjeta') resumen.tarjeta += monto;
              else if (pago.metodo === 'transferencia') resumen.transferencia += monto;
            });
          } else {
            const monto = Number(venta.total);
            if (venta.metodo_pago === 'efectivo') resumen.efectivo += monto;
            else if (venta.metodo_pago === 'tarjeta') resumen.tarjeta += monto;
            else if (venta.metodo_pago === 'transferencia') resumen.transferencia += monto;
          }

          // Agregar productos de esta venta
          if (venta.productos && venta.productos.length > 0) {
            venta.productos.forEach((item: any) => {
              productos.push({
                folio: venta.folio,
                fecha: venta.fecha,
                producto: item.producto_nombre,
                etiqueta: item.producto_etiqueta,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                total: item.total,
                metodo_pago: venta.metodo_pago
              });
            });
          }
        });

        setProductosVendidos(productos);
        setResumenPagos(resumen);
      }
    } catch (error) {
      console.error("Error cargando ventas:", error);
    }
  }, [sucursalActiva, caja]);

  // Función para forzar actualización de todos los datos
  const actualizarTodosLosDatos = useCallback(async (mostrarIndicator = false) => {
    if (!sucursalActiva) {
      console.log("No hay sucursal activa para actualizar");
      return;
    }
    
    if (mostrarIndicator) {
      setActualizando(true);
    }
    
    console.log("Actualizando todos los datos para sucursal:", sucursalActiva);
    
    try {
      // Cargar caja, movimientos, ventas e inventario en paralelo
      const [resCaja, resMov, resVentas] = await Promise.all([
        fetch(`/api/caja/activa?sucursal_id=${sucursalActiva}`),
        fetch(`/api/caja/movimientos?sucursal_id=${sucursalActiva}`),
        fetch(`/api/ventas?sucursal_id=${sucursalActiva}`)
      ]);
      
      // Procesar respuesta de caja
      let nuevaCaja = null;
      if (resCaja.ok) {
        nuevaCaja = await resCaja.json();
        setCaja(nuevaCaja);
      } else {
        setCaja(null);
      }
      
      // Procesar respuesta de movimientos
      setCargandoMovimientos(true);
      if (resMov.ok) {
        const dataMov = await resMov.json();
        setMovimientos(dataMov);
      }
      
      // Procesar respuesta de ventas
      if (resVentas.ok && nuevaCaja) {
        const dataVentas = await resVentas.json();
        
        const ventasFiltradas = dataVentas.filter((venta: any) => 
          venta.caja_id === nuevaCaja.id && 
          venta.estado === 'completada'
        );
        
        setVentasCaja(ventasFiltradas);
        
        const resumen = {
          efectivo: 0,
          tarjeta: 0,
          transferencia: 0,
          total: 0,
          cantidad: ventasFiltradas.length
        };

        const productos: any[] = [];

        ventasFiltradas.forEach((venta: any) => {
          resumen.total += Number(venta.total);
          
          if (venta.pagos && venta.pagos.length > 0) {
            venta.pagos.forEach((pago: any) => {
              const monto = Number(pago.monto);
              if (pago.metodo === 'efectivo') resumen.efectivo += monto;
              else if (pago.metodo === 'tarjeta') resumen.tarjeta += monto;
              else if (pago.metodo === 'transferencia') resumen.transferencia += monto;
            });
          } else {
            const monto = Number(venta.total);
            if (venta.metodo_pago === 'efectivo') resumen.efectivo += monto;
            else if (venta.metodo_pago === 'tarjeta') resumen.tarjeta += monto;
            else if (venta.metodo_pago === 'transferencia') resumen.transferencia += monto;
          }

          if (venta.productos && venta.productos.length > 0) {
            venta.productos.forEach((item: any) => {
              productos.push({
                folio: venta.folio,
                fecha: venta.fecha,
                producto: item.producto_nombre,
                etiqueta: item.producto_etiqueta,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                total: item.total,
                metodo_pago: venta.metodo_pago
              });
            });
          }
        });

        setProductosVendidos(productos);
        setResumenPagos(resumen);
      } else {
        setVentasCaja([]);
        setResumenPagos({ efectivo: 0, tarjeta: 0, transferencia: 0, total: 0, cantidad: 0 });
        setProductosVendidos([]);
      }
      
      // Cargar inventario
      await cargarInventarioCompleto();
      
      setUltimaActualizacion(new Date());
    } catch (error) {
      console.error("Error actualizando datos:", error);
    } finally {
      setCargandoMovimientos(false);
      if (mostrarIndicator) {
        setActualizando(false);
      }
    }
  }, [sucursalActiva, cargarInventarioCompleto]);

  // Iniciar polling periódico
  const iniciarPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Actualizar cada 30 segundos
    pollingIntervalRef.current = setInterval(() => {
      if (mountedRef.current && sucursalActiva) {
        actualizarTodosLosDatos(false);
      }
    }, 30000);
    
    console.log("Polling iniciado - actualizando cada 30 segundos");
  }, [sucursalActiva, actualizarTodosLosDatos]);

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
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) setSaludo("Buenos días");
    else if (hora >= 12 && hora < 19) setSaludo("Buenas tardes");
    else setSaludo("Buenas noches");

    const user = sessionStorage.getItem("usuario");
    if (!user) {
      router.push("/login");
      return;
    }

    const parsed = JSON.parse(user);
    setUsuario(parsed);
    
    cargarSucursales(parsed);
    
  }, [router]);

  useEffect(() => {
    if (!usuario) return;

    if (usuario.rol === "empleado") {
      if (usuario.sucursal_id) {
        setSucursalActiva(usuario.sucursal_id.toString());
      }
      if (usuario.sucursal_nombre) {
        setSucursalNombre(usuario.sucursal_nombre);
      } else if (usuario.sucursal_id) {
        cargarNombreSucursal(usuario.sucursal_id.toString());
      }
    } else if (usuario.rol === "admin") {
      const guardada = sessionStorage.getItem("sucursalActiva");
      if (guardada) {
        setSucursalActiva(guardada);
        const suc = sucursales.find(s => s.id.toString() === guardada);
        if (suc) {
          setSucursalNombre(suc.nombre);
        }
      }
    }
  }, [usuario, sucursales]);

  // Efecto para cargar datos cuando cambia la sucursal activa y iniciar polling
  useEffect(() => {
    if (sucursalActiva) {
      console.log("Sucursal activa cambió a:", sucursalActiva);
      
      // Carga inicial
      actualizarTodosLosDatos(true);
      
      // Iniciar polling
      iniciarPolling();
      
      if (usuario?.rol === "admin") {
        const suc = sucursales.find(s => s.id.toString() === sucursalActiva);
        if (suc) {
          setSucursalNombre(suc.nombre);
          sessionStorage.setItem("sucursalActiva", sucursalActiva);
        }
      }
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [sucursalActiva, usuario?.rol, sucursales, actualizarTodosLosDatos, iniciarPolling]);

  const cargarNombreSucursal = async (id: string) => {
    try {
      const res = await fetch(`/api/sucursales/${id}`);
      const data = await res.json();
      setSucursalNombre(data.nombre);
      const user = sessionStorage.getItem("usuario");
      if (user) {
        const parsed = JSON.parse(user);
        parsed.sucursal_nombre = data.nombre;
        sessionStorage.setItem("usuario", JSON.stringify(parsed));
      }
    } catch (error) {
      console.error("Error cargando nombre de sucursal:", error);
    }
  };

  const cargarSucursales = async (userData?: any) => {
    try {
      const res = await fetch("/api/sucursales");
      const data = await res.json();
      setSucursales(data);
      
      if (userData?.rol === "admin") {
        const guardada = sessionStorage.getItem("sucursalActiva");
        if (guardada) {
          const existe = data.some((s: any) => s.id.toString() === guardada);
          if (existe) {
            setSucursalActiva(guardada);
            const suc = data.find((s: any) => s.id.toString() === guardada);
            if (suc) {
              setSucursalNombre(suc.nombre);
            }
          } else if (data.length > 0) {
            setSucursalActiva(data[0].id.toString());
            setSucursalNombre(data[0].nombre);
            sessionStorage.setItem("sucursalActiva", data[0].id.toString());
          }
        } else if (data.length > 0) {
          setSucursalActiva(data[0].id.toString());
          setSucursalNombre(data[0].nombre);
          sessionStorage.setItem("sucursalActiva", data[0].id.toString());
        }
      }
    } catch (error) {
      console.error("Error cargando sucursales:", error);
    }
  };

  const cambiarSucursal = (e: any) => {
    const nueva = e.target.value;
    setSucursalActiva(nueva);
    sessionStorage.setItem("sucursalActiva", nueva);
  };

  const abrirCaja = async () => {
    if (!montoInicial || Number(montoInicial) < 0) {
      return Swal.fire({ 
        icon: 'error', 
        title: 'Monto inválido', 
        text: 'Ingresa un monto válido',
        confirmButtonColor: '#000' 
      });
    }

    if (!sucursalActiva) {
      return Swal.fire({ 
        icon: 'error', 
        title: 'Error', 
        text: 'No hay sucursal seleccionada',
        confirmButtonColor: '#000' 
      });
    }

    try {
      const res = await fetch("/api/caja/abrir", {  
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sucursal_id: parseInt(sucursalActiva), 
          monto_inicial: Number(montoInicial),
          usuario_id: usuario.id,
          usuario_nombre: usuario.nombre
        }),
      });

      if (res.ok) {
        setMostrarModalCaja(false);
        setMontoInicial("");
        
        await actualizarTodosLosDatos(true);
        
        Swal.fire({ 
          icon: 'success', 
          title: 'Caja abierta', 
          timer: 1500, 
          showConfirmButton: false 
        });
      } else {
        const error = await res.json();
        Swal.fire({ 
          icon: 'error', 
          title: 'Error', 
          text: error.error || 'Error al abrir caja',
          confirmButtonColor: '#000' 
        });
      }
    } catch (error) { 
      console.error(error); 
      Swal.fire({ 
        icon: 'error', 
        title: 'Error', 
        text: 'Error de conexión',
        confirmButtonColor: '#000' 
      });
    }
  };

  // Función para exportar corte completo con inventario
  const exportarCorteCompleto = () => {
    const wb = XLSX.utils.book_new();
    const fecha = new Date();
    const fechaStr = fecha.toLocaleDateString('es-MX');
    const horaStr = fecha.toLocaleTimeString('es-MX');
    
    // ===========================================
    // HOJA 1: RESUMEN DE CAJA
    // ===========================================
    const resumenData = [
      ['CORTE DE CAJA - BLACKS BOUTIQUE'],
      [],
      ['Información General'],
      ['Fecha', fechaStr],
      ['Hora', horaStr],
      ['Sucursal', sucursalNombre],
      ['Cajero', usuario.nombre],
      [],
      ['RESUMEN DE VENTAS'],
      ['Método', 'Monto', 'Transacciones'],
      ['Efectivo', `$${formatPrecio(resumenPagos.efectivo)}`, ''],
      ['Tarjeta', `$${formatPrecio(resumenPagos.tarjeta)}`, ''],
      ['Transferencia', `$${formatPrecio(resumenPagos.transferencia)}`, ''],
      ['TOTAL', `$${formatPrecio(resumenPagos.total)}`, resumenPagos.cantidad],
      [],
      ['RESUMEN DE CAJA'],
      ['Concepto', 'Monto'],
      ['Monto inicial', `$${formatPrecio(caja?.monto_inicial || 0)}`],
      ['Ventas totales', `+$${formatPrecio(resumenPagos.total)}`],
      ['Monto final esperado', `$${formatPrecio((caja?.monto_inicial || 0) + resumenPagos.total)}`],
      ['Monto final real', `$${formatPrecio(caja?.monto_actual || 0)}`],
      ['Diferencia', `$${formatPrecio((caja?.monto_actual || 0) - ((caja?.monto_inicial || 0) + resumenPagos.total))}`],
      [],
      ['ESTADÍSTICAS'],
      ['Total de ventas', resumenPagos.cantidad],
      ['Total productos vendidos', productosVendidos.reduce((sum, p) => sum + p.cantidad, 0)]
    ];
    
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, "Corte de Caja");

    // ===========================================
    // HOJA 2: PRODUCTOS VENDIDOS
    // ===========================================
    if (productosVendidos.length > 0) {
      const productosData = [
        ['FOLIO', 'FECHA', 'HORA', 'PRODUCTO', 'ETIQUETA', 'CANTIDAD', 'P. UNITARIO', 'TOTAL', 'M. PAGO'],
        ...productosVendidos.map(p => {
          const fechaVenta = new Date(p.fecha);
          return [
            p.folio,
            fechaVenta.toLocaleDateString('es-MX'),
            fechaVenta.toLocaleTimeString('es-MX'),
            p.producto,
            p.etiqueta,
            p.cantidad,
            `$${formatPrecio(p.precio_unitario)}`,
            `$${formatPrecio(p.total)}`,
            p.metodo_pago
          ];
        })
      ];
      
      const wsProductos = XLSX.utils.aoa_to_sheet(productosData);
      
      // Ajustar ancho de columnas
      wsProductos['!cols'] = [
        { wch: 15 }, // FOLIO
        { wch: 12 }, // FECHA
        { wch: 10 }, // HORA
        { wch: 30 }, // PRODUCTO
        { wch: 15 }, // ETIQUETA
        { wch: 10 }, // CANTIDAD
        { wch: 15 }, // P. UNITARIO
        { wch: 15 }, // TOTAL
        { wch: 15 }  // M. PAGO
      ];
      
      XLSX.utils.book_append_sheet(wb, wsProductos, "Productos Vendidos");
    }

    // ===========================================
    // HOJA 3: INVENTARIO COMPLETO
    // ===========================================
    if (todosLosProductos.length > 0) {
      const inventarioData = [
        ['INVENTARIO COMPLETO'],
        [`Generado: ${fechaStr} ${horaStr}`],
        [],
        ['CÓDIGO', 'PRODUCTO', 'COLOR', 'TALLA', 'PRECIO', 'STOCK', 'UBICACIÓN', 'VENDIDOS'],
        ...todosLosProductos.map(p => [
          p.etiqueta,
          p.nombre,
          p.color || '-',
          p.talla || '-',
          `$${formatPrecio(p.precio)}`,
          p.stock,
          p.ubicacion || 'Sin ubicación',
          p.total_vendido || 0
        ])
      ];
      
      const wsInventario = XLSX.utils.aoa_to_sheet(inventarioData);
      
      wsInventario['!cols'] = [
        { wch: 15 }, // CÓDIGO
        { wch: 30 }, // PRODUCTO
        { wch: 15 }, // COLOR
        { wch: 10 }, // TALLA
        { wch: 12 }, // PRECIO
        { wch: 10 }, // STOCK
        { wch: 20 }, // UBICACIÓN
        { wch: 10 }  // VENDIDOS
      ];
      
      XLSX.utils.book_append_sheet(wb, wsInventario, "Inventario");
    }

    // ===========================================
    // HOJA 4: RESUMEN POR UBICACIÓN
    // ===========================================
    if (inventarioUbicaciones.length > 0) {
      const ubicacionesData = [
        ['RESUMEN POR UBICACIÓN'],
        [],
        ['UBICACIÓN', 'PRODUCTOS', 'PIEZAS', 'VALOR TOTAL', 'STOCK BAJO', 'AGOTADOS'],
        ...inventarioUbicaciones.map(u => [
          u.ubicacion,
          u.total_productos,
          u.total_piezas,
          `$${formatPrecio(u.valor_total)}`,
          u.stock_bajo,
          u.agotados
        ])
      ];
      
      if (inventarioGeneral) {
        ubicacionesData.push(
          [],
          ['TOTALES GENERALES'],
          ['Total productos', inventarioGeneral.total_productos],
          ['Total piezas', inventarioGeneral.total_piezas],
          ['Valor total', `$${formatPrecio(inventarioGeneral.valor_total_inventario)}`],
          ['Stock bajo', inventarioGeneral.productos_stock_bajo],
          ['Agotados', inventarioGeneral.productos_agotados]
        );
      }
      
      const wsUbicaciones = XLSX.utils.aoa_to_sheet(ubicacionesData);
      XLSX.utils.book_append_sheet(wb, wsUbicaciones, "Ubicaciones");
    }

    // ===========================================
    // HOJA 5: MOVIMIENTOS DE CAJA
    // ===========================================
    if (movimientos.length > 0) {
      const movimientosData = [
        ['MOVIMIENTOS DE CAJA'],
        [],
        ['TIPO', 'MONTO ANTERIOR', 'MONTO NUEVO', 'RAZÓN', 'USUARIO', 'FECHA'],
        ...movimientos.map(m => [
          m.tipo === 'APERTURA' ? 'APERTURA' : 'EDICIÓN',
          m.monto_anterior ? `$${formatPrecio(m.monto_anterior)}` : '-',
          `$${formatPrecio(m.monto_nuevo || m.monto)}`,
          m.razon || '-',
          m.usuario_nombre || 'Sistema',
          new Date(m.created_at).toLocaleString('es-MX')
        ])
      ];
      
      const wsMovimientos = XLSX.utils.aoa_to_sheet(movimientosData);
      XLSX.utils.book_append_sheet(wb, wsMovimientos, "Movimientos Caja");
    }

    // Exportar archivo
    const nombreArchivo = `corte_completo_${sucursalNombre}_${fechaStr.replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  };

  const cerrarCaja = async () => {
    if (!caja) return;

    // Mostrar resumen antes de cerrar
    const totalProductos = productosVendidos.reduce((sum, p) => sum + p.cantidad, 0);
    const diferencia = (caja.monto_actual || 0) - ((caja.monto_inicial || 0) + resumenPagos.total);
    
    const { value: aceptar } = await Swal.fire({
      title: '📋 CORTE DE CAJA COMPLETO',
      html: `
        <div class="text-left space-y-4 max-h-[70vh] overflow-y-auto p-2">
          <div class="bg-gray-100 p-4 rounded-lg">
            <h3 class="font-bold text-lg mb-2 flex items-center gap-2">
              <DollarSign size={18} />
              Resumen de ventas
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span>💰 Efectivo:</span>
                <span class="font-bold">$${formatPrecio(resumenPagos.efectivo)}</span>
              </div>
              <div class="flex justify-between">
                <span>💳 Tarjeta:</span>
                <span class="font-bold">$${formatPrecio(resumenPagos.tarjeta)}</span>
              </div>
              <div class="flex justify-between">
                <span>🏦 Transferencia:</span>
                <span class="font-bold">$${formatPrecio(resumenPagos.transferencia)}</span>
              </div>
              <div class="flex justify-between pt-2 border-t font-bold">
                <span>TOTAL:</span>
                <span>$${formatPrecio(resumenPagos.total)}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span>Ventas realizadas:</span>
                <span>${resumenPagos.cantidad}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span>Productos vendidos:</span>
                <span>${totalProductos}</span>
              </div>
            </div>
          </div>
          
          <div class="bg-gray-100 p-4 rounded-lg">
            <h3 class="font-bold text-lg mb-2">💰 Estado de caja</h3>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span>Monto inicial:</span>
                <span>$${formatPrecio(caja.monto_inicial)}</span>
              </div>
              <div class="flex justify-between">
                <span>Ventas:</span>
                <span class="text-green-600">+$${formatPrecio(resumenPagos.total)}</span>
              </div>
              <div class="flex justify-between pt-2 border-t">
                <span class="font-bold">Esperado:</span>
                <span class="font-bold">$${formatPrecio(caja.monto_inicial + resumenPagos.total)}</span>
              </div>
              <div class="flex justify-between">
                <span class="font-bold">Real:</span>
                <span class="font-bold text-blue-600">$${formatPrecio(caja.monto_actual)}</span>
              </div>
              <div class="flex justify-between pt-2 border-t">
                <span class="font-bold">Diferencia:</span>
                <span class="font-bold ${diferencia === 0 ? 'text-green-600' : diferencia > 0 ? 'text-green-600' : 'text-red-600'}">
                  $${formatPrecio(diferencia)}
                </span>
              </div>
            </div>
          </div>

          <div class="bg-gray-100 p-4 rounded-lg">
            <h3 class="font-bold text-lg mb-2">📦 Inventario</h3>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span>Total productos:</span>
                <span>${inventarioGeneral?.total_productos || 0}</span>
              </div>
              <div class="flex justify-between">
                <span>Total piezas:</span>
                <span>${inventarioGeneral?.total_piezas || 0}</span>
              </div>
              <div class="flex justify-between">
                <span>Valor inventario:</span>
                <span>$${formatPrecio(inventarioGeneral?.valor_total_inventario || 0)}</span>
              </div>
              <div class="flex justify-between">
                <span>Stock bajo:</span>
                <span class="text-yellow-600">${inventarioGeneral?.productos_stock_bajo || 0}</span>
              </div>
              <div class="flex justify-between">
                <span>Agotados:</span>
                <span class="text-red-600">${inventarioGeneral?.productos_agotados || 0}</span>
              </div>
            </div>
          </div>

          <div class="flex gap-2 justify-center mt-4">
            <button id="exportar-btn" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
              <FileSpreadsheet size={16} />
              Exportar corte completo
            </button>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Cerrar caja',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#000',
      cancelButtonColor: '#6b7280',
      width: '800px',
      didOpen: () => {
        const exportBtn = document.getElementById('exportar-btn');
        if (exportBtn) {
          exportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            exportarCorteCompleto();
          });
        }
      },
      preConfirm: async () => {
        try {
          const res = await fetch("/api/caja/cerrar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ caja_id: caja.id })
          });

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Error al cerrar caja');
          }
          return true;
        } catch (error: any) {
          Swal.showValidationMessage(error.message);
          return false;
        }
      }
    });

    if (aceptar) {
      await actualizarTodosLosDatos(true);
      
      const { value: exportar } = await Swal.fire({
        title: '✅ Caja cerrada',
        html: `
          <p>¿Quieres exportar el corte completo con inventario?</p>
          <p class="text-sm text-gray-600 mt-2">El archivo incluirá:</p>
          <ul class="text-sm text-left mt-2 space-y-1 list-disc pl-5">
            <li>Corte de caja detallado</li>
            <li>Productos vendidos</li>
            <li>Inventario completo</li>
            <li>Resumen por ubicaciones</li>
            <li>Movimientos de caja</li>
          </ul>
        `,
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Sí, exportar',
        cancelButtonText: 'No',
        confirmButtonColor: '#059669',
        cancelButtonColor: '#6b7280'
      });

      if (exportar) {
        exportarCorteCompleto();
      }
    }
  };

  const editarMontoInicial = async () => {
    if (!caja) return;

    const { value: formValues } = await Swal.fire({
      title: 'Editar apertura',
      html: `
        <div class="space-y-5 py-2">
          <div class="text-left">
            <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              <span class="inline-block w-1 h-3 bg-black mr-2 align-middle"></span>
              Nuevo monto
            </label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-medium">$</span>
              <input 
                id="monto-input" 
                type="number" 
                step="0.01" 
                min="0" 
                value="${caja.monto_inicial}" 
                placeholder="0.00"
                class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-lg font-medium focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors"
              >
            </div>
          </div>

          <div class="text-left">
            <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              <span class="inline-block w-1 h-3 bg-black mr-2 align-middle"></span>
              Razón
            </label>
            <textarea 
              id="razon-input" 
              rows="3"
              placeholder="Ej: Error en apertura, ajuste manual..."
              class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm resize-none focus:outline-none focus:border-gray-400 focus:ring-0 transition-colors"
            ></textarea>
            <p class="text-xs text-gray-400 mt-2 text-right">Este cambio quedará registrado</p>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#000000',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      preConfirm: () => {
        const monto = (document.getElementById('monto-input') as HTMLInputElement)?.value;
        const razon = (document.getElementById('razon-input') as HTMLTextAreaElement)?.value;
        
        if (!monto || Number(monto) < 0) {
          Swal.showValidationMessage('Ingresa un monto válido');
          return false;
        }
        
        if (!razon || razon.trim() === '') {
          Swal.showValidationMessage('Ingresa una razón');
          return false;
        }
        
        return { monto: Number(monto), razon: razon.trim() };
      }
    });

    if (formValues) {
      try {
        Swal.fire({
          title: 'Actualizando...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const res = await fetch("/api/caja/editar-inicial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            caja_id: caja.id,
            monto_inicial: formValues.monto,
            razon: formValues.razon,
            usuario_id: usuario.id,
            usuario_nombre: usuario.nombre
          }),
        });

        if (res.ok) {
          await actualizarTodosLosDatos(true);
          
          Swal.fire({
            icon: 'success',
            title: 'Actualizado',
            text: 'Monto inicial modificado',
            timer: 1500,
            showConfirmButton: false
          });
        } else {
          const error = await res.json();
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.error || 'Error al editar',
            confirmButtonColor: '#000'
          });
        }
      } catch (error) {
        console.error(error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error de conexión',
          confirmButtonColor: '#000'
        });
      }
    }
  };

  const eliminarMovimiento = async (movimientoId: number) => {
    if (!usuario || usuario.rol !== 'admin') return;

    const result = await Swal.fire({
      title: '¿Eliminar movimiento?',
      text: 'Esta acción eliminará permanentemente este movimiento del historial.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
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

        const res = await fetch("/api/caja/movimientos/eliminar", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            movimiento_id: movimientoId
          }),
        });

        if (res.ok) {
          await actualizarTodosLosDatos(true);
          
          Swal.fire({
            icon: 'success',
            title: 'Eliminado',
            text: 'El movimiento ha sido eliminado',
            timer: 1500,
            showConfirmButton: false
          });
        } else {
          const data = await res.json();
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: data.error || 'No se pudo eliminar el movimiento',
            confirmButtonColor: '#000'
          });
        }
      } catch (error) {
        console.error("Error al eliminar:", error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error de conexión',
          confirmButtonColor: '#000'
        });
      }
    }
  };

  const recargarManualmente = () => {
    actualizarTodosLosDatos(true);
    Swal.fire({
      icon: 'success',
      title: 'Actualizado',
      text: 'Datos recargados manualmente',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const handleLogout = () => {
    if (caja) {
      return Swal.fire({ 
        icon: 'error', 
        title: 'Caja activa', 
        text: 'Debes cerrar la caja antes de salir.',
        confirmButtonColor: '#000' 
      });
    }
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");
    router.push("/login");
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHoras < 24) return `Hace ${diffHoras} h`;
    if (diffDias < 30) return `Hace ${diffDias} d`;
    return date.toLocaleDateString();
  };

  if (!usuario) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar usuario={usuario} onLogout={handleLogout} />

      <main className="lg:ml-20 min-h-screen transition-all duration-300">
        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
          {/* Indicador de actualización en tiempo real */}
          <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
            {actualizando && (
              <div className="bg-blue-100 border border-blue-200 text-blue-800 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
                <RefreshCw size={16} className="animate-spin" />
                <span className="text-sm">Actualizando...</span>
              </div>
            )}
          </div>

          {/* Saludo con botón de recarga manual */}
          <section className="mb-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl lg:text-3xl font-light text-gray-900">
                {saludo}, <span className="font-medium">{usuario.nombre.split(' ')[0]}</span>
              </h2>
              
              <button
                onClick={recargarManualmente}
                className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                title="Recargar manualmente"
              >
                <RefreshCw size={18} className="text-gray-600" />
              </button>
            </div>
            
            <div className="flex items-center gap-2 text-gray-500 mt-3 bg-white w-fit px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
              <MapPin size={14} className="text-gray-900" />
              
              {usuario?.rol === "admin" ? (
                <select
                  className="bg-transparent text-xs font-medium uppercase tracking-wider outline-none cursor-pointer text-gray-900"
                  value={sucursalActiva}
                  onChange={cambiarSucursal}
                >
                  {sucursales.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs font-medium uppercase tracking-wider text-gray-900">
                  {sucursalNombre || "Cargando..."}
                </p>
              )}
            </div>
          </section>

          {/* Sección Caja */}
          <section className="mb-8">
            {caja ? (
              <>
                {/* Fila principal de caja */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-4">
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-3 pr-4 border-r border-gray-100">
                      <div className="relative">
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping opacity-75" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-400 uppercase">Caja</span>
                        <span className="text-xs font-bold text-emerald-600 block">Activa</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl">
                      <div>
                        <span className="text-xs font-medium text-gray-400">Inicial</span>
                        <span className="text-sm font-bold text-gray-900 block">
                          ${Number(caja?.monto_inicial || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button 
                        onClick={editarMontoInicial}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                      >
                        <Pencil size={14} className="text-gray-400" />
                      </button>
                    </div>

                    <div>
                      <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                        <ShoppingCart size={12} /> Ventas
                      </span>
                      <span className="text-sm font-bold text-emerald-600">
                        +${formatPrecio(resumenPagos.total)}
                      </span>
                    </div>

                    <div className="flex-1 flex items-center justify-end gap-4 ml-auto border-l border-gray-100 pl-4">
                      <div className="text-right">
                        <span className="text-xs font-medium text-gray-400 block">Balance</span>
                        <span className="text-2xl font-light text-gray-900">
                          ${Number(caja?.monto_actual || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button 
                        onClick={cerrarCaja}
                        className="p-3 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-colors"
                      >
                        <LogOut size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Resumen de pagos por método */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-600 mb-1">
                      <Wallet size={16} />
                      <span className="text-xs font-medium uppercase">Efectivo</span>
                    </div>
                    <div className="text-xl font-bold text-green-700">
                      ${formatPrecio(resumenPagos.efectivo)}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                      <CreditCard size={16} />
                      <span className="text-xs font-medium uppercase">Tarjeta</span>
                    </div>
                    <div className="text-xl font-bold text-blue-700">
                      ${formatPrecio(resumenPagos.tarjeta)}
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-purple-600 mb-1">
                      <Landmark size={16} />
                      <span className="text-xs font-medium uppercase">Transferencia</span>
                    </div>
                    <div className="text-xl font-bold text-purple-700">
                      ${formatPrecio(resumenPagos.transferencia)}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <button 
                onClick={() => setMostrarModalCaja(true)}
                className="w-full flex items-center justify-center gap-3 px-6 py-12 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:text-gray-900 hover:border-gray-400 transition-all"
              >
                <PlusCircle size={24} />
                <span className="text-sm font-medium">Abrir caja</span>
              </button>
            )}
          </section>

          {/* Sección de Movimientos */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-gray-900"></div>
              <h2 className="text-xl font-light text-gray-900">Movimientos de caja</h2>
              {cargandoMovimientos && (
                <div className="ml-2">
                  <Clock size={16} className="text-gray-400 animate-spin" />
                </div>
              )}
            </div>
            
            <p className="text-gray-400 mb-6">
              Historial de aperturas y ediciones
            </p>

            {movimientos.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clock size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-400 text-sm">No hay movimientos registrados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {movimientos.map((mov, index) => (
                  <div 
                    key={mov.id || index} 
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors relative"
                  >
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                      ${mov.tipo === 'APERTURA' ? 'bg-green-100' : 'bg-blue-100'}
                    `}>
                      {mov.tipo === 'APERTURA' ? (
                        <ArrowUpRight size={16} className="text-green-600" />
                      ) : (
                        <Pencil size={16} className="text-blue-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {mov.tipo === 'APERTURA' ? 'Apertura de caja' : 'Edición de apertura'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatFecha(mov.created_at)}
                        </span>
                      </div>
                      
                      {mov.razon && (
                        <p className="text-xs text-gray-500 mb-2">
                          <span className="font-medium">Razón:</span> {mov.razon}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-3 text-xs">
                        {mov.monto_anterior !== null && (
                          <>
                            <span className="text-gray-500 line-through">
                              ${Number(mov.monto_anterior).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-gray-300">→</span>
                          </>
                        )}
                        <span className="text-gray-900 font-medium">
                          ${Number(mov.monto_nuevo || mov.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">Por:</span>
                        <span className="text-xs font-medium text-gray-700">
                          {mov.usuario_nombre || 'Sistema'}
                        </span>
                      </div>
                    </div>

                    {usuario?.rol === 'admin' && (
                      <button
                        onClick={() => eliminarMovimiento(mov.id)}
                        className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-red-600 hover:bg-red-50 transition-all ml-2 flex-shrink-0"
                        title="Eliminar movimiento"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal apertura */}
      {mostrarModalCaja && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-sm relative">
            <button 
              onClick={() => setMostrarModalCaja(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"
            >
              <X size={18} />
            </button>
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
              <DollarSign size={24} className="text-gray-900" />
            </div>
            <h2 className="text-lg font-light mb-4 text-center">Nueva apertura</h2>
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input 
                type="number" 
                placeholder="0.00" 
                value={montoInicial} 
                onChange={(e) => setMontoInicial(e.target.value)} 
                className="w-full bg-gray-50 border border-gray-200 p-3 pl-7 rounded-xl text-lg outline-none focus:border-gray-400" 
              />
            </div>
            <button 
              onClick={abrirCaja} 
              className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Abrir turno
            </button>
          </div>
        </div>
      )}
    </div>
  );
}