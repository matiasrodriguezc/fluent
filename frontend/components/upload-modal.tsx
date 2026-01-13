"use client";

import { useState, useRef } from "react";
import axios from "axios";
import { UploadCloud, FileText, X, CheckCircle2, Loader2, FileSpreadsheet } from "lucide-react";
import clsx from "clsx";

const API_URL = "http://localhost:8000"; // Ajusta si tu backend corre en otro puerto

interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const validTypes = [
      "application/pdf", 
      "text/csv", 
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "text/plain"
    ];
    
    // Aceptamos si el tipo coincide O si la extensión es .csv (a veces el tipo MIME falla)
    if (validTypes.includes(selectedFile.type) || selectedFile.name.endsWith(".csv")) {
      setFile(selectedFile);
      setStatus("idle");
    } else {
      alert("Formato no soportado. Usa PDF, CSV o Excel.");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus("uploading");
    const formData = new FormData();
    formData.append("file", file);
    // Hardcodeamos un ID de usuario por ahora para avanzar
    formData.append("user_id", "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");

    try {
      await axios.post(`${API_URL}/ingest/upload-file`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStatus("success");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 text-lg">Subir Documento</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8">
          {status === "success" ? (
            <div className="text-center py-10 animate-in zoom-in duration-300">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-gray-900">¡Archivo Procesado!</h4>
              <p className="text-gray-500 mt-2">La IA ya leyó tu documento.</p>
            </div>
          ) : (
            <>
              {/* Dropzone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={clsx(
                  "border-2 border-dashed rounded-xl py-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-200",
                  isDragging
                    ? "border-blue-500 bg-blue-50 scale-[1.02]"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                  file ? "border-green-200 bg-green-50/30" : ""
                )}
              >
                <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={(e) => e.target.files?.[0] && validateAndSetFile(e.target.files[0])}
                    accept=".pdf,.csv,.xlsx,.txt"
                />
                
                {file ? (
                  <div className="text-center">
                    <div className="w-12 h-12 bg-white text-blue-600 shadow-sm rounded-lg flex items-center justify-center mx-auto mb-3">
                      {file.name.endsWith('.csv') || file.name.endsWith('.xlsx') ? (
                          <FileSpreadsheet className="w-6 h-6"/>
                      ) : (
                          <FileText className="w-6 h-6" />
                      )}
                    </div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="font-medium text-gray-700">Haz click o arrastra un archivo</p>
                    <p className="text-xs text-gray-400 mt-2">Soporta PDF, Excel, CSV</p>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {status === "error" && (
                <p className="text-red-500 text-sm text-center mt-4">Hubo un error al subir el archivo.</p>
              )}

              {/* Action Button */}
              <button
                disabled={!file || status === "uploading"}
                onClick={handleUpload}
                className="w-full mt-6 bg-gray-900 text-white font-medium py-3 rounded-xl hover:bg-black transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === "uploading" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Procesando con IA...
                  </>
                ) : (
                  "Analizar Documento"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}