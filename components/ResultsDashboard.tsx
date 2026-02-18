
import React from 'react';
import { AuditAnalysis, UploadedFile, FileType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AlertTriangle, CheckCircle, FileText, ShieldAlert, Filter, Database, Search, LayoutDashboard, UserCheck, BarChart3 } from 'lucide-react';
import PlanValidator from './PlanValidator';
import FileUpload from './FileUpload';

interface ResultsDashboardProps {
  data: AuditAnalysis;
  reset: () => void;
  hasComparison: boolean;
  files?: Map<FileType, UploadedFile>; 
  selectedEntity?: string;
  onFileUpload: (file: File, type: FileType) => void;
  onRunAudit: () => void;
  onRemoveFile: (type: FileType) => void;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ 
  data, 
  reset, 
  hasComparison, 
  files, 
  selectedEntity,
  onFileUpload,
  onRemoveFile
}) => {
  // Updated Colors for CNSC Palette
  const chartData = hasComparison 
    ? [
        { name: 'En SIMO', value: data.stats.totalReportedSIMO, color: '#0033A0' }, // gov-blue
        { name: 'Posible Oculta', value: data.stats.potentialHidden, color: '#EF4444' }, // Red
        { name: 'Cubiertas', value: Math.max(0, data.stats.totalCareerPositions - data.stats.totalReportedSIMO - data.stats.potentialHidden), color: '#CBD5E1' }, // Gray
      ]
    : [
        { name: 'Carrera', value: data.stats.totalCareerPositions, color: '#0033A0' }, // gov-blue
        { name: 'Otros', value: Math.max(0, data.stats.totalAuthorized - data.stats.totalCareerPositions), color: '#94A3B8' }, // Slate 400
      ];

  const plantFile = files?.get(FileType.PLANT);
  const planFile = files?.get(FileType.PLAN);
  const simoFile = files?.get(FileType.SIMO);
  const rpcaFile = files?.get(FileType.RPCA);

  return (
    <div className="space-y-8 animate-fade-in-up pb-10">
      
      {/* Header Summary */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
            <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-blue-50 rounded-md">
                     <LayoutDashboard size={18} className="text-gov-blue"/>
                </div>
                <span className="text-xs font-bold text-gov-blue uppercase tracking-widest">Panel de Control</span>
            </div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            {selectedEntity ? selectedEntity : "Análisis General de Planta"}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {rpcaFile ? "Auditoría Completa (Fase 5)" : (hasComparison ? "Informe de Auditoría Integral (Fase 3)" : "Validación Estructural y Planificación (Fase 1-2)")}
          </p>
        </div>
        <button 
          onClick={reset}
          className="px-5 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 rounded-lg font-bold transition-all text-xs uppercase tracking-wide shadow-sm hover:border-gray-400"
        >
          Nueva Auditoría
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between hover:border-gov-blue/30 transition-colors duration-300">
          <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Total Planta</p>
              <p className="text-3xl font-bold text-slate-900">{data.stats.totalAuthorized}</p>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-xs text-slate-500 font-medium">
            <FileText size={14} className="mr-2" /> Registros Totales
          </div>
        </div>

        <div className="bg-gov-blue p-6 rounded-xl shadow-lg shadow-blue-900/10 flex flex-col justify-between text-white relative overflow-hidden">
           <div className="absolute right-0 top-0 p-4 opacity-10">
                <ShieldAlert size={80} />
            </div>
          <div className="relative z-10">
              <div className="flex justify-between items-start">
                <p className="text-xs text-blue-200 font-bold uppercase tracking-wider mb-2">Cargos Carrera</p>
              </div>
              <p className="text-3xl font-bold text-white">{data.stats.totalCareerPositions}</p>
          </div>
          <div className="relative z-10 mt-4 pt-4 border-t border-blue-800 flex items-center text-xs text-blue-200">
             {((data.stats.totalCareerPositions / data.stats.totalAuthorized) * 100).toFixed(1)}% del Total
          </div>
        </div>

        {hasComparison && (
          <>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between hover:border-blue-300 transition-colors duration-300">
              <div>
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-2">Oferta Pública</p>
                  <p className="text-3xl font-bold text-gov-blue">{data.stats.totalReportedSIMO}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-xs text-slate-500 font-medium">
                <CheckCircle size={14} className="mr-2 text-gov-blue" /> SIMO Confirmado
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute right-0 top-0 p-2 opacity-5">
                  <AlertTriangle size={60} className="text-red-500" />
              </div>
              <div>
                  <p className="text-xs text-red-500 font-bold uppercase tracking-wider mb-2">Riesgo / Ocultas</p>
                  <p className="text-3xl font-bold text-red-600">{data.stats.potentialHidden}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-red-50 flex items-center text-xs text-red-600 font-bold bg-red-50 w-fit px-2 py-0.5 rounded">
                 Acción Requerida
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
             <BarChart3 size={18} className="text-gov-blue" />
             <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Composición de la Planta</h3>
          </div>
          <div className="h-64 w-full flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none"/>
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#1e293b', fontSize: '12px', fontWeight: 600 }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle"/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Methodology & Observations */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200">
            <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wide flex items-center gap-2">
                <Filter size={16} className="text-gray-500" /> Metodología Aplicada
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {data.methodologyUsed}
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
             <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wide flex items-center gap-2">
                <FileText size={16} className="text-gov-blue" /> Observaciones del Auditor
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">{data.generalObservation}</p>
          </div>
        </div>
      </div>

      {/* STEP 2, 3 & 5: Plan Validator (Handles SIMO & RPCA) */}
      {planFile && selectedEntity && (
        <PlanValidator 
            plantFile={plantFile}
            planFile={planFile} 
            plantLevels={data.stats.levelBreakdown} 
            selectedEntity={selectedEntity}
            simoFile={simoFile} 
            rpcaFile={rpcaFile}
        />
      )}

      {/* PHASE 3 UPLOAD SECTION (SIMO) */}
      {!simoFile && planFile && (
        <div className="mt-12 bg-white rounded-2xl border border-gray-200 p-8 md:p-12 shadow-lg relative overflow-hidden">
             {/* Corporate Accent */}
             <div className="absolute top-0 left-0 w-2 h-full bg-gov-blue"></div>
            
            <div className="flex flex-col md:flex-row gap-10 items-center relative z-10">
                <div className="md:w-1/2">
                    <div className="inline-block p-3 bg-blue-50 rounded-xl mb-4 border border-blue-100">
                         <Database size={24} className="text-gov-blue" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">Fase 3: Cruce con Oferta Pública</h2>
                    <p className="text-slate-600 mb-6 leading-relaxed">
                       Para completar la auditoría, cargue el reporte extraído de SIMO 4.0. El sistema ejecutará un algoritmo de comparación matricial para identificar vacantes ocultas (Definitivas en Plan vs. No reportadas).
                    </p>
                    
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center gap-2 text-xs font-bold text-gov-blue mb-2 uppercase tracking-wide">
                            <Search size={12}/> Algoritmo de Verificación
                        </div>
                        <ul className="text-xs text-slate-500 space-y-2">
                            <li className="flex gap-2 items-center">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                Análisis de Columna 'G' (Nivel Jerárquico).
                            </li>
                            <li className="flex gap-2 items-center">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                Conteo directo de filas (1 Fila = 1 Registro).
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="md:w-1/2 w-full">
                    <div className="bg-white rounded-xl shadow-sm">
                         <FileUpload 
                            label="Cargar Reporte SIMO" 
                            description="Excel (.xlsx) - Formato estándar"
                            type={FileType.SIMO}
                            file={simoFile}
                            onFileSelect={onFileUpload}
                            onRemove={onRemoveFile}
                            colorClass="gov"
                        />
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* PHASE 5 UPLOAD SECTION (RPCA) */}
      {simoFile && !rpcaFile && (
        <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-8 md:p-12 shadow-lg relative overflow-hidden">
             <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>

             <div className="flex flex-col md:flex-row gap-10 items-center relative z-10">
                <div className="md:w-1/2">
                    <div className="inline-block p-3 bg-emerald-50 rounded-xl mb-4 border border-emerald-100">
                         <UserCheck size={24} className="text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">Fase 5: Validación Derechos de Carrera (RPCA)</h2>
                    <p className="text-slate-600 mb-6 leading-relaxed">
                       <strong>Paso Final:</strong> Cargue la base de datos del Registro Público de Carrera Administrativa (RPCA). 
                       El sistema validará si el número de personas con derechos de carrera coincide con las plazas ocupadas calculadas (Planta - Vacantes Definitivas).
                    </p>
                    
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                            <Database size={12}/> Campos Requeridos (Excel)
                        </div>
                        <p className="text-xs text-slate-500 leading-normal">
                            Servidor, nombre_capitulo, Tramite, nombre_tipotramite, nombre_empleo, codigo_empleo, grado_empleo, nombre_nivel, estado_tramite, Concepto.
                        </p>
                    </div>
                </div>

                <div className="md:w-1/2 w-full">
                     <FileUpload 
                        label="Cargar Base de Datos RPCA" 
                        description="Excel (.xlsx) - Reporte de inscritos"
                        type={FileType.RPCA}
                        file={rpcaFile}
                        onFileSelect={onFileUpload}
                        onRemove={onRemoveFile}
                        colorClass="emerald"
                    />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ResultsDashboard;
