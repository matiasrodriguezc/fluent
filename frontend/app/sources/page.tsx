"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Database, Plus, Server, Loader2, RefreshCw, FileUp, Trash2, Activity, 
  X, CheckCircle2, AlertCircle, Pencil, FileText, HardDrive, Table, Link as LinkIcon 
} from "lucide-react";
import { UploadModal } from "@/components/upload-modal";
import { triggerSourcesUpdate } from "@/lib/events"; // <--- IMPORTAMOS EL DISPARADOR

const API_URL = "http://localhost:8000";

export default function SourcesPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);             // DB
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false); // CSV Local
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);   // Google Sheet (NUEVO)

  // Estados Acciones
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [pingModal, setPingModal] = useState<{ open: boolean; success: boolean; message: string }>({ open: false, success: false, message: "" });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null; name: string; type: string }>({ open: false, id: null, name: "", type: "" });
  const [editModal, setEditModal] = useState<{ open: boolean; id: string | null; currentName: string }>({ open: false, id: null, currentName: "" });

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/ingest/list`);
      setConnections(res.data.connections || []);
    } catch (error) {
      console.error("Error fetching connections", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConnections(); }, []);

  // --- ACTIONS ---

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
        await axios.delete(`${API_URL}/ingest/connection/${deleteModal.id}`);
        setConnections(prev => prev.filter(c => c.id !== deleteModal.id));
        setDeleteModal({ ...deleteModal, open: false });
        triggerSourcesUpdate(); // <--- ACTUALIZA EL SIDEBAR AL INSTANTE
    } catch (error) {
        alert("Error al eliminar");
    }
  };

  // El resto de handlers (Ping, OpenModals) igual que antes...
  const handlePing = async (id: string) => {
    setPingingId(id);
    try {
        await axios.post(`${API_URL}/ingest/test/${id}`);
        setPingModal({ open: true, success: true, message: "Conexión estable." });
    } catch (error: any) {
        setPingModal({ open: true, success: false, message: error.response?.data?.detail || "Error." });
    } finally {
        setPingingId(null);
    }
  };

  const openDeleteConfirmation = (id: string, name: string, type: string) => setDeleteModal({ open: true, id, name, type });
  const openEditModal = (id: string, currentName: string) => setEditModal({ open: true, id, currentName });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Data Hub</h1>
          <p className="text-gray-500 mt-1">Gestiona las fuentes de verdad de tu organización.</p>
        </div>
        
        {/* BOTONERA SUPERIOR */}
        <div className="flex gap-2">
            <button onClick={() => setIsSheetModalOpen(true)} className="flex items-center gap-2 bg-white text-green-700 border border-gray-200 hover:bg-green-50 px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm">
              <Table className="w-4 h-4" /> Google Sheet
            </button>
            <button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm">
              <FileUp className="w-4 h-4" /> Subir Archivo
            </button>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl active:scale-95">
              <Plus className="w-4 h-4" /> Conectar DB
            </button>
        </div>
      </div>

      {/* GRID */}
      {loading ? (
        <div className="flex items-center gap-3 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /> Cargando...</div>
      ) : connections.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Sin conexiones</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {connections.map((conn, idx) => {
            const isDB = ['MYSQL', 'POSTGRESQL', 'POSTGRES'].includes(conn.type.toUpperCase());
            const isSheet = conn.type.toUpperCase() === 'GSHEET';
            
            // Colores según tipo
            let gradient = 'from-orange-400 to-red-500'; // Default File
            let iconBox = 'bg-orange-50 text-orange-600';
            let Icon = FileText;

            if (isDB) {
                gradient = 'from-blue-500 to-purple-500';
                iconBox = 'bg-blue-50 text-blue-600';
                Icon = Server;
            } else if (isSheet) {
                gradient = 'from-green-400 to-emerald-600';
                iconBox = 'bg-emerald-50 text-emerald-600';
                Icon = Table;
            }

            return (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden flex flex-col h-full">
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${gradient}`}></div>
                
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${iconBox}`}><Icon className="w-6 h-6" /></div>
                  <div className="px-2 py-1 bg-gray-50 text-gray-600 text-[10px] font-bold uppercase rounded-full border border-gray-100 flex items-center gap-1">
                     <span className={`w-1.5 h-1.5 rounded-full ${conn.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                     {conn.status || 'Active'}
                  </div>
                </div>
                
                <div className="flex-1 mb-4">
                    <h3 className="font-bold text-gray-900 text-lg mb-1 truncate" title={conn.name}>{conn.name}</h3>
                    <p className="text-xs text-gray-500 font-mono truncate">{conn.type} • {isSheet ? 'Google Cloud' : conn.host}</p>
                </div>
                
                <div className="pt-4 border-t border-gray-50 grid grid-cols-3 gap-2">
                   <button onClick={() => openEditModal(conn.id, conn.name)} className="flex items-center justify-center gap-2 text-xs font-medium text-gray-600 hover:bg-gray-100 py-2 rounded-lg transition"><Pencil className="w-3.5 h-3.5" /></button>

                   {isDB ? (
                     <>
                        <button onClick={() => handlePing(conn.id)} disabled={pingingId === conn.id} className="flex items-center justify-center gap-2 text-xs font-medium text-blue-600 hover:bg-blue-50 py-2 rounded-lg transition">
                            {pingingId === conn.id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Activity className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => openDeleteConfirmation(conn.id, conn.name, "DB")} className="flex items-center justify-center gap-2 text-xs font-medium text-red-600 hover:bg-red-50 py-2 rounded-lg transition"><Trash2 className="w-3.5 h-3.5" /></button>
                     </>
                   ) : (
                     <button onClick={() => openDeleteConfirmation(conn.id, conn.name, "FILE")} className="col-span-2 flex items-center justify-center gap-2 text-xs font-medium text-red-600 hover:bg-red-50 py-2 rounded-lg transition"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALES */}
      {isModalOpen && <AddConnectionModal onClose={() => setIsModalOpen(false)} onSuccess={() => { setIsModalOpen(false); fetchConnections(); triggerSourcesUpdate(); }} />}
      {isUploadModalOpen && <UploadModal onClose={() => setIsUploadModalOpen(false)} onSuccess={() => { setIsUploadModalOpen(false); fetchConnections(); triggerSourcesUpdate(); }} />}
      
      {/* NUEVO MODAL GOOGLE SHEETS */}
      {isSheetModalOpen && (
        <AddSheetModal 
            onClose={() => setIsSheetModalOpen(false)} 
            onSuccess={() => { setIsSheetModalOpen(false); fetchConnections(); triggerSourcesUpdate(); }} 
        />
      )}

      {pingModal.open && <PingResultModal success={pingModal.success} message={pingModal.message} onClose={() => setPingModal({ ...pingModal, open: false })} />}
      {deleteModal.open && <DeleteConfirmModal name={deleteModal.name} type={deleteModal.type} onClose={() => setDeleteModal({ ...deleteModal, open: false })} onConfirm={confirmDelete} />}
      {editModal.open && <EditSourceModal id={editModal.id!} currentName={editModal.currentName} onClose={() => setEditModal({ ...editModal, open: false })} onSuccess={() => { setEditModal({ ...editModal, open: false }); fetchConnections(); triggerSourcesUpdate(); }} />}
    </div>
  );
}

// ==========================================
// NUEVO COMPONENTE: MODAL GOOGLE SHEETS
// ==========================================

function AddSheetModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const [formData, setFormData] = useState({ name: "Mi Hoja de Cálculo", url: "" });
    const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        try {
            // Reutilizamos el endpoint /connection pero mandamos type="gsheet"
            await axios.post(`${API_URL}/ingest/connection`, {
                name: formData.name,
                type: "gsheet",
                host: formData.url, // Usamos 'host' para guardar la URL
                port: "0", user: "", password: "", dbname: "" // Relleno
            });
            onSuccess();
        } catch (error) {
            console.error(error);
            setStatus("error");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-900">Agregar Google Sheet</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {status === "error" && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">Error: Verifica que la URL sea pública.</div>}
                    
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 uppercase">Nombre Referencia</label>
                        <input className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ej: Ventas Q1" />
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 uppercase">Link Público (Google Sheet)</label>
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"/>
                            <input 
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-green-500/20" 
                                placeholder="https://docs.google.com/spreadsheets/d/..." 
                                value={formData.url} 
                                onChange={e => setFormData({...formData, url: e.target.value})} 
                                required 
                            />
                        </div>
                        <p className="text-[10px] text-gray-400">Asegúrate de que esté configurado como "Cualquiera con el enlace".</p>
                    </div>

                    <button type="submit" disabled={status === "loading"} className="w-full px-4 py-2.5 text-sm font-medium bg-green-600 text-white hover:bg-green-700 rounded-xl transition flex justify-center gap-2">
                        {status === "loading" ? <RefreshCw className="w-4 h-4 animate-spin"/> : "Agregar Hoja"}
                    </button>
                </form>
            </div>
        </div>
    )
}

// ... (Resto de componentes: DeleteConfirmModal, EditSourceModal, PingResultModal, AddConnectionModal se mantienen IGUAL) ...
// (Asegúrate de que AddConnectionModal use también triggerSourcesUpdate en su onSuccess cuando lo llames desde el componente padre)
function DeleteConfirmModal({ name, type, onClose, onConfirm }: { name: string, type: string, onClose: () => void, onConfirm: () => void }) {
    const isDB = type === "DB";
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-7 h-7"/>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{isDB ? "¿Desconectar Base?" : "¿Eliminar Fuente?"}</h3>
                <p className="text-sm text-gray-500 mb-6">{isDB ? `Se perderá la conexión con "${name}".` : `¿Seguro que quieres eliminar "${name}"?`}</p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 bg-white border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition">Cancelar</button>
                    <button onClick={onConfirm} className="flex-1 bg-red-600 text-white font-medium py-2.5 rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-600/20">{isDB ? "Desconectar" : "Eliminar"}</button>
                </div>
            </div>
        </div>
    )
}
// ... Los otros modales (Edit, Ping, AddConnection) pegalos tal cual los tenías ...
function EditSourceModal({ id, currentName, onClose, onSuccess }: { id: string, currentName: string, onClose: () => void, onSuccess: () => void }) {
    const [name, setName] = useState(currentName);
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); try { await axios.put(`${API_URL}/ingest/connection/${id}`, { name }); onSuccess(); } catch (error) { alert("Error"); setLoading(false); } };
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50"><h3 className="font-bold text-gray-900">Editar Nombre</h3><button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button></div>
                <form onSubmit={handleSubmit} className="p-6"><div className="space-y-1 mb-6"><label className="text-xs font-medium text-gray-500 uppercase">Nombre</label><input className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div><button type="submit" disabled={loading} className="w-full bg-gray-900 text-white font-medium py-2.5 rounded-xl hover:bg-black transition">{loading ? <Loader2 className="w-5 h-5 animate-spin"/> : "Guardar"}</button></form>
            </div>
        </div>
    )
}
function PingResultModal({ success, message, onClose }: { success: boolean, message: string, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{success ? <CheckCircle2 className="w-8 h-8"/> : <AlertCircle className="w-8 h-8"/>}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{success ? "Conexión Exitosa" : "Error"}</h3>
                <p className="text-sm text-gray-500 mb-6">{message}</p>
                <button onClick={onClose} className="w-full bg-gray-900 text-white font-medium py-2.5 rounded-xl hover:bg-black transition">Entendido</button>
            </div>
        </div>
    )
}
function AddConnectionModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const [formData, setFormData] = useState({ name: "Tienda Online", type: "mysql", user: "root", password: "", host: "external_mysql", port: "3306", dbname: "tienda_ropa" });
    const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setStatus("loading"); try { await axios.post(`${API_URL}/ingest/connection`, formData); onSuccess(); } catch (error) { console.error(error); setStatus("error"); } };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50"><h3 className="font-bold text-gray-900">Nueva Fuente de Datos</h3><button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {status === "error" && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2"><X className="w-4 h-4"/> Error al conectar.</div>}
                <div className="space-y-1"><label className="text-xs font-medium text-gray-500 uppercase">Nombre Ref.</label><input className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
                <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-xs font-medium text-gray-500 uppercase">Tipo</label><select className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option value="mysql">MySQL</option><option value="postgresql">PostgreSQL</option></select></div><div className="space-y-1"><label className="text-xs font-medium text-gray-500 uppercase">Host</label><input className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono" value={formData.host} onChange={e => setFormData({...formData, host: e.target.value})} required /></div></div>
                <div className="grid grid-cols-3 gap-4"><div className="col-span-1 space-y-1"><label className="text-xs font-medium text-gray-500 uppercase">Puerto</label><input className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono" value={formData.port} onChange={e => setFormData({...formData, port: e.target.value})} /></div><div className="col-span-2 space-y-1"><label className="text-xs font-medium text-gray-500 uppercase">Base de Datos</label><input className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono" value={formData.dbname} onChange={e => setFormData({...formData, dbname: e.target.value})} required /></div></div>
                <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-xs font-medium text-gray-500 uppercase">Usuario</label><input className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono" value={formData.user} onChange={e => setFormData({...formData, user: e.target.value})} required /></div><div className="space-y-1"><label className="text-xs font-medium text-gray-500 uppercase">Contraseña</label><input type="password" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div></div>
                <div className="pt-4 flex gap-3"><button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button><button type="submit" disabled={status === "loading"} className="flex-1 px-4 py-2 text-sm font-medium bg-gray-900 text-white hover:bg-black rounded-lg transition">{status === "loading" ? <RefreshCw className="w-4 h-4 animate-spin"/> : "Guardar"}</button></div>
            </form>
          </div>
        </div>
    );
}