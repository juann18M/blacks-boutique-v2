"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  ArrowLeftRight,
  Settings,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  Bot,
  LogOut,
  Menu,
  X,
  Store,
  User
} from "lucide-react";

interface SidebarProps {
  usuario: any;
  onLogout: () => void;
}

export default function Sidebar({ usuario, onLogout }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const menuItems = [
    { icon: Home, label: 'Inicio', path: '/dashboard', roles: ['admin', 'empleado'] },
     { icon: Package, label: 'Productos', path: '/productos', roles: ['admin', 'empleado'] },
    { icon: ShoppingCart, label: 'Ventas', path: '/ventas', roles: ['admin', 'empleado'] },
    { icon: ShoppingBag, label: 'Inventario', path: '/inventario', roles: ['admin', 'empleado'] },
    { icon: ArrowLeftRight, label: 'Traslados', path: '/traslados', roles: ['admin', 'empleado'] },
    { icon: CreditCard, label: 'Apartados', path: '/apartados', roles: ['admin', 'empleado'] },
    { icon: Bot, label: 'Asistente', path: '/asistente', roles: ['admin', 'empleado'] }
    
  ];

  // Filtrar menú según el rol del usuario
  const filteredMenu = menuItems.filter(item => 
    item.roles.includes(usuario?.rol)
  );

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Botón móvil */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-gray-200 rounded-xl shadow-sm"
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay para móvil */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen bg-white border-r border-gray-200
        transition-all duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isOpen ? 'w-64' : 'w-20'}
        lg:block
      `}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-100">
          <div className={`flex items-center ${isOpen ? 'gap-2' : 'justify-center'}`}>
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Store size={18} className="text-white" />
            </div>
            {isOpen && (
              <span className="text-sm font-black tracking-wider">BLACKS</span>
            )}
          </div>
        </div>

        {/* Perfil usuario */}
        <div className="p-4 border-b border-gray-100">
          <div className={`flex items-center ${isOpen ? 'gap-3' : 'justify-center'}`}>
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <User size={20} className="text-gray-600" />
            </div>
            {isOpen && (
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{usuario?.nombre}</p>
                <p className="text-xs text-gray-500 capitalize">{usuario?.rol}</p>
              </div>
            )}
          </div>
        </div>

        {/* Menú */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
          {filteredMenu.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                  transition-all duration-200 group
                  ${isActive 
                    ? 'bg-black text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                  ${!isOpen && 'justify-center'}
                `}
                title={!isOpen ? item.label : undefined}
              >
                <Icon size={20} className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'} />
                {isOpen && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Cerrar sesión */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-100 bg-white">
          <button
            onClick={onLogout}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              text-gray-600 hover:bg-red-50 hover:text-red-600
              transition-all duration-200
              ${!isOpen && 'justify-center'}
            `}
            title={!isOpen ? "Cerrar sesión" : undefined}
          >
            <LogOut size={20} />
            {isOpen && (
              <span className="text-sm font-medium">Cerrar sesión</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}