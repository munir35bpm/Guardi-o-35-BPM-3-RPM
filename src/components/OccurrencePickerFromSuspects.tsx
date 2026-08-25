import React, { useState, useMemo } from 'react';
import {
  Search,
  Users,
  Link2,
  Copy,
  CheckCircle,
  FileText,
  Calendar,
  MapPin,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  UserCheck
} from 'lucide-react';
import { OcorrenciaCriminal, SuspectWithDetails } from '../types';
import { db } from '../backend/db';

interface OccurrencePickerFromSuspectsProps {
  occurrences: OcorrenciaCriminal[];
  suspects: (SuspectWithDetails | any)[];
  currentSuspectId?: string;
  currentSuspectName?: string;
  selectedPapel: string;
  onChangePapel: (papel: string) => void;
  onLinkOccurrence: (occurrence: OcorrenciaCriminal, papel: string) => void;
  onCopyOccurrence: (occurrence: OcorrenciaCriminal) => void;
  alreadyLinkedIds?: string[];
}

export const OccurrencePickerFromSuspects: React.FC<OccurrencePickerFromSuspectsProps> = ({
  occurrences,
  suspects,
  currentSuspectId,
  currentSuspectName,
  selectedPapel,
  onChangePapel,
  onLinkOccurrence,
  onCopyOccurrence,
  alreadyLinkedIds = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSuspectFilter, setSelectedSuspectFilter] = useState<string>('all');
  const [expandedOcId, setExpandedOcId] = useState<string | null>(null);

  // Build mapping of occurrence ID / BO -> Linked Suspects
  const occurrencesWithSuspects = useMemo(() => {
    // Collect all occurrences from both prop and db to ensure none is missed
    const allOcsMap = new Map<string, OcorrenciaCriminal>();
    
    // Add from props
    occurrences.forEach((oc) => {
      if (oc && (oc.id || oc.numero_bo)) {
        allOcsMap.set(oc.id || oc.numero_bo, oc);
      }
    });

    // Add from in-memory DB if any exists
    if (db && db.ocorrencias_criminais) {
      db.ocorrencias_criminais.forEach((oc: any) => {
        if (oc && (oc.id || oc.numero_bo)) {
          if (!allOcsMap.has(oc.id || oc.numero_bo)) {
            allOcsMap.set(oc.id || oc.numero_bo, oc);
          }
        }
      });
    }

    const allOcs = Array.from(allOcsMap.values());

    return allOcs.map((oc) => {
      const linkedSuspects: { id: string; nome: string; vulgo?: string; papel?: string; foto_url?: string }[] = [];

      // Check against suspects list
      suspects.forEach((s) => {
        let isLinked = false;
        let papel = 'Autor';

        if (s.ocorrencias && Array.isArray(s.ocorrencias)) {
          const found = s.ocorrencias.find(
            (o: any) => (o.id && o.id === oc.id) || (o.numero_bo && o.numero_bo === oc.numero_bo)
          );
          if (found) {
            isLinked = true;
            papel = found.papel || found.papel_no_crime || 'Autor';
          }
        }

        if (!isLinked && db && db.infrator_ocorrencia) {
          const io = db.infrator_ocorrencia.find(
            (link: any) =>
              link.infrator_id === s.id &&
              (link.ocorrencia_id === oc.id || link.ocorrencia_id === oc.numero_bo)
          );
          if (io) {
            isLinked = true;
            papel = io.papel_no_crime || 'Autor';
          }
        }

        if (isLinked) {
          linkedSuspects.push({
            id: s.id,
            nome: s.nome_completo,
            vulgo: s.vulgo,
            papel,
            foto_url: s.foto_url,
          });
        }
      });

      return {
        ...oc,
        linkedSuspects,
      };
    });
  }, [occurrences, suspects]);

  // List of suspects who have at least one occurrence registered
  const suspectsWithOccurrences = useMemo(() => {
    return suspects.filter((s) => {
      const hasOcsInArray = s.ocorrencias && s.ocorrencias.length > 0;
      const hasOcsInDb =
        db &&
        db.infrator_ocorrencia &&
        db.infrator_ocorrencia.some((io: any) => io.infrator_id === s.id);
      return hasOcsInArray || hasOcsInDb;
    });
  }, [suspects]);

  // Filtered occurrences based on search term & selected suspect
  const filteredOccurrences = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return occurrencesWithSuspects.filter((item) => {
      // 1. Suspect filter
      if (selectedSuspectFilter !== 'all') {
        const matchesSuspect = item.linkedSuspects.some((s) => s.id === selectedSuspectFilter);
        if (!matchesSuspect) return false;
      }

      // 2. Search term filter
      if (!term) return true;

      const numBo = (item.numero_bo || '').toLowerCase();
      const tipificacao = (item.tipificacao_penal || '').toLowerCase();
      const modus = (item.modus_operandi || '').toLowerCase();
      const desc = (item.descricao_fato || '').toLowerCase();
      const armas = (item.armas_utilizadas || '').toLowerCase();
      const veiculo = (item.veiculo_utilizado || '').toLowerCase();
      const matchesSuspectName = item.linkedSuspects.some(
        (s) =>
          s.nome.toLowerCase().includes(term) ||
          (s.vulgo && s.vulgo.toLowerCase().includes(term))
      );

      return (
        numBo.includes(term) ||
        tipificacao.includes(term) ||
        modus.includes(term) ||
        desc.includes(term) ||
        armas.includes(term) ||
        veiculo.includes(term) ||
        matchesSuspectName
      );
    });
  }, [occurrencesWithSuspects, selectedSuspectFilter, searchTerm]);

  return (
    <div className="bg-[#0D0D11] border border-zinc-800 rounded-lg p-3.5 space-y-3 font-mono">
      {/* Header with Title & Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded">
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
              Registros Policiais de Outros Infratores / Banco de B.O.s
            </h4>
            <p className="text-[10px] text-zinc-400 font-sans">
              Pesquise ocorrências cadastradas em outros infratores para vincular como coautoria ou copiar dados.
            </p>
          </div>
        </div>

        {/* Global Role selector */}
        <div className="flex items-center gap-2 bg-[#141419] px-2.5 py-1.5 rounded border border-zinc-750">
          <label className="text-[9px] uppercase text-zinc-400 font-bold whitespace-nowrap">
            Vincular como:
          </label>
          <select
            value={selectedPapel}
            onChange={(e) => onChangePapel(e.target.value)}
            className="bg-[#09090C] border border-amber-500/50 rounded px-2 py-0.5 text-xs text-amber-300 font-bold focus:outline-none cursor-pointer"
          >
            <option value="Autor">Autor (Principal)</option>
            <option value="Coautor">Coautor</option>
            <option value="Suspeito">Suspeito</option>
            <option value="Vítima">Vítima</option>
            <option value="Notificado">Notificado</option>
            <option value="Testemunha / Condutor">Testemunha / Condutor</option>
            <option value="Indiciado">Indiciado</option>
          </select>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        {/* Filter by other suspect */}
        <div className="sm:col-span-5">
          <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-1">
            Filtrar por Infrator Específico:
          </label>
          <div className="relative">
            <select
              value={selectedSuspectFilter}
              onChange={(e) => setSelectedSuspectFilter(e.target.value)}
              className="w-full bg-[#141419] border border-zinc-700 hover:border-zinc-500 rounded p-2 text-xs text-zinc-200 focus:outline-none appearance-none pr-8 cursor-pointer"
            >
              <option value="all">📂 Todos os Infratores e Ocorrências ({occurrencesWithSuspects.length})</option>
              {suspectsWithOccurrences.map((s) => (
                <option key={s.id} value={s.id}>
                  👤 {s.nome_completo} {s.vulgo ? `("${s.vulgo}")` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>
        </div>

        {/* Text search */}
        <div className="sm:col-span-7">
          <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-1">
            Buscar por Nº B.O., Tipificação, Comparsa ou Dinâmica:
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Ex: 2025-037100827-001, Homicídio, Samuel, Pistola..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#141419] border border-zinc-700 hover:border-zinc-500 rounded pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Occurrences List */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {filteredOccurrences.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-zinc-800 rounded bg-[#09090C] text-zinc-500 text-xs">
            <ShieldAlert className="w-6 h-6 text-zinc-600 mx-auto mb-1.5" />
            <p>Nenhum registro policial encontrado com os filtros aplicados.</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Tente buscar por outro termo ou selecione "Todos os Infratores".</p>
          </div>
        ) : (
          filteredOccurrences.map((oc) => {
            const isAlreadyLinked =
              alreadyLinkedIds.includes(oc.id) ||
              alreadyLinkedIds.includes(oc.numero_bo);
            const isExpanded = expandedOcId === (oc.id || oc.numero_bo);

            return (
              <div
                key={oc.id || oc.numero_bo}
                className={`p-3 rounded border transition ${
                  isAlreadyLinked
                    ? 'bg-[#101410] border-emerald-800/60 opacity-90'
                    : 'bg-[#141419] border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                  {/* Left Column: BO info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded">
                        B.O. Nº {oc.numero_bo}
                      </span>
                      <span className="text-xs font-bold text-zinc-100">
                        {oc.tipificacao_penal}
                      </span>
                      {oc.data_hora && (
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-zinc-500" />
                          {new Date(oc.data_hora).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                      {isAlreadyLinked && (
                        <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                          <CheckCircle className="w-2.5 h-2.5" /> JÁ ADICIONADO
                        </span>
                      )}
                    </div>

                    {/* Suspects already attached to this occurrence */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                        <Users className="w-3 h-3 text-zinc-400" /> Infratores neste B.O.:
                      </span>
                      {oc.linkedSuspects && oc.linkedSuspects.length > 0 ? (
                        oc.linkedSuspects.map((ls) => (
                          <span
                            key={ls.id}
                            className="text-[10px] bg-zinc-900 border border-zinc-750 text-zinc-300 px-1.5 py-0.5 rounded flex items-center gap-1"
                          >
                            <strong className="text-amber-300">{ls.nome}</strong>
                            {ls.vulgo && <span className="text-zinc-400 font-normal">("{ls.vulgo}")</span>}
                            <span className="text-[8px] bg-zinc-800 text-zinc-400 px-1 rounded uppercase">
                              {ls.papel}
                            </span>
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-zinc-500 italic">
                          Cadastrado no acervo geral
                        </span>
                      )}
                    </div>

                    {/* Modus Operandi & Details preview */}
                    {oc.modus_operandi && (
                      <p className="text-[11px] text-zinc-300 font-sans line-clamp-2">
                        <strong className="text-zinc-400 font-mono text-[10px]">Dinâmica:</strong> {oc.modus_operandi}
                      </p>
                    )}

                    {/* Expanded details (Description, weapons, location) */}
                    {isExpanded && (
                      <div className="mt-2 pt-2 border-t border-zinc-800 text-[11px] space-y-1.5 bg-[#0A0A0E] p-2 rounded">
                        {oc.descricao_fato && (
                          <div>
                            <span className="text-[9px] uppercase text-zinc-400 font-bold block">
                              Narrativa Circunstanciada:
                            </span>
                            <p className="text-zinc-300 font-sans text-xs leading-relaxed whitespace-pre-wrap">
                              {oc.descricao_fato}
                            </p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[10px]">
                          {oc.armas_utilizadas && (
                            <div>
                              <strong className="text-zinc-400">Armas:</strong> {oc.armas_utilizadas}
                            </div>
                          )}
                          {oc.veiculo_utilizado && (
                            <div>
                              <strong className="text-zinc-400">Veículo:</strong> {oc.veiculo_utilizado}
                            </div>
                          )}
                          {oc.geom_crime && (
                            <div>
                              <strong className="text-zinc-400">Coordenadas:</strong>{' '}
                              {oc.geom_crime.lat?.toFixed(4)}, {oc.geom_crime.lng?.toFixed(4)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Action Buttons */}
                  <div className="flex sm:flex-col items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {/* Link Button */}
                    <button
                      type="button"
                      onClick={() => onLinkOccurrence(oc, selectedPapel)}
                      disabled={isAlreadyLinked}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded uppercase transition flex items-center justify-center gap-1 cursor-pointer w-full shadow-sm ${
                        isAlreadyLinked
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                      }`}
                      title={isAlreadyLinked ? 'B.O. já vinculado' : `Vincular este B.O. como ${selectedPapel}`}
                    >
                      <Link2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{isAlreadyLinked ? 'Vinculado' : `Vincular (${selectedPapel})`}</span>
                    </button>

                    {/* Copy/Clone Data to form */}
                    <button
                      type="button"
                      onClick={() => onCopyOccurrence(oc)}
                      className="px-2.5 py-1 text-[10px] font-bold rounded uppercase transition flex items-center justify-center gap-1 cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 w-full"
                      title="Copiar os dados deste B.O. para preencher e editar no formulário"
                    >
                      <Copy className="w-3 h-3 text-cyan-400" />
                      <span>Copiar Dados</span>
                    </button>

                    {/* Toggle expand */}
                    <button
                      type="button"
                      onClick={() => setExpandedOcId(isExpanded ? null : (oc.id || oc.numero_bo))}
                      className="px-2 py-0.5 text-[9px] text-zinc-400 hover:text-zinc-200 transition flex items-center gap-0.5"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3 h-3" /> Menos
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" /> Detalhes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OccurrencePickerFromSuspects;
