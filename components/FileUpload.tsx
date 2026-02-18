
import React, { useRef } from 'react';
import { Upload, FileText, CheckCircle, X } from 'lucide-react';
import { FileType, UploadedFile } from '../types';

interface FileUploadProps {
  label: string;
  description: string;
  type: FileType;
  file: UploadedFile | undefined;
  onFileSelect: (file: File, type: FileType) => void;
  onRemove: (type: FileType) => void;
  colorClass: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  label, 
  description, 
  type, 
  file, 
  onFileSelect, 
  onRemove,
  colorClass 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0], type);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0], type);
    }
  };

  const getBorderColor = () => {
      if (file) return 'border-gov-blue bg-blue-50/40';
      return 'hover:border-gov-blue hover:bg-blue-50/20';
  };

  return (
    <div 
      className={`relative border border-dashed rounded-xl p-6 transition-all duration-300 group cursor-pointer ${
        file ? 'border-gov-blue bg-blue-50/30' : 'border-gray-300 bg-white'
      } ${!file && getBorderColor()}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => !file && inputRef.current?.click()}
    >
      {file ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg text-gov-blue">
              <CheckCircle size={20} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-700 truncate max-w-[180px]">{file.file.name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">{(file.file.size / 1024).toFixed(1)} KB • LISTO</p>
            </div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(type); }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center py-2">
          <div className={`p-3 rounded-full bg-gray-100 text-gray-500 mb-3 group-hover:bg-blue-100 group-hover:text-gov-blue group-hover:scale-110 transition-all duration-300`}>
            <Upload size={20} strokeWidth={2} />
          </div>
          <h3 className="font-bold text-slate-700 text-sm group-hover:text-gov-blue transition-colors">{label}</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-[220px] leading-relaxed">{description}</p>
        </div>
      )}
      <input 
        type="file" 
        ref={inputRef}
        onChange={handleChange} 
        className="hidden" 
        accept=".pdf,.xlsx,.xls,.csv"
      />
    </div>
  );
};

export default FileUpload;
