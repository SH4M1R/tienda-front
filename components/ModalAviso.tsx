'use client';

import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type TipoAviso = 'error' | 'warning' | 'info' | 'success';

interface ModalAvisoProps {
  isOpen: boolean;
  titulo?: string;
  mensaje: string;
  tipo?: TipoAviso;
  onClose: () => void;
}

export default function ModalAviso({
  isOpen,
  titulo = 'Aviso del Sistema',
  mensaje,
  tipo = 'warning',
  onClose,
}: ModalAvisoProps) {
  if (!isOpen) return null;

  const config = {
    error: {
      icon: <AlertCircle className="w-6 h-6 text-red-600" />,
      bgColor: 'bg-red-100',
      btnColor: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: <AlertCircle className="w-6 h-6 text-amber-600" />,
      bgColor: 'bg-amber-100',
      btnColor: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    info: {
      icon: <Info className="w-6 h-6 text-blue-600" />,
      bgColor: 'bg-blue-100',
      btnColor: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    success: {
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
      bgColor: 'bg-emerald-100',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
  }[tipo];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-md w-full p-6 relative flex flex-col gap-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 transition-colors p-1 rounded-lg hover:bg-zinc-100 cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${config.bgColor}`}>
            {config.icon}
          </div>
          <div className="space-y-1 pr-6">
            <h3 className="font-semibold text-zinc-900 text-base">{titulo}</h3>
            <p className="text-sm text-zinc-600 leading-relaxed">{mensaje}</p>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-zinc-100 mt-2">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${config.btnColor}`}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}