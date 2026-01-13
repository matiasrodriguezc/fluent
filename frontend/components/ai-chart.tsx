"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

interface AiChartProps {
  data: any[];
  title?: string;
  type?: 'bar' | 'line' | 'pie';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#FF6B6B', '#4ECDC4'];

// CONFIGURACIÓN DE LÍMITES
const MAX_ITEMS_DISPLAY = 50; // Si hay más de 50, cortamos y mostramos aviso
const ITEM_WIDTH = 60; // Píxeles estimados por barra/punto para calcular el scroll

export function AiChart({ data, title, type = 'bar' }: AiChartProps) {
  if (!data || data.length === 0) return null;

  const keys = Object.keys(data[0]);
  if (keys.length < 2) return <p className="text-sm text-red-500">Datos insuficientes</p>;

  const xKey = keys[0];
  const yKey = keys[1];

  // 1. LÓGICA DE CORTE DE DATOS
  const totalItems = data.length;
  const displayData = data.slice(0, MAX_ITEMS_DISPLAY);
  const hiddenCount = totalItems - MAX_ITEMS_DISPLAY;

  // 2. CÁLCULO DE ANCHO DINÁMICO (Para el Scroll)
  // Si es Pie, usamos 100%. Si es Bar/Line, calculamos ancho basado en cantidad de datos.
  const isScrollable = type !== 'pie' && displayData.length > 4; 
  const chartWidth = isScrollable ? Math.max(1000, displayData.length * ITEM_WIDTH) : '100%';

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={displayData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis 
                dataKey={xKey} 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#6B7280', fontSize: 12}} 
                dy={10} 
                interval={0} // Fuerza a mostrar todas las etiquetas
                angle={-45}  // Las inclina si están muy apretadas
                textAnchor="end"
                height={60}
            />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
            <Tooltip 
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                cursor={{stroke: '#E5E7EB', strokeWidth: 2}}
            />
            <Line type="monotone" dataKey={yKey} stroke="#2563EB" strokeWidth={3} dot={{r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#fff'}} />
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey={yKey}
              nameKey={xKey}
            >
              {displayData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
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
            <XAxis 
                dataKey={xKey} 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#6B7280', fontSize: 12}} 
                dy={10} 
                interval={0} // Muestra todas
                angle={-45}
                textAnchor="end"
                height={60}
            />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
            <Tooltip 
                cursor={{fill: '#F3F4F6'}}
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
            />
            <Bar dataKey={yKey} fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        );
    }
  };

  return (
    <div className="w-full mt-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col">
      {title && <h4 className="text-sm font-semibold text-gray-700 mb-4">{title}</h4>}
      
      {/* WRAPPER CON SCROLL: overflow-x-auto habilita el scroll si el contenido es ancho */}
      <div className="w-full overflow-x-auto pb-2">
          {/* CONTENEDOR DE TAMAÑO DINÁMICO */}
          <div style={{ width: typeof chartWidth === 'number' ? `${chartWidth}px` : chartWidth, height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
            </ResponsiveContainer>
          </div>
      </div>

      {/* MENSAJE DE LÍMITE (Si hay más datos de los que mostramos) */}
      {hiddenCount > 0 && (
          <p className="text-xs text-center text-gray-400 mt-2 bg-gray-50 py-1 rounded">
            ℹ️ Mostrando los primeros {MAX_ITEMS_DISPLAY} resultados. Hay {hiddenCount} más que no entran en el gráfico.
          </p>
      )}
    </div>
  );
}