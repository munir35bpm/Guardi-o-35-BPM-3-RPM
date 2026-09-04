import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Edit3,
  MapPin,
  X,
  CheckCircle2,
  Trash2,
  Compass,
  AlertTriangle,
  Layers,
  Swords,
  Crosshair,
  RefreshCw
} from 'lucide-react';
import { GangAreaZone } from '../types';

interface GangAreaEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoneToEdit: GangAreaZone | null;
  existingGangAreas: GangAreaZone[];
  selectedCoords?: { lat: number; lng: number } | null;
  onSave: (zone: GangAreaZone, isNew: boolean) => Promise<void> | void;
  onDelete?: (zoneId: string) => Promise<void> | void;
}

// Tactical color options
const TACTICAL_COLORS = [
  { name: 'Vermelho Alerta', hex: '#ef4444' },
  { name: 'Laranja Tático', hex: '#f97316' },
  { name: 'Amarelo Ouro', hex: '#eab308' },
  { name: 'Verde Esmeralda', hex: '#10b981' },
  { name: 'Ciano Operacional', hex: '#06b6d4' },
  { name: 'Azul Polícia', hex: '#3b82f6' },
  { name: 'Roxo / Violeta', hex: '#8b5cf6' },
  { name: 'Rosa Choque', hex: '#ec4899' },
];

// Quick suggestions for faction names
const FACTION_SUGGESTIONS = [
  'Comando Vermelho (CV)',
  'Primeiro Comando da Capital (PCC)',
  'Terceiro Comando Puro (TCP)',
  'Gangue do Palmital',
  'Tropa da Rua 15',
  'Gangue do São Benedito',
  'Bonde do Alto',
  'Gangue da Pista',
];

// Generate a regular circular polygon around a center point
function generateCircularPolygon(
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
  points: number = 10
): [number, number][] {
  const coords: [number, number][] = [];
  const latRadian = (centerLat * Math.PI) / 180;
  const dLat = (radiusMeters / 6371000) * (180 / Math.PI);
  const dLng = dLat / Math.cos(latRadian);

  for (let i = 0; i < points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    const pLat = centerLat + dLat * Math.sin(angle);
    const pLng = centerLng + dLng * Math.cos(angle);
    coords.push([Number(pLat.toFixed(6)), Number(pLng.toFixed(6))]);
  }
  // Close the polygon
  coords.push(coords[0]);
  return coords;
}

// Approximate polygon area in km²
function calculatePolygonAreaKm2(coords: [number, number][]): number {
  if (!coords || coords.length < 3) return 0;
  let area = 0;
  const R = 6371; // Earth radius in km
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const lat1 = (p1[0] * Math.PI) / 180;
    const lat2 = (p2[0] * Math.PI) / 180;
    const dLng = ((p2[1] - p1[1]) * Math.PI) / 180;
    area += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  area = Math.abs((area * R * R) / 4);
  return Number(area.toFixed(2));
}

