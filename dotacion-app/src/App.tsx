import React, { useState, useEffect, useRef } from 'react';
import { Company, Sector, SECTOR_LABELS } from './types';
import { loadCompanies, saveCompanies } from './services/storage';
import { importFromExcel, exportToExcel } from './services/excelImport';
import { Dashboard } from './components/Dashboard';
import { CompanyTable } from './components/CompanyTable';
import { CompanyForm } from './components/CompanyForm';
import { SendModal } from './components/SendModal';
import { SettingsModal } from './components/SettingsModal';
import {
  Plus, Upload, Download, Send, Settings, Search,
  Filter, HardHat, FileText
} from 'lucide-react';

const SENDER_KEY = 'dotacion_sender_name';

export default function App() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [senderName, setSenderName] = useState(() => localStorage.getItem(SENDER_KEY) || 'Dotaciones El Manantial');
  const [showForm, setShowForm] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | undefined>();
  const [sendTargets, setSendTargets] = useState<Company[] | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSector, setFilterSector] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCompanies(loadCompanies());
  }, []);

  const persist = (updated: Company[]) => {
    setCompanies(updated);
    saveCompanies(updated);
  };

  const handleSave = (c: Company) => {
    const existing = companies.findIndex(x => x.id === c.id);
    if (existing >= 0) {
      const updated = [...companies];
      updated[existing] = c;
      persist(updated);
    } else {
      persist([...companies, c]);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar esta empresa?')) {
      persist(companies.filter(c => c.id !== id));
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importFromExcel(file);
      persist([...companies, ...imported]);
      alert(`✅ Se importaron ${imported.length} empresas`);
    } catch {
      alert('❌ Error al leer el archivo. Use formato Excel (.xlsx)');
    }
    e.target.value = '';
  };

  const handleMarkSent = (ids: string[]) => {
    const now = new Date().toLocaleDateString('es-CO');
    persist(companies.map(c =>
      ids.includes(c.id) ? { ...c, status: 'enviado', sentAt: now } : c
    ));
  };

  const filtered = companies.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.contactPerson.toLowerCase().includes(q);
    const matchSector = !filterSector || c.sector === filterSector;
    const matchStatus = !filterStatus || c.status === filterStatus;
    return matchSearch && matchSector && matchStatus;
  });

  const pendingCompanies = filtered.filter(c => c.status === 'pendiente');

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <HardHat size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-none">DotaciónPro</h1>
              <p className="text-blue-200 text-xs mt-0.5">Sistema de cotizaciones — {senderName}</p>
            </div>
          </div>
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl hover:bg-white/20 transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Stats */}
        <Dashboard companies={companies} />

        {/* Actions bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { setEditCompany(undefined); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-sm font-bold rounded-lg hover:bg-blue-800 shadow-sm">
              <Plus size={16} /> Agregar empresa
            </button>

            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 text-sm font-semibold border border-gray-300 rounded-lg hover:bg-gray-50">
              <Upload size={16} /> Importar Excel
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />

            <button onClick={() => exportToExcel(companies)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 text-sm font-semibold border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download size={16} /> Exportar
            </button>
          </div>

          {pendingCompanies.length > 0 && (
            <button
              onClick={() => setSendTargets(pendingCompanies)}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800 shadow-sm">
              <Send size={16} /> Enviar a {pendingCompanies.length} pendientes
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar empresa, email, contacto..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" />
          </div>
          <select value={filterSector} onChange={e => setFilterSector(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-slate-700">
            <option value="">Todos los sectores</option>
            {(Object.keys(SECTOR_LABELS) as Sector[]).map(s => (
              <option key={s} value={s}>{SECTOR_LABELS[s]}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-slate-700">
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="enviado">Enviado</option>
            <option value="respondido">Respondió</option>
            <option value="rechazado">Rechazado</option>
          </select>
          {(search || filterSector || filterStatus) && (
            <span className="flex items-center text-xs text-slate-500 bg-blue-50 border border-blue-100 px-3 py-2 rounded-lg">
              <Filter size={13} className="mr-1" /> {filtered.length} resultados
            </span>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2">
              <FileText size={16} /> Lista de empresas ({filtered.length})
            </h2>
          </div>
          <CompanyTable
            companies={filtered}
            onEdit={c => { setEditCompany(c); setShowForm(true); }}
            onDelete={handleDelete}
            onSendOne={c => setSendTargets([c])}
          />
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-sm text-slate-600">
          <h3 className="font-bold text-blue-800 mb-2">¿Cómo funciona?</h3>
          <ol className="space-y-1 list-decimal list-inside">
            <li>Configura el nombre de tu empresa en <strong>Configuración ⚙️</strong></li>
            <li>Agrega empresas manualmente o importa desde Excel (columnas: nombre, sector, email, telefono, contacto, direccion)</li>
            <li>Haz clic en <strong>"Enviar a X pendientes"</strong> para iniciar la campaña</li>
            <li>La app genera el email y el mensaje de WhatsApp automáticamente con tu catálogo</li>
            <li>Abre Gmail o WhatsApp con un clic — solo adjunta el PDF y envía</li>
            <li>Marca como "enviado" para llevar el control</li>
          </ol>
        </div>
      </main>

      {showForm && (
        <CompanyForm
          initial={editCompany}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditCompany(undefined); }}
        />
      )}
      {sendTargets && (
        <SendModal
          companies={sendTargets}
          senderName={senderName}
          onClose={() => setSendTargets(null)}
          onMarkSent={handleMarkSent}
        />
      )}
      {showSettings && (
        <SettingsModal
          senderName={senderName}
          onSave={name => { setSenderName(name); localStorage.setItem(SENDER_KEY, name); }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
