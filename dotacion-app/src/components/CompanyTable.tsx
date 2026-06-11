import React from 'react';
import { Company, SECTOR_LABELS, SECTOR_COLORS, STATUS_LABELS, STATUS_COLORS, Sector } from '../types';
import { Edit2, Trash2, Send, MessageCircle } from 'lucide-react';

interface Props {
  companies: Company[];
  onEdit: (c: Company) => void;
  onDelete: (id: string) => void;
  onSendOne: (c: Company) => void;
}

export const CompanyTable: React.FC<Props> = ({ companies, onEdit, onDelete, onSendOne }) => {
  if (companies.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-4xl mb-3">📋</p>
        <p className="font-medium">No hay empresas aún</p>
        <p className="text-sm">Agrega empresas manualmente o importa desde Excel</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs text-slate-500 uppercase tracking-wide">
            <th className="text-left py-3 px-4 font-semibold">Empresa</th>
            <th className="text-left py-3 px-2 font-semibold">Sector</th>
            <th className="text-left py-3 px-2 font-semibold">Contacto</th>
            <th className="text-left py-3 px-2 font-semibold">Estado</th>
            <th className="text-right py-3 px-4 font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {companies.map(c => (
            <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4">
                <p className="font-semibold text-slate-800">{c.name}</p>
                {c.address && <p className="text-xs text-slate-400">{c.address}, {c.city}</p>}
              </td>
              <td className="py-3 px-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SECTOR_COLORS[c.sector as Sector] || 'bg-slate-100 text-slate-700'}`}>
                  {SECTOR_LABELS[c.sector as Sector] || c.sector}
                </span>
              </td>
              <td className="py-3 px-2">
                {c.contactPerson && <p className="text-slate-700 text-xs font-medium">{c.contactPerson}</p>}
                {c.email && <p className="text-slate-500 text-xs">{c.email}</p>}
                {c.phone && <p className="text-slate-500 text-xs">{c.phone}</p>}
              </td>
              <td className="py-3 px-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                  {STATUS_LABELS[c.status]}
                </span>
                {c.sentAt && <p className="text-xs text-slate-400 mt-0.5">{c.sentAt}</p>}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => onSendOne(c)} title="Enviar cotización"
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Send size={15} />
                  </button>
                  <button onClick={() => onEdit(c)} title="Editar"
                    className="p-1.5 text-slate-500 hover:bg-gray-100 rounded-lg transition-colors">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => onDelete(c.id)} title="Eliminar"
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