export const GangAreaEditModal: React.FC<GangAreaEditModalProps> = ({
  isOpen,
  onClose,
  zoneToEdit,
  existingGangAreas,
  selectedCoords,
  onSave,
  onDelete,
}) => {
  const isEditing = Boolean(zoneToEdit);

  // Form State
  const [gangName, setGangName] = useState('');
  const [territoryName, setTerritoryName] = useState('');
  const [dangerLevel, setDangerLevel] = useState<'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO'>('ALTO');
  const [rivalGang, setRivalGang] = useState('');
  const [color, setColor] = useState('#ef4444');
  const [description, setDescription] = useState('');

  // Geometry / Demarcation State
  const [coordinates, setCoordinates] = useState<[number, number][]>([]);
  const [demarcationMode, setDemarcationMode] = useState<'radius' | 'manual'>('radius');
  const [centerLat, setCenterLat] = useState<number>(-19.7712);
  const [centerLng, setCenterLng] = useState<number>(-43.8564);
  const [radiusMeters, setRadiusMeters] = useState<number>(500);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or reset form when modal opens or zoneToEdit changes
  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    setIsSaving(false);
    setIsDeleting(false);

    if (zoneToEdit) {
      // Editing existing zone
      setGangName(zoneToEdit.gangName || zoneToEdit.name || '');
      setTerritoryName(zoneToEdit.name || zoneToEdit.gangName || '');
      setDangerLevel(zoneToEdit.dangerLevel || 'ALTO');
      setRivalGang(zoneToEdit.rivalGang || '');
      setColor(zoneToEdit.color || '#ef4444');
      setDescription(zoneToEdit.description || zoneToEdit.notes || '');

      if (zoneToEdit.coordinates && zoneToEdit.coordinates.length >= 3) {
        setCoordinates(zoneToEdit.coordinates);
        // Calculate center of existing polygon
        const latSum = zoneToEdit.coordinates.reduce((sum, p) => sum + p[0], 0);
        const lngSum = zoneToEdit.coordinates.reduce((sum, p) => sum + p[1], 0);
        setCenterLat(Number((latSum / zoneToEdit.coordinates.length).toFixed(6)));
        setCenterLng(Number((lngSum / zoneToEdit.coordinates.length).toFixed(6)));
        setDemarcationMode('manual');
      } else {
        const cLat = selectedCoords?.lat || -19.7712;
        const cLng = selectedCoords?.lng || -43.8564;
        setCenterLat(cLat);
        setCenterLng(cLng);
        const initialPoly = generateCircularPolygon(cLat, cLng, 500);
        setCoordinates(initialPoly);
        setDemarcationMode('radius');
      }
    } else {
      // Creating new zone
      setGangName('');
      setTerritoryName('');
      setDangerLevel('ALTO');
      setRivalGang('');
      setColor('#ef4444');
      setDescription('');

      const cLat = selectedCoords?.lat || -19.7712;
      const cLng = selectedCoords?.lng || -43.8564;
      setCenterLat(cLat);
      setCenterLng(cLng);
      setRadiusMeters(500);
      const initialPoly = generateCircularPolygon(cLat, cLng, 500);
      setCoordinates(initialPoly);
      setDemarcationMode('radius');
    }
  }, [isOpen, zoneToEdit, selectedCoords]);

  if (!isOpen) return null;

  // Re-generate radius-based polygon
  const handleRegenerateRadiusPolygon = (rMeters: number, cLat?: number, cLng?: number) => {
    const lat = cLat !== undefined ? cLat : centerLat;
    const lng = cLng !== undefined ? cLng : centerLng;
    setRadiusMeters(rMeters);
    const newCoords = generateCircularPolygon(lat, lng, rMeters);
    setCoordinates(newCoords);
  };

  // Use current tactical map crosshair coordinates
  const handleApplySelectedCoords = () => {
    if (selectedCoords) {
      setCenterLat(selectedCoords.lat);
      setCenterLng(selectedCoords.lng);
      handleRegenerateRadiusPolygon(radiusMeters, selectedCoords.lat, selectedCoords.lng);
    }
  };

  const calculatedArea = calculatePolygonAreaKm2(coordinates);

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedGang = gangName.trim();
    const trimmedTerritory = territoryName.trim() || trimmedGang;

    if (!trimmedGang) {
      setErrorMessage('O Nome da Gangue / Facção é obrigatório.');
      return;
    }

    let finalCoords = coordinates;
    if (!finalCoords || finalCoords.length < 3) {
      finalCoords = generateCircularPolygon(centerLat, centerLng, radiusMeters);
    }

    const areaKm2 = calculatePolygonAreaKm2(finalCoords);

    const zoneData: GangAreaZone = {
      id: zoneToEdit?.id || `gang-zone-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedTerritory,
      gangName: trimmedGang,
      description: description.trim(),
      notes: description.trim(),
      color: color,
      fillOpacity: zoneToEdit?.fillOpacity !== undefined ? zoneToEdit.fillOpacity : 0.35,
      strokeWidth: zoneToEdit?.strokeWidth !== undefined ? zoneToEdit.strokeWidth : 2.5,
      coordinates: finalCoords,
      type: 'Polygon',
      visible: zoneToEdit?.visible !== undefined ? zoneToEdit.visible : true,
      dangerLevel: dangerLevel,
      rivalGang: rivalGang.trim() || undefined,
      areaKm2: areaKm2 > 0 ? areaKm2 : 0.45,
      sourceFile: zoneToEdit?.sourceFile || 'Cadastro Tático Manual (35º BPM)',
    };

    try {
      setIsSaving(true);
      await onSave(zoneData, !isEditing);
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar área de gangue:', err);
      setErrorMessage(err.message || 'Erro ao salvar território de gangue.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Handler
  const handleDelete = async () => {
    if (!zoneToEdit || !onDelete) return;
    const confirmDelete = window.confirm(
      `Deseja realmente excluir a demarcação da gangue "${zoneToEdit.gangName || zoneToEdit.name}"? Esta ação removerá o polígono do mapa tático.`
    );
    if (!confirmDelete) return;

    try {
      setIsDeleting(true);
      await onDelete(zoneToEdit.id);
      onClose();
    } catch (err: any) {
      console.error('Erro ao excluir gangue:', err);
      setErrorMessage(err.message || 'Erro ao excluir território de gangue.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-fade-in font-sans">
      <div className="bg-[#0e1017] border border-zinc-700/80 rounded-xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-mono">
        
        {/* Modal Header */}
        <div className="bg-[#141824] px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              {isEditing ? <Edit3 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                <span>{isEditing ? 'Editar Gangue & Território Tático' : 'Cadastrar Nova Gangue & Território'}</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                  35º BPM // GIS
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                {isEditing
                  ? 'Atualize o nome da facção, território demarcado, periculosidade e perímetro tático'
                  : 'Cadastre uma nova organização criminosa e defina seu perímetro de domínio territorial'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs text-zinc-300">
          
          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg flex items-start gap-2.5 text-red-200">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs">Erro:</p>
                <p className="text-[11px] text-red-300 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Faction Name & Territory Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                Nome da Gangue / Facção *
              </label>
              <input
                type="text"
                required
                value={gangName}
                onChange={(e) => setGangName(e.target.value)}
                placeholder="Ex: Comando Vermelho, Gangue do Palmital..."
                className="w-full px-3 py-2 bg-black/60 border border-zinc-700 focus:border-amber-500 rounded-lg text-white font-bold text-xs outline-none transition"
              />
              {/* Quick Suggestion Chips */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {FACTION_SUGGESTIONS.slice(0, 4).map((fac) => (
                  <button
                    key={fac}
                    type="button"
                    onClick={() => {
                      setGangName(fac);
                      if (!territoryName) setTerritoryName(fac);
                    }}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-amber-300 border border-zinc-700 transition cursor-pointer"
                  >
                    + {fac.split(' (')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">
                Nome do Território / Bairro Demarcado *
              </label>
              <input
                type="text"
                required
                value={territoryName}
                onChange={(e) => setTerritoryName(e.target.value)}
                placeholder="Ex: Alto do Palmital / Rua 15, Bairro São Benedito..."
                className="w-full px-3 py-2 bg-black/60 border border-zinc-700 focus:border-amber-500 rounded-lg text-white font-bold text-xs outline-none transition"
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Identificação geográfica exibida no mapa e nos relatórios de inteligência.
              </span>
            </div>
          </div>

          {/* Danger Level & Rival Faction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">
                Grau de Periculosidade / Alerta Tático
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['CRÍTICO', 'ALTO', 'MÉDIO', 'BAIXO'] as const).map((lvl) => {
                  const isSelected = dangerLevel === lvl;
                  const colorClass =
                    lvl === 'CRÍTICO'
                      ? isSelected ? 'bg-red-700 text-white border-red-500 shadow-md' : 'bg-zinc-900 text-red-400 border-zinc-800 hover:bg-zinc-800'
                      : lvl === 'ALTO'
                      ? isSelected ? 'bg-orange-600 text-white border-orange-400 shadow-md' : 'bg-zinc-900 text-orange-400 border-zinc-800 hover:bg-zinc-800'
                      : lvl === 'MÉDIO'
                      ? isSelected ? 'bg-amber-600 text-white border-amber-400 shadow-md' : 'bg-zinc-900 text-amber-400 border-zinc-800 hover:bg-zinc-800'
                      : isSelected ? 'bg-emerald-700 text-white border-emerald-500 shadow-md' : 'bg-zinc-900 text-emerald-400 border-zinc-800 hover:bg-zinc-800';

                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDangerLevel(lvl)}
                      className={`py-1.5 text-center text-[10px] font-bold uppercase rounded border transition cursor-pointer ${colorClass}`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Swords className="w-3 h-3 text-red-400" />
                <span>Facção / Gangue Rival Declarada (Opcional)</span>
              </label>
              <input
                type="text"
                value={rivalGang}
                onChange={(e) => setRivalGang(e.target.value)}
                placeholder="Ex: Terceiro Comando Puro (TCP), Gangue do Morro..."
                className="w-full px-3 py-2 bg-black/60 border border-zinc-700 focus:border-red-500 rounded-lg text-white text-xs outline-none transition"
              />
            </div>
          </div>

          {/* Tactical Color Palette */}
          <div>
            <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
              Cor de Identificação Tática no Mapa
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {TACTICAL_COLORS.map((c) => {
                const isSelected = color.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-bold transition cursor-pointer ${
                      isSelected
                        ? 'border-white bg-zinc-800 text-white shadow-md ring-1 ring-white/50'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-white/30"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span>{c.name}</span>
                  </button>
                );
              })}
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[10px] text-zinc-500">Personalizada:</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                />
              </div>
            </div>
          </div>

          {/* Intelligence Notes & Doctrine */}
          <div>
            <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">
              Doutrina, Modus Operandi & Notas de Inteligência
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva pontos de tráfico (biqueiras), armamentos visualizados, lideranças locais, rotas de fuga ou alertas operacionais..."
              className="w-full px-3 py-2 bg-black/60 border border-zinc-700 focus:border-amber-500 rounded-lg text-zinc-200 text-xs outline-none transition"
            />
          </div>

          {/* Territory Delimitation / Georeferencing Section */}
          <div className="p-3.5 bg-black/40 border border-zinc-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                  Delimitação do Perímetro Territorial
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded font-bold">
                  {calculatedArea ? `${calculatedArea} km²` : 'Delimitando'}
                </span>
                <span className="text-[10px] text-zinc-500">
                  ({coordinates.length} pontos)
                </span>
              </div>
            </div>

            {/* Mode Selector */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDemarcationMode('radius')}
                className={`flex-1 py-1.5 rounded text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                  demarcationMode === 'radius'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span>Demarcação por Centro & Raio (Automático)</span>
              </button>

              <button
                type="button"
                onClick={() => setDemarcationMode('manual')}
                className={`flex-1 py-1.5 rounded text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                  demarcationMode === 'manual'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Coordenadas dos Vértices ({coordinates.length})</span>
              </button>
            </div>

            {demarcationMode === 'radius' ? (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">
                      Latitude Central
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={centerLat}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || centerLat;
                        setCenterLat(val);
                        handleRegenerateRadiusPolygon(radiusMeters, val, centerLng);
                      }}
                      className="w-full px-2.5 py-1.5 bg-black/60 border border-zinc-700 rounded text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">
                      Longitude Central
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={centerLng}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || centerLng;
                        setCenterLng(val);
                        handleRegenerateRadiusPolygon(radiusMeters, centerLat, val);
                      }}
                      className="w-full px-2.5 py-1.5 bg-black/60 border border-zinc-700 rounded text-xs font-mono text-white"
                    />
                  </div>
                </div>

                {/* Apply selected map coordinate shortcut */}
                {selectedCoords && (
                  <div className="flex items-center justify-between bg-zinc-900/70 p-2 rounded border border-zinc-800 text-[10px]">
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Mira atual no mapa: <strong>{selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplySelectedCoords}
                      className="px-2 py-1 bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-700 rounded font-bold transition cursor-pointer"
                    >
                      Usar Coordenadas da Mira
                    </button>
                  </div>
                )}

                {/* Radius presets */}
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1.5">
                    Raio Estimado do Domínio Territorial
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[250, 400, 600, 800, 1200, 1800].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleRegenerateRadiusPolygon(r)}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition cursor-pointer border ${
                          radiusMeters === r
                            ? 'bg-amber-500 text-black border-amber-400'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white'
                        }`}
                      >
                        {r >= 1000 ? `${(r / 1000).toFixed(1)} km` : `${r} metros`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <p className="text-[10px] text-zinc-400">
                  Vértices demarcados para este polígono ({coordinates.length} pontos geográficos).
                </p>
                <div className="max-h-28 overflow-y-auto bg-black/60 p-2 rounded border border-zinc-800 text-[10px] font-mono text-zinc-400 space-y-1">
                  {coordinates.map((coord, idx) => (
                    <div key={idx} className="flex items-center justify-between py-0.5 border-b border-zinc-900">
                      <span>Vértice #{idx + 1}</span>
                      <span className="text-zinc-200">[{coord[0].toFixed(6)}, {coord[1].toFixed(6)}]</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedCoords) {
                        setCoordinates([...coordinates, [selectedCoords.lat, selectedCoords.lng]]);
                      }
                    }}
                    disabled={!selectedCoords}
                    className="text-[10px] px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-amber-400 rounded border border-zinc-700 transition cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>Adicionar Ponto da Mira Tática</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRegenerateRadiusPolygon(500)}
                    className="text-[10px] px-2.5 py-1 text-zinc-400 hover:text-amber-300 transition cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Redefinir com Raio Circular</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions Footer */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSaving}
                className="px-3 py-2 bg-red-950/60 hover:bg-red-900/80 text-red-300 text-xs font-bold rounded-lg border border-red-800/80 flex items-center gap-1.5 transition cursor-pointer"
                title="Excluir demarcação desta gangue"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Excluindo...' : 'Excluir Gangue'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving || isDeleting}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition uppercase tracking-wider cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving || isDeleting}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-amber-500/20"
              >
                {isSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{isSaving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Salvar Território & Gangue'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
