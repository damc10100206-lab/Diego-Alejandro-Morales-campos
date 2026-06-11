import React, { useState } from 'react';
import { X, Settings } from 'lucide-react';

interface Props {
  senderName: string;
  onSave: (name: string) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ senderName, onSave, onClose }) => {
  const [name, setName] = useState(senderName);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings size={18} /> Configuración</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre de su empresa / negocio</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Dotaciones García" />
            <p className="text-xs text-slate-400 mt-1">Este nombre aparecerá en los emails y mensajes de WhatsApp.</p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button onClick={() => { onSave(name); onClose(); }} className="px-5 py-2 text-sm font-bold text-white bg-blue-700 rounded-lg hover:bg-blue-800">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
};
