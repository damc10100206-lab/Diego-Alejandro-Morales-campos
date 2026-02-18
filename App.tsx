
import React, { useState, useEffect, useRef } from 'react';
import { FileType, UploadedFile, AnalysisState, FilePreviewData, LevelStats } from './types';
import FileUpload from './components/FileUpload';
import ResultsDashboard from './components/ResultsDashboard';
import FilePreview from './components/FilePreview';
import { analyzeDocuments } from './services/geminiService';
import { generatePlantTemplate } from './services/templateGenerator';
import { Search, BrainCircuit, ShieldCheck, ShieldAlert, Building2, ChevronDown, X, CheckCircle, ChevronRight, FileSearch, Mail, FileDown, Info } from 'lucide-react';
import * as XLSX from 'xlsx';

function App() {
  const [files, setFiles] = useState<Map<FileType, UploadedFile>>(new Map());
  const [analysis, setAnalysis] = useState<AnalysisState>({
    isLoading: false,
    error: null,
    result: null,
  });

  const [entities, setEntities] = useState<string[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [parsingPlan, setParsingPlan] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const generatePreview = (file: File): Promise<FilePreviewData | undefined> => {
    return new Promise((resolve) => {
      const isSpreadsheet = /\.(xlsx|xls|csv)$/i.test(file.name) || file.type === 'text/csv';
      
      if (!isSpreadsheet) {
        resolve(undefined);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
          if (!workbook.SheetNames.length) {
            resolve(undefined);
            return;
          }
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const jsonArray = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
          
          if (jsonArray.length > 0) {
            let headerRowIndex = 0;
            let maxCols = 0;

            for (let i = 0; i < Math.min(jsonArray.length, 20); i++) {
              const row = jsonArray[i];
              if (Array.isArray(row)) {
                const nonEmptyCols = row.filter(cell => cell !== null && cell !== undefined && cell !== '').length;
                if (nonEmptyCols > maxCols) {
                  maxCols = nonEmptyCols;
                  headerRowIndex = i;
                }
              }
            }
            
            const headers = (jsonArray[headerRowIndex] as string[]).map(h => String(h || '').trim());
            const cleanHeaders = headers.filter(h => h && h.length > 0);
            const rawRows = jsonArray.slice(headerRowIndex + 1);
            
            const rows = rawRows.map((row: any[]) => {
              const rowObj: any = {};
              headers.forEach((h, i) => {
                if (h) {
                  rowObj[h] = row[i];
                }
              });
              return rowObj;
            }).filter(r => Object.keys(r).length > 0);

            // Logic to calculate stats...
            let totalPositions = 0;
            let careerPositions = 0;
            const levels: LevelStats = { asesor: 0, profesional: 0, tecnico: 0, asistencial: 0, directivo: 0 };

            const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

            let qtyCol = '';
            let levelCol = '';
            let natureCol = '';

            const checkHeader = (h: string, keywords: string[]) => {
                const n = normalize(h);
                return keywords.some(k => n.includes(k) || n === k);
            };

            const qtyKeywords = ['cantidad', 'total', 'no. empleo', 'num empleo', 'plazas', 'vacantes', 'numero', 'no.', 'cant'];
            const levelKeywords = ['nivel', 'jerarqui', 'denominacion']; 
            const natureKeywords = ['naturaleza', 'vinculacion', 'clase', 'tipo'];

            if (headers[4] && checkHeader(headers[4], qtyKeywords)) {
                qtyCol = headers[4];
            } else {
                qtyCol = headers.find(h => checkHeader(h, qtyKeywords)) || '';
            }

            if (headers[5] && checkHeader(headers[5], levelKeywords)) {
                levelCol = headers[5];
            } else {
                levelCol = headers.find(h => checkHeader(h, levelKeywords)) || '';
            }

            natureCol = headers.find(h => checkHeader(h, natureKeywords)) || '';

            rows.forEach(r => {
                const vals = Object.values(r).map(v => normalize(String(v)));
                if (vals.some(v => v === 'total' || v.startsWith('total ') || v.includes('total general'))) return;

                let qty = 1;
                if (qtyCol && r[qtyCol] !== undefined) {
                    const val = r[qtyCol];
                    if (typeof val === 'number') {
                        qty = val;
                    } else if (typeof val === 'string') {
                         const match = val.trim().match(/^(\d+)/); 
                         if (match) qty = parseInt(match[1], 10);
                    }
                }
                
                totalPositions += qty;
                
                let isCareer = false;
                if (natureCol && r[natureCol]) {
                    const nature = normalize(String(r[natureCol]));
                    if (
                        (nature.includes('carrera') || nature.includes('administrativ') || nature.includes('reglamentar') || nature.includes('periodo de prueba')) &&
                        !nature.includes('libre nombramiento') &&
                        !nature.includes('provisional')
                    ) {
                        isCareer = true;
                    }
                } 

                if (isCareer) {
                    careerPositions += qty;
                    let levelStr = '';
                    if (levelCol && r[levelCol]) {
                        levelStr = String(r[levelCol]);
                    } 
                    
                    const normLevel = normalize(levelStr);
                    
                    if (normLevel.includes('asesor')) levels.asesor += qty;
                    else if (normLevel.includes('profesional')) levels.profesional += qty;
                    else if (normLevel.includes('tecnico') || normLevel.includes('técnico')) levels.tecnico += qty;
                    else if (normLevel.includes('asistencial') || normLevel.includes('auxiliar') || normLevel.includes('secretari') || normLevel.includes('conductor') || normLevel.includes('celador') || normLevel.includes('operario') || normLevel.includes('ayudante')) levels.asistencial += qty;
                    else if (normLevel.includes('directiv')) levels.directivo += qty;
                }
            });
            
            if (totalPositions === 0) totalPositions = rows.length;

            resolve({
              headers: cleanHeaders,
              rowCount: rows.length,
              rows: rows,
              sheetName: firstSheetName,
              stats: {
                totalPositions,
                careerPositions,
                otherPositions: totalPositions - careerPositions,
                levelBreakdown: levels
              }
            });
          } else {
            resolve(undefined);
          }
        } catch (err) {
          console.error("Error generating preview", err);
          resolve(undefined);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const loadEntitiesFromPlan = (file: File) => {
    setParsingPlan(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

        const uniqueEntities = new Set<string>();
        json.forEach((row, idx) => {
          if (idx > 3 && row[2]) {
            uniqueEntities.add(String(row[2]).trim());
          }
        });
        setEntities(Array.from(uniqueEntities).sort());
      } catch (err) {
        console.error("Error parsing Plan entities", err);
      } finally {
        setParsingPlan(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileSelect = async (file: File, type: FileType) => {
    const previewData = await generatePreview(file);
    const newFiles = new Map(files);
    newFiles.set(type, { file, type, preview: previewData });
    setFiles(newFiles);

    if (type === FileType.PLAN) {
        loadEntitiesFromPlan(file);
        setSelectedEntity('');
        setSearchTerm('');
    }
    
    if (analysis.error) setAnalysis(prev => ({ ...prev, error: null }));
  };

  const handleRemoveFile = (type: FileType) => {
    const newFiles = new Map(files);
    newFiles.delete(type);
    setFiles(newFiles);
    
    if (type === FileType.PLAN) {
        setEntities([]);
        setSelectedEntity('');
        setSearchTerm('');
    }
  };

  const handleEntitySelect = (entity: string) => {
    setSelectedEntity(entity);
    setSearchTerm(entity);
    setIsDropdownOpen(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setSelectedEntity('');
    setIsDropdownOpen(true);
  };

  const clearSelection = () => {
    setSearchTerm('');
    setSelectedEntity('');
    setIsDropdownOpen(true);
  };

  const handleAudit = async () => {
    if (files.size === 0) {
      setAnalysis(prev => ({ ...prev, error: "Por favor cargue la Planta de Personal." }));
      return;
    }
    if (files.has(FileType.PLAN) && !selectedEntity) {
        setAnalysis(prev => ({ ...prev, error: "Debe seleccionar una Entidad para continuar." }));
        return;
    }

    setAnalysis(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const filesArray: UploadedFile[] = Array.from(files.values());
      const plantPreviewStats = files.get(FileType.PLANT)?.preview?.stats;
      const result = await analyzeDocuments(filesArray, plantPreviewStats);
      setAnalysis({ isLoading: false, error: null, result });
    } catch (err: any) {
      setAnalysis({ 
        isLoading: false, 
        error: "Error procesando los archivos. Verifique que sean formatos Excel válidos.", 
        result: null 
      });
    }
  };

  const resetAudit = () => {
    setFiles(new Map());
    setAnalysis({ isLoading: false, error: null, result: null });
    setEntities([]);
    setSelectedEntity('');
    setSearchTerm('');
  };

  const plantFile = files.get(FileType.PLANT);
  const planFile = files.get(FileType.PLAN);
  const hasSimo = files.has(FileType.SIMO);
  const filteredEntities = entities.filter(e => e.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col min-h-screen font-sans bg-gray-50 text-slate-800">
      
      {/* CORPORATE HEADER */}
      <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-gov-blue to-blue-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
                <div className="flex items-center gap-4">
                    <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                        <ShieldCheck size={28} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight leading-none">CNSC EARM</h1>
                        <p className="text-xs text-blue-100 font-light mt-0.5">Sistema de Auditoría de Vacantes</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                     <span className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-800 text-blue-100 border border-blue-700">
                        v2.2 Local
                     </span>
                </div>
            </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {analysis.result ? (
           <div className="animate-fade-in-up">
              {analysis.isLoading ? (
                 <div className="flex flex-col items-center justify-center min-h-[50vh] animate-pulse">
                    <div className="w-16 h-16 border-4 border-gray-200 border-t-gov-blue rounded-full animate-spin mb-6"></div>
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">AUDITANDO ENTIDAD...</h3>
                    <p className="text-slate-500 mt-2 tracking-wide text-xs uppercase">Procesando Planta vs Plan vs SIMO</p>
                 </div>
              ) : (
                <ResultsDashboard 
                   data={analysis.result} 
                   reset={resetAudit} 
                   hasComparison={hasSimo} 
                   files={files}
                   selectedEntity={selectedEntity} 
                   onFileUpload={handleFileSelect} 
                   onRunAudit={handleAudit} 
                   onRemoveFile={handleRemoveFile} 
                />
              )}
           </div>
        ) : (
          <div className="animate-fade-in-up">
              {/* WELCOME SECTION */}
              <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
                    Auditoría de Vacantes Públicas
                  </h2>
                  <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    Herramienta institucional para la identificación de inconsistencias en reportes de carrera administrativa y validación de oferta pública (OPEC).
                  </p>
              </div>

              {/* CARD CONTAINER */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 md:p-10">
                
                {/* Header with Template Download */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-gov-blue">
                       <FileSearch size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Carga de Documentos Fuente</h3>
                        <p className="text-xs text-slate-500 hidden md:block">Suba los archivos en formato Excel para iniciar el análisis.</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={generatePlantTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gov-blue text-gov-blue text-xs font-bold rounded-lg hover:bg-blue-50 transition-all shadow-sm active:scale-95"
                    title="Descargar formato oficial con instructivo"
                  >
                    <FileDown size={16} />
                    DESCARGAR PLANTILLA OFICIAL
                  </button>
                </div>
                
                {/* Hints for Users */}
                <div className="mb-6 p-3 bg-blue-50/50 border border-blue-100 rounded-lg flex items-start gap-3">
                    <Info size={18} className="text-gov-blue mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-600">
                        <strong>Nota para Profesionales:</strong> Para evitar errores de lectura, recomendamos usar la "Plantilla Oficial" descargable. Asegúrese de que las columnas de "Naturaleza" y "Nivel Jerárquico" estén diligenciadas correctamente.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FileUpload 
                    label="1. Planta de Personal" 
                    description="Archivo maestro de cargos (Excel/CSV)."
                    type={FileType.PLANT}
                    file={files.get(FileType.PLANT)}
                    onFileSelect={handleFileSelect}
                    onRemove={handleRemoveFile}
                    colorClass="gov"
                  />
                  <FileUpload 
                    label="2. Plan Anual de Vacantes" 
                    description="Formato Único de Reporte (FURAG/Excel)."
                    type={FileType.PLAN}
                    file={files.get(FileType.PLAN)}
                    onFileSelect={handleFileSelect}
                    onRemove={handleRemoveFile}
                    colorClass="gov"
                  />
                </div>

                {plantFile && plantFile.preview && (
                  <div className="mt-8 border-t border-gray-100 pt-8">
                    <FilePreview file={plantFile} />
                  </div>
                )}

                {/* ENTITY SELECTION */}
                {files.has(FileType.PLAN) && (
                  <div className="mt-10 bg-gray-50 p-6 rounded-xl border border-gray-200" ref={dropdownRef}>
                      <div className="flex items-center justify-between mb-4">
                          <label className="text-sm font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wide">
                              <Building2 className="text-gov-blue" size={18} />
                              Seleccionar Entidad Auditada
                          </label>
                          {parsingPlan && <span className="text-xs text-gov-blue font-medium animate-pulse">Procesando archivo...</span>}
                      </div>

                      <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                              <Search className="text-gray-400" size={18} />
                          </div>
                          
                          <input
                              type="text"
                              className={`block w-full pl-11 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-gov-blue focus:border-gov-blue bg-white text-slate-900 placeholder-gray-400 shadow-sm transition-all text-base font-medium ${
                                  selectedEntity ? 'border-gov-blue ring-1 ring-gov-blue' : 'border-gray-300 hover:border-gray-400'
                              }`}
                              placeholder={entities.length > 0 ? "Buscar entidad en el Plan Anual..." : "Esperando archivo..."}
                              value={searchTerm}
                              onChange={handleSearchChange}
                              onFocus={() => setIsDropdownOpen(true)}
                              disabled={entities.length === 0}
                          />

                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center gap-2">
                              {selectedEntity && (
                                  <span className="flex items-center gap-1 text-gov-blue text-xs font-bold bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                      <CheckCircle size={12}/> SELECCIONADO
                                  </span>
                              )}
                              {searchTerm && (
                                  <button onClick={clearSelection} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                                      <X size={16} />
                                  </button>
                              )}
                              <ChevronDown size={18} className="text-gray-400" />
                          </div>

                          {isDropdownOpen && entities.length > 0 && (
                              <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 overflow-y-auto custom-scrollbar">
                                  {filteredEntities.length > 0 ? (
                                      filteredEntities.map((entity, idx) => (
                                          <div 
                                              key={idx}
                                              className={`px-4 py-3 cursor-pointer text-sm border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors flex items-center justify-between ${
                                                  entity === selectedEntity ? 'bg-blue-50 text-gov-blue font-bold' : 'text-slate-600'
                                              }`}
                                              onClick={() => handleEntitySelect(entity)}
                                          >
                                              {entity}
                                              {entity === selectedEntity && <CheckCircle size={14} className="text-gov-blue"/>}
                                          </div>
                                      ))
                                  ) : (
                                      <div className="px-4 py-8 text-gray-400 text-sm text-center italic">No se encontraron resultados</div>
                                  )}
                              </div>
                          )}
                      </div>
                  </div>
                )}

                {analysis.error && (
                  <div className="mt-8 p-4 bg-red-50 text-red-800 rounded-lg flex items-center border border-red-100 shadow-sm">
                    <ShieldAlert size={20} className="mr-3 flex-shrink-0" />
                    <p className="text-sm font-medium">{analysis.error}</p>
                  </div>
                )}

                <div className="mt-12 flex justify-end">
                  {analysis.isLoading ? (
                      <button disabled className="px-6 py-3 bg-gray-100 text-gray-400 rounded-lg font-bold flex items-center cursor-wait">
                          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin mr-3"></div>
                          Procesando...
                      </button>
                  ) : (
                      <button 
                          onClick={handleAudit}
                          disabled={files.size < 1 || (files.has(FileType.PLAN) && !selectedEntity)}
                          className={`px-6 py-3 rounded-lg font-bold text-sm uppercase tracking-wide shadow-md transition-all duration-300 flex items-center ${
                          (files.size < 1 || (files.has(FileType.PLAN) && !selectedEntity))
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200'
                              : 'bg-gov-blue text-white hover:bg-blue-800 hover:shadow-lg hover:-translate-y-0.5' 
                          }`}
                      >
                          {planFile ? "Iniciar Auditoría Completa" : "Analizar Planta"}
                          <ChevronRight size={18} className="ml-2" />
                      </button>
                  )}
                </div>
              </div>
          </div>
        )}
      </main>

      {/* CORPORATE FOOTER */}
      <footer className="bg-gov-dark text-white py-12 border-t-4 border-gov-blue">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                     <h2 className="text-lg font-bold text-white mb-1">CNSC - Comisión Nacional del Servicio Civil</h2>
                     <p className="text-sm text-gray-400">Despacho EARM - Equipo de Auditoría y Riesgo</p>
                     <p className="text-xs text-gray-500 mt-4">© CNSC- Despacho EARM- 2026. Todos los derechos reservados.</p>
                </div>
                <div className="text-center md:text-right">
                    <div className="inline-flex flex-col items-center md:items-end">
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Contacto y Soporte</span>
                         <a href="mailto:apsanchez@cnsc.gov.co" className="flex items-center gap-2 text-sm text-blue-200 hover:text-white transition-colors duration-300 mb-1">
                            <Mail size={14} /> apsanchez@cnsc.gov.co
                         </a>
                         <a href="mailto:dmorales@cnsc.gov.co" className="flex items-center gap-2 text-sm text-blue-200 hover:text-white transition-colors duration-300">
                            <Mail size={14} /> dmorales@cnsc.gov.co
                         </a>
                    </div>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
