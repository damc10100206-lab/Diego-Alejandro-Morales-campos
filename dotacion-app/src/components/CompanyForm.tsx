import React, { useState } from 'react';
import { Company, Sector, SECTOR_LABELS } from '../types';
import { generateId } from '../services/storage';
import { X } from 'lucide-react';

interface Props {
  onSave: (company: Company) => void;
  onClose: () => void;
  initial?: Company;
}

const EMPTY: Omit<Company, 'id'> = {
  name: '', sector: 'manufactura', email: '', phone: '',
  address: '', city: 'Bogotá', contactPerson: '', status: 'pendiente', notes: ''
};

export const CompanyForm: React.FC<Props> = ({ onSave, onClose, initial }) => {
  const [form, setForm] = useState<Omit<Company, 'id'>>(initial ? { ...initial } : { ...EMPTY });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...form, id: initial?.id || generateId() });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-slate-800">{initial ? 'Editar empresa' : 'Agregar empresa'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <Field label="Nombre de la empresa *" value={form.name} onChange={set('name')} required />
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Sector *</label>
              <select value={form.sector} onChange={set('sector')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                {(Object.keys(SECTOR_LABELS) as Sector[]).map(s => (
                  <option key={s} value={s}>{SECTOR_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <Field label="Email de contacto" value={form.email} onChange={set('email')} type="email" />
            <Field label="Teléfono / WhatsApp" value={form.phone} onChange={set('phone')} placeholder="Ej: 3101234567" />
            <Field label="Persona de contacto" value={form.contactPerson} onChange={set('contactPerson')} placeholder="Nombre del encargado de compras" />
            <Field label="Dirección" value={form.address} onChange={set('address')} />
            <Field label="Ciudad" value={form.city} onChange={set('city')} />
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Estado</label>
              <select value={form.status} onChange={set('status')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="pendiente">Pendiente</option>
                <option value="enviado">Enviado</option>
                <option value="respondido">Respondió</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notas</label>
              <textarea value={form.notes} onChange={set('notes')} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Observaciones, llamadas previas, etc." />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="px-5 py-2 text-sm font-bold text-white bg-blue-700 rounded-lg hover:bg-blue-800">
              {initial ? 'Guardar cambios' : 'Agregar empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Field: React.FC<{
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; placeholder?: string; required?: boolean;
}> = ({ label, value, onChange, type = 'text', placeholder, required }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
  </div>
);
