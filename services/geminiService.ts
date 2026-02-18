
import { UploadedFile, AuditAnalysis, FileType, PreviewStats } from "../types";
import * as XLSX from "xlsx";

// Helper for normalization
const normalize = (text: any) => String(text || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// Helper to count SIMO rows
const analyzeSimoFile = async (file: File): Promise<number> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
                
                let count = 0;
                // Basic SIMO counting logic (Column G usually holds Level)
                json.forEach((row, idx) => {
                    if (idx > 0 && row.length > 5) {
                         // Only count if it looks like a valid record row
                        count++;
                    }
                });
                resolve(count);
            } catch (err) {
                console.error("Error parsing SIMO locally", err);
                resolve(0);
            }
        };
        reader.readAsArrayBuffer(file);
    });
};

const parsePlantFile = async (file: File): Promise<PreviewStats> => {
    return new Promise((resolve, reject) => {
         const reader = new FileReader();
         reader.onload = (e) => {
             try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
                
                // Reuse logic similar to App.tsx preview but essentially ensuring we have stats
                // Note: In a real app we might refactor this shared logic to a utils file
                // For now, we do a quick pass if stats weren't provided.
                
                let totalPositions = 0;
                let careerPositions = 0;
                const levels = { asesor: 0, profesional: 0, tecnico: 0, asistencial: 0, directivo: 0 };
                
                // Very basic header detection
                const headers = (json[0] || []).map((h:any) => normalize(h));
                const natureIdx = headers.findIndex((h: string) => h.includes('naturaleza') || h.includes('vinculacion'));
                const levelIdx = headers.findIndex((h: string) => h.includes('nivel') || h.includes('jerarqu'));
                
                if (natureIdx === -1) {
                    // Fallback: Assume all rows are positions if we can't filter
                    resolve({
                        totalPositions: json.length - 1,
                        careerPositions: 0, 
                        otherPositions: json.length - 1,
                        levelBreakdown: levels
                    });
                    return;
                }

                json.slice(1).forEach(row => {
                     const nature = normalize(row[natureIdx]);
                     const level = normalize(row[levelIdx] || '');
                     
                     totalPositions++;
                     
                     if (nature.includes('carrera') || nature.includes('administrativa') || nature.includes('periodo')) {
                         if (nature.includes('libre') || nature.includes('provisional')) return;
                         
                         careerPositions++;
                         if (level.includes('asesor')) levels.asesor++;
                         else if (level.includes('profesional')) levels.profesional++;
                         else if (level.includes('tecnico')) levels.tecnico++;
                         else if (level.includes('asistencial')) levels.asistencial++;
                         else if (level.includes('directivo')) levels.directivo++;
                     }
                });
                
                resolve({
                    totalPositions,
                    careerPositions,
                    otherPositions: totalPositions - careerPositions,
                    levelBreakdown: levels
                });

             } catch (e) {
                 reject(e);
             }
         };
         reader.readAsArrayBuffer(file);
    });
}

export const analyzeDocuments = async (files: UploadedFile[], plantStats?: PreviewStats): Promise<AuditAnalysis> => {
  // We no longer need API KEY check.
  
  // 1. Get Plant Stats (Use passed stats or parse locally)
  let stats = plantStats;
  const plantFile = files.find(f => f.type === FileType.PLANT);
  
  if (!stats && plantFile && (plantFile.file.name.endsWith('xlsx') || plantFile.file.name.endsWith('xls'))) {
      try {
          stats = await parsePlantFile(plantFile.file);
      } catch (e) {
          console.error("Failed to parse plant locally", e);
      }
  }

  // If still no stats, return empty structure
  if (!stats) {
       return {
            methodologyUsed: "Error: No se pudo procesar el archivo de Planta. Asegúrese de que sea un Excel válido.",
            generalObservation: "No hay datos suficientes.",
            stats: {
                totalAuthorized: 0,
                totalCareerPositions: 0,
                totalReportedSIMO: 0,
                totalPlanned: 0,
                potentialHidden: 0,
                levelBreakdown: { asesor: 0, profesional: 0, tecnico: 0, asistencial: 0, directivo: 0 }
            },
            discrepancies: [],
            recommendations: []
       };
  }

  // 2. Count SIMO if present
  let simoCount = 0;
  const simoFile = files.find(f => f.type === FileType.SIMO);
  if (simoFile) {
      simoCount = await analyzeSimoFile(simoFile.file);
  }

  // 3. Construct the Analysis Object purely from data
  return {
      methodologyUsed: "AUDITORÍA DETERMINÍSTICA (MOTOR LOCAL):\n\n1. Extracción de datos estructurados mediante librería XLSX (Standard Parsing).\n2. Filtrado algorítmico de columnas 'Naturaleza' para aislar cargos de Carrera.\n3. Segmentación automática por niveles jerárquicos.\n4. Comparación directa con registros SIMO detectados.",
      generalObservation: `Análisis completado exitosamente. Se identificaron ${stats.totalPositions} cargos en la planta global, filtrando ${stats.careerPositions} posiciones pertenecientes estrictamente al régimen de Carrera Administrativa. ${simoCount > 0 ? `Se encontraron ${simoCount} registros válidos en el reporte SIMO para cruce.` : 'Pendiente carga de reporte SIMO para cruce de vacantes.'}`,
      stats: {
          totalAuthorized: stats.totalPositions,
          totalCareerPositions: stats.careerPositions,
          totalReportedSIMO: simoCount,
          totalPlanned: stats.totalPositions, // Assumption for initial view
          potentialHidden: Math.max(0, stats.careerPositions - simoCount), // Rough calculation, refined in PlanValidator
          levelBreakdown: stats.levelBreakdown
      },
      discrepancies: [], // PlanValidator handles the detailed row-by-row discrepancies
      recommendations: [
          "Verificar manualmente las diferencias en el dashboard detallado.",
          "Asegurar que los nombres de columnas en el Excel cumplan con el estándar FURAG.",
          "Si existen diferencias, validar si corresponden a vacantes temporales o encargos."
      ]
  };
};
