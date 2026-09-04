import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Unlock, Eye, EyeOff, AlertTriangle, KeyRound, X } from 'lucide-react';
import { loginAdmin, DEFAULT_PIN_HINT } from '../services/adminAuth';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pendingActionLabel?: string;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  pendingActionLabel,
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMessage(null);
      setShowPin(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const result = loginAdmin(pin, rememberMe);
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
              <Lock className="w-5 h-5 text-[#C4A76E]" />
            </div>
            <div>
              <h2 className="text-sm font-black font-display text-[#F3EEE4] tracking-wider uppercase">
                ACESSO RESTRITO // P2
              </h2>
              <p className="text-[11px] font-mono text-[#DFC897]">
                PMMG • 35º BPM • GUARDIÃO
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

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#C4A76E]" />
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-200">
                Desbloqueio de Alimentação
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {pendingActionLabel ? (
                <span>
                  A ação <strong className="text-amber-400">"{pendingActionLabel}"</strong> requer privilégios de Administrador.
                </span>
              ) : (
                <span>
                  O aplicativo opera por padrão em <strong className="text-zinc-200">Modo Consulta (Somente Leitura)</strong>. Insira seu PIN mestre para habilitar o cadastro, edição ou exclusão de dados.
                </span>
              )}
            </p>
          </div>

          {/* PIN Input */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono font-bold uppercase text-zinc-300">
              PIN / Senha de Administrador:
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoFocus
                placeholder="Digite o PIN de acesso..."
                className="w-full px-3.5 py-2.5 bg-[#0B0D12] border border-zinc-700 focus:border-[#C4A76E] focus:ring-1 focus:ring-[#C4A76E] rounded-lg text-sm text-zinc-100 placeholder-zinc-500 font-mono tracking-widest outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 p-1 cursor-pointer transition"
                title={showPin ? 'Ocultar PIN' : 'Exibir PIN'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-2.5 bg-red-950/60 border border-red-800 text-red-300 rounded text-xs font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Remember this browser checkbox */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 text-zinc-300 cursor-pointer select-none font-mono text-[11px]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 text-[#C4A76E] focus:ring-[#C4A76E] accent-[#C4A76E] bg-zinc-900 cursor-pointer"
              />
              <span>Lembrar neste navegador por 30 dias</span>
            </label>

            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className="text-[10px] font-mono text-[#DFC897] hover:underline cursor-pointer"
            >
              {showHint ? 'Ocultar dica' : 'Primeiro acesso?'}
            </button>
          </div>

          {/* Hint info for initial access */}
          {showHint && (
            <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded text-[11px] font-mono text-amber-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                PIN Padrão Inicial: <code className="bg-black/50 px-1.5 py-0.5 rounded text-amber-200">{DEFAULT_PIN_HINT}</code>
              </p>
              <p className="text-[10px] text-zinc-400">
                Após desbloquear, você pode trocar o PIN para qualquer código pessoal no botão "Alterar PIN".
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-mono font-bold transition cursor-pointer"
            >
              Cancelar (Permanecer em Leitura)
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-[#C4A76E] hover:bg-[#DFC897] text-black font-extrabold rounded-lg text-xs font-mono uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#C4A76E]/20 transition cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Desbloquear Alimentação</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
