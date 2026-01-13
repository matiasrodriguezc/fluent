"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import axios from "axios";
import { 
  LayoutDashboard, MessageSquare, Database, Settings, LogOut, 
  Clock, ShieldCheck, HardDrive, Server, FolderOpen, Table
} from "lucide-react";
import clsx from "clsx";
import { SOURCES_UPDATED_EVENT } from "@/lib/events"; // Asegúrate de tener este archivo creado

interface Source {
  id: string;
  name: string;
  type: string;
  host: string;
  status: string;
}

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Analyst Chat", href: "/chat", icon: MessageSquare },
  { name: "Data Hub", href: "/sources", icon: Database },
  { name: "Settings", href: "/settings", icon: Settings },
];

const API_URL = "http://localhost:8000";

export function AppSidebar() {
  const pathname = usePathname();
  const [sources, setSources] = useState<Source[]>([]);

  // --- CARGAR FUENTES ---
  const fetchSources = async () => {
    try {
      const res = await axios.get(`${API_URL}/ingest/list`);
      setSources(res.data.connections || []);
    } catch (error) {
      console.error("Error cargando sidebar sources", error);
    }
  };

  useEffect(() => {
    // 1. Carga inicial
    fetchSources();

    // 2. Escuchar evento de actualización (Real-time)
    const handleUpdate = () => fetchSources();
    if (typeof window !== "undefined") {
      window.addEventListener(SOURCES_UPDATED_EVENT, handleUpdate);
    }

    // 3. Limpieza
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(SOURCES_UPDATED_EVENT, handleUpdate);
      }
    };
  }, [pathname]);

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center font-serif font-bold text-xl">F</div>
        <div>
          <h2 className="text-sm font-bold text-gray-900">Fluent AI</h2>
          <p className="text-xs text-gray-500">v1.0.0</p>
        </div>
      </div>

      {/* Navegación Principal */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gray-900 text-white shadow-md shadow-gray-900/10"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className={clsx("w-5 h-5", isActive ? "text-gray-300" : "text-gray-400")} />
              {item.name}
            </Link>
          );
        })}

        {/* --- SECCIÓN CONTEXTO ACTIVO --- */}
        <div className="mt-8 px-2">
            <div className="flex justify-between items-center px-2 mb-3">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Fuentes Conectadas
                </h3>
                <Link href="/sources" className="text-[10px] text-blue-500 hover:underline">
                    Gestionar
                </Link>
            </div>
            
            <div className="space-y-2">
                {sources.length === 0 ? (
                    <div className="p-4 text-center border border-dashed border-gray-200 rounded-lg">
                        <p className="text-[10px] text-gray-400">Sin fuentes activas</p>
                    </div>
                ) : (
                    sources.map((src, idx) => {
                        // Determinar Icono y Tipo Visual
                        const type = src.type.toUpperCase();
                        let Icon = HardDrive;
                        let label = src.type;

                        if (['MYSQL', 'POSTGRESQL', 'POSTGRES'].includes(type)) {
                            Icon = Server;
                            label = src.host === 'external_mysql' ? 'Docker DB' : src.host;
                        } else if (type === 'GSHEET') {
                            Icon = Table;
                            label = 'Google Cloud';
                        } else if (type === 'LOCAL_FILE') {
                            Icon = FolderOpen;
                            label = 'Archivos Locales';
                        }

                        return (
                            <div key={idx} className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 bg-gray-50/50 animate-in fade-in slide-in-from-left-2 hover:bg-white hover:shadow-sm transition-all cursor-default">
                                <div className="p-1.5 bg-white rounded border border-gray-100 text-gray-600">
                                    <Icon size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-700 truncate">{src.name}</p>
                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                                        <Clock size={10} /> 
                                        <span className="truncate max-w-[80px]">{label}</span>
                                        <span className="text-green-500 flex items-center gap-0.5 ml-auto font-medium">
                                            <ShieldCheck size={10} /> OK
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <button className="flex items-center gap-3 w-full p-2 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-lg transition-colors text-sm font-medium">
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}