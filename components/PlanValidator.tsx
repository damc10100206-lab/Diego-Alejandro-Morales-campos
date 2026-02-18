
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { UploadedFile, LevelStats } from '../types';
import { 
    CheckCircle, AlertTriangle, Building2, TrendingUp, 
    PieChart as PieIcon, Users, Briefcase, Activity, 
    AlertOctagon, ArrowRight, FileText, ClipboardCheck, Scale, Download, UserCheck, Table, Filter
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface PlanValidatorProps {
  plantFile?: UploadedFile; // Base 1: Planta (Step 1)
  planFile: UploadedFile;   // Base 2: Plan Anual (Step 2)
  plantLevels: LevelStats | undefined;
  selectedEntity: string;
  simoFile?: UploadedFile;  // Base 3: SIMO (Step 3)
  rpcaFile?: UploadedFile;  // Base 4: RPCA (Step 5)
}

interface EntityKPIs {
    totalPositions: number;
    totalVacancies: number;
    totalOccupied: number;
    vacancyRate: number;
    occupancyRate: number;
}

interface ValidationData {
  entity: string;
  careerTotals: LevelStats; 
  vacancyTotals: LevelStats; 
  kpis: EntityKPIs;
}

interface SimoValidationData {
    totals: LevelStats;
    totalRows: number;
}

interface RpcaValidationData {
    totalRegistered: number;
    rows: any[];
}

interface DetailedAuditRow {
    key: string; // CODE-LEVEL-GRADE
    denomination: string;
    nature: string;
    plantQty: number;
    simoQty: number;
    rpcaQty: number;
    hiddenVacancies: number; // (Plant - SIMO) - RPCA
}

// Colors
const COLORS = ['#0F172A', '#334155', '#64748B', '#94A3B8', '#CBD5E1']; 

// Helper to normalize text
const normalize = (text: any) => String(text || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// STRICT KEY GENERATOR: CODE - LEVEL - GRADE
// Normalization logic: Code (Trim/Upper), Level (Trim/Upper), Grade (Strip leading zeros)
const generateKey = (code: any, level: any, grade: any) => {
    const c = String(code || '').trim().toUpperCase();
    const l = String(level || 'N/A').trim().toUpperCase();
    
    // Normalize grade: handle "08" vs "8" vs "008" -> "8"
    let g = String(grade || '0').trim();
    if (/^\d+$/.test(g)) {
        g = String(parseInt(g, 10)); // Converts "05" to "5"
    }
    
    return `${c}-${l}-${g}`;
};

// DYNAMIC COLUMN FINDER HELPER (Used in Module 5)
const findHeaderIndex = (headers: string[], keywords: string[]): number => {
    const normalizedHeaders = headers.map(h => normalize(h));
    
    // 1. Exact match attempt
    for (const k of keywords) {
        const idx = normalizedHeaders.findIndex(h => h === k);
        if (idx !== -1) return idx;
    }
    
    // 2. Partial match attempt
    for (const k of keywords) {
        const idx = normalizedHeaders.findIndex(h => h.includes(k));
        if (idx !== -1) return idx;
    }
    
    return -1;
};

// SMART HEADER ROW DETECTOR
// Scans the first 50 rows to find the one that likely contains the headers
const findBestHeaderRow = (rows: any[], requiredKeywords: string[]): number => {
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
        const row = rows[i];
        if (!Array.isArray(row)) continue;
        const rowStr = row.map(c => normalize(c)).join(' ');
        
        // If row contains ANY of the strong keywords (e.g. "codigo", "nivel"), it's likely the header
        if (requiredKeywords.some(k => rowStr.includes(k))) {
            return i;
        }
    }
    return 0; // Default to first row if not found
};

const PlanValidator: React.FC<PlanValidatorProps> = ({ plantFile, planFile, plantLevels, selectedEntity, simoFile, rpcaFile }) => {
  const [validationData, setValidationData] = useState<ValidationData | null>(null);
  const [simoData, setSimoData] = useState<SimoValidationData | null>(null);
  const [rpcaData, setRpcaData] = useState<RpcaValidationData | null>(null);
  const [detailedAudit, setDetailedAudit] = useState<DetailedAuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    if (planFile && planFile.file && selectedEntity) {
      analyzeEntityData(selectedEntity);
    }
  }, [planFile, selectedEntity]);

  useEffect(() => {
    if (simoFile && simoFile.file) {
        analyzeSimoData();
    } else {
        setSimoData(null);
    }
  }, [simoFile]);

  useEffect(() => {
    if (rpcaFile && rpcaFile.file) {
        analyzeRpcaData();
    } else {
        setRpcaData(null);
    }
  }, [rpcaFile]);

  // TRIGGER MODULE 5 LOGIC
  useEffect(() => {
      if (plantFile && simoFile) {
          processModule5();
      }
  }, [plantFile, simoFile, rpcaFile]);

  // -----------------------------------------------------------------------
  // PHASE 2: PLAN ANUAL (Fixed Columns for FURAG Standard)
  // -----------------------------------------------------------------------
  const analyzeEntityData = (entity: string) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

        let careerTotals = { ases: 0, prof: 0, tec: 0, asist: 0, dir: 0 };
        let vacancyTotals = { ases: 0, prof: 0, tec: 0, asist: 0, dir: 0 };

        json.forEach((row, idx) => {
          // Standard FURAG: Row 2 usually Entity Name
          if (idx > 3 && String(row[2]).trim() === entity) {
              const p = (idx: number) => {
                  const val = parseInt(row[idx]);
                  return isNaN(val) ? 0 : val;
              };

              // Fixed indices for Plan Anual
              careerTotals.ases += p(19); 
              careerTotals.prof += p(20); 
              careerTotals.tec += p(21);  
              careerTotals.asist += p(22); 
              
              vacancyTotals.ases += p(25); 
              vacancyTotals.prof += p(26); 
              vacancyTotals.tec += p(27); 
              vacancyTotals.asist += p(28); 
          }
        });

        const totalPos = careerTotals.ases + careerTotals.prof + careerTotals.tec + careerTotals.asist;
        const totalVac = vacancyTotals.ases + vacancyTotals.prof + vacancyTotals.tec + vacancyTotals.asist;
        
        setValidationData({
          entity,
          careerTotals: {
              asesor: careerTotals.ases,
              profesional: careerTotals.prof,
              tecnico: careerTotals.tec,
              asistencial: careerTotals.asist,
              directivo: 0 
          },
          vacancyTotals: {
              asesor: vacancyTotals.ases,
              profesional: vacancyTotals.prof,
              tecnico: vacancyTotals.tec,
              asistencial: vacancyTotals.asist,
              directivo: 0
          },
          kpis: {
              totalPositions: totalPos,
              totalVacancies: totalVac,
              totalOccupied: totalPos - totalVac,
              vacancyRate: totalPos > 0 ? (totalVac / totalPos) * 100 : 0,
              occupancyRate: totalPos > 0 ? ((totalPos - totalVac) / totalPos) * 100 : 0
          }
        });
      } catch (err) {
        console.error("Error analyzing Plan data", err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(planFile.file);
  };

  // -----------------------------------------------------------------------
  // PHASE 3: SIMO OVERVIEW (Smart Dynamic Logic)
  // Updated to match Module 5 robustness
  // -----------------------------------------------------------------------
  const analyzeSimoData = () => {
    if (!simoFile) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

            let totals = { ases: 0, prof: 0, tec: 0, asist: 0, dir: 0 };
            let rowCount = 0;

            if (json.length > 0) {
                // Use smart header detection
                const headerRowIdx = findBestHeaderRow(json, ['codigo', 'código', 'empleo', 'vacantes', 'nivel']);
                const headers = (json[headerRowIdx] as any[]).map(h => normalize(h));
                const rows = json.slice(headerRowIdx + 1);

                const levelIdx = findHeaderIndex(headers, ['nivel', 'jerarqui', 'jerarquico']);
                const vacIdx = findHeaderIndex(headers, ['vacantes', 'total', 'cantidad']);

                rows.forEach((row) => {
                    if (!Array.isArray(row)) return;

                    let nivel = '';
                    // Try dynamic column first
                    if (levelIdx > -1 && row[levelIdx]) {
                         nivel = String(row[levelIdx]).toLowerCase();
                    } 
                    // Fallback to Column G (Index 6) only if dynamic failed and col exists
                    else if (row[6]) {
                         nivel = String(row[6]).toLowerCase();
                    }

                    if (nivel) {
                        let qty = 1;
                        // Use quantity column if available
                        if (vacIdx > -1 && row[vacIdx]) {
                             const val = row[vacIdx];
                             if (typeof val === 'number') qty = val;
                             else if (typeof val === 'string') {
                                // Robust number parsing
                                const clean = val.trim();
                                const match = clean.match(/^(\d+)/);
                                if (match) qty = parseInt(match[1], 10);
                             }
                        }

                        rowCount += qty;
                        
                        if (nivel.includes('asesor')) totals.ases += qty;
                        else if (nivel.includes('profesional')) totals.prof += qty;
                        else if (nivel.includes('técnico') || nivel.includes('tecnico')) totals.tec += qty;
                        else if (nivel.includes('asistencial')) totals.asist += qty;
                        else if (nivel.includes('directivo')) totals.dir += qty;
                    }
                });
            }

            setSimoData({
                totals: {
                    asesor: totals.ases,
                    profesional: totals.prof,
                    tecnico: totals.tec,
                    asistencial: totals.asist,
                    directivo: totals.dir
                },
                totalRows: rowCount
            });

        } catch (err) {
            console.error("Error parsing SIMO", err);
        }
    };
    reader.readAsArrayBuffer(simoFile.file);
  };

  const analyzeRpcaData = () => {
      if (!rpcaFile) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              const sheet = workbook.Sheets[workbook.SheetNames[0]];
              const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
              setRpcaData({
                  totalRegistered: json.length - 1, 
                  rows: json
              });
          } catch (err) {
              console.error("Error parsing RPCA", err);
          }
      };
      reader.readAsArrayBuffer(rpcaFile.file);
  };

  // -----------------------------------------------------------------------
  // MODULE 5: DYNAMIC CROSS-REFERENCE (Plant - SIMO - RPCA)
  // Improved to find header rows dynamically (fixes missing table issue)
  // -----------------------------------------------------------------------
  const processModule5 = async () => {
      if (!plantFile || !simoFile) return;

      const readFile = (file: File) => {
          return new Promise<any[]>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                  const data = new Uint8Array(e.target?.result as ArrayBuffer);
                  const workbook = XLSX.read(data, { type: 'array' });
                  const sheet = workbook.Sheets[workbook.SheetNames[0]];
                  resolve(XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 }));
              };
              reader.readAsArrayBuffer(file);
          });
      };

      try {
          const plantRowsAll = await readFile(plantFile.file);
          const simoRowsAll = await readFile(simoFile.file);
          const rpcaRowsAll = rpcaFile ? await readFile(rpcaFile.file) : [];

          // =========================================================
          // BASE 1: PLANTA (Step 1)
          // =========================================================
          const plantMap = new Map<string, { qty: number, nature: string, denom: string, displayKey: string }>();
          
          if (plantRowsAll.length > 0) {
              // FIND HEADER ROW
              const headerRowIdx = findBestHeaderRow(plantRowsAll, ['codigo', 'código', 'id empleo', 'nivel', 'denominacion']);
              const headers = plantRowsAll[headerRowIdx].map((h: any) => normalize(h));
              const plantRows = plantRowsAll.slice(headerRowIdx + 1);
              
              const codeIdx = findHeaderIndex(headers, ['codigo', 'código', 'id empleo']);
              const levelIdx = findHeaderIndex(headers, ['nivel', 'jerarqui']);
              const gradeIdx = findHeaderIndex(headers, ['grado']);
              const natureIdx = findHeaderIndex(headers, ['naturaleza', 'vinculacion', 'tipo', 'clase']);
              // Expanded QTY Keywords to catch more variations
              const qtyIdx = findHeaderIndex(headers, ['cantidad', 'total', 'plazas', 'numero', 'no.', 'cant', 'autoriz', 'cargos']);
              const denomIdx = findHeaderIndex(headers, ['denominacion', 'empleo', 'cargo', 'nombre']);

              plantRows.forEach(row => {
                  if (codeIdx === -1 || !row[codeIdx]) return;
                  
                  // Filter: Career only
                  // More robust check: Accept anything that looks like Carrera, exclude specific Non-Career types
                  let nature = String(row[natureIdx] || 'Indefinido').toUpperCase();
                  if (natureIdx === -1) {
                      // If column not found, we might assume career if parsing fails, but better to be safe
                      // For now, if no nature column, we proceed (assuming user uploaded a filtered list)
                      nature = "CARRERA (ASUMIDA)";
                  } else {
                      // Strict exclude
                      if (nature.includes('LIBRE') || nature.includes('PROVISIONAL') || nature.includes('PERIODO') || nature.includes('TEMPORAL')) return;
                      // Strict include (if not clearly excluded above, does it contain carrera or admin?)
                      // If it's just "Administrativo", we accept. If "Trabajador Oficial", exclude.
                      if (!nature.includes('CARRERA') && !nature.includes('ADMINISTRATIVA') && !nature.includes('PLANTA GLOBAL')) return;
                  }

                  const code = row[codeIdx];
                  const level = levelIdx > -1 ? row[levelIdx] : 'N/A';
                  const grade = gradeIdx > -1 ? row[gradeIdx] : '0';
                  
                  const key = generateKey(code, level, grade);
                  
                  let qty = 1;
                  if (qtyIdx > -1) {
                      const val = row[qtyIdx];
                      // Robust Qty Parsing
                      if (typeof val === 'number') {
                          qty = val;
                      } else if (typeof val === 'string') {
                          const clean = val.trim();
                          // Handle "5", "5 cargos", "05"
                          const match = clean.match(/^(\d+)/);
                          if (match) {
                              qty = parseInt(match[1], 10);
                          }
                      }
                  }

                  const current = plantMap.get(key) || { 
                      qty: 0, 
                      nature: natureIdx > -1 ? String(row[natureIdx]) : nature, 
                      denom: denomIdx > -1 ? String(row[denomIdx] || '') : '', 
                      displayKey: key 
                  };
                  plantMap.set(key, { ...current, qty: current.qty + qty });
              });
          }

          // =========================================================
          // BASE 2: SIMO (Step 3)
          // =========================================================
          const simoMap = new Map<string, number>();
          if (simoRowsAll.length > 0) {
              // FIND HEADER ROW
              const headerRowIdx = findBestHeaderRow(simoRowsAll, ['codigo', 'código', 'empleo', 'vacantes']);
              const headers = simoRowsAll[headerRowIdx].map((h: any) => normalize(h));
              const simoRows = simoRowsAll.slice(headerRowIdx + 1);
              
              const codeIdx = findHeaderIndex(headers, ['codigo', 'código', 'empleo', 'id']);
              const levelIdx = findHeaderIndex(headers, ['nivel', 'jerarqui']);
              const gradeIdx = findHeaderIndex(headers, ['grado']);
              const vacIdx = findHeaderIndex(headers, ['vacantes', 'total', 'cantidad']);

              simoRows.forEach(row => {
                  if (codeIdx === -1 || !row[codeIdx]) return;
                  
                  const code = row[codeIdx];
                  const level = levelIdx > -1 ? row[levelIdx] : 'N/A';
                  const grade = gradeIdx > -1 ? row[gradeIdx] : '0';
                  
                  const key = generateKey(code, level, grade);

                  let qty = 1;
                  if (vacIdx > -1) {
                       const val = row[vacIdx];
                       if (typeof val === 'number') qty = val;
                       else if (typeof val === 'string') {
                           const clean = val.trim();
                           const match = clean.match(/^(\d+)/);
                           if (match) qty = parseInt(match[1], 10);
                       }
                  }
                  simoMap.set(key, (simoMap.get(key) || 0) + qty);
              });
          }

          // =========================================================
          // BASE 3: RPCA (Step 5)
          // =========================================================
          const rpcaMap = new Map<string, number>();
          if (rpcaRowsAll.length > 0) {
              // FIND HEADER ROW
              const headerRowIdx = findBestHeaderRow(rpcaRowsAll, ['codigo', 'código', 'servidor', 'nivel']);
              const headers = rpcaRowsAll[headerRowIdx].map((h: any) => normalize(h));
              const rpcaRows = rpcaRowsAll.slice(headerRowIdx + 1);
              
              const codeIdx = findHeaderIndex(headers, ['codigo_empleo', 'codigo empleo', 'código', 'codigo']);
              const gradeIdx = findHeaderIndex(headers, ['grado_empleo', 'grado']);
              const levelIdx = findHeaderIndex(headers, ['nombre_nivel', 'nivel', 'nivel_jerarquico']);

              rpcaRows.forEach(row => {
                  let code = '';
                  // Priority: Header detection, then hardcoded column H (Index 7)
                  if (codeIdx > -1 && row[codeIdx]) {
                      code = row[codeIdx];
                  } else if (row[7]) {
                      code = row[7];
                  }

                  if (!code) return; // Skip invalid rows
                  
                  let grade = '0';
                  // Priority: Header detection, then hardcoded column I (Index 8)
                  if (gradeIdx > -1 && row[gradeIdx]) {
                      grade = row[gradeIdx];
                  } else if (row[8]) {
                      grade = row[8];
                  }
                  
                  let level = 'N/A';
                  // Priority: Header detection, then hardcoded column F (Index 5)
                  if (levelIdx > -1 && row[levelIdx]) {
                      level = row[levelIdx];
                  } else if (row[5]) {
                      level = row[5];
                  }

                  // NORMALIZE RPCA LEVEL to match standard keys (ASESOR, PROFESIONAL, TECNICO, ASISTENCIAL, DIRECTIVO)
                  const normLevel = String(level).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  if (normLevel.includes('asesor')) level = 'ASESOR';
                  else if (normLevel.includes('profesional')) level = 'PROFESIONAL';
                  else if (normLevel.includes('tecnico')) level = 'TECNICO';
                  else if (normLevel.includes('asistencial')) level = 'ASISTENCIAL';
                  else if (normLevel.includes('directivo')) level = 'DIRECTIVO';
                  
                  const key = generateKey(code, level, grade);
                  rpcaMap.set(key, (rpcaMap.get(key) || 0) + 1);
              });
          }

          // =========================================================
          // CALCULATION & TABLE
          // =========================================================
          const results: DetailedAuditRow[] = [];
          
          plantMap.forEach((value, key) => {
              const simoQty = simoMap.get(key) || 0;
              const rpcaQty = rpcaMap.get(key) || 0;
              
              const step1 = value.qty - simoQty; 
              const hiddenVacancies = step1 - rpcaQty; 

              results.push({
                  key: value.displayKey,
                  denomination: value.denom,
                  nature: value.nature,
                  plantQty: value.qty,
                  simoQty,
                  rpcaQty,
                  hiddenVacancies
              });
          });

          results.sort((a, b) => b.hiddenVacancies - a.hiddenVacancies);
          setDetailedAudit(results);

      } catch (e) {
          console.error("Error processing Module 5", e);
      }
  };

  const generatePDF = async () => {
    if (!validationData || !plantLevels) return;
    
    setGeneratingPdf(true);
    try {
        const jsPDFModule = await import('jspdf');
        // @ts-ignore
        const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
        
        const autoTableModule = await import('jspdf-autotable');
        const autoTable = autoTableModule.default || autoTableModule;

        const doc = new jsPDF();
        const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
        
        doc.setFillColor(0, 51, 160);
        doc.rect(0, 0, 210, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`INFORME TÉCNICO DE AUDITORÍA`, 15, 19);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(226, 232, 240);
        doc.text(`Entidad: ${selectedEntity}`, 15, 26);
        doc.text(`Fecha: ${date}`, 160, 26);

        let yPos = 45;

        doc.setTextColor(15, 23, 42); 
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("1. RESULTADOS MÓDULO 5 (MATRIZ DE VACANTES OCULTAS)", 15, yPos);
        yPos += 7;
        
        if (detailedAudit.length > 0) {
            const rows = detailedAudit
                .filter(r => r.hiddenVacancies !== 0) 
                .map(r => [
                    r.key,
                    r.nature,
                    r.plantQty,
                    r.simoQty,
                    r.rpcaQty,
                    r.hiddenVacancies
                ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Llave (Cód-Nivel-Grado)', 'Naturaleza', 'Planta', 'SIMO', 'RPCA', 'RES']],
                body: rows,
                theme: 'striped',
                headStyles: { fillColor: [15, 23, 42], textColor: 255 },
                columnStyles: { 
                    5: { fontStyle: 'bold', textColor: [220, 38, 38] } 
                }
            });
        } else {
             doc.setFont('helvetica', 'normal');
             doc.text("No se encontraron vacantes ocultas con la información procesada.", 15, yPos + 5);
        }

        doc.save(`Auditoria_Modulo5_${selectedEntity.replace(/\s+/g, '_')}_${date}.pdf`);
    } catch (error) {
        console.error("PDF Generation Error:", error);
    } finally {
        setGeneratingPdf(false);
    }
  };

  if (!plantLevels) return null;
  if (loading) return <div className="p-8 text-center text-slate-400 font-medium animate-pulse">Analizando Plan Anual...</div>;

  const planVacancyTotal = validationData ? validationData.kpis.totalVacancies : 0;
  const simoTotal = simoData ? (simoData.totals.asesor + simoData.totals.profesional + simoData.totals.tecnico + simoData.totals.asistencial) : 0;
  
  // Phase 3 Difference Calculation (Strictly Plan vs SIMO)
  const phase3Difference = planVacancyTotal - simoTotal;
  
  const plantTotal = plantLevels ? (plantLevels.asesor + plantLevels.profesional + plantLevels.tecnico + plantLevels.asistencial + (plantLevels.directivo || 0)) : 0;
  const planTotal = validationData ? (validationData.careerTotals.asesor + validationData.careerTotals.profesional + validationData.careerTotals.tecnico + validationData.careerTotals.asistencial + (validationData.careerTotals.directivo || 0)) : 0;

  // Module 5 (Hidden) calculation remains same
  let totalHidden = 0;
  let module5Totals = { plant: 0, simo: 0, rpca: 0, hidden: 0 };

  if (detailedAudit.length > 0) {
      totalHidden = detailedAudit.reduce((acc, row) => acc + (row.hiddenVacancies > 0 ? row.hiddenVacancies : 0), 0);
      module5Totals = detailedAudit.reduce((acc, row) => ({
          plant: acc.plant + row.plantQty,
          simo: acc.simo + row.simoQty,
          rpca: acc.rpca + row.rpcaQty,
          hidden: acc.hidden + row.hiddenVacancies
      }), { plant: 0, simo: 0, rpca: 0, hidden: 0 });
  }

  // --- Components Helpers ---
  const StatCard = ({ title, value, sub, icon: Icon, colorClass }: any) => (
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between min-w-[200px] hover:border-gov-blue/20 transition-colors">
          <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
              <h4 className="text-2xl font-bold text-slate-800">{value}</h4>
              <p className={`text-xs mt-1 font-medium ${colorClass}`}>{sub}</p>
          </div>
          <div className={`p-2 rounded-lg ${colorClass.replace('text-', 'bg-').replace('600', '50').replace('500', '50')}`}>
              <Icon size={20} className={colorClass} />
          </div>
      </div>
  );

  const DistributionBar = ({ label, count, total, color }: any) => {
      const pct = total > 0 ? (count / total) * 100 : 0;
      return (
          <div className="mb-4">
              <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-600">{label}</span>
                  <span className="text-slate-800">{count} ({pct.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }}></div>
              </div>
          </div>
      );
  };

  const renderPlantRow = (label: string, value: number) => (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-gray-300 transition-colors">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span className="font-bold text-slate-900 text-lg">{value}</span>
    </div>
  );

  const renderComparisonRow = (label: string, plantValue: number, planValue: number) => {
    const isMatch = plantValue === planValue;
    const diff = planValue - planValue; 
    
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-blue-200 transition-colors gap-2 sm:gap-0">
            <span className="text-sm font-medium text-slate-600">{label}</span>
            <div className="flex items-center justify-end gap-3">
                <span className={`font-bold text-lg ${isMatch ? 'text-slate-900' : 'text-red-600'}`}>
                    {planValue}
                </span>
                {isMatch ? (
                    <div className="p-1 bg-green-100 rounded-full text-green-600" title="Coincide">
                        <CheckCircle size={16} />
                    </div>
                ) : (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-md text-xs font-bold" title="Diferencia">
                        <AlertTriangle size={12} />
                        {diff > 0 ? `+${diff}` : diff}
                    </div>
                )}
            </div>
        </div>
    );
  };

  const renderPhase3Row = (label: string, planVacancy: number, simoVacancy: number) => {
      const difference = planVacancy - simoVacancy;
      const hasDiscrepancy = difference > 0; 
      
      return (
        <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors`}>
            <td className="px-4 sm:px-6 py-4 font-medium text-slate-700">{label}</td>
            <td className="px-4 sm:px-6 py-4 text-center">
                <span className="text-slate-900 font-semibold">{planVacancy}</span>
            </td>
            <td className="px-4 sm:px-6 py-4 text-center">
                <span className="text-gov-blue font-semibold">{simoVacancy}</span>
            </td>
            <td className="px-4 sm:px-6 py-4 text-center">
                {difference !== 0 ? (
                    <div className={`inline-flex items-center justify-center gap-1 sm:gap-2 font-bold text-[10px] sm:text-xs uppercase tracking-wide py-1 px-2 sm:px-3 rounded-full ${hasDiscrepancy ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {hasDiscrepancy ? (
                            <>
                                <AlertTriangle size={12} />
                                <span className="hidden sm:inline">{difference} Dif</span>
                                <span className="sm:hidden">-{difference}</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle size={12} />
                                <span className="hidden sm:inline">{Math.abs(difference)} Extra</span>
                                <span className="sm:hidden">+{Math.abs(difference)}</span>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="inline-flex items-center gap-1 text-slate-300 font-medium text-xs">
                        <CheckCircle size={12} /> OK
                    </div>
                )}
            </td>
        </tr>
      );
  };

  return (
    <div className="space-y-12 animate-fade-in-up mt-10">
      
      {/* 1. STRATEGIC DASHBOARD HEADER */}
      {validationData && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                <div className="flex items-center gap-3 flex-grow">
                    <div className="h-px bg-gray-200 w-12 hidden sm:block"></div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Dashboard Estratégico</span>
                    <div className="h-px bg-gray-200 flex-grow"></div>
                </div>
                {simoData && (
                    <button 
                        onClick={generatePDF}
                        disabled={generatingPdf}
                        className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-gov-blue text-white rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-blue-800 transition-colors shadow-md active:scale-95 ${generatingPdf ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        {generatingPdf ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Generando...
                            </>
                        ) : (
                            <>
                                <Download size={16} /> Descargar Informe
                            </>
                        )}
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Total Cargos Carrera" 
                    value={validationData.kpis.totalPositions} 
                    sub="Autorizados en Plan"
                    icon={Briefcase}
                    colorClass="text-slate-600"
                />
                <StatCard 
                    title="Tasa de Ocupación" 
                    value={`${validationData.kpis.occupancyRate.toFixed(1)}%`} 
                    sub={`${validationData.kpis.totalOccupied} Provistos`}
                    icon={Users}
                    colorClass="text-emerald-600"
                />
                <StatCard 
                    title="Vacantes Definitivas" 
                    value={validationData.kpis.totalVacancies} 
                    sub={`${validationData.kpis.vacancyRate.toFixed(1)}% de la Planta`}
                    icon={Activity}
                    colorClass="text-amber-500"
                />
                 <StatCard 
                    title="Cobertura SIMO" 
                    value={simoData ? `${((simoTotal/validationData.kpis.totalVacancies)*100).toFixed(1)}%` : 'N/A'} 
                    sub={simoData ? "De vacantes reportadas" : "Pendiente archivo"}
                    icon={TrendingUp}
                    colorClass="text-gov-blue"
                />
            </div>

             {/* 2. PHASE 2: CROSS-VALIDATION (PLANT VS PLAN) */}
             <div className="relative bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 lg:p-8 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16 z-0"></div>
                
                <div className="relative z-10 mb-8">
                     <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Scale size={20} className="text-gov-blue"/>
                        Validación Cruzada
                    </h3>
                    <p className="text-slate-500 text-sm mt-1">Comparativa de consistencia: Estructura vs. Planeación</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
                    <div className="hidden lg:flex absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 justify-center">
                        <div className="bg-white p-2 rounded-full border border-gray-200 shadow-lg text-slate-400">
                            <ArrowRight size={24} />
                        </div>
                    </div>

                    {/* LEFT: Plant Data */}
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-6 border-b border-gray-200 pb-4">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-slate-600">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">1. Planta de Personal</h3>
                                <p className="text-xs text-slate-500">Datos del archivo maestro</p>
                            </div>
                        </div>
                        
                        <div className="space-y-3 flex-grow">
                            {renderPlantRow('Asesor', plantLevels.asesor)}
                            {renderPlantRow('Profesional', plantLevels.profesional)}
                            {renderPlantRow('Técnico', plantLevels.tecnico)}
                            {renderPlantRow('Asistencial', plantLevels.asistencial)}
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200">
                            <span className="text-sm font-bold text-slate-500 uppercase">Total Planta</span>
                            <span className="text-xl font-black text-slate-800">{plantTotal}</span>
                        </div>
                    </div>

                    {/* RIGHT: Plan Data */}
                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-6 border-b border-blue-200 pb-4">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-gov-blue">
                                <ClipboardCheck size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-blue-900">2. Plan Anual</h3>
                                <p className="text-xs text-blue-500">Datos FURAG</p>
                            </div>
                        </div>

                        <div className="space-y-3 flex-grow">
                            {renderComparisonRow('Asesor', plantLevels.asesor, validationData.careerTotals.asesor)}
                            {renderComparisonRow('Profesional', plantLevels.profesional, validationData.careerTotals.profesional)}
                            {renderComparisonRow('Técnico', plantLevels.tecnico, validationData.careerTotals.tecnico)}
                            {renderComparisonRow('Asistencial', plantLevels.asistencial, validationData.careerTotals.asistencial)}
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-blue-200 flex justify-between items-center bg-white p-3 rounded-xl border border-blue-100">
                            <span className="text-sm font-bold text-blue-500 uppercase">Total Plan</span>
                            <div className="flex items-center gap-2">
                                {plantTotal !== planTotal && (
                                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">
                                        Dif: {planTotal - plantTotal > 0 ? '+' : ''}{planTotal - plantTotal}
                                    </span>
                                )}
                                <span className={`text-xl font-black ${plantTotal === planTotal ? 'text-blue-900' : 'text-red-600'}`}>
                                    {planTotal}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
             </div>

            {/* 3. PHASE 3 CHARTS & MATRIX */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Distribution Chart */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-1">
                    <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <PieIcon size={16} className="text-slate-400"/>
                        Distribución de Vacantes
                    </h3>
                    <div className="h-48">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Asesor', value: validationData.vacancyTotals.asesor },
                                        { name: 'Profesional', value: validationData.vacancyTotals.profesional },
                                        { name: 'Técnico', value: validationData.vacancyTotals.tecnico },
                                        { name: 'Asistencial', value: validationData.vacancyTotals.asistencial },
                                    ]}
                                    innerRadius={40}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {COLORS.map((color, index) => (
                                        <Cell key={`cell-${index}`} fill={color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ color: '#1e293b', fontSize: '12px', fontWeight: 600 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                        <DistributionBar label="Profesional" count={validationData.vacancyTotals.profesional} total={validationData.kpis.totalVacancies} color="#334155" />
                        <DistributionBar label="Técnico" count={validationData.vacancyTotals.tecnico} total={validationData.kpis.totalVacancies} color="#64748b" />
                        <DistributionBar label="Asistencial" count={validationData.vacancyTotals.asistencial} total={validationData.kpis.totalVacancies} color="#94a3b8" />
                    </div>
                </div>

                {/* Main Validation Matrix (High Level) */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
                    <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50/50 gap-3 sm:gap-0">
                        <div>
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Building2 size={18} className="text-slate-400"/>
                                Auditoría (Fase 3)
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Comparativa Planificación vs. Oferta Pública (Resumen)</p>
                        </div>
                        {phase3Difference > 0 && simoData && (
                            <div className="px-3 py-1 bg-red-50 border border-red-100 text-red-700 rounded-full text-xs font-bold flex items-center gap-2 animate-pulse w-full sm:w-auto justify-center">
                                <AlertOctagon size={14} />
                                {phase3Difference} DISCREPANCIAS
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-grow overflow-x-auto">
                        {simoData ? (
                            <table className="w-full text-sm text-left min-w-[500px]">
                                <thead className="bg-gray-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 sm:px-6 py-4">Nivel Jerárquico</th>
                                        <th className="px-4 sm:px-6 py-4 text-center text-slate-700">Meta Plan</th>
                                        <th className="px-4 sm:px-6 py-4 text-center text-gov-blue">Real SIMO</th>
                                        <th className="px-4 sm:px-6 py-4 text-center">Compliance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {renderPhase3Row('Asesor', validationData.vacancyTotals.asesor, simoData.totals.asesor)}
                                    {renderPhase3Row('Profesional', validationData.vacancyTotals.profesional, simoData.totals.profesional)}
                                    {renderPhase3Row('Técnico', validationData.vacancyTotals.tecnico, simoData.totals.tecnico)}
                                    {renderPhase3Row('Asistencial', validationData.vacancyTotals.asistencial, simoData.totals.asistencial)}
                                    
                                    {/* Footer */}
                                    <tr className="bg-gray-50 font-bold border-t border-gray-200">
                                        <td className="px-4 sm:px-6 py-4 text-slate-800">TOTAL</td>
                                        <td className="px-4 sm:px-6 py-4 text-center text-slate-900 text-lg">{planVacancyTotal}</td>
                                        <td className="px-4 sm:px-6 py-4 text-center text-gov-blue text-lg">{simoTotal}</td>
                                        <td className="px-4 sm:px-6 py-4 text-center">
                                            {phase3Difference !== 0 ? (
                                                <span className={`flex items-center justify-center gap-1 text-sm ${phase3Difference > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                    <AlertTriangle size={16} /> 
                                                    {phase3Difference > 0 ? `-${phase3Difference}` : `+${Math.abs(phase3Difference)}`}
                                                </span>
                                            ) : (
                                                <span className="text-emerald-600 text-sm">CUMPLIDO</span>
                                            )}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                                <div className="p-4 bg-gray-50 rounded-full mb-3">
                                    <ArrowRight size={24} className="text-slate-300" />
                                </div>
                                <p className="text-slate-500 font-medium">Esperando archivo SIMO para cruce final...</p>
                                <p className="text-xs text-slate-400 mt-1 max-w-xs">Cargue el reporte de oferta pública para visualizar las discrepancias por nivel.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 4. MODULE 5 TABLE (Replaces old Phase 5 Card) */}
            {detailedAudit.length > 0 && rpcaFile && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden mt-8">
                     <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                             <h3 className="text-lg font-bold flex items-center gap-2">
                                <Table size={20} className="text-blue-400"/>
                                MÓDULO 5: ANÁLISIS DE VACANTES OCULTAS
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">Cálculo: (Planta Carrera - SIMO) - RPCA</p>
                        </div>
                        <div className="flex gap-2">
                             <div className="text-xs bg-slate-800 px-3 py-1 rounded-full border border-slate-700 flex items-center gap-1">
                                <Filter size={10} className="text-emerald-400"/>
                                Solo Carrera Admin.
                             </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-slate-600 font-semibold text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 bg-gray-100">Llave (Cód-Nivel-Grado)</th>
                                    <th className="px-6 py-4">Naturaleza</th>
                                    <th className="px-6 py-4 text-center">Planta</th>
                                    <th className="px-6 py-4 text-center text-gov-blue">(-) SIMO</th>
                                    <th className="px-6 py-4 text-center text-emerald-600">(-) RPCA</th>
                                    <th className="px-6 py-4 text-center bg-gray-100 border-l border-gray-200">Vacantes Ocultas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {detailedAudit.map((row, idx) => (
                                    <tr key={idx} className={`hover:bg-gray-50 transition-colors ${row.hiddenVacancies !== 0 ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-6 py-3 font-mono text-xs text-slate-600 font-bold border-r border-gray-100 bg-gray-50/50">
                                            {row.key}
                                        </td>
                                        <td className="px-6 py-3 text-slate-500 text-xs font-medium">
                                            {row.nature}
                                        </td>
                                        <td className="px-6 py-3 text-center font-bold text-slate-800">
                                            {row.plantQty}
                                        </td>
                                        <td className="px-6 py-3 text-center font-bold text-gov-blue">
                                            {row.simoQty}
                                        </td>
                                        <td className="px-6 py-3 text-center font-bold text-emerald-600">
                                            {row.rpcaQty}
                                        </td>
                                        <td className={`px-6 py-3 text-center font-bold border-l border-gray-200 text-base ${row.hiddenVacancies > 0 ? 'text-red-600 bg-red-50' : 'text-slate-300'}`}>
                                            {row.hiddenVacancies > 0 ? `+${row.hiddenVacancies}` : row.hiddenVacancies < 0 ? row.hiddenVacancies : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="sticky bottom-0 bg-slate-100 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-20">
                                <tr className="border-t-2 border-slate-300 font-black text-slate-800">
                                    <td className="px-6 py-4 uppercase tracking-wider text-xs bg-slate-200/50" colSpan={2}>
                                        TOTALES GENERALES
                                    </td>
                                    <td className="px-6 py-4 text-center text-lg">{module5Totals.plant}</td>
                                    <td className="px-6 py-4 text-center text-lg text-gov-blue">{module5Totals.simo}</td>
                                    <td className="px-6 py-4 text-center text-lg text-emerald-600">{module5Totals.rpca}</td>
                                    <td className={`px-6 py-4 text-center text-xl border-l border-slate-300 ${module5Totals.hidden > 0 ? 'text-red-600 bg-red-50' : 'text-slate-500'}`}>
                                        {module5Totals.hidden > 0 ? `+${module5Totals.hidden}` : module5Totals.hidden}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
          </>
      )}
    </div>
  );
};

export default PlanValidator;
