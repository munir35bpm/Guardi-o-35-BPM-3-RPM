import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { OcorrenciaCriminal, EnderecoAtuacao, GangAreaZone } from '../types';
import {
  MapPin,
  Crosshair,
  Navigation,
  AlertCircle,
  Layers,
  Upload,
  Eye,
  EyeOff,
  Trash2,
  Maximize2,
  RefreshCw,
  ShieldAlert,
  Compass,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
} from 'lucide-react';
import { db } from '../backend/db';
import GangMapImporterModal from './GangMapImporterModal';
import { isPointInPolygon, DEFAULT_GANG_AREAS_35BPM } from '../utils/kmlGeoJsonParser';

interface TacticalMapProps {
  selectedCoords?: { lat: number; lng: number } | null;
  onSelectCoords?: (coords: { lat: number; lng: number }) => void;
  highlightedSuspectId?: string | null;
}

export default function TacticalMap({
  selectedCoords,
  onSelectCoords,
  highlightedSuspectId,
}: TacticalMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clickMarkerRef = useRef<L.Marker | null>(null);
  const [occurrences, setOccurrences] = useState<OcorrenciaCriminal[]>([]);
  const [addresses, setAddresses] = useState<EnderecoAtuacao[]>([]);
  const [gangAreas, setGangAreas] = useState<GangAreaZone[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals and UI Toggles
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);
  const [showAllGangLayers, setShowAllGangLayers] = useState(true);
  const [activeZoneHover, setActiveZoneHover] = useState<GangAreaZone | null>(null);
  const [colorPickerZoneId, setColorPickerZoneId] = useState<string | null>(null);

  // Group of layers so we can easily clear and redraw them
  const gangLayersGroupRef = useRef<L.LayerGroup | null>(null);
  const markerLayersGroupRef = useRef<L.LayerGroup | null>(null);

  // Polygon layers lookup map for fast fly-to
  const polygonLayersMapRef = useRef<Record<string, L.Polygon | L.Polyline>>({});

  const fetchMapData = async () => {
    try {
      const [resOc, resAdd, resGang] = await Promise.all([
        fetch('/api/ocorrencias').catch(() => null),
        fetch('/api/enderecos').catch(() => null),
        fetch('/api/gang-areas').catch(() => null),
      ]);

      if (resOc && resOc.ok) {
        const dataOc = await resOc.json();
        setOccurrences(dataOc);
      } else {
        setOccurrences(db.ocorrencias_criminais);
      }

      if (resAdd && resAdd.ok) {
        const dataAdd = await resAdd.json();
        setAddresses(dataAdd);
      } else {
        setAddresses(db.enderecos_atuacao);
      }

      if (resGang && resGang.ok) {
        const dataGang = await resGang.json();
        if (Array.isArray(dataGang) && dataGang.length > 0) {
          setGangAreas(dataGang);
        } else {
          // Check localStorage or fallback to default
          loadLocalGangAreas();
        }
      } else {
        loadLocalGangAreas();
      }

      setLoading(false);
    } catch (e) {
      console.warn('Backend indisponível para mapa, usando dados locais:', e);
      setOccurrences(db.ocorrencias_criminais);
      setAddresses(db.enderecos_atuacao);
      loadLocalGangAreas();
      setLoading(false);
    }
  };

  const loadLocalGangAreas = () => {
    try {
      const saved = localStorage.getItem('tactical_gang_areas_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGangAreas(parsed);
          return;
        }
      }
    } catch (e) {
      console.error('Falha ao ler gang areas do localStorage:', e);
    }
    setGangAreas(DEFAULT_GANG_AREAS_35BPM);
  };

  const saveGangAreas = async (newAreas: GangAreaZone[], replaceAll = true) => {
    setGangAreas(newAreas);
    try {
      localStorage.setItem('tactical_gang_areas_v1', JSON.stringify(newAreas));
      await fetch('/api/gang-areas/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zones: newAreas, replaceAll }),
      }).catch(() => null);
    } catch (e) {
      console.warn('Erro ao salvar áreas de gangue no servidor:', e);
    }
  };

  useEffect(() => {
    fetchMapData();
  }, [highlightedSuspectId]);

  // Initial Map Setup
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Center on Santa Luzia / 35º BPM by default (-19.7712, -43.8564)
    const map = L.map(mapContainerRef.current, {
      center: [-19.7712, -43.8564],
      zoom: 13,
      maxZoom: 19,
    });

    // Dark high contrast basemap for tactical ops
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO | 35º BPM',
      maxZoom: 19,
    }).addTo(map);

    gangLayersGroupRef.current = L.layerGroup().addTo(map);
    markerLayersGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Map Click Handler to pick target coordinates for GIS queries
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      updateClickMarker(lat, lng);
      if (onSelectCoords) {
        onSelectCoords({ lat, lng });
      }
    });

    // Clean up on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update target marker when selectedCoords props changes externally
  useEffect(() => {
    if (!mapRef.current || !selectedCoords) return;
    updateClickMarker(selectedCoords.lat, selectedCoords.lng, true);
  }, [selectedCoords]);

  // Render Gang Territories / Polygons Layer
  useEffect(() => {
    if (!mapRef.current || !gangLayersGroupRef.current) return;

    gangLayersGroupRef.current.clearLayers();
    polygonLayersMapRef.current = {};

    if (!showAllGangLayers) return;

    const bounds = L.latLngBounds([]);
    let hasPoints = false;

    gangAreas.forEach((zone) => {
      if (!zone.visible) return;

      const color = zone.color || '#ef4444';
      const opacity = zone.fillOpacity !== undefined ? zone.fillOpacity : 0.35;
      const strokeW = zone.strokeWidth !== undefined ? zone.strokeWidth : 2.5;

      // Find suspects located inside this territory
      const suspectsInside = addresses.filter((addr) => {
        if (!addr.geom_ponto?.lat || !addr.geom_ponto?.lng) return false;
        return isPointInPolygon([addr.geom_ponto.lat, addr.geom_ponto.lng], zone.coordinates);
      });

      // Find occurrences located inside this territory
      const occurrencesInside = occurrences.filter((oc) => {
        if (!oc.geom_crime?.lat || !oc.geom_crime?.lng) return false;
        return isPointInPolygon([oc.geom_crime.lat, oc.geom_crime.lng], zone.coordinates);
      });

      if (zone.type === 'Polygon' && zone.coordinates.length >= 3) {
        const polyCoords = zone.innerHoles
          ? [zone.coordinates, ...zone.innerHoles]
          : zone.coordinates;

        const polygon = L.polygon(polyCoords as any, {
          color: color,
          weight: strokeW,
          opacity: 0.9,
          fillColor: color,
          fillOpacity: opacity,
          dashArray: zone.dangerLevel === 'CRÍTICO' ? '4, 4' : undefined,
        });

        // Tooltip on hover
        polygon.bindTooltip(
          `<div style="font-family: monospace; font-size: 11px; font-weight: bold; color: ${color};">
            🛡️ ${zone.gangName || zone.name}
            ${zone.areaKm2 ? `<span style="color: #94a3b8; font-weight: normal;"> (${zone.areaKm2} km²)</span>` : ''}
          </div>`,
          { sticky: true, className: 'tactical-map-tooltip' }
        );

        // Rich popup on click
        const suspectsHTML =
          suspectsInside.length > 0
            ? `<div style="margin-top: 8px; border-top: 1px solid #334155; padding-top: 6px;">
                <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #f59e0b; margin-bottom: 3px;">
                  ⚠️ ${suspectsInside.length} Infrator(es) Mapeado(s) neste Território:
                </div>
                <div style="max-height: 90px; overflow-y: auto; font-size: 11px;">
                  ${suspectsInside
                    .map(
                      (s) =>
                        `<div style="padding: 2px 0; border-bottom: 1px dashed #1e293b;">
                          <strong style="color: #f1f5f9;">${s.infrator_nome || 'Infrator'}</strong> 
                          <span style="color: #94a3b8;">(${s.infrator_vulgo || 'S/V'})</span>
                          <span style="color: #64748b; font-size: 10px; display: block;">${s.tipo_endereco}: ${s.logradouro}</span>
                        </div>`
                    )
                    .join('')}
                </div>
              </div>`
            : `<div style="margin-top: 6px; font-size: 10px; color: #64748b; font-style: italic;">
                Nenhum endereço de suspeito fixado diretamente dentro deste polígono.
              </div>`;

        const occurrencesHTML =
          occurrencesInside.length > 0
            ? `<div style="margin-top: 6px; font-size: 10px; color: #f87171;">
                🚨 ${occurrencesInside.length} Ocorrência(s) policial(is) registrada(s) na área.
               </div>`
            : '';

        const popupContent = `
          <div style="font-size: 12px; font-family: sans-serif; color: #e2e8f0; min-width: 220px; max-width: 280px;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid ${color}; padding-bottom: 4px; margin-bottom: 6px;">
              <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: ${color};">
                ${zone.gangName || 'ÁREA DEMARCADA'}
              </span>
              ${
                zone.dangerLevel
                  ? `<span style="font-size: 9px; font-weight: bold; background: ${
                      zone.dangerLevel === 'CRÍTICO' ? '#991b1b' : '#854d0e'
                    }; color: #ffffff; padding: 2px 4px; border-radius: 2px;">
                      ${zone.dangerLevel}
                    </span>`
                  : ''
              }
            </div>
            
            <h4 style="margin: 0 0 4px 0; font-size: 12px; font-weight: bold; color: #f8fafc;">
              ${zone.name}
            </h4>

            ${
              zone.description
                ? `<p style="margin: 3px 0 6px 0; font-size: 11px; color: #cbd5e1; line-height: 1.4;">
                    ${zone.description}
                  </p>`
                : ''
            }

            <div style="font-size: 10px; font-family: monospace; color: #94a3b8; background: #0f172a; padding: 4px 6px; border-radius: 3px; margin-top: 4px;">
              <div>Área Estimada: <span style="color: #38bdf8;">${zone.areaKm2 || 'N/A'} km²</span></div>
              ${zone.sourceFile ? `<div>Origem: <span style="color: #a78bfa;">${zone.sourceFile}</span></div>` : ''}
              ${zone.rivalGang ? `<div>Rivalidade: <span style="color: #f87171;">${zone.rivalGang}</span></div>` : ''}
            </div>

            ${suspectsHTML}
            ${occurrencesHTML}
          </div>
        `;

        polygon.bindPopup(popupContent);

        // Hover high-contrast effect
        polygon.on('mouseover', () => {
          polygon.setStyle({
            weight: strokeW + 1.5,
            fillOpacity: Math.min(0.65, opacity + 0.2),
          });
          setActiveZoneHover(zone);
        });

        polygon.on('mouseout', () => {
          polygon.setStyle({
            weight: strokeW,
            fillOpacity: opacity,
          });
          setActiveZoneHover(null);
        });

        gangLayersGroupRef.current?.addLayer(polygon);
        polygonLayersMapRef.current[zone.id] = polygon;

        // Extend bounds
        zone.coordinates.forEach((c) => {
          bounds.extend(c);
          hasPoints = true;
        });
      } else if (zone.type === 'LineString' && zone.coordinates.length >= 2) {
        const polyline = L.polyline(zone.coordinates, {
          color: color,
          weight: Math.max(3.5, strokeW),
          opacity: 0.9,
          dashArray: '5, 5',
        });
        polyline.bindTooltip(`📍 ${zone.name}`, { sticky: true });
        gangLayersGroupRef.current?.addLayer(polyline);
        polygonLayersMapRef.current[zone.id] = polyline;
      }
    });
  }, [gangAreas, showAllGangLayers, addresses, occurrences]);

  // Redraw Suspect Addresses & Crime Occurrences
  useEffect(() => {
    if (!mapRef.current || !markerLayersGroupRef.current) return;

    markerLayersGroupRef.current.clearLayers();

    // 1. Draw Suspect Addresses with influence buffer circles
    addresses.forEach((addr) => {
      const isHighlighted = highlightedSuspectId === addr.infrator_id;
      const lat = addr.geom_ponto?.lat;
      const lng = addr.geom_ponto?.lng;

      if (!lat || !lng) return;

      const color =
        addr.tipo_endereco === 'Residência'
          ? '#3b82f6'
          : addr.tipo_endereco === 'Esconderijo'
          ? '#ea580c'
          : addr.tipo_endereco === 'Ponto de Venda'
          ? '#a855f7'
          : '#eab308';

      const addressIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: ${isHighlighted ? '28px' : '22px'};
            height: ${isHighlighted ? '28px' : '22px'};
            background-color: ${color};
            border: 2px solid ${isHighlighted ? '#f59e0b' : '#ffffff'};
            border-radius: ${addr.tipo_endereco === 'Residência' ? '50%' : '3px'};
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            transition: all 0.2s;
          ">
            <span style="color: #ffffff; font-size: ${isHighlighted ? '10px' : '8px'}; font-weight: bold;">
              ${addr.tipo_endereco ? addr.tipo_endereco[0] : 'E'}
            </span>
          </div>
        `,
        iconSize: isHighlighted ? [28, 28] : [22, 22],
        iconAnchor: isHighlighted ? [14, 14] : [11, 11],
      });

      const marker = L.marker([lat, lng], { icon: addressIcon });

      const circle = L.circle([lat, lng], {
        radius: (addr.raio_influencia_km || 2.5) * 1000,
        fillColor: color,
        fillOpacity: isHighlighted ? 0.22 : 0.07,
        color: isHighlighted ? '#f59e0b' : color,
        weight: isHighlighted ? 2.5 : 1,
        dashArray: '3, 4',
      });

      marker.bindPopup(`
        <div style="font-size: 13px; font-family: sans-serif; color: #1e293b;">
          <h4 style="margin: 0 0 5px 0; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            ${addr.infrator_nome || 'Infrator'} ${addr.infrator_vulgo ? `(${addr.infrator_vulgo})` : ''}
          </h4>
          <p style="margin: 3px 0;"><strong>Tipo:</strong> ${addr.tipo_endereco}</p>
          <p style="margin: 3px 0;"><strong>Endereço:</strong> ${addr.logradouro}, ${addr.bairro || 'Centro'}</p>
          <p style="margin: 3px 0;"><strong>Raio de Atuação:</strong> ${addr.raio_influencia_km || 2.5} km</p>
        </div>
      `);

      markerLayersGroupRef.current?.addLayer(circle);
      markerLayersGroupRef.current?.addLayer(marker);

      if (isHighlighted) {
        mapRef.current?.setView([lat, lng], 14);
      }
    });

    // 2. Draw Crime Occurrences with Beacons
    occurrences.forEach((oc) => {
      const lat = oc.geom_crime?.lat;
      const lng = oc.geom_crime?.lng;

      if (!lat || !lng) return;

      const crimeIcon = L.divIcon({
        className: 'custom-crime-marker',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
            <div style="position: absolute; width: 24px; height: 24px; background: rgba(239, 68, 68, 0.4); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 12px; height: 12px; background: #ef4444; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 0 8px #ef4444;"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([lat, lng], { icon: crimeIcon });

      const involvedHTML =
        oc.envolvidos && oc.envolvidos.length > 0
          ? `<div style="margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
              <strong style="color: #475569; font-size: 11px; text-transform: uppercase;">Infratores Vinculados:</strong>
              <ul style="margin: 3px 0; padding-left: 14px; font-size: 11px;">
                ${oc.envolvidos
                  .map((e) => `<li>${e.nome} (${e.vulgo}) - <strong>${e.papel}</strong></li>`)
                  .join('')}
              </ul>
             </div>`
          : '<div style="margin-top: 6px; font-style: italic; color: #94a3b8; font-size: 11px;">Nenhum autor autuado diretamente neste B.O.</div>';

      marker.bindPopup(`
        <div style="font-size: 13px; font-family: sans-serif; color: #1e293b; max-width: 250px;">
          <h4 style="margin: 0 0 5px 0; color: #991b1b; font-weight: bold; border-bottom: 1px solid #fecaca; padding-bottom: 4px; display: flex; align-items: center; gap: 4px;">
            <span style="display:inline-block; width: 8px; height: 8px; background: #ef4444; border-radius: 50%;"></span>
            ${oc.numero_bo} - ${oc.tipificacao_penal}
          </h4>
          <p style="margin: 3px 0; font-size: 11px; color: #64748b;"><strong>Data:</strong> ${new Date(
            oc.data_hora
          ).toLocaleString('pt-BR')}</p>
          <p style="margin: 4px 0; font-size: 12px; font-weight: 500; color: #334155; max-height: 80px; overflow-y: auto;">
            ${oc.descricao_fato}
          </p>
          <p style="margin: 2px 0; font-size: 11px;"><strong>Arma:</strong> ${oc.armas_utilizadas || 'Não informada'}</p>
          <p style="margin: 2px 0; font-size: 11px;"><strong>Veículo:</strong> ${oc.veiculo_utilizado || 'Não informado'}</p>
          ${involvedHTML}
        </div>
      `);

      markerLayersGroupRef.current?.addLayer(marker);
    });
  }, [occurrences, addresses, highlightedSuspectId]);

  // Update selection indicator marker
  const updateClickMarker = (lat: number, lng: number, pan = false) => {
    if (!mapRef.current) return;

    const crosshairIcon = L.divIcon({
      className: 'custom-target-marker',
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 32px; height: 32px; border: 2px dashed #10b981; border-radius: 50%; animation: spin 4s linear infinite;"></div>
          <div style="width: 6px; height: 6px; background: #10b981; border-radius: 50%;"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (clickMarkerRef.current) {
      clickMarkerRef.current.setLatLng([lat, lng]);
    } else {
      clickMarkerRef.current = L.marker([lat, lng], { icon: crosshairIcon }).addTo(mapRef.current);
    }

    if (pan) {
      mapRef.current.setView([lat, lng], 14);
    }
  };

  // Actions on Gang Areas
  const handleImportSuccess = (importedZones: GangAreaZone[], replaceExisting: boolean) => {
    let updated: GangAreaZone[];
    if (replaceExisting) {
      updated = importedZones;
    } else {
      // Merge unique
      const existingIds = new Set(gangAreas.map((g) => g.id));
      const newOnly = importedZones.filter((g) => !existingIds.has(g.id));
      updated = [...gangAreas, ...newOnly];
    }
    saveGangAreas(updated, replaceExisting);
    setShowAllGangLayers(true);

    // Fit map to imported bounds
    if (mapRef.current && importedZones.length > 0) {
      const bounds = L.latLngBounds([]);
      importedZones.forEach((z) => {
        z.coordinates.forEach((c) => bounds.extend(c));
      });
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  };

  const toggleZoneVisibility = (zoneId: string) => {
    const updated = gangAreas.map((z) => (z.id === zoneId ? { ...z, visible: !z.visible } : z));
    saveGangAreas(updated, true);
  };

  const deleteZone = (zoneId: string) => {
    const updated = gangAreas.filter((z) => z.id !== zoneId);
    saveGangAreas(updated, true);
  };

  const updateZoneColor = (zoneId: string, newColor: string) => {
    const updated = gangAreas.map((z) => (z.id === zoneId ? { ...z, color: newColor } : z));
    saveGangAreas(updated, true);
    setColorPickerZoneId(null);
  };

  const flyToZone = (zone: GangAreaZone) => {
    if (!mapRef.current || zone.coordinates.length === 0) return;
    const bounds = L.latLngBounds([]);
    zone.coordinates.forEach((c) => bounds.extend(c));
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  };

  const centerOn35BPM = () => {
    if (!mapRef.current) return;
    mapRef.current.setView([-19.7712, -43.8564], 13);
  };

  const resetToDefaultAreas = () => {
    if (confirm('Deseja restaurar as demarcações de gangues padrão do 35º BPM?')) {
      saveGangAreas(DEFAULT_GANG_AREAS_35BPM, true);
      centerOn35BPM();
    }
  };

  const visibleCount = gangAreas.filter((g) => g.visible).length;

  return (
    <div className="relative w-full h-[600px] border border-zinc-800 rounded-lg overflow-hidden bg-slate-950 flex flex-col shadow-2xl">
      {/* Top Tactical Command Bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        
        {/* Left: Coordinate Target Box */}
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 p-2 rounded-md shadow-lg pointer-events-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '10s' }} />
            <div>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest font-mono block">
                35º BPM // Mapeamento Tático
              </span>
              {selectedCoords ? (
                <div className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <Crosshair className="w-3 h-3 text-emerald-400" />
                  {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
                </div>
              ) : (
                <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Clique no mapa p/ mira
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={centerOn35BPM}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono font-bold rounded border border-slate-700 transition cursor-pointer flex items-center gap-1"
            title="Centralizar no 35º BPM / Santa Luzia"
          >
            <Maximize2 className="w-3 h-3 text-amber-400" />
            35º BPM
          </button>
        </div>

        {/* Right: Gang Layer Controls & Importer Button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          
          {/* Import KML / GeoJSON Button */}
          <button
            type="button"
            onClick={() => setIsImporterOpen(true)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded shadow-lg shadow-amber-500/20 uppercase tracking-wider font-mono flex items-center gap-1.5 transition cursor-pointer"
            title="Importar polígonos e cores do Google My Maps (KML, KMZ, GeoJSON)"
          >
            <Upload className="w-4 h-4 stroke-[2.5]" />
            <span>Importar Mapa de Gangues</span>
          </button>

          {/* Toggle Gang Layers Panel */}
          <button
            type="button"
            onClick={() => setIsLayersPanelOpen(!isLayersPanelOpen)}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 border transition cursor-pointer shadow-md ${
              isLayersPanelOpen
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-900/90 text-slate-200 hover:bg-slate-800 border-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Camadas ({visibleCount}/{gangAreas.length})</span>
            {isLayersPanelOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Master Visibility Toggle */}
          <button
            type="button"
            onClick={() => setShowAllGangLayers(!showAllGangLayers)}
            className={`p-1.5 rounded border transition cursor-pointer shadow-md ${
              showAllGangLayers
                ? 'bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border-slate-700'
                : 'bg-red-950/80 hover:bg-red-900/80 text-red-300 border-red-800'
            }`}
            title={showAllGangLayers ? 'Ocultar todos os territórios de gangues' : 'Exibir territórios de gangues'}
          >
            {showAllGangLayers ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* Collapsible Gang Layers / Legend Panel */}
      {isLayersPanelOpen && (
        <div className="absolute top-16 right-3 z-[1000] w-80 max-h-[460px] bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-lg shadow-2xl flex flex-col font-mono text-xs overflow-hidden tactical-corner animate-fade-in">
          
          <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-slate-100 uppercase text-[11px] tracking-wider">
                Territórios Demarcados
              </span>
            </div>
            <span className="text-[10px] text-amber-400 bg-amber-950/50 border border-amber-800/60 px-1.5 py-0.5 rounded font-bold">
              {gangAreas.length} Áreas
            </span>
          </div>

          {/* List of Gang Zones */}
          <div className="p-2 space-y-1.5 overflow-y-auto flex-1 max-h-72">
            {gangAreas.length > 0 ? (
              gangAreas.map((zone) => {
                const suspectsInside = addresses.filter((addr) => {
                  if (!addr.geom_ponto?.lat || !addr.geom_ponto?.lng) return false;
                  return isPointInPolygon([addr.geom_ponto.lat, addr.geom_ponto.lng], zone.coordinates);
                });

                return (
                  <div
                    key={zone.id}
                    className={`p-2 rounded border transition flex flex-col gap-1.5 ${
                      zone.visible
                        ? 'bg-slate-950/80 border-slate-800'
                        : 'bg-slate-950/30 border-slate-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        
                        {/* Color Swatch / Color Picker Trigger */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setColorPickerZoneId(colorPickerZoneId === zone.id ? null : zone.id)
                            }
                            className="w-4 h-4 rounded border border-white/40 shadow-sm cursor-pointer block"
                            style={{ backgroundColor: zone.color }}
                            title="Clique para alterar a cor desta gangue"
                          />
                          {colorPickerZoneId === zone.id && (
                            <div className="absolute top-6 left-0 z-50 p-1.5 bg-slate-900 border border-slate-700 rounded shadow-xl flex gap-1">
                              {['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'].map(
                                (c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => updateZoneColor(zone.id, c)}
                                    className="w-4 h-4 rounded border border-white/20 hover:scale-110 transition cursor-pointer"
                                    style={{ backgroundColor: c }}
                                  />
                                )
                              )}
                            </div>
                          )}
                        </div>

                        <span className="font-bold text-slate-200 text-[11px] truncate" title={zone.name}>
                          {zone.gangName || zone.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Fly To Button */}
                        <button
                          type="button"
                          onClick={() => flyToZone(zone)}
                          className="p-1 text-slate-400 hover:text-amber-400 rounded transition cursor-pointer"
                          title="Centralizar visualização nesta área"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Visibility Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleZoneVisibility(zone.id)}
                          className={`p-1 rounded transition cursor-pointer ${
                            zone.visible
                              ? 'text-emerald-400 hover:text-emerald-300'
                              : 'text-slate-600 hover:text-slate-400'
                          }`}
                          title={zone.visible ? 'Ocultar camada' : 'Exibir camada'}
                        >
                          {zone.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>

                        {/* Delete Zone */}
                        <button
                          type="button"
                          onClick={() => deleteZone(zone.id)}
                          className="p-1 text-slate-600 hover:text-red-400 rounded transition cursor-pointer"
                          title="Remover esta área"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
                      <span>{zone.areaKm2 ? `${zone.areaKm2} km²` : zone.type}</span>
                      {suspectsInside.length > 0 ? (
                        <span className="text-amber-400 font-bold bg-amber-950/60 px-1 py-0.2 rounded border border-amber-800/50">
                          ⚠️ {suspectsInside.length} Suspeito(s)
                        </span>
                      ) : (
                        <span className="text-slate-600">0 Suspeitos</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center p-4 text-slate-500 italic text-[11px]">
                Nenhuma demarcação de gangue carregada. Importe um KML ou restaure o padrão.
              </div>
            )}
          </div>

          {/* Footer of Layers Panel */}
          <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={resetToDefaultAreas}
              className="text-[10px] text-slate-400 hover:text-amber-400 flex items-center gap-1 transition cursor-pointer"
              title="Restaurar polígonos originais do 35º BPM"
            >
              <RefreshCw className="w-3 h-3" /> Restaurar Padrão 35º BPM
            </button>

            <button
              type="button"
              onClick={() => setIsImporterOpen(true)}
              className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Upload className="w-3 h-3" /> + Importar KML
            </button>
          </div>

        </div>
      )}

      {/* Bottom Right Legend */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-800 p-2.5 rounded-md shadow-md text-xs text-slate-300 space-y-1.5 font-mono pointer-events-auto max-w-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
          <span className="font-bold text-slate-100 uppercase text-[10px] tracking-wider">
            Simbologia Tática
          </span>
          <span className="text-[9px] text-emerald-400">PMMG • 35º BPM</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] border border-white inline-block"></span>
            <span>Ocorrência B.O.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] inline-block"></span>
            <span>Residência</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#ea580c] inline-block rounded-xs"></span>
            <span>Esconderijo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 border border-amber-400 bg-amber-400/30 inline-block rounded-xs"></span>
            <span>Área Gangue</span>
          </div>
        </div>
      </div>

      {/* Leaflet Map DOM Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Gang Map Importer Modal */}
      <GangMapImporterModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}
