"use client"

import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import { Pin, X, Save } from "lucide-react" 
import axios from "axios"
import { AiChart } from "@/components/ai-chart" 

interface CanvasProps {
  messages: any[]
  isThinking: boolean
}

export function Canvas({ messages, isThinking }: CanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // Estados para el Modal de Pin
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)
  const [pinData, setPinData] = useState<any>(null)
  const [customTitle, setCustomTitle] = useState("")

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isThinking])

  // Abrir Modal al hacer click en Pin
  const openPinModal = (msg: any) => {
    setPinData(msg)
    const defaultTitle = typeof msg.content === 'string' ? msg.content.substring(0, 30) : "Gráfico Guardado"
    setCustomTitle(msg.data?.suggested_title || defaultTitle)
    setIsPinModalOpen(true)
  }

  // Guardar definitivamente en Dashboard
  const handleConfirmPin = async () => {
    if (!pinData) return
    try {
        await axios.post("http://localhost:8000/dashboard/pin", {
            user_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
            title: customTitle,
            chart_type: pinData.data.chart_type || "bar",
            sql: pinData.data.sql,
            data: pinData.data.result
        })
        alert("📌 ¡Guardado en Dashboard!")
        setIsPinModalOpen(false)
    } catch (e) {
        console.error(e)
        alert("❌ Error al guardar.")
    }
  }

  return (
    <main className="flex-1 overflow-y-auto bg-[#F9FAFB] p-4 md:p-12 relative">
      <div className="max-w-4xl mx-auto space-y-12">
        {messages.map((msg, idx) => (
          <div key={idx} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* --- MENSAJE DEL USUARIO --- */}
            {msg.role === "user" ? (
              <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 text-right leading-tight">
                  {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                </h1>
              </div>
            ) : (
              // --- MENSAJE DEL ASISTENTE ---
              <div className="bg-white rounded-xl border border-gray-100 p-6 md:p-8 shadow-sm">
                
                <div className="flex items-center gap-2 mb-6">
                   <span className="px-2 py-1 bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider rounded">
                      {msg.tool_used || "INSIGHT"}
                   </span>
                   <span className="text-xs text-gray-400">Fluent AI Analysis</span>
                </div>

                <div className="prose prose-lg prose-gray max-w-none font-serif text-gray-800 leading-relaxed">
                  {typeof msg.content === 'string' ? (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                      <ReactMarkdown>{msg.content[0]?.text || JSON.stringify(msg.content)}</ReactMarkdown>
                  )}
                </div>

                {/* --- LÓGICA DE GRÁFICO: SOLO SI ES 'CHART' --- */}
                {msg.tool_used === "CHART" && msg.data?.result && (
                  <div className="mt-8 w-full bg-gray-50 rounded-lg p-2 border border-gray-200 animate-in zoom-in-95 duration-300">
                    <AiChart
                      data={msg.data.result}
                      type={msg.data.chart_type || "bar"} 
                    />
                    
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200/50 px-2">
                        <details className="text-[10px] text-gray-400 font-mono cursor-pointer relative group">
                            <summary className="hover:text-gray-600">Ver Query SQL</summary>
                            <div className="hidden group-open:block absolute bottom-6 left-0 w-64 bg-gray-900 text-gray-100 p-3 rounded-lg shadow-xl z-20 font-sans whitespace-pre-wrap">
                                {msg.data.sql}
                            </div>
                        </details>

                        <button 
                            onClick={() => openPinModal(msg)}
                            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors hover:bg-blue-50 px-2 py-1.5 rounded-md"
                        >
                            <Pin size={14} />
                            Pin to Dashboard
                        </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {isThinking && (
          <div className="flex items-center gap-3 text-gray-400 mb-8 pl-2">
             <span className="text-sm font-serif italic">Analyzing data streams...</span>
          </div>
        )}
        <div ref={scrollRef} className="h-4" />
      </div>

      {/* --- MODAL PARA GUARDAR --- */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-900 text-lg">Guardar en Dashboard</h3>
                    <button onClick={() => setIsPinModalOpen(false)}><X size={20} className="text-gray-400" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Título del Gráfico</label>
                        <input 
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-900 font-medium"
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setIsPinModalOpen(false)} className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition">Cancelar</button>
                        <button onClick={handleConfirmPin} className="flex-1 py-3 bg-gray-900 text-white font-medium hover:bg-black rounded-xl transition flex items-center justify-center gap-2">
                            <Save size={18} /> Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </main>
  )
}