import { X, Database, AlertTriangle, Columns, Table as TableIcon } from 'lucide-react';

interface DataProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  stats: any; // El objeto JSON que viene del backend
}

export function DataProfileModal({ isOpen, onClose, title, stats }: DataProfileModalProps) {
  if (!isOpen) return null;

  // Si no hay stats (archivos viejos), mostramos un aviso
  const hasStats = stats && stats.total_rows !== undefined;
  const previewData = stats?.preview || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Database size={20} />
            </div>
            <div>
                <h3 className="font-bold text-gray-800">{title}</h3>
                <p className="text-xs text-gray-500">Detalles del Dataset</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!hasStats ? (
            <div className="text-center py-8 text-gray-400">
                <AlertTriangle className="mx-auto mb-2" size={32} />
                <p>No hay perfilado disponible para este archivo.</p>
                <p className="text-xs">Sube el archivo nuevamente para generar estadísticas.</p>
            </div>
          ) : (
            <div className="space-y-6">
                {/* 1. Tarjetas de Estadísticas */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <p className="text-xs text-blue-600 font-medium uppercase mb-1">Total Filas</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.total_rows.toLocaleString()}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <p className="text-xs text-purple-600 font-medium uppercase mb-1 flex items-center gap-1">
                            <Columns size={12}/> Columnas
                        </p>
                        <p className="text-2xl font-bold text-gray-800">{stats.total_columns}</p>
                    </div>
                    <div className={`${stats.missing_values > 0 ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'} p-4 rounded-xl border`}>
                        <p className={`text-xs font-medium uppercase mb-1 flex items-center gap-1 ${stats.missing_values > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            {stats.missing_values > 0 ? <AlertTriangle size={12}/> : null} Valores Nulos
                        </p>
                        <p className="text-2xl font-bold text-gray-800">{stats.missing_values}</p>
                    </div>
                </div>

                {/* 2. Preview de Datos (Tabla) */}
                {previewData.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <TableIcon size={16} /> Previsualización (Primeras filas)
                        </h4>
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium">
                                    <tr>
                                        {Object.keys(previewData[0]).map((key) => (
                                            <th key={key} className="px-4 py-2 whitespace-nowrap">{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {previewData.map((row: any, i: number) => (
                                        <tr key={i} className="hover:bg-gray-50/50">
                                            {Object.values(row).map((val: any, j) => (
                                                <td key={j} className="px-4 py-2 text-gray-600 whitespace-nowrap max-w-[150px] overflow-hidden text-ellipsis">
                                                    {String(val)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                <div className="text-xs text-right text-gray-400">
                    Peso en memoria: ~{stats.memory_usage_kb} KB
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}