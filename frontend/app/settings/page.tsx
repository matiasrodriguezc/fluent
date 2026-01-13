"use client";

import { useState } from "react";
import { 
  User, CreditCard, BarChart3, HardDrive, Zap, 
  Settings as SettingsIcon, Download, ChevronRight, AlertCircle 
} from "lucide-react";

export default function SettingsPage() {
  // Datos simulados (esto vendría de tu backend: /api/user/usage)
  const [userProfile, setUserProfile] = useState({
    name: "Carlos Developer",
    email: "carlos@empresa.com",
    avatar: "C"
  });

  const [usage, setUsage] = useState({
    storageUsed: 24.5, // MB
    storageLimit: 50,  // MB (Plan Gratuito)
    tokensUsed: 14250,
    tokensLimit: 50000,
    planName: "Starter Plan",
    renewsAt: "12 Feb, 2026"
  });

  return (
    <div className="max-w-5xl mx-auto pb-20">
      
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-gray-900">Mi Cuenta</h1>
        <p className="text-gray-500 mt-1">Gestiona tu perfil, suscripción y límites de uso.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: PERFIL Y PLAN */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* 1. PERFIL */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <User className="w-5 h-5 text-gray-400" /> Perfil
                    </h3>
                    <button className="text-sm text-blue-600 font-medium hover:underline">Editar</button>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-900 text-white rounded-full flex items-center justify-center text-xl font-bold">
                        {userProfile.avatar}
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 text-lg">{userProfile.name}</p>
                        <p className="text-gray-500">{userProfile.email}</p>
                    </div>
                </div>
            </div>

            {/* 2. ESTADÍSTICAS DE USO (LO IMPORTANTE) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-gray-400" /> Consumo Mensual
                    </h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">Se renueva: {usage.renewsAt}</span>
                </div>

                <div className="space-y-6">
                    
                    {/* Almacenamiento */}
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="flex items-center gap-2 text-gray-700">
                                <HardDrive className="w-4 h-4 text-gray-400" /> Almacenamiento (RAG)
                            </span>
                            <span className="font-mono font-medium">{usage.storageUsed}MB / {usage.storageLimit}MB</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div 
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                                style={{ width: `${(usage.storageUsed / usage.storageLimit) * 100}%` }}
                            ></div>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Espacio ocupado por tus PDFs, Excels y CSVs subidos.</p>
                    </div>

                    {/* Tokens IA */}
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="flex items-center gap-2 text-gray-700">
                                <Zap className="w-4 h-4 text-orange-400" /> Tokens IA (GPT-4)
                            </span>
                            <span className="font-mono font-medium">{usage.tokensUsed.toLocaleString()} / {usage.tokensLimit.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div 
                                className={`h-2.5 rounded-full transition-all duration-500 ${usage.tokensUsed > usage.tokensLimit * 0.9 ? 'bg-red-500' : 'bg-orange-500'}`} 
                                style={{ width: `${(usage.tokensUsed / usage.tokensLimit) * 100}%` }}
                            ></div>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Tokens generados en chats y análisis SQL.</p>
                    </div>

                </div>

                {/* Alerta si está cerca del límite */}
                {(usage.tokensUsed / usage.tokensLimit) > 0.8 && (
                    <div className="mt-6 p-3 bg-orange-50 border border-orange-100 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-orange-800">Te estás quedando sin créditos</p>
                            <p className="text-xs text-orange-700 mt-1">Has consumido el 80% de tu plan. Actualiza a PRO para evitar interrupciones.</p>
                        </div>
                        <button className="text-xs bg-white border border-orange-200 text-orange-700 px-3 py-1 rounded font-medium hover:bg-orange-100 ml-auto">Upgrade</button>
                    </div>
                )}
            </div>
            
            {/* 3. FACTURACIÓN */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Download className="w-5 h-5 text-gray-400" /> Historial de Facturas
                </h3>
                <div className="space-y-2">
                    {[1, 2].map((i) => (
                        <div key={i} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg transition group cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 rounded text-gray-500"><FileTextIcon /></div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Factura #{1023 + i}</p>
                                    <p className="text-xs text-gray-500">12 Ene, 2026</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-mono text-gray-600">$29.00</span>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>

        {/* COLUMNA DERECHA: PLAN ACTUAL & UPGRADE */}
        <div className="space-y-6">
            
            <div className="bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                
                <div className="relative z-10">
                    <h3 className="text-sm font-medium text-gray-300 uppercase tracking-widest mb-1">Plan Actual</h3>
                    <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-3xl font-bold">{usage.planName}</span>
                    </div>

                    <div className="space-y-3 mb-8">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                            <CheckIcon /> 50 Consultas / mes
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                            <CheckIcon /> 50MB Almacenamiento
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                            <CheckIcon /> 1 Usuario
                        </div>
                    </div>

                    <button className="w-full bg-white text-gray-900 py-3 rounded-xl font-bold hover:bg-gray-100 transition shadow-lg">
                        Mejorar Plan 🚀
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-3">Cancela cuando quieras.</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-gray-400" /> Método de Pago
                </h3>
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl mb-4">
                    <div className="w-10 h-6 bg-gray-800 rounded flex items-center justify-center text-white text-[10px] font-bold tracking-wider">VISA</div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">•••• 4242</p>
                        <p className="text-xs text-gray-500">Expira 12/28</p>
                    </div>
                </div>
                <button className="text-sm text-gray-600 font-medium hover:text-gray-900 hover:underline">
                    Cambiar tarjeta
                </button>
            </div>

        </div>

      </div>
    </div>
  );
}

// Iconos pequeños auxiliares
function FileTextIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    )
}

function CheckIcon() {
    return (
        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
    )
}