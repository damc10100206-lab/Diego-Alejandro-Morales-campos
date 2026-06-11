export interface Company {
  id: string;
  name: string;
  sector: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  contactPerson: string;
  status: 'pendiente' | 'enviado' | 'respondido' | 'rechazado';
  sentAt?: string;
  notes: string;
}

export type Sector = 'plasticos' | 'aluminios' | 'flores' | 'manufactura' | 'construccion' | 'alimentos' | 'logistica' | 'otro';

export const SECTOR_LABELS: Record<Sector, string> = {
  plasticos: 'Plásticos',
  aluminios: 'Aluminios / Metales',
  flores: 'Flores / Agroindustria',
  manufactura: 'Manufactura General',
  construccion: 'Construcción',
  alimentos: 'Alimentos',
  logistica: 'Logística / Transporte',
  otro: 'Otro'
};

export const SECTOR_COLORS: Record<Sector, string> = {
  plasticos: 'bg-blue-100 text-blue-800',
  aluminios: 'bg-gray-100 text-gray-800',
  flores: 'bg-pink-100 text-pink-800',
  manufactura: 'bg-yellow-100 text-yellow-800',
  construccion: 'bg-orange-100 text-orange-800',
  alimentos: 'bg-green-100 text-green-800',
  logistica: 'bg-purple-100 text-purple-800',
  otro: 'bg-slate-100 text-slate-800'
};

export const STATUS_LABELS: Record<Company['status'], string> = {
  pendiente: 'Pendiente',
  enviado: 'Enviado',
  respondido: 'Respondió',
  rechazado: 'Rechazado'
};

export const STATUS_COLORS: Record<Company['status'], string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  enviado: 'bg-blue-100 text-blue-800',
  respondido: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-800'
};
