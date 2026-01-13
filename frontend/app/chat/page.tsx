"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Canvas } from "@/components/canvas"
import { AppSidebar } from "@/components/app-sidebar" 
import { QueryInput } from "@/components/query-input"

const API_URL = "http://localhost:8000"
const USER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" 

export default function Home() {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: "system",
        content: "Bienvenido a Fluent AI. Conecta tus datos o sube un archivo para comenzar."
      }])
    }
  }, [])

  const handleSendMessage = async (input: string) => {
    if (!input.trim() && !file) return

    const userMsg = { role: "user", content: input }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      if (file) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("user_id", USER_ID)
        await axios.post(`${API_URL}/ingest/upload-file`, formData)
        
        setMessages((prev) => [...prev, { 
          role: "system", 
          content: `Archivo "${file.name}" procesado correctamente.` 
        }])
        setFile(null)
      }

      if (input.trim()) {
        const res = await axios.post(`${API_URL}/chat`, {
          message: input,
          user_id: USER_ID,
          conversation_id: "default",
        })

        const payload = res.data

        // --- CORRECCIÓN CRÍTICA AQUÍ ---
        setMessages((prev) => [
          ...prev,
          { 
            role: "assistant", 
            content: payload.response, 
            data: payload.data, 
            // FIX: Cambiado de 'tool' a 'tool_used' para coincidir con el Canvas
            tool_used: payload.tool_used 
          },
        ])
      }
    } catch (error) {
      console.error(error)
      setMessages((prev) => [...prev, { role: "system", content: "⚠️ Error conectando con el servidor." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background font-sans">
      <AppSidebar />
      <div className="flex-1 flex flex-col relative h-screen ml-64">
        <Canvas messages={messages} isThinking={loading} />
        <QueryInput 
          onSend={handleSendMessage} 
          onFileSelect={setFile} 
          selectedFile={file}
        />
      </div>
    </div>
  )
}