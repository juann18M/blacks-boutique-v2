"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Send,
  Package,
  MapPin,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  CalendarClock,
  X,
  Loader2,
  User,
  Phone,
  Mail,
  MapPinned,
  Search,
  Filter,
  Sparkles,
  MessageCircle,
  Store
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";

interface Mensaje {
  id: number;
  tipo: 'usuario' | 'asistente';
  contenido: any;
  timestamp: Date;
}

export default function AsistentePage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [sucursalActiva, setSucursalActiva] = useState("");
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: 1,
      tipo: 'asistente',
      contenido: {
        tipo: 'texto',
        mensaje: `🤖 *Asistente Virtual*

Puedo buscar productos en tu inventario REAL. Por ejemplo:

• "busca playeras negras"
• "camisas rojas talla M"
• "chamarras"
• "#MWN32NEK"
• "productos con poco stock"

*¿Qué quieres buscar?*`
      },
      timestamp: new Date()
    }
  ]);
  const [mensajeActual, setMensajeActual] = useState("");
  const [cargando, setCargando] = useState(false);
  const [animando, setAnimando] = useState(false);
  const mensajesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const user = sessionStorage.getItem("usuario");
    if (!user) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(user);
    setUsuario(parsed);

    if (parsed.rol === "admin") {
      const guardada = sessionStorage.getItem("sucursalActiva");
      if (guardada) setSucursalActiva(guardada);
    } else {
      setSucursalActiva(parsed.sucursal_id.toString());
    }
  }, [router]);

  useEffect(() => {
    scrollToBottom();
  }, [mensajes]);

  const scrollToBottom = () => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const enviarMensaje = async () => {
    if (!mensajeActual.trim() || !sucursalActiva) return;

    const nuevoMensaje: Mensaje = {
      id: mensajes.length + 1,
      tipo: 'usuario',
      contenido: { tipo: 'texto', mensaje: mensajeActual },
      timestamp: new Date()
    };

    setMensajes(prev => [...prev, nuevoMensaje]);
    setMensajeActual("");
    setCargando(true);
    setAnimando(true);

    // Autoajustar altura del textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const res = await fetch('/api/asistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: mensajeActual,
          sucursal_id: parseInt(sucursalActiva),
          usuario_id: usuario.id
        })
      });

      const data = await res.json();

      setTimeout(() => {
        setMensajes(prev => [...prev, {
          id: prev.length + 1,
          tipo: 'asistente',
          contenido: data,
          timestamp: new Date()
        }]);
        setAnimando(false);
      }, 500);

    } catch (error) {
      console.error('Error:', error);
      setTimeout(() => {
        setMensajes(prev => [...prev, {
          id: prev.length + 1,
          tipo: 'asistente',
          contenido: {
            tipo: 'texto',
            mensaje: '❌ Lo siento, hubo un error al procesar tu consulta'
          },
          timestamp: new Date()
        }]);
        setAnimando(false);
      }, 500);
    } finally {
      setCargando(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMensajeActual(e.target.value);
    // Autoajustar altura
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const formatPrecio = (valor: number) => {
    return valor.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderMensaje = (mensaje: Mensaje) => {
    if (mensaje.tipo === 'usuario') {
      return (
        <div className="flex justify-end mb-4 animate-slideLeft">
          <div className="bg-black text-white rounded-2xl rounded-br-none px-4 py-2 max-w-[80%] shadow-md hover:shadow-lg transition-shadow">
            <p className="text-sm whitespace-pre-wrap">{mensaje.contenido.mensaje}</p>
            <p className="text-xs text-gray-300 mt-1">
              {mensaje.timestamp.toLocaleTimeString()}
            </p>
          </div>
        </div>
      );
    }

    const contenido = mensaje.contenido;

    switch (contenido.tipo) {
      case 'texto':
        return (
          <div className="flex mb-4 animate-slideRight">
            <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-2 max-w-[80%] shadow-sm hover:shadow-md transition-shadow">
              <p className="text-sm text-black whitespace-pre-line">{contenido.mensaje}</p>
              <p className="text-xs text-black mt-1">
                {mensaje.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        );

      case 'producto_unico':
        const p = contenido.producto;
        return (
          <div className="flex mb-4 animate-scaleIn">
            <div className="bg-gray-100 rounded-2xl rounded-bl-none p-4 max-w-[95%] shadow-sm">
              <h3 className="font-medium text-black mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-black" />
                Producto encontrado
              </h3>
              <div className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Imagen con efecto hover */}
                  <div className="w-32 h-32 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 mx-auto sm:mx-0 group">
                    {p.imagen ? (
                      <img
                        src={p.imagen}
                        alt={p.nombre}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <Package size={40} className="text-black" />
                      </div>
                    )}
                  </div>
                  
                  {/* Información */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-black text-lg">{p.nombre}</h4>
                        <p className="text-xs text-black">#{p.etiqueta}</p>
                      </div>
                      <span className="text-xl font-bold text-black bg-gray-100 px-3 py-1 rounded-lg">
                        ${formatPrecio(p.precio)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <p className="text-xs text-black">Talla</p>
                        <p className="font-medium text-black">{p.talla || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <p className="text-xs text-black">Color</p>
                        <p className="font-medium text-black">{p.color || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-black" />
                        <span className="text-sm text-black">{p.ubicacion || 'Sin ubicación'}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        p.stock > 10 ? 'bg-green-100 text-green-800' :
                        p.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {p.stock} disponibles
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2 text-sm text-black">
                      <Store size={14} className="text-black" />
                      <span>{p.sucursal_nombre}</span>
                    </div>
                    
                    {p.descripcion && (
                      <p className="text-sm text-black mt-2 italic border-t border-gray-200 pt-2">
                        "{p.descripcion}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-black mt-3">
                {mensaje.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        );

      case 'lista_productos':
      case 'productos_sucursal':
        return (
          <div className="flex mb-4 animate-slideRight">
            <div className="bg-gray-100 rounded-2xl rounded-bl-none p-4 max-w-[95%] shadow-sm">
              <h3 className="font-medium text-black mb-2">{contenido.titulo}</h3>
              {contenido.subtitulo && (
                <p className="text-sm text-black mb-3">{contenido.subtitulo}</p>
              )}
              <div className="space-y-3">
                {contenido.productos.map((p: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-fadeIn"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Imagen pequeña */}
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
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
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-black">{p.nombre}</p>
                            <p className="text-xs text-black">#{p.etiqueta}</p>
                          </div>
                          <span className="font-bold text-black">${formatPrecio(p.precio)}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          {p.color && p.color !== 'Varios' && (
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-black">
                              {p.color}
                            </span>
                          )}
                          {p.talla && p.talla !== 'Varias' && (
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-black">
                              Talla {p.talla}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            p.stock > 10 ? 'bg-green-100 text-green-800' :
                            p.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {p.stock} uds
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2 text-xs text-black">
                          <MapPin size={12} className="text-black" />
                          <span>{p.ubicacion || 'Sin ubicación'}</span>
                          {p.sucursal && (
                            <>
                              <span className="text-black">•</span>
                              <Store size={12} className="text-black" />
                              <span>{p.sucursal}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-black mt-3">
                {mensaje.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        );

      case 'sin_resultados':
        return (
          <div className="flex mb-4 animate-slideRight">
            <div className="bg-gray-100 rounded-2xl rounded-bl-none p-4 max-w-[95%] shadow-sm">
              <p className="text-sm text-black mb-3">{contenido.mensaje}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {contenido.productos.map((p: any, idx: number) => (
                  <div 
                    key={idx} 
                    className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-md transition-all hover:scale-[1.02] animate-fadeIn"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <p className="font-medium text-sm text-black">{p.nombre}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-black">
                        {p.color || 'Varios'} • Talla {p.talla || 'Varias'}
                      </span>
                      <span className="text-sm font-bold text-black">${formatPrecio(p.precio)}</span>
                    </div>
                    <p className="text-xs text-black mt-1">
                      Stock: {p.stock} • #{p.etiqueta}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-black mt-3">
                {mensaje.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        );

      case 'detalles_sucursal':
        const s = contenido.sucursal;
        return (
          <div className="flex mb-4 animate-scaleIn">
            <div className="bg-gray-100 rounded-2xl rounded-bl-none p-4 max-w-[95%] shadow-sm">
              <h3 className="font-medium text-black mb-3 flex items-center gap-2">
                <Store size={16} className="text-black" />
                {s.nombre}
              </h3>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <p className="text-2xl font-bold text-black">{s.total_productos || 0}</p>
                    <p className="text-xs text-black">Productos</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <p className="text-2xl font-bold text-black">{s.total_piezas || 0}</p>
                    <p className="text-xs text-black">Piezas</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200 hover:shadow-md transition-shadow">
                    <p className="text-2xl font-bold text-yellow-700">{s.stock_bajo || 0}</p>
                    <p className="text-xs text-yellow-700">Stock bajo</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200 hover:shadow-md transition-shadow">
                    <p className="text-2xl font-bold text-red-700">{s.productos_agotados || 0}</p>
                    <p className="text-xs text-red-700">Agotados</p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <p className="text-xl font-bold text-black text-center">
                    ${formatPrecio(s.valor_total || 0)}
                  </p>
                  <p className="text-xs text-black text-center">Valor total</p>
                </div>
              </div>
              <p className="text-xs text-black mt-3">
                {mensaje.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!usuario) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar usuario={usuario} onLogout={() => router.push('/login')} />

      <main className="lg:ml-20 min-h-screen">
        <div className="h-screen flex flex-col">
          {/* Header con animación */}
          <div className="bg-white border-b border-gray-200 p-4 shadow-sm animate-slideDown">
            <div className="flex items-center gap-3 max-w-7xl mx-auto">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-md animate-pulse">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-light text-black flex items-center gap-2">
                  Asistente Virtual
                  {cargando && <Loader2 size={16} className="animate-spin text-black" />}
                </h1>
                <p className="text-xs text-black flex items-center gap-1">
                  <MessageCircle size={12} />
                  Pregúntame sobre productos, stock y más
                </p>
              </div>
            </div>
          </div>

          {/* Área de mensajes */}
          <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-3xl mx-auto">
              {mensajes.map(m => (
                <div key={m.id}>
                  {renderMensaje(m)}
                </div>
              ))}
              {animando && (
                <div className="flex mb-4 animate-slideRight">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={mensajesEndRef} />
            </div>
          </div>

          {/* Input de mensaje con animación */}
          <div className="bg-white border-t border-gray-200 p-4 shadow-lg animate-slideUp">
            <div className="max-w-3xl mx-auto flex gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={mensajeActual}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Escribe tu pregunta..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl resize-none focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-black placeholder-gray-500"
                  rows={1}
                  style={{ minHeight: '52px', maxHeight: '120px' }}
                />
                <button
                  onClick={enviarMensaje}
                  disabled={!mensajeActual.trim() || cargando}
                  className="absolute right-2 bottom-2 p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
            <p className="text-xs text-black text-center mt-2">
              Presiona Enter para enviar • Shift + Enter para nueva línea
            </p>
          </div>
        </div>
      </main>

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
        
        @keyframes slideLeft {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
        
        .animate-slideLeft {
          animation: slideLeft 0.3s ease-out forwards;
        }
        
        .animate-slideRight {
          animation: slideRight 0.3s ease-out forwards;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}