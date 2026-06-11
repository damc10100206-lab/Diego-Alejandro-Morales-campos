import React from 'react';
import { Company, STATUS_LABELS } from '../types';
import { Building2, Send, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Props {
  companies: Company[];
}

export const Dashboard: React.FC<Props> = ({ companies }) => {
  const total = companies.length;
  const sent = companies.filter(c => c.status === 'enviado').length;
  const responded = companies.filter(c => c.status === 'respondido').length;
  const pending = companies.filter(c => c.status === 'pendiente').length;

  const cards = [
    { label: 'Total Empresas', value: total, icon: Building2, color: 'bg-blue-50 text-blue-700', border: 'border-blue-200' },
    { label: 'Pendientes', value: pending, icon: Clock, color: 'bg-amber-50 text-amber-700', border: 'border-amber-200' },
    { label: 'Cotizaciones Enviadas', value: sent, icon: Send, color: 'bg-indigo-50 text-indigo-700', border: 'border-indigo-200' },
    { label: 'Respondieron', value: responded, icon: CheckCircle, color: 'bg-green-50 text-green-700', border: 'border-green-200' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map(({ label, value, icon: Icon, color, border }) => (
        <div key={label} className={`bg-white rounded-xl border ${border} p-4 flex items-center gap-3 shadow-sm`}>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
