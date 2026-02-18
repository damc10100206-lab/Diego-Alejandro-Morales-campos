
import React from 'react';
import { UploadedFile } from '../types';
import { Database, FileSpreadsheet, List, Columns, Users, Briefcase, Award } from 'lucide-react';

interface FilePreviewProps {
  file: UploadedFile;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file }) => {
  if (!file.preview) return null;

  const { headers, rowCount, rows, sheetName, stats } = file.preview;

  // Limit columns for preview to avoid horizontal scroll hell if too many
  const previewHeaders = headers.slice(0, 8);
  const remainingHeaders = headers.length - 8;

  // Find the column used for "Nature" to use in highlighting
  const natureCol = headers.find(h => /Naturaleza|Vinculación|Vinculacion/i.test(h));

  const getRowClass = (row: any) => {
    if (!natureCol) return 'hover:bg-gray-50';
    
    const val = String(row[natureCol] || '').toLowerCase();
    if (val.includes('carrera') || val.includes('administrativa')) {
        return 'bg-green-50/70 hover:bg-green-100 border-l-4 border-green-500';
    }
    if (val.includes('libre') || val.includes('nombramiento')) {
        return 'bg-orange-50/70 hover:bg-orange-100 border-l-4 border-orange-400';
    }
    return 'hover:bg-gray-50 border-l-4 border-transparent';
  };

  return (
    <div className="w-full mt-8 animate-fade-in-up">
        {/* Card Header with Stats */}
        <div className="bg-white rounded-t-3xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-start gap-6 relative overflow-hidden">
            {/* Decorative background blur */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -mr-20 -mt-20 pointer-events-none"></div>

            <div className="flex items-center gap-5 relative z-10">
                <div className="bg-gradient-to-br from-indigo-600 to-blue-600 p-4 rounded-2xl shadow-lg text-white">
                    <FileSpreadsheet size={32} strokeWidth={1.5} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">Estructura Detectada</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-sm font-medium text-gray-500">Archivo:</span>
                        <span className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            {file.file.name}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 relative z-10 w-full md:w-auto">
                {/* KPI: Total Rows/Jobs */}
                <div className="flex-1 min-w-[120px] bg-white border border-gray-100 p-3 rounded-xl shadow-sm flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                        {stats ? 'TOTAL EMPLEOS' : 'REGISTROS'}
                    </span>
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
                        <Users size={18} className="text-indigo-400" />
                        {stats ? stats.totalPositions.toLocaleString() : rowCount.toLocaleString()}
                    </div>
                </div>

                {/* KPI: Career Positions */}
                {stats && (
                    <div className="flex-1 min-w-[120px] bg-green-50 border border-green-100 p-3 rounded-xl shadow-sm flex flex-col items-center">
                        <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">
                            CARRERA ADMIN.
                        </span>
                        <div className="flex items-center gap-2 text-green-700 font-bold text-xl">
                            <Award size={18} className="text-green-500" />
                            {stats.careerPositions.toLocaleString()}
                        </div>
                    </div>
                )}
                
                 {/* KPI: Other Positions */}
                 {stats && (
                    <div className="flex-1 min-w-[120px] bg-gray-50 border border-gray-100 p-3 rounded-xl shadow-sm flex flex-col items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                            OTRA NATURALEZA
                        </span>
                        <div className="flex items-center gap-2 text-gray-600 font-bold text-xl">
                            <Briefcase size={18} className="text-gray-400" />
                            {stats.otherPositions.toLocaleString()}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Data Preview Section */}
        <div className="bg-white rounded-b-3xl shadow-xl border-x border-b border-gray-100 p-6 pt-2">
            
            {/* Column Tags */}
            <div className="mb-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 bg-gray-100 rounded text-gray-500">
                        <Database size={14} />
                    </div>
                    <span className="text-sm font-bold text-gray-700">Columnas ({headers.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {headers.slice(0, 10).map((header, idx) => (
                        <span key={idx} className={`px-2 py-1 text-[10px] font-semibold rounded border transition-colors cursor-default ${
                           natureCol === header ? 'bg-green-100 text-green-700 border-green-200 ring-1 ring-green-300' : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>
                            {header}
                        </span>
                    ))}
                    {headers.length > 10 && (
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-semibold rounded border border-indigo-100">
                            +{headers.length - 10} más...
                        </span>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm ring-1 ring-black/5">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-sm text-left relative">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 w-10 text-center text-[10px] font-bold text-gray-400 uppercase bg-gray-100">#</th>
                                {previewHeaders.map((header, idx) => (
                                    <th key={idx} className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50">
                                        {header}
                                    </th>
                                ))}
                                {remainingHeaders > 0 && <th className="px-4 py-3 bg-gray-50"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {rows.map((row, idx) => (
                                <tr key={idx} className={`transition-colors text-xs ${getRowClass(row)}`}>
                                    <td className="px-4 py-3 text-center text-gray-400 font-mono">
                                        {idx + 1}
                                    </td>
                                    {previewHeaders.map((header, hIdx) => (
                                        <td key={hIdx} className="px-6 py-3 text-gray-600 whitespace-nowrap max-w-[250px] truncate">
                                            {row[header] !== undefined && row[header] !== null && row[header] !== '' ? (
                                                <span title={String(row[header])}>{String(row[header])}</span>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                    ))}
                                    {remainingHeaders > 0 && (
                                        <td className="px-4 py-3 text-center text-gray-400 italic">...</td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="mt-3 text-center">
                <span className="text-xs text-gray-400">
                    Mostrando {rows.length} registros cargados
                </span>
            </div>
        </div>
    </div>
  );
};

export default FilePreview;
