"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { AppSidebar } from "@/components/app-sidebar" 
import { AiChart } from "@/components/ai-chart"
import { LayoutDashboard, Loader2, Trash2, RefreshCw } from "lucide-react"

export default function DashboardPage() {
  const [widgets, setWidgets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)

  useEffect(() => {
    fetchWidgets()
  }, [])

  const fetchWidgets = async () => {
    try {
      // Ajusta tu User ID si cambia
      const res = await axios.get("http://localhost:8000/dashboard/list?user_id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")
      setWidgets(res.data.widgets)
    } catch (error) {
      console.error("Error cargando dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if(!confirm("¿Seguro que quieres borrar este gráfico?")) return;
    try {
        await axios.delete(`http://localhost:8000/dashboard/widget/${id}`)
        setWidgets(prev => prev.filter(w => w.id !== id))
    } catch (error) {
        alert("Error al borrar")
    }
  }

  const handleRefresh = async (id: string) => {
    setRefreshingId(id)
    try {
        const res = await axios.put(`http://localhost:8000/dashboard/widget/${id}/refresh`)
        setWidgets(prev => prev.map(w => {
            if (w.id === id) {
                return { ...w, data: res.data.data }
            }
            return w
        }))
    } catch (error) {
        console.error(error)
        alert("Error al actualizar datos.")
    } finally {
        setRefreshingId(null)
    }
  }

  return (
    <div className="flex min-h-screen bg-background font-sans">
      <AppSidebar />

      <main className="flex-1 p-8 bg-gray-50/50 overflow-y-auto ml-64">
        <header className="mb-8 flex justify-between items-end">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <LayoutDashboard className="text-blue-600" />
                    Dashboard Ejecutivo
                </h1>
                <p className="text-gray-500 mt-2">Tus métricas clave y visualizaciones guardadas.</p>
            </div>
            <button 
                onClick={fetchWidgets} 
                className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-2"
            >
                <RefreshCw size={14} /> Recargar Todo
            </button>
        </header>

        {loading ? (
            <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="animate-spin" /> Cargando tablero...
            </div>
        ) : widgets.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-gray-400 mb-4">No tienes gráficos pineados aún.</p>
                <a href="/chat" className="text-blue-600 font-medium hover:underline">Ir al Chat para crear uno &rarr;</a>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                {widgets.map((widget) => (
                    <div key={widget.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group h-full flex flex-col">
                        
                        {/* HEADER DE LA TARJETA RE-DISEÑADO */}
                        <div className="flex justify-between items-start mb-4">
                            {/* Título y Badge en la misma línea */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="font-bold text-gray-800 text-lg leading-none">{widget.title}</h3>
                                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                    {widget.chart_type}
                                </span>
                            </div>
                            
                            {/* Botones de acción (ocultos hasta hover) */}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                                <button 
                                    onClick={() => handleRefresh(widget.id)}
                                    disabled={refreshingId === widget.id}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                    title="Actualizar datos"
                                >
                                    <RefreshCw size={16} className={refreshingId === widget.id ? "animate-spin text-blue-600" : ""} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(widget.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                    title="Eliminar gráfico"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* GRÁFICO */}
                        <div className="w-full flex-1 min-h-[300px]">
                             {/* title="" para que AiChart no renderice su propio título interno */}
                             <AiChart 
                                data={widget.data} 
                                type={widget.chart_type} 
                                title="" 
                                sql={widget.sql} // <--- ¡IMPORTANTE!
                             />
                        </div>
                    </div>
                ))}
            </div>
        )}
      </main>
    </div>
  )
}