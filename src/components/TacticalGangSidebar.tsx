import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Shield,
  Crosshair,
  Search,
  Users,
  Home,
  FileText,
  AlertTriangle,
  ChevronRight,
  Maximize2,
  Sparkles,
  MapPin,
  ExternalLink,
  Plus,
  RefreshCw,
  X,
  Radio,
  Swords,
  Eye,
  CheckCircle2,
  Layers,
  ChevronDown,
  ChevronUp,
  Edit3
} from 'lucide-react';
import { GangAreaZone, Infrator, EnderecoAtuacao, OcorrenciaCriminal } from '../types';
import { getGangIntelligenceDetails, GangIntelligenceData } from '../utils/gangIntelligence';

interface TacticalGangSidebarProps {
  gangAreas: GangAreaZone[];
  selectedGangZone: GangAreaZone | null;
  onSelectGangZone: (zone: GangAreaZone | null) => void;
  suspects: Infrator[];
  addresses: EnderecoAtuacao[];
  occurrences: OcorrenciaCriminal[];
  onFocusCoordinates?: (coords: { lat: number; lng: number }) => void;
  onViewSuspectDetail?: (suspect: Infrator) => void;
  onRunAiSweep?: (gangZone?: GangAreaZone) => void;
  onRegisterOccurrence?: (coords?: { lat: number; lng: number }) => void;
  onRegisterAddress?: (coords?: { lat: number; lng: number }) => void;
  onEditGangZone?: (zone: GangAreaZone) => void;
  onCreateGangZone?: () => void;
}

