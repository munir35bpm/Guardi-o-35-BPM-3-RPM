import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  UserPlus,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Link2,
  User,
  Calendar,
  FileText,
  Lock
} from 'lucide-react';
import { OcorrenciaCriminal, SuspectWithDetails } from '../types';

interface LinkSuspectToOccurrenceModalProps {
  isOpen: boolean;
  occurrence: OcorrenciaCriminal | null;
  suspects: any[];
  onClose: () => void;
  onLinkSuspect: (suspectId: string, papel: string) => Promise<void>;
  onUnlinkSuspect: (suspectId: string) => Promise<void>;
  isAdmin: boolean;
  requireAdmin: (actionTitle: string, callback: () => void) => void;
  getLinkedSuspectsForOccurrence: (oc: OcorrenciaCriminal) => Array<{
    id: string;
    nome: string;
    vulgo: string;
    papel: string;
    foto_url?: string;
  }>;
  getPapelBadge: (papel: string) => { bg: string; label: string };
}

export const LinkSuspectToOccurrenceModal: React.FC<LinkSuspectToOccurrenceModalProps> = ({
  isOpen,
  occurrence,
  suspects,
  onClose,
  onLinkSuspect,
  onUnlinkSuspect,
  isAdmin,
  requireAdmin,
  getLinkedSuspectsForOccurrence,
  getPapelBadge
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSuspectId, setSelectedSuspectId] = useState<string>('');
  const [selectedPapel, setSelectedPapel] = useState<string>('Autor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !occurrence) return null;

  // Currently linked suspects to this occurrence
  const currentlyLinked = getLinkedSuspectsForOccurrence(occurrence);
  const linkedIdsSet = new Set(currentlyLinked.map((s) => s.id).filter(Boolean));

  // Available suspects filtered by search query
  const filteredSuspects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return suspects.filter((s) => {
      if (!term) return true;
      const nomeMatch = (s.nome_completo || '').toLowerCase().includes(term);
      const vulgoMatch = (s.vulgo || '').toLowerCase().includes(term);
      const faccaoMatch = (s.gangue_faccao || '').toLowerCase().includes(term);
      const cpfMatch = (s.cpf || '').includes(term);
      return nomeMatch || vulgoMatch || faccaoMatch || cpfMatch;
    });
  }, [suspects, searchTerm]);

  const handleConfirmLink = async () => {
    if (!selectedSuspectId) {
      setErrorMessage('Selecione um infrator na lista para vincular.');
      return;
    }

    requireAdmin(`Vincular Infrator ao B.O. ${occurrence.numero_bo}`, async () => {
      setIsSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      try {
        await onLinkSuspect(selectedSuspectId, selectedPapel);
        const linkedSuspect = suspects.find((s) => s.id === selectedSuspectId);
        const nameDisplay = linkedSuspect ? `${linkedSuspect.nome_completo} (${linkedSuspect.vulgo || 'Sem vulgo'})` : 'Infrator';
        setSuccessMessage(`${nameDisplay} vinculado com sucesso como "${selectedPapel}"!`);
        setSelectedSuspectId('');
        setTimeout(() => setSuccessMessage(null), 3500);
      } catch (err: any) {
        setErrorMessage(`Falha ao vincular infrator: ${err?.message || 'Erro de comunicação'}`);
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  const handleUnlink = async (suspectId: string, suspectNome: string) => {
    if (!suspectId) {
      alert('Vínculo histórico não referenciado por ID.');
      return;
    }

    requireAdmin(`Desvincular ${suspectNome} do B.O. ${occurrence.numero_bo}`, async () => {
      setIsSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      try {
        await onUnlinkSuspect(suspectId);
        setSuccessMessage(`${suspectNome} desvinculado deste B.O. com sucesso.`);
        setTimeout(() => setSuccessMessage(null), 3500);
      } catch (err: any) {
        setErrorMessage(`Falha ao desvincular: ${err?.message || 'Erro de comunicação'}`);
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0E1118] border border-[#C4A76E]/40 rounded-lg max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#141824] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded">
              <Link2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono flex items-center gap-2">
                <span>Vincular Infratores ao Registro Policial</span>
                <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-mono">
                  B.O. Nº {occurrence.numero_bo}
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {occurrence.tipificacao_penal} • Registrado em {new Date(occurrence.data_hora).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Messages */}
          {errorMessage && (
            <div className="p-3 bg-red-950/70 border border-red-800 text-red-200 text-xs rounded flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs rounded flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* B.O. Details Summary Box */}
          <div className="bg-[#090B10] border border-zinc-850 p-3.5 rounded-lg space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-amber-400 font-mono font-bold">
                {occurrence.tipificacao_penal}
              </span>
              <span className="text-zinc-500 font-mono text-[11px] flex items-center gap-1">
                <Calendar className="w-3 h-3 text-zinc-500" />
                {new Date(occurrence.data_hora).toLocaleString('pt-BR')}
              </span>
            </div>
            {occurrence.modus_operandi && (
              <p className="text-xs text-zinc-300 bg-zinc-900/60 p-2 rounded border border-zinc-800/80">
                <strong className="text-zinc-400 text-[10px] uppercase block mb-0.5">Modus Operandi:</strong>
                {occurrence.modus_operandi}
              </p>
            )}
            {occurrence.descricao_fato && occurrence.descricao_fato !== occurrence.modus_operandi && (
              <p className="text-[11px] text-zinc-400 italic line-clamp-2">
                {occurrence.descricao_fato}
              </p>
            )}
            {(occurrence.armas_utilizadas || occurrence.veiculo_utilizado) && (
              <div className="flex flex-wrap gap-4 text-[10px] text-zinc-400 font-mono pt-1">
                {occurrence.armas_utilizadas && (
                  <span><strong>Armas:</strong> {occurrence.armas_utilizadas}</span>
                )}
                {occurrence.veiculo_utilizado && (
                  <span><strong>Veículo:</strong> {occurrence.veiculo_utilizado}</span>
                )}
              </div>
            )}
          </div>

          {/* Section 1: Infratores Atualmente Vinculados */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Infratores Já Vinculados a este B.O.</span>
                <span className="px-1.5 py-0.2 bg-zinc-800 text-zinc-300 text-[10px] rounded font-mono">
                  {currentlyLinked.length}
                </span>
              </h3>
            </div>

            {currentlyLinked.length === 0 ? (
              <div className="p-3.5 bg-zinc-900/40 border border-dashed border-zinc-800 rounded text-center">
                <p className="text-xs text-zinc-500 font-mono italic">
                  Nenhum infrator vinculado a este B.O. até o momento.
                </p>
                <p className="text-[10px] text-zinc-600 mt-1">
                  Selecione um investigado abaixo para associar ao registro criminal.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {currentlyLinked.map((ls, idx) => {
                  const badge = getPapelBadge(ls.papel);
                  return (
                    <div
                      key={idx}
                      className="bg-[#121622] border border-zinc-800 hover:border-zinc-700 p-2.5 rounded flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {ls.foto_url ? (
                          <img
                            src={ls.foto_url}
                            alt={ls.nome}
                            className="w-9 h-9 rounded object-cover border border-zinc-700 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-zinc-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-zinc-100 truncate">
                            {ls.nome}
                          </div>
                          {ls.vulgo && (
                            <div className="text-[10px] text-amber-400 font-mono truncate">
                              "{ls.vulgo}"
                            </div>
                          )}
                          <span
                            className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold border ${badge.bg}`}
                          >
                            {ls.papel}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                          let targetId = ls.id;
                          if (!targetId) {
                            const found = suspects.find(
                              (sp) => sp.nome_completo === ls.nome || sp.vulgo === ls.vulgo
                            );
                            if (found) targetId = found.id;
                          }
                          handleUnlink(targetId || ls.nome, ls.nome);
                        }}
                        className="px-2.5 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 hover:text-white rounded text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer flex-shrink-0 shadow-sm shadow-red-950/40"
                        title={`Excluir ${ls.nome} deste registro policial`}
                      >
                        <Trash2 className="w-3 h-3 text-red-300 stroke-[2.5]" />
                        <span>Excluir Infrator Vinculado</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Vincular Novo Infrator da Base */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-2">
                <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>Selecionar Infrator no Banco de Investigados</span>
              </h3>
              {!isAdmin && (
                <span className="text-[10px] text-amber-500 flex items-center gap-1 font-mono">
                  <Lock className="w-3 h-3" /> Requer PIN de Administrador
                </span>
              )}
            </div>

            {/* Search and Role Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, vulgo, facção ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0A0A0E] border border-zinc-850 focus:border-amber-500/80 rounded p-2 pl-8 text-xs text-zinc-200 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">
                  Papel no Crime
                </label>
                <select
                  value={selectedPapel}
                  onChange={(e) => setSelectedPapel(e.target.value)}
                  className="w-full bg-[#0A0A0E] border border-zinc-850 rounded p-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-500/80"
                >
                  <option value="Autor">Autor (Principal)</option>
                  <option value="Coautor">Coautor</option>
                  <option value="Partícipe">Partícipe</option>
                  <option value="Mandante">Mandante</option>
                  <option value="Investigado">Investigado / Suspeito</option>
                  <option value="Vítima">Vítima</option>
                  <option value="Testemunha">Testemunha</option>
                </select>
              </div>
            </div>

            {/* List of Suspects */}
            <div className="space-y-1 max-h-56 overflow-y-auto border border-zinc-850 rounded p-1.5 bg-[#090B10]">
              {filteredSuspects.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-500 font-mono">
                  Nenhum investigado encontrado para a busca informada.
                </div>
              ) : (
                filteredSuspects.map((s) => {
                  const isLinked = linkedIdsSet.has(s.id);
                  const isSelected = selectedSuspectId === s.id;

                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        if (!isLinked) {
                          setSelectedSuspectId(s.id);
                        }
                      }}
                      className={`p-2 rounded border transition flex items-center justify-between gap-3 text-xs ${
                        isLinked
                          ? 'bg-zinc-950/40 border-zinc-850 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'bg-amber-500/15 border-amber-500/60 shadow-sm cursor-pointer'
                          : 'bg-[#10131C]/80 border-zinc-800/80 hover:bg-[#161B29] hover:border-zinc-700 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {s.foto_url ? (
                          <img
                            src={s.foto_url}
                            alt={s.nome_completo}
                            className="w-8 h-8 rounded object-cover border border-zinc-700 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-zinc-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-zinc-200 truncate flex items-center gap-1.5">
                            <span>{s.nome_completo}</span>
                            {s.vulgo && (
                              <span className="text-amber-400 font-mono text-[11px]">
                                "{s.vulgo}"
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-2">
                            <span>{s.gangue_faccao || 'Sem facção'}</span>
                            <span>•</span>
                            <span className="text-zinc-400">{s.situacao_atual || 'EM LIBERDADE'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        {isLinked ? (
                          <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[9px] font-bold rounded">
                            Já Vinculado
                          </span>
                        ) : (
                          <input
                            type="radio"
                            name="selectedSuspect"
                            checked={isSelected}
                            onChange={() => setSelectedSuspectId(s.id)}
                            className="accent-amber-500 cursor-pointer"
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected Suspect Preview & Submit */}
            {selectedSuspectId && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded flex items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="text-zinc-400">Infrator selecionado: </span>
                  <span className="font-bold text-amber-300 font-mono">
                    {suspects.find((s) => s.id === selectedSuspectId)?.nome_completo}
                  </span>
                  <span className="text-zinc-400"> como </span>
                  <span className="font-bold text-zinc-200 uppercase font-mono">
                    "{selectedPapel}"
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmLink}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase rounded transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                  <span>{isSubmitting ? 'Vinculando...' : 'Confirmar Vínculo'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#141824] border-t border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase rounded cursor-pointer transition"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkSuspectToOccurrenceModal;
