"use client";

import { useRef, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { FileSpreadsheet, Image as ImageIcon, Code, X, Copy, Check } from 'lucide-react'; // <--- Importamos Code, X, Copy, Check
import { toPng } from 'html-to-image';

interface AiChartProps {
  data: any[];
  title?: string;
  type?: 'bar' | 'line' | 'pie';
  sql?: string; // <--- NUEVA PROP
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#FF6B6B', '#4ECDC4'];
const MAX_ITEMS_DISPLAY = 50; 
const ITEM_WIDTH = 60; 

export function AiChart({ data, title, type = 'bar', sql }: AiChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [showSql, setShowSql] = useState(false); // <--- Estado del Modal SQL
  const [copied, setCopied] = useState(false);   // <--- Estado para feedback de copia

  if (!data || data.length === 0) return null;

  const keys = Object.keys(data[0]);
  if (keys.length < 2) return <p className="text-sm text-red-500">Datos insuficientes</p>;

  const xKey = keys[0];
  const yKey = keys[1];

  const totalItems = data.length;
  const displayData = data.slice(0, MAX_ITEMS_DISPLAY);
  const hiddenCount = totalItems - MAX_ITEMS_DISPLAY;

  const isScrollable = type !== 'pie' && displayData.length > 4; 
  const chartWidth = isScrollable ? Math.max(1000, displayData.length * ITEM_WIDTH) : '100%';

  // --- ACTIONS ---
  const handleDownloadCSV = () => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => {
      return Object.values(row).map(value => {
        if (typeof value === 'object' && value !== null) {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return value;
      }).join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title || "datos_exportados"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadImage = async () => {
    if (chartRef.current) {
      try {
        const chartContainer = chartRef.current.querySelector('div[style*="width"]');
        if (chartContainer) {
            const dataUrl = await toPng(chartContainer as HTMLElement, { cacheBust: true, backgroundColor: '#ffffff' });
            const link = document.createElement("a");
            link.download = `${title || "grafico"}.png`;
            link.href = dataUrl;
            link.click();
        }
      } catch (error) { console.error("Error:", error); }
    }
  };

  const copyToClipboard = () => {
    if (sql) {
        navigator.clipboard.writeText(sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };
  // ----------------

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={displayData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} interval={0} angle={-45} textAnchor="end" height={60} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
            <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} cursor={{stroke: '#E5E7EB', strokeWidth: 2}} />
            <Line type="monotone" dataKey={yKey} stroke="#2563EB" strokeWidth={3} dot={{r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#fff'}} />
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie data={displayData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey={yKey} nameKey={xKey}>
              {displayData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        );
      case 'bar':
      default:
        return (
          <BarChart data={displayData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} interval={0} angle={-45} textAnchor="end" height={60} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
            <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
            <Bar dataKey={yKey} fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        );
    }
  };

  return (
    <>
      <div className="w-full mt-4 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden relative">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-gray-50/50">
          <h4 className="text-sm font-semibold text-gray-700">{title || "Análisis de Datos"}</h4>
          
          <div className="flex gap-2">
              {/* BOTÓN SQL (NUEVO) */}
              {sql && (
                <button 
                    onClick={() => setShowSql(true)} 
                    className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors" 
                    title="Ver consulta SQL"
                >
                    <Code size={16} />
                </button>
              )}
              
              <button onClick={handleDownloadCSV} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors" title="Descargar CSV">
                  <FileSpreadsheet size={16} />
              </button>
              <button onClick={handleDownloadImage} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Guardar Imagen">
                  <ImageIcon size={16} />
              </button>
          </div>
        </div>

        <div className="p-4" ref={chartRef}> 
          <div className="w-full overflow-x-auto pb-2">
              <div style={{ width: typeof chartWidth === 'number' ? `${chartWidth}px` : chartWidth, height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
                </ResponsiveContainer>
              </div>
          </div>
          {hiddenCount > 0 && <p className="text-xs text-center text-gray-400 mt-2">ℹ️ +{hiddenCount} registros adicionales en el CSV.</p>}
        </div>
      </div>

      {/* --- MODAL SQL --- */}
      {showSql && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Code size={18} className="text-purple-600"/> Consulta Generada
                    </h3>
                    <button onClick={() => setShowSql(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-0 bg-slate-900 overflow-auto max-h-[300px]">
                    <div className="p-4 font-mono text-sm text-green-400 whitespace-pre-wrap">
                        {sql}
                    </div>
                </div>
                
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button 
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition shadow-sm"
                    >
                        {copied ? <Check size={16} className="text-green-600"/> : <Copy size={16}/>}
                        {copied ? "¡Copiado!" : "Copiar Query"}
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
}