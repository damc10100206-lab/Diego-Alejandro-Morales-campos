import * as XLSX from 'xlsx';
import { Company, Sector } from '../types';
import { generateId } from './storage';

const normalizeSector = (raw: string): Sector => {
  const s = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (s.includes('plastic')) return 'plasticos';
  if (s.includes('alumin') || s.includes('metal')) return 'aluminios';
  if (s.includes('flor') || s.includes('agro')) return 'flores';
  if (s.includes('aliment') || s.includes('comida')) return 'alimentos';
  if (s.includes('construc')) return 'construccion';
  if (s.includes('logis') || s.includes('transport')) return 'logistica';
  if (s.includes('manufactur') || s.includes('industrial')) return 'manufactura';
  return 'otro';
};

export const importFromExcel = (file: File): Promise<Company[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);

        const companies: Company[] = rows.map((row) => ({
          id: generateId(),
          name: String(row['nombre'] || row['empresa'] || row['name'] || '').trim(),
          sector: normalizeSector(String(row['sector'] || '')),
          email: String(row['email'] || row['correo'] || '').trim(),
          phone: String(row['telefono'] || row['phone'] || row['whatsapp'] || '').trim(),
          address: String(row['direccion'] || row['address'] || '').trim(),
          city: String(row['ciudad'] || row['city'] || 'Bogotá').trim(),
          contactPerson: String(row['contacto'] || row['persona'] || '').trim(),
          status: 'pendiente',
          notes: ''
        })).filter(c => c.name);

        resolve(companies);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

export const exportToExcel = (companies: Company[]) => {
  const rows = companies.map(c => ({
    'Empresa': c.name,
    'Sector': c.sector,
    'Email': c.email,
    'Teléfono': c.phone,
    'Dirección': c.address,
    'Ciudad': c.city,
    'Contacto': c.contactPerson,
    'Estado': c.status,
    'Enviado': c.sentAt || '',
    'Notas': c.notes
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Empresas');
  XLSX.writeFile(wb, 'empresas_dotacion.xlsx');
};
