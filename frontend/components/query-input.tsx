"use client"

import { useState, useRef } from "react"
import { Paperclip, Send, X, FileText } from "lucide-react"

interface QueryInputProps {
  onSend: (text: string) => void
  onFileSelect: (file: File | null) => void
  selectedFile: File | null
}

export function QueryInput({ onSend, onFileSelect, selectedFile }: QueryInputProps) {
  const [query, setQuery] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    if (query.trim() || selectedFile) {
      onSend(query)
      setQuery("")
    }
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent z-10">
      <div className="max-w-4xl mx-auto">
        <div className="relative flex flex-col gap-2 bg-white border border-gray-200 rounded-2xl shadow-xl shadow-gray-200/50 p-2 ring-1 ring-gray-100 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
          
          {/* Chip de Archivo Seleccionado */}
          {selectedFile && (
            <div className="mx-2 mt-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium flex items-center justify-between animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="truncate max-w-[200px]">{selectedFile.name}</span>
              </div>
              <button 
                onClick={() => onFileSelect(null)}
                className="hover:bg-blue-100 rounded p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 px-2">
            {/* Botón Clip */}
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              <Paperclip className="w-5 h-5" />
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])} 
              />
            </button>

            {/* Input Texto */}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your business..."
              className="flex-1 bg-transparent border-none outline-none py-4 text-gray-900 placeholder:text-gray-400 text-lg font-serif"
            />

            {/* Botón Enviar */}
            <button
              onClick={handleSend}
              disabled={!query.trim() && !selectedFile}
              className="p-3 bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed transition-transform active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="text-center mt-3 text-xs text-gray-400 font-medium">
          Fluent AI can make mistakes. Verify important financial data.
        </div>
      </div>
    </div>
  )
}