import React, { useState } from 'react';
import { KeyRound, Check, X, AlertTriangle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { changeAdminPin } from '../services/adminAuth';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPins, setShowPins] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPin !== confirmPin) {
      setErrorMessage('A confirmação do novo PIN não confere.');
      return;
    }

    if (newPin.trim().length < 4) {
      setErrorMessage('O novo PIN deve ter pelo menos 4 caracteres.');
      return;
    }

    const result = changeAdminPin(currentPin, newPin);
    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMessage(result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0E121B] border-2 border-[#C4A76E]/60 rounded-xl shadow-2xl shadow-black overflow-hidden font-sans">
        {/* Header */}
        <div className="bg-[#171E2D] border-b border-[#C4A76E]/30 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#C4A76E]/15 border border-[#C4A76E]/40 flex items-center justify-center text-[#DFC897]">
              <KeyRound className="w-5 h-5 text-[#C4A76E]" />
            </div>
            <div>
              <h2 className="text-sm font-black font-display text-[#F3EEE4] tracking-wider uppercase">
                ALTERAR PIN MESTRE
              </h2>
              <p className="text-[11px] font-mono text-[#DFC897]">
                SEGURANÇA DA ALIMENTAÇÃO DO SISTEMA
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 rounded transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Defina um novo PIN exclusivo para impedir que qualquer outra pessoa altere os registros do 35º BPM.
          </p>

          {/* Current PIN */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-bold uppercase text-zinc-300">
              PIN Atual:
            </label>
            <div className="relative">
              <input
                type={showPins ? 'text' : 'password'}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                autoFocus
                placeholder="Informe seu PIN atual..."
                className="w-full px-3.5 py-2 bg-[#0B0D12] border border-zinc-700 focus:border-[#C4A76E] focus:ring-1 focus:ring-[#C4A76E] rounded-lg text-sm text-zinc-100 placeholder-zinc-500 font-mono tracking-widest outline-none"
              />
            </div>
          </div>

          {/* New PIN */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-bold uppercase text-zinc-300">
              Novo PIN (Mínimo 4 dígitos/caracteres):
            </label>
            <div className="relative">
              <input
                type={showPins ? 'text' : 'password'}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Defina o novo PIN..."
                className="w-full px-3.5 py-2 bg-[#0B0D12] border border-zinc-700 focus:border-[#C4A76E] focus:ring-1 focus:ring-[#C4A76E] rounded-lg text-sm text-zinc-100 placeholder-zinc-500 font-mono tracking-widest outline-none"
              />
            </div>
          </div>

          {/* Confirm New PIN */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-bold uppercase text-zinc-300">
              Confirmar Novo PIN:
            </label>
            <div className="relative">
              <input
                type={showPins ? 'text' : 'password'}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Repita o novo PIN..."
                className="w-full px-3.5 py-2 bg-[#0B0D12] border border-zinc-700 focus:border-[#C4A76E] focus:ring-1 focus:ring-[#C4A76E] rounded-lg text-sm text-zinc-100 placeholder-zinc-500 font-mono tracking-widest outline-none"
              />
            </div>
          </div>

          {/* Toggle show/hide pins */}
          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => setShowPins(!showPins)}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-[11px] font-mono cursor-pointer"
            >
              {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-amber-400" />}
              <span>{showPins ? 'Ocultar caracteres' : 'Exibir caracteres'}</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-2.5 bg-red-950/60 border border-red-800 text-red-300 rounded text-xs font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-mono font-bold transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-[#C4A76E] hover:bg-[#DFC897] text-black font-extrabold rounded-lg text-xs font-mono uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#C4A76E]/20 transition cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Salvar Novo PIN</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
