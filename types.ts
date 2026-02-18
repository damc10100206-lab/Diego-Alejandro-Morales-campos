
export enum FileType {
  PLANT = 'planta',
  PLAN = 'plan',
  SIMO = 'simo',
  RPCA = 'rpca',
}

export interface LevelStats {
  asesor: number;
  profesional: number;
  tecnico: number;
  asistencial: number;
  directivo: number;
}

export interface PreviewStats {
  totalPositions: number;
  careerPositions: number;
  otherPositions: number;
  levelBreakdown?: LevelStats;
}

export interface FilePreviewData {
  headers: string[];
  rowCount: number;
  rows: any[];
  sheetName?: string;
  stats?: PreviewStats;
}

export interface UploadedFile {
  file: File;
  type: FileType;
  content?: string;
  preview?: FilePreviewData;
}

export interface VacancyDiscrepancy {
  code: string;
  denomination: string;
  grade: string;
  nature: string;
  location: string;
  reason: string;
  sourceDocument: string;
}

export interface AuditStats {
  totalAuthorized: number;
  totalCareerPositions: number;
  totalReportedSIMO: number;
  totalPlanned: number;
  potentialHidden: number;
  levelBreakdown?: LevelStats; // New: Breakdown for Step 2 comparison
}

export interface AuditAnalysis {
  methodologyUsed: string;
  generalObservation: string;
  stats: AuditStats;
  discrepancies: VacancyDiscrepancy[];
  recommendations: string[];
}

export interface AnalysisState {
  isLoading: boolean;
  error: string | null;
  result: AuditAnalysis | null;
}
