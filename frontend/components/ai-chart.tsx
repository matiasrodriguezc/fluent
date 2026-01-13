"use client";

import { useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { FileSpreadsheet, Image as ImageIcon } from 'lucide-react'; 
// CAMBIO 1: Importamos html-to-image en lugar de html2canvas
import { toPng } from 'html-to-image';

interface AiChartProps {
  data: any[];
  title?: string;
  type?: 'bar' | 'line' | 'pie';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#FF6B6B', '#4ECDC4'];

const MAX_ITEMS_DISPLAY = 50; 
const ITEM_WIDTH = 60; 

export function AiChart({ data, title, type = 'bar' }: AiChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

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

  // --- EXPORTAR CSV  ---
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

  // --- FUNCIÓN DE IMAGEN ---
  const handleDownloadImage = async () => {
  if (chartRef.current) {
    try {
      // Busca el div interno que tiene el ancho completo
      const chartContainer = chartRef.current.querySelector('div[style*="width"]');
      
      if (chartContainer) {
        const dataUrl = await toPng(chartContainer as HTMLElement, {
          cacheBust: true,
          backgroundColor: '#ffffff',
        });

        const link = document.createElement("a");
        link.download = `${title || "grafico"}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }
};

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
    <div className="w-full mt-4 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-gray-50/50">
        <h4 className="text-sm font-semibold text-gray-700">{title || "Análisis de Datos"}</h4>
        <div className="flex gap-2">
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
        {hiddenCount > 0 && (
            <p className="text-xs text-center text-gray-400 mt-2">
              ℹ️ +{hiddenCount} registros adicionales en el CSV exportable.
            </p>
        )}
      </div>
    </div>
  );
}