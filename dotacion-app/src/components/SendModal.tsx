import React, { useState } from 'react';
import { Company } from '../types';
import { buildEmailBody, buildEmailSubject, buildWhatsAppMessage } from '../services/emailTemplate';
import { Mail, MessageCircle, Copy, ExternalLink, X, CheckCircle } from 'lucide-react';

interface Props {
  companies: Company[];
  senderName: string;
  onClose: () => void;
  onMarkSent: (ids: string[]) => void;
}

export const SendModal: React.FC<Props> = ({ companies, senderName, onClose, onMarkSent }) => {
  const [tab, setTab] = useState<'email' | 'whatsapp'>('email');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const company = companies[currentIdx];
  if (!company) return null;

  const emailSubject = buildEmailSubject(company);
  const emailBody = buildEmailBody(company, senderName);
  const waMessage = buildWhatsAppMessage(company, senderName);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const markSent = () => {
    const newSent = new Set(sentIds);
    newSent.add(company.id);
    setSentIds(newSent);
  };

  const openGmail = () => {
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(company.email)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(url, '_blank');
    markSent();
  };

  const openMailto = () => {
    const url = `mailto:${company.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(url, '_blank');
    markSent();
  };

  const openWhatsApp = () => {
    const phone = company.phone.replace(/\D/g, '');
    const intlPhone = phone.startsWith('57') ? phone : `57${phone}`;
    const url = `https://wa.me/${intlPhone}?text=${encodeURIComponent(waMessage)}`;
    window.open(url, '_blank');
    markSent();
  };

  const handleFinish = () => {
    onMarkSent(Array.from(sentIds));
    onClose();
  };

  const isSent = sentIds.has(company.id);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Enviar cotización</h2>
            <p className="text-xs text-slate-500">{currentIdx + 1} de {companies.length} empresas</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        {/* Company info */}
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {company.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">{company.name}</p>
            <p className="text-xs text-slate-500">{company.email} {company.phone && `• ${company.phone}`}</p>
          </div>
          {isSent && (
            <span className="ml-auto flex items-center gap-1 text-green-700 text-xs font-bold bg-green-100 px-2 py-1 rounded-full">
              <CheckCircle size={12} /> Enviado
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {(['email', 'whatsapp'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${tab === t ? 'border-b-2 border-blue-700 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'email' ? <><Mail size={15} /> Email</> : <><MessageCircle size={15} /> WhatsApp</>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {tab === 'email' ? (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Asunto</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm text-slate-700 border border-gray-200">{emailSubject}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cuerpo del mensaje</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm text-slate-700 border border-gray-200 whitespace-pre-wrap max-h-48 overflow-y-auto">{emailBody}</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => copy(emailBody)} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Copy size={14} /> {copied ? '¡Copiado!' : 'Copiar texto'}
                </button>
                {company.email && (
                  <>
                    <button onClick={openGmail} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700">
                      <ExternalLink size={14} /> Abrir en Gmail
                    </button>
                    <button onClick={openMailto} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-white bg-blue-700 rounded-lg hover:bg-blue-800">
                      <Mail size={14} /> Abrir en correo
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mensaje de WhatsApp</label>
                <div className="mt-1 p-3 bg-green-50 rounded-lg text-sm text-slate-700 border border-green-200 whitespace-pre-wrap">{waMessage}</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => copy(waMessage)} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Copy size={14} /> {copied ? '¡Copiado!' : 'Copiar mensaje'}
                </button>
                {company.phone && (
                  <button onClick={openWhatsApp} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-white bg-green-600 rounded-lg hover:bg-green-700">
                    <ExternalLink size={14} /> Abrir WhatsApp
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="p-5 border-t flex items-center justify-between gap-3">
          <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}
            className="px-4 py-2 text-sm text-slate-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
            ← Anterior
          </button>
          <button onClick={markSent} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${isSent ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200'}`}>
            {isSent ? '✓ Marcado como enviado' : 'Marcar como enviado'}
          </button>
          {currentIdx < companies.length - 1 ? (
            <button onClick={() => setCurrentIdx(i => i + 1)} className="px-4 py-2 text-sm font-bold text-white bg-blue-700 rounded-lg hover:bg-blue-800">
              Siguiente →
            </button>
          ) : (
            <button onClick={handleFinish} className="px-4 py-2 text-sm font-bold text-white bg-green-700 rounded-lg hover:bg-green-800">
              Finalizar campaña ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