export const TacticalGangSidebar: React.FC<TacticalGangSidebarProps> = ({
  gangAreas,
  selectedGangZone,
  onSelectGangZone,
  suspects,
  addresses,
  occurrences,
  onFocusCoordinates,
  onViewSuspectDetail,
  onRunAiSweep,
  onRegisterOccurrence,
  onRegisterAddress,
  onEditGangZone,
  onCreateGangZone,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'integrantes' | 'residencias' | 'ocorrencias' | 'operacoes'>('integrantes');
  const [isGangListExpanded, setIsGangListExpanded] = useState(true);

  // Computa a inteligência detalhada para cada gangue
  const gangIntelMap = useMemo(() => {
    const map = new Map<string, GangIntelligenceData>();
    gangAreas.forEach((zone) => {
      map.set(zone.id, getGangIntelligenceDetails(zone, suspects, addresses, occurrences));
    });
    return map;
  }, [gangAreas, suspects, addresses, occurrences]);

  // Inteligência da gangue atualmente selecionada
  const selectedGangIntel = useMemo(() => {
    if (!selectedGangZone) return null;
    return (
      gangIntelMap.get(selectedGangZone.id) ||
      getGangIntelligenceDetails(selectedGangZone, suspects, addresses, occurrences)
    );
  }, [selectedGangZone, gangIntelMap, suspects, addresses, occurrences]);

  // Filtragem de botões pelo input de busca
  const filteredGangs = useMemo(() => {
    if (!searchTerm.trim()) return gangAreas;
    const term = searchTerm.toLowerCase();
    return gangAreas.filter((zone) => {
      const gName = (zone.gangName || '').toLowerCase();
      const zName = (zone.name || '').toLowerCase();
      const desc = (zone.description || '').toLowerCase();
      const rival = (zone.rivalGang || '').toLowerCase();
      return gName.includes(term) || zName.includes(term) || desc.includes(term) || rival.includes(term);
    });
  }, [gangAreas, searchTerm]);

  // Handler para focar no centróide da gangue
  const handleFocusGangTerritory = () => {
    if (!selectedGangZone || !selectedGangZone.coordinates || selectedGangZone.coordinates.length === 0) return;
    const coords = selectedGangZone.coordinates;
    const centerLat = coords.reduce((sum, p) => sum + p[0], 0) / coords.length;
    const centerLng = coords.reduce((sum, p) => sum + p[1], 0) / coords.length;
    if (onFocusCoordinates) {
      onFocusCoordinates({ lat: centerLat, lng: centerLng });
    }
  };

  return (
    <div className="bg-[#0F0F12] border border-zinc-800 rounded-lg p-4 flex flex-col h-full shadow-2xl tactical-corner font-mono text-xs overflow-hidden">
      {/* Top Header Bar */}
      <div className="border-b border-zinc-800 pb-3 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Mapeamento Tático</span>
              <span className="text-[10px] text-zinc-500">// Gangues</span>
            </h3>
            <p className="text-[10px] text-zinc-400">
              {selectedGangZone ? '1 Gangue em Foco Exclusivo' : `${gangAreas.length} Territórios Registrados`}
            </p>
          </div>
        </div>

        {/* Action Buttons: Cadastrar Nova Gangue & Reset/All Gangs */}
        <div className="flex items-center gap-1.5">
          {onCreateGangZone && (
            <button
              type="button"
              onClick={onCreateGangZone}
              className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 rounded border border-amber-500/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition cursor-pointer"
              title="Cadastrar nova gangue e demarcar território"
            >
              <Plus className="w-3 h-3 text-amber-400" />
              <span>Nova Gangue</span>
            </button>
          )}

          {selectedGangZone ? (
            <button
              type="button"
              onClick={() => onSelectGangZone(null)}
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded border border-zinc-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition cursor-pointer"
              title="Limpar seleção e exibir todas as demarcações no mapa"
            >
              <Eye className="w-3 h-3 text-amber-400" />
              <span>Ver Todas</span>
            </button>
          ) : (
            <span className="text-[10px] bg-amber-950/60 border border-amber-800/60 text-amber-300 px-2 py-0.5 rounded font-bold">
              {gangAreas.length} Áreas
            </span>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filtrar gangue por nome, setor..."
          className="w-full pl-8 pr-7 py-1.5 bg-black/50 border border-zinc-800 focus:border-amber-500/60 rounded text-zinc-200 placeholder-zinc-600 text-[11px] outline-none transition"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Gang Selection Buttons Section */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1.5 px-0.5">
          <span className="flex items-center gap-1">
            <Radio className="w-3 h-3 text-amber-400" />
            <span>Botões de Gangues ({filteredGangs.length})</span>
          </span>
          {selectedGangZone && (
            <button
              type="button"
              onClick={() => setIsGangListExpanded(!isGangListExpanded)}
              className="text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5 transition cursor-pointer"
            >
              <span>{isGangListExpanded ? 'Recolher' : 'Expandir'}</span>
              {isGangListExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Scrollable Container with Gang Buttons */}
        <div
          className={`space-y-1.5 overflow-y-auto pr-1 transition-all duration-200 ${
            selectedGangZone
              ? isGangListExpanded
                ? 'max-h-40'
                : 'max-h-12'
              : 'max-h-80 flex-1'
          }`}
        >
          {filteredGangs.length > 0 ? (
            filteredGangs.map((zone) => {
              const isSelected = selectedGangZone?.id === zone.id;
              const intel = gangIntelMap.get(zone.id);
              const memberCount = intel?.integrantes.length || 0;
              const addrCount = intel?.residencias.length || 0;
              const ocCount = intel?.ocorrencias.length || 0;
              const hasWarrants = (intel?.mandadosAtivosCount || 0) > 0;

              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      // Se já está selecionada, ao clicar novamente pode re-focar ou manter
                      handleFocusGangTerritory();
                    } else {
                      onSelectGangZone(zone);
                    }
                  }}
                  className={`w-full text-left p-2 rounded border transition-all cursor-pointer flex flex-col gap-1 relative ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-500 text-amber-200 shadow-lg shadow-amber-500/10'
                      : 'bg-zinc-900/60 hover:bg-zinc-800/80 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                  style={{
                    borderLeftWidth: '4px',
                    borderLeftColor: zone.color || '#eab308',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: zone.color || '#eab308' }}
                      />
                      <span className="font-bold text-[11px] truncate tracking-tight uppercase">
                        {zone.gangName || zone.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onEditGangZone && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditGangZone(zone);
                          }}
                          className="p-1 text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 rounded transition cursor-pointer"
                          title="Editar nome da gangue e território"
                        >
                          <Edit3 className="w-3 h-3 text-amber-400" />
                        </button>
                      )}
                      {isSelected && (
                        <span className="shrink-0 flex items-center gap-1 text-[9px] bg-amber-500 text-black font-extrabold px-1.5 py-0.2 rounded uppercase">
                          <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" />
                          <span>Foco</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badges / Metrics row */}
                  <div className="flex items-center gap-2 text-[9px] text-zinc-400 pl-4">
                    <span className="flex items-center gap-1">
                      <Users className="w-2.5 h-2.5 text-blue-400" />
                      <span>{memberCount}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Home className="w-2.5 h-2.5 text-emerald-400" />
                      <span>{addrCount} res.</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-2.5 h-2.5 text-red-400" />
                      <span>{ocCount} B.O.</span>
                    </span>

                    {hasWarrants && (
                      <span className="ml-auto text-[8px] bg-red-950/80 text-red-300 border border-red-800/60 px-1 py-0.2 rounded font-bold uppercase">
                        Mandado
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-3 text-center text-zinc-500 text-[11px]">
              Nenhuma gangue encontrada com o termo "{searchTerm}".
            </div>
          )}
        </div>
      </div>

      {/* Detailed Gang Inspector (When a gang is selected) */}
      {selectedGangZone && selectedGangIntel ? (
        <div className="flex-1 flex flex-col overflow-hidden border-t border-zinc-800 pt-2">
          {/* Gang Card Header */}
          <div className="p-2.5 bg-black/40 border border-zinc-800/80 rounded mb-2.5">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedGangZone.color || '#eab308' }}
                  />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {selectedGangZone.gangName || selectedGangZone.name}
                  </h4>
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {selectedGangZone.name}
                </p>
              </div>

              {/* Action Buttons: Editar & Focar */}
              <div className="flex items-center gap-1.5">
                {onEditGangZone && (
                  <button
                    type="button"
                    onClick={() => onEditGangZone(selectedGangZone)}
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-400 hover:text-amber-300 border border-zinc-700 hover:border-amber-500/50 rounded transition cursor-pointer flex items-center gap-1"
                    title="Editar nome da gangue, território e parâmetros táticos"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-bold uppercase hidden sm:inline">Editar</span>
                  </button>
                )}

                {/* Focus Map Button */}
                <button
                  type="button"
                  onClick={handleFocusGangTerritory}
                  className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded transition cursor-pointer flex items-center gap-1"
                  title="Centralizar e aproximar mapa neste território"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold uppercase hidden sm:inline">Focar</span>
                </button>
              </div>
            </div>

            {/* General Gang Stats Row */}
            <div className="grid grid-cols-3 gap-1.5 text-center mt-2 pt-2 border-t border-zinc-800/60 text-[9px]">
              <div className="bg-zinc-900/60 p-1 rounded border border-zinc-800">
                <span className="text-zinc-500 block">Área</span>
                <span className="font-bold text-amber-300">
                  {selectedGangZone.areaKm2 ? `${selectedGangZone.areaKm2} km²` : 'Delimitada'}
                </span>
              </div>
              <div className="bg-zinc-900/60 p-1 rounded border border-zinc-800">
                <span className="text-zinc-500 block">Risco</span>
                <span
                  className={`font-bold ${
                    selectedGangZone.dangerLevel === 'CRÍTICO'
                      ? 'text-red-400'
                      : selectedGangZone.dangerLevel === 'ALTO'
                      ? 'text-orange-400'
                      : 'text-yellow-400'
                  }`}
                >
                  {selectedGangZone.dangerLevel || 'MONITORADO'}
                </span>
              </div>
              <div className="bg-zinc-900/60 p-1 rounded border border-zinc-800">
                <span className="text-zinc-500 block">Mandados</span>
                <span
                  className={`font-bold ${
                    selectedGangIntel.mandadosAtivosCount > 0 ? 'text-red-400 font-extrabold' : 'text-emerald-400'
                  }`}
                >
                  {selectedGangIntel.mandadosAtivosCount}
                </span>
              </div>
            </div>

            {selectedGangZone.rivalGang && (
              <div className="mt-2 flex items-center gap-1.5 text-[9px] text-red-400 bg-red-950/30 border border-red-900/40 px-2 py-1 rounded">
                <Swords className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  <strong>Rival Declarado:</strong> {selectedGangZone.rivalGang}
                </span>
              </div>
            )}
          </div>

          {/* Navigation Tabs for Details */}
          <div className="flex border-b border-zinc-800 mb-2 gap-1 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('integrantes')}
              className={`flex-1 py-1.5 px-1 rounded-t border-b-2 text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'integrantes'
                  ? 'border-amber-500 text-amber-300 bg-amber-950/20'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>Integ. ({selectedGangIntel.integrantes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('residencias')}
              className={`flex-1 py-1.5 px-1 rounded-t border-b-2 text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'residencias'
                  ? 'border-amber-500 text-amber-300 bg-amber-950/20'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Home className="w-3 h-3" />
              <span>Resid. ({selectedGangIntel.residencias.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ocorrencias')}
              className={`flex-1 py-1.5 px-1 rounded-t border-b-2 text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'ocorrencias'
                  ? 'border-amber-500 text-amber-300 bg-amber-950/20'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>B.O.s ({selectedGangIntel.ocorrencias.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('operacoes')}
              className={`py-1.5 px-2 rounded-t border-b-2 text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'operacoes'
                  ? 'border-amber-500 text-amber-300 bg-amber-950/20'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
              title="Ações táticas e IA"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
            </button>
          </div>

          {/* Tab 1: Integrantes da Gangue */}
          {activeTab === 'integrantes' && (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {selectedGangIntel.integrantes.length > 0 ? (
                selectedGangIntel.integrantes.map((suspect) => {
                  const hasWarrant = Boolean(suspect.status_mandado_prisao);
                  const suspectAddresses = (suspect as any).enderecos;
                  const firstAddr =
                    suspectAddresses && suspectAddresses.length > 0
                      ? suspectAddresses[0]
                      : addresses.find((a) => a.infrator_id === suspect.id);

                  return (
                    <div
                      key={suspect.id}
                      className="p-2 bg-zinc-900/70 border border-zinc-800 rounded hover:border-zinc-700 transition flex flex-col gap-1.5"
                    >
                      <div className="flex items-start gap-2">
                        {/* Suspect Photo */}
                        <div className="w-9 h-9 rounded bg-black/60 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {suspect.foto_url ? (
                            <img
                              src={suspect.foto_url}
                              alt={suspect.nome_completo}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Users className="w-4 h-4 text-zinc-500" />
                          )}
                        </div>

                        {/* Name & Nickname */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className="font-bold text-white text-[11px] truncate">
                              {suspect.nome_completo}
                            </h5>
                            {hasWarrant && (
                              <span className="shrink-0 text-[8px] bg-red-600 text-white font-extrabold px-1 py-0.2 rounded uppercase">
                                Mandado
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-amber-400 font-bold truncate">
                            Vulgo: "{suspect.vulgo || 'S/V'}"
                          </div>

                          <div className="text-[9px] text-zinc-400 flex items-center gap-2 mt-0.5">
                            <span>Peric: {suspect.periculosidade || 'Média'}</span>
                            <span>•</span>
                            <span
                              className={
                                suspect.situacao_atual === 'PRESO'
                                  ? 'text-red-400'
                                  : suspect.situacao_atual === 'FORAGIDO'
                                  ? 'text-orange-400 font-bold'
                                  : 'text-emerald-400'
                              }
                            >
                              {suspect.situacao_atual || 'EM LIBERDADE'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-800/60 text-[9px]">
                        {firstAddr && firstAddr.geom_ponto?.lat && firstAddr.geom_ponto?.lng && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onFocusCoordinates && firstAddr.geom_ponto) {
                                onFocusCoordinates(firstAddr.geom_ponto);
                              }
                            }}
                            className="flex-1 py-1 px-1.5 bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 border border-blue-800/50 rounded flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <MapPin className="w-2.5 h-2.5 text-blue-400" />
                            <span>Focar Residência</span>
                          </button>
                        )}

                        {onViewSuspectDetail && (
                          <button
                            type="button"
                            onClick={() => onViewSuspectDetail(suspect)}
                            className="flex-1 py-1 px-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span>Ver Ficha</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 bg-zinc-950/60 border border-dashed border-zinc-800 rounded text-center text-zinc-500">
                  <p className="text-[11px] mb-1">Nenhum integrante vinculado formalmente.</p>
                  <p className="text-[9px] text-zinc-600">
                    Cadastre um novo infrator informando a facção "{selectedGangZone.gangName || selectedGangZone.name}".
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Residências dos Integrantes */}
          {activeTab === 'residencias' && (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {selectedGangIntel.residencias.length > 0 ? (
                selectedGangIntel.residencias.map((addr, idx) => {
                  const ownerSuspect = suspects.find((s) => s.id === addr.infrator_id);

                  return (
                    <div
                      key={addr.id || `addr-${idx}`}
                      className="p-2 bg-zinc-900/70 border border-zinc-800 rounded hover:border-zinc-700 transition flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-950/70 text-blue-300 border border-blue-800/60 uppercase">
                          {addr.tipo_endereco || 'Residência'}
                        </span>
                        {addr.raio_influencia_km && (
                          <span className="text-[9px] text-zinc-500">
                            Raio: {addr.raio_influencia_km} km
                          </span>
                        )}
                      </div>

                      <div className="font-bold text-white text-[11px] truncate">
                        {addr.logradouro || 'Logradouro não informado'}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {addr.bairro || 'Bairro central'}, {addr.cidade || 'Santa Luzia'}
                      </div>

                      {ownerSuspect && (
                        <div className="text-[9px] text-amber-400/90 truncate mt-0.5">
                          Morador: {ownerSuspect.nome_completo} ({ownerSuspect.vulgo || 'S/V'})
                        </div>
                      )}

                      {addr.geom_ponto?.lat && addr.geom_ponto?.lng && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onFocusCoordinates && addr.geom_ponto) {
                              onFocusCoordinates(addr.geom_ponto);
                            }
                          }}
                          className="mt-1 py-1 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded flex items-center justify-center gap-1 text-[9px] transition cursor-pointer"
                        >
                          <Crosshair className="w-3 h-3 text-amber-400" />
                          <span>Focar Coordenadas no Mapa</span>
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 bg-zinc-950/60 border border-dashed border-zinc-800 rounded text-center text-zinc-500">
                  <p className="text-[11px] mb-1">Nenhuma residência delimitada no momento.</p>
                  {onRegisterAddress && (
                    <button
                      type="button"
                      onClick={() => onRegisterAddress()}
                      className="mt-2 text-[10px] px-2 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded border border-amber-500/40 transition cursor-pointer"
                    >
                      + Cadastrar Endereço / Ponto
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: B.O.s e Ocorrências */}
          {activeTab === 'ocorrencias' && (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {selectedGangIntel.ocorrencias.length > 0 ? (
                selectedGangIntel.ocorrencias.map((oc) => (
                  <div
                    key={oc.id || oc.numero_bo}
                    className="p-2 bg-zinc-900/70 border border-zinc-800 rounded hover:border-zinc-700 transition flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-red-400 text-[10px]">
                        B.O. {oc.numero_bo}
                      </span>
                      <span className="text-[9px] text-zinc-500">
                        {oc.data_hora ? new Date(oc.data_hora).toLocaleDateString('pt-BR') : 'Data n/i'}
                      </span>
                    </div>

                    <div className="font-bold text-white text-[11px]">
                      {oc.tipificacao_penal}
                    </div>

                    {oc.descricao_fato && (
                      <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5">
                        {oc.descricao_fato}
                      </p>
                    )}

                    {oc.geom_crime?.lat && oc.geom_crime?.lng && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onFocusCoordinates && oc.geom_crime) {
                            onFocusCoordinates(oc.geom_crime);
                          }
                        }}
                        className="mt-1 py-1 px-2 bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/50 rounded flex items-center justify-center gap-1 text-[9px] transition cursor-pointer"
                      >
                        <Crosshair className="w-3 h-3 text-red-400" />
                        <span>Focar Local do Crime no Mapa</span>
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 bg-zinc-950/60 border border-dashed border-zinc-800 rounded text-center text-zinc-500">
                  <p className="text-[11px] mb-1">Nenhum B.O. associado a este território.</p>
                  {onRegisterOccurrence && (
                    <button
                      type="button"
                      onClick={() => onRegisterOccurrence()}
                      className="mt-2 text-[10px] px-2 py-1 bg-red-950/60 text-red-300 hover:bg-red-900/80 rounded border border-red-800 transition cursor-pointer"
                    >
                      + Registrar B.O. neste Território
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Ações Operacionais & IA */}
          {activeTab === 'operacoes' && (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded">
                <h5 className="font-bold text-white text-[11px] flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Varredura IA de Inteligência</span>
                </h5>
                <p className="text-[10px] text-zinc-400 mb-2.5">
                  Analisa cruzamentos balísticos, rotas de fuga e reincidências associadas à facção{' '}
                  <strong className="text-amber-300">{selectedGangZone.gangName || selectedGangZone.name}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (onRunAiSweep) onRunAiSweep(selectedGangZone);
                  }}
                  className="w-full py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-extrabold rounded uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Executar Varredura IA na Área</span>
                </button>
              </div>

              {/* Fast Action Buttons */}
              <div className="space-y-1.5 pt-1">
                {onRegisterOccurrence && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedGangZone.coordinates?.[0]) {
                        onRegisterOccurrence({
                          lat: selectedGangZone.coordinates[0][0],
                          lng: selectedGangZone.coordinates[0][1],
                        });
                      } else {
                        onRegisterOccurrence();
                      }
                    }}
                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-red-400" />
                    <span>Registrar B.O. Neste Território</span>
                  </button>
                )}

                {onRegisterAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedGangZone.coordinates?.[0]) {
                        onRegisterAddress({
                          lat: selectedGangZone.coordinates[0][0],
                          lng: selectedGangZone.coordinates[0][1],
                        });
                      } else {
                        onRegisterAddress();
                      }
                    }}
                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-400" />
                    <span>Registrar Residência / Ponto</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty / No Gang Selected State */
        <div className="flex-1 flex flex-col justify-between border-t border-zinc-800 pt-3">
          <div className="bg-zinc-950/70 border border-dashed border-zinc-800 rounded-lg p-3 text-center">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center mb-2">
              <Crosshair className="w-5 h-5 text-amber-500/80 animate-pulse" />
            </div>
            <h4 className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide mb-1">
              Selecione uma Gangue Acima
            </h4>
            <p className="text-[10px] text-zinc-500 leading-relaxed max-w-xs mx-auto">
              Clique em qualquer botão de gangue para focar o mapa exclusivamente em seu território,
              ocultando as outras áreas para um visual 100% clean.
            </p>
          </div>

          {/* Tactical Quick Actions */}
          <div className="space-y-2 mt-3">
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">
              Operações Rápidas
            </div>
            {onRunAiSweep && (
              <button
                type="button"
                onClick={() => onRunAiSweep()}
                className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Executar Varredura Geral IA</span>
              </button>
            )}

            {onRegisterOccurrence && (
              <button
                type="button"
                onClick={() => onRegisterOccurrence()}
                className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-red-400" />
                <span>Registrar Ocorrência Criminal</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TacticalGangSidebar;
