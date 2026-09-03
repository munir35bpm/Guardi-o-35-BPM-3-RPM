import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { OcorrenciaCriminal, EnderecoAtuacao, GangAreaZone, Infrator } from '../types';
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
  Map as MapIcon,
  Globe,
  Radio,
  X,
} from 'lucide-react';
import { db } from '../backend/db';
import GangMapImporterModal from './GangMapImporterModal';
import { isPointInPolygon, DEFAULT_GANG_AREAS_35BPM } from '../utils/kmlGeoJsonParser';
import { persistGangAreasToFirebase } from '../services/firebaseSync';
import { getGangIntelligenceDetails } from '../utils/gangIntelligence';

// Base map layer providers (100% free, no API key required)
export type BaseMapStyle = 'tactical_dark' | 'satellite' | 'street' | 'esri_streets';

const BASEMAP_CONFIGS: Record<BaseMapStyle, { name: string; url: string; attribution: string; subdomains?: string[]; maxZoom: number }> = {
  tactical_dark: {
    name: 'Noturno Tático (Esri Dark)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, DeLorme, NAVTEQ | PMMG 35º BPM',
    maxZoom: 16,
  },
  street: {
    name: 'Ruas & Logradouros (OSM)',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors | PMMG 35º BPM',
    maxZoom: 19,
  },
  satellite: {
    name: 'Satélite / Ortofoto (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Maxar, Earthstar Geographics | PMMG 35º BPM',
    maxZoom: 19,
  },
  esri_streets: {
    name: 'Topográfico / Vias (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin | PMMG 35º BPM',
    maxZoom: 19,
  },
};

interface TacticalMapProps {
  selectedCoords?: { lat: number; lng: number } | null;
  onSelectCoords?: (coords: { lat: number; lng: number }) => void;
  highlightedSuspectId?: string | null;
  occurrencesList?: OcorrenciaCriminal[];
  addressesList?: EnderecoAtuacao[];
  suspectsList?: Infrator[];
  refreshTrigger?: number;
  onRefresh?: () => void;
  selectedGangZone?: GangAreaZone | null;
  onSelectGangZone?: (zone: GangAreaZone | null) => void;
  gangAreasProp?: GangAreaZone[];
  onGangAreasChange?: (areas: GangAreaZone[]) => void;
}

// Helper to compute centroid of polygon coordinates for tactical label placement
function getPolygonCentroid(coords: [number, number][]): [number, number] {
  if (!coords || coords.length === 0) return [-19.7712, -43.8564];
  let sumLat = 0;
  let sumLng = 0;
  for (let i = 0; i < coords.length; i++) {
    sumLat += coords[i][0];
    sumLng += coords[i][1];
  }
  return [sumLat / coords.length, sumLng / coords.length];
}

// Helper to deduplicate addresses for clean tactical map rendering
function deduplicateAddressList(list: EnderecoAtuacao[]): EnderecoAtuacao[] {
  const seen = new Set<string>();
  const result: EnderecoAtuacao[] = [];

  for (const ea of list) {
    if (!ea || !ea.geom_ponto) continue;
    const lat = Number(ea.geom_ponto.lat || 0).toFixed(4);
    const lng = Number(ea.geom_ponto.lng || 0).toFixed(4);
    const logr = (ea.logradouro || '').toLowerCase().trim();
    const tipo = (ea.tipo_endereco || 'Residência').toLowerCase().trim();
    const infId = ea.infrator_id || '';
    const key = `${infId}|${tipo}|${logr}|${lat}|${lng}`;

    if (!seen.has(key)) {
      seen.add(key);
      result.push(ea);
    }
  }

  return result;
}

// Helper to accurately resolve suspect name and nickname (alcunha/vulgo)
function getSuspectInfoForAddress(addr: EnderecoAtuacao) {
  let nome = addr.infrator_nome?.trim();
  let vulgo = addr.infrator_vulgo?.trim();

  // Search in memory database if missing or placeholder
  if (!nome || nome.toLowerCase() === 'infrator' || nome.toLowerCase() === 'novo infrator' || nome === '') {
    if (addr.infrator_id) {
      const inf = db.infratores?.find((i) => i.id === addr.infrator_id) || db.getInfratorFull?.(addr.infrator_id);
      if (inf) {
        if (inf.nome_completo) nome = inf.nome_completo.trim();
        if (inf.vulgo) vulgo = inf.vulgo.trim();
      }
    }
  }

  // Filter out placeholder vulgos
  const isCleanVulgo =
    vulgo &&
    vulgo.trim() !== '' &&
    vulgo.toUpperCase() !== 'S/V' &&
    vulgo.toLowerCase() !== 'sem vulgo' &&
    vulgo.toLowerCase() !== 'não informado' &&
    vulgo.toLowerCase() !== 'nenhum';

  return {
    nome: nome || 'Infrator Cadastrado',
    vulgo: isCleanVulgo ? vulgo : null,
  };
}

export default function TacticalMap({
  selectedCoords,
  onSelectCoords,
  highlightedSuspectId,
  occurrencesList,
  addressesList,
  suspectsList,
  refreshTrigger,
  onRefresh,
  selectedGangZone = null,
  onSelectGangZone,
  gangAreasProp,
  onGangAreasChange,
}: TacticalMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clickMarkerRef = useRef<L.Marker | null>(null);
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);

  const [occurrences, setOccurrences] = useState<OcorrenciaCriminal[]>(occurrencesList || []);
  const [addresses, setAddresses] = useState<EnderecoAtuacao[]>(addressesList || []);
  const [gangAreas, setGangAreas] = useState<GangAreaZone[]>(gangAreasProp && gangAreasProp.length > 0 ? gangAreasProp : []);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Basemap selector state (defaults to high-contrast open street map)
  const [baseMapStyle, setBaseMapStyle] = useState<BaseMapStyle>('street');
  const [isBaseMapMenuOpen, setIsBaseMapMenuOpen] = useState(false);

  // Modals and UI Toggles
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);
  const [showAllGangLayers, setShowAllGangLayers] = useState(true);
  const [showGangLabels, setShowGangLabels] = useState(true);
  const [showOccurrencesLayer, setShowOccurrencesLayer] = useState(true);
  const [showAddressesLayer, setShowAddressesLayer] = useState(true);
  const [activeZoneHover, setActiveZoneHover] = useState<GangAreaZone | null>(null);
  const [colorPickerZoneId, setColorPickerZoneId] = useState<string | null>(null);

  // Group of layers so we can easily clear and redraw them
  const gangLayersGroupRef = useRef<L.LayerGroup | null>(null);
  const markerLayersGroupRef = useRef<L.LayerGroup | null>(null);

  // Polygon layers lookup map for fast fly-to
  const polygonLayersMapRef = useRef<Record<string, L.Polygon | L.Polyline>>({});

  // Sync with incoming props if provided
  useEffect(() => {
    if (occurrencesList) {
      setOccurrences(occurrencesList);
    }
  }, [occurrencesList]);

  useEffect(() => {
    if (addressesList) {
      const activeSuspects = suspectsList || db.infratores || [];
      const validSuspectIds = new Set(activeSuspects.map((i) => i.id));
      const filtered = addressesList.filter(
        (ea) => ea.infrator_id && validSuspectIds.has(ea.infrator_id)
      );
      setAddresses(deduplicateAddressList(filtered));
    }
  }, [addressesList, suspectsList]);

  // Sync with incoming gang areas prop
  useEffect(() => {
    if (gangAreasProp && gangAreasProp.length > 0) {
      setGangAreas(gangAreasProp);
    }
  }, [gangAreasProp]);

  // Auto-focus map on selected gang territory when selected
  useEffect(() => {
    if (selectedGangZone && mapRef.current && selectedGangZone.coordinates && selectedGangZone.coordinates.length > 0) {
      flyToZone(selectedGangZone);
    }
  }, [selectedGangZone]);

  const fetchMapData = async () => {
    try {
      setIsRefreshing(true);
      const [resOc, resAdd, resGang] = await Promise.all([
        fetch('/api/ocorrencias').catch(() => null),
        fetch('/api/enderecos').catch(() => null),
        fetch('/api/gang-areas').catch(() => null),
      ]);

      const activeSuspects = suspectsList || db.infratores || [];
      const validSuspectIds = new Set(activeSuspects.map((i) => i.id));

      if (resOc && resOc.ok) {
        const dataOc = await resOc.json();
        setOccurrences(dataOc);
      } else {
        setOccurrences(db.ocorrencias_criminais || []);
      }

      if (resAdd && resAdd.ok) {
        const dataAdd = await resAdd.json();
        const filtered = (Array.isArray(dataAdd) ? dataAdd : []).filter(
          (ea: EnderecoAtuacao) => ea.infrator_id && validSuspectIds.has(ea.infrator_id)
        );
        const enriched = filtered.map((ea: EnderecoAtuacao) => {
          const inf = activeSuspects.find((i) => i.id === ea.infrator_id) || db.getInfratorFull?.(ea.infrator_id);
          return {
            ...ea,
            infrator_nome: ea.infrator_nome || inf?.nome_completo,
            infrator_vulgo: ea.infrator_vulgo || inf?.vulgo,
          };
        });
        setAddresses(deduplicateAddressList(enriched));
      } else {
        const filtered = (db.enderecos_atuacao || []).filter(
          (ea: EnderecoAtuacao) => ea.infrator_id && validSuspectIds.has(ea.infrator_id)
        );
        const enriched = filtered.map((ea: EnderecoAtuacao) => {
          const inf = activeSuspects.find((i) => i.id === ea.infrator_id) || db.getInfratorFull?.(ea.infrator_id);
          return {
            ...ea,
            infrator_nome: ea.infrator_nome || inf?.nome_completo,
            infrator_vulgo: ea.infrator_vulgo || inf?.vulgo,
          };
        });
        setAddresses(deduplicateAddressList(enriched));
      }

      if (resGang && resGang.ok) {
        const dataGang = await resGang.json();
        if (Array.isArray(dataGang) && dataGang.length > 0) {
          setGangAreas(dataGang);
        } else {
          loadLocalGangAreas();
        }
      } else {
        loadLocalGangAreas();
      }

      setLoading(false);
    } catch (e) {
      console.warn('Backend indisponível para mapa, usando dados locais:', e);
      const activeSuspects = suspectsList || db.infratores || [];
      const validSuspectIds = new Set(activeSuspects.map((i) => i.id));
      const filtered = (db.enderecos_atuacao || []).filter(
        (ea: EnderecoAtuacao) => ea.infrator_id && validSuspectIds.has(ea.infrator_id)
      );
      setOccurrences(db.ocorrencias_criminais || []);
      setAddresses(deduplicateAddressList(filtered));
      loadLocalGangAreas();
      setLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    fetchMapData();
    if (onRefresh) onRefresh();
  };

  const loadLocalGangAreas = () => {
    try {
      const saved = localStorage.getItem('tactical_gang_areas_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGangAreas(parsed);
          if (onGangAreasChange) onGangAreasChange(parsed);
          return;
        }
      }
    } catch (e) {
      console.error('Falha ao ler gang areas do localStorage:', e);
    }
    setGangAreas(DEFAULT_GANG_AREAS_35BPM);
    if (onGangAreasChange) onGangAreasChange(DEFAULT_GANG_AREAS_35BPM);
  };

  const saveGangAreas = async (newAreas: GangAreaZone[], replaceAll = true) => {
    setGangAreas(newAreas);
    if (onGangAreasChange) onGangAreasChange(newAreas);
    try {
      localStorage.setItem('tactical_gang_areas_v1', JSON.stringify(newAreas));
      // Save to Firebase Firestore
      await persistGangAreasToFirebase(newAreas, replaceAll);

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

    // Clean, public, reliable tile layers that DO NOT require any API keys
    const initialConfig = BASEMAP_CONFIGS[baseMapStyle] || BASEMAP_CONFIGS.street;
    const tileLayer = L.tileLayer(initialConfig.url, {
      attribution: initialConfig.attribution,
      maxZoom: initialConfig.maxZoom,
      subdomains: initialConfig.subdomains || ['a', 'b', 'c', 'd'],
    }).addTo(map);

    activeTileLayerRef.current = tileLayer;
    gangLayersGroupRef.current = L.layerGroup().addTo(map);
    markerLayersGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Force tile recalculation after layout paints
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

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
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle Basemap Layer Switching dynamically
  useEffect(() => {
    if (!mapRef.current) return;

    const config = BASEMAP_CONFIGS[baseMapStyle];
    if (!config) return;

    if (activeTileLayerRef.current) {
      mapRef.current.removeLayer(activeTileLayerRef.current);
    }

    const newTileLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
      subdomains: config.subdomains || ['a', 'b', 'c', 'd'],
    });

    // Add new base tile layer and send to back
    newTileLayer.addTo(mapRef.current);
    if (typeof (newTileLayer as any).bringToBack === 'function') {
      (newTileLayer as any).bringToBack();
    }
    activeTileLayerRef.current = newTileLayer;
  }, [baseMapStyle]);

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

      // Clean map filter: if a gang is selected, show ONLY that gang!
      if (selectedGangZone && zone.id !== selectedGangZone.id) return;

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

      const gangDisplayName = zone.gangName || zone.name || 'GANGUE NÃO IDENTIFICADA';
      const dangerBadge = zone.dangerLevel
        ? `<span style="font-size: 9px; font-weight: 800; background: ${
            zone.dangerLevel === 'CRÍTICO' ? '#991b1b' : '#854d0e'
          }; color: #ffffff; padding: 1px 5px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.5px;">
            ${zone.dangerLevel}
          </span>`
        : '';

      const tooltipHTML = `
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; line-height: 1.45; min-width: 190px; max-width: 280px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid ${color}99; padding-bottom: 4px; margin-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 5px; min-width: 0;">
              <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: ${color}; box-shadow: 0 0 8px ${color}; flex-shrink: 0;"></span>
              <span style="font-weight: 800; color: #FFFFFF; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; white-space: normal;">
                ${gangDisplayName}
              </span>
            </div>
            ${dangerBadge}
          </div>
          ${zone.name && zone.name.toLowerCase() !== gangDisplayName.toLowerCase() ? `<div style="font-size: 10px; color: #cbd5e1; margin-bottom: 3px; font-weight: 600;">${zone.name}</div>` : ''}
          <div style="font-size: 10px; color: #94a3b8; display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Área / Dimensão:</span>
              <span style="color: #38bdf8; font-weight: bold;">${zone.areaKm2 ? `${zone.areaKm2} km²` : 'Território delimitado'}</span>
            </div>
            ${zone.rivalGang ? `
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Rivalidade:</span>
                <span style="color: #f87171; font-weight: bold;">⚔️ ${zone.rivalGang}</span>
              </div>
            ` : ''}
            ${suspectsInside.length > 0 ? `
              <div style="display: flex; justify-content: space-between; color: #f59e0b; font-weight: bold; background: rgba(245, 158, 11, 0.1); padding: 1px 4px; border-radius: 2px; margin-top: 2px;">
                <span>Infratores no território:</span>
                <span>⚠️ ${suspectsInside.length}</span>
              </div>
            ` : ''}
            ${occurrencesInside.length > 0 ? `
              <div style="display: flex; justify-content: space-between; color: #f87171; font-weight: bold; background: rgba(239, 68, 68, 0.1); padding: 1px 4px; border-radius: 2px; margin-top: 1px;">
                <span>Ocorrências registradas:</span>
                <span>🚨 ${occurrencesInside.length}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      if (zone.type === 'Polygon' && zone.coordinates.length >= 3) {
        const polyCoords = zone.innerHoles
          ? [zone.coordinates, ...zone.innerHoles]
          : zone.coordinates;

        const polygon = L.polygon(polyCoords as any, {
          color: color,
          weight: strokeW,
          opacity: 0.95,
          fillColor: color,
          fillOpacity: opacity,
          dashArray: zone.dangerLevel === 'CRÍTICO' ? '4, 4' : undefined,
          interactive: true,
        });

        // Tooltip on hover showing Gang Name clearly
        polygon.bindTooltip(tooltipHTML, {
          sticky: true,
          direction: 'top',
          opacity: 1,
          className: 'tactical-map-tooltip',
          offset: [0, -10],
        });

        // Rich popup on click
        const suspectsHTML =
          suspectsInside.length > 0
            ? `<div style="margin-top: 8px; border-top: 1px solid #334155; padding-top: 6px;">
                <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #f59e0b; margin-bottom: 3px;">
                  ⚠️ ${suspectsInside.length} Infrator(es) Mapeado(s) neste Território:
                </div>
                <div style="max-height: 110px; overflow-y: auto; font-size: 11px;">
                  ${suspectsInside
                    .map(
                      (s) => {
                        const sInfo = getSuspectInfoForAddress(s);
                        return `<div style="padding: 3px 0; border-bottom: 1px dashed #334155;">
                          <strong style="color: #f1f5f9; font-size: 11px;">${sInfo.nome}</strong> 
                          ${sInfo.vulgo ? `<span style="color: #DFC897; font-weight: 600;">("${sInfo.vulgo}")</span>` : ''}
                          <span style="color: #94a3b8; font-size: 10px; display: block; margin-top: 1px;">📍 ${s.tipo_endereco}: ${s.logradouro}</span>
                        </div>`;
                      }
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
                ${zone.gangName || 'ÁREA DE GANGUE'}
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

        polygon.on('click', () => {
          if (onSelectGangZone) {
            onSelectGangZone(zone);
          }
        });

        // Hover high-contrast effect & HUD update
        polygon.on('mouseover', () => {
          polygon.setStyle({
            weight: strokeW + 2,
            fillOpacity: Math.min(0.75, opacity + 0.3),
          });
          if (typeof (polygon as any).bringToFront === 'function') {
            (polygon as any).bringToFront();
          }
          setActiveZoneHover({
            ...zone,
            suspectsInsideCount: suspectsInside.length,
            occurrencesInsideCount: occurrencesInside.length,
          } as any);
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

        // Centroid tactical label (if enabled)
        if (showGangLabels) {
          const centroid = getPolygonCentroid(zone.coordinates);
          const labelIcon = L.divIcon({
            className: 'gang-centroid-label',
            html: `
              <div style="
                background: rgba(9, 12, 18, 0.90);
                border: 1px solid ${color};
                color: #FFFFFF;
                padding: 2px 7px;
                border-radius: 4px;
                font-family: 'JetBrains Mono', monospace;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.5px;
                text-transform: uppercase;
                white-space: nowrap;
                box-shadow: 0 3px 10px rgba(0,0,0,0.85), 0 0 8px ${color}55;
                display: inline-flex;
                align-items: center;
                gap: 5px;
                pointer-events: auto;
                cursor: pointer;
              ">
                <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${color}; box-shadow: 0 0 4px ${color};"></span>
                <span>${gangDisplayName}</span>
              </div>
            `,
            iconSize: [120, 20],
            iconAnchor: [60, 10],
          });

          const labelMarker = L.marker(centroid, { icon: labelIcon, interactive: true });
          labelMarker.on('click', () => {
            if (onSelectGangZone) {
              onSelectGangZone(zone);
            }
            polygon.openPopup();
          });
          labelMarker.on('mouseover', () => {
            polygon.fire('mouseover');
          });
          labelMarker.on('mouseout', () => {
            polygon.fire('mouseout');
          });
          gangLayersGroupRef.current?.addLayer(labelMarker);
        }

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
          interactive: true,
        });
        polyline.bindTooltip(tooltipHTML, { sticky: true, className: 'tactical-map-tooltip', opacity: 1, direction: 'top' });
        polyline.on('click', () => {
          if (onSelectGangZone) onSelectGangZone(zone);
        });
        polyline.on('mouseover', () => {
          polyline.setStyle({ weight: strokeW + 2, opacity: 1 });
          setActiveZoneHover(zone);
        });
        polyline.on('mouseout', () => {
          polyline.setStyle({ weight: Math.max(3.5, strokeW), opacity: 0.9 });
          setActiveZoneHover(null);
        });
        gangLayersGroupRef.current?.addLayer(polyline);
        polygonLayersMapRef.current[zone.id] = polyline;
      } else if (zone.type === 'Point' && zone.coordinates.length >= 1) {
        const pt = zone.coordinates[0];
        const ptIcon = L.divIcon({
          className: 'custom-gang-pt',
          html: `
            <div style="display:flex; align-items:center; justify-content:center; width:22px; height:22px; background:${color}; border:2px solid #fff; border-radius:50%; box-shadow:0 0 10px ${color}; cursor:pointer;">
              <span style="color:#fff; font-size:10px; font-weight:bold;">🛡️</span>
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        const ptMarker = L.marker(pt, { icon: ptIcon, interactive: true });
        ptMarker.bindTooltip(tooltipHTML, { sticky: true, className: 'tactical-map-tooltip', opacity: 1, direction: 'top' });
        ptMarker.on('click', () => {
          if (onSelectGangZone) onSelectGangZone(zone);
        });
        ptMarker.on('mouseover', () => setActiveZoneHover(zone));
        ptMarker.on('mouseout', () => setActiveZoneHover(null));
        gangLayersGroupRef.current?.addLayer(ptMarker);
      }
    });

    // Clean mode auto-zoom: When a gang is selected, focus map directly on its territory
    if (selectedGangZone && selectedGangZone.coordinates && selectedGangZone.coordinates.length > 0) {
      try {
        const gangBounds = L.latLngBounds(selectedGangZone.coordinates);
        if (gangBounds.isValid()) {
          mapRef.current.flyToBounds(gangBounds, { padding: [50, 50], maxZoom: 16, duration: 0.8 });
        }
      } catch (err) {
        console.warn('Falha ao focar limites da gangue selecionada:', err);
      }
    }
  }, [gangAreas, showAllGangLayers, showGangLabels, addresses, occurrences, selectedGangZone]);

  // Redraw Suspect Addresses & Crime Occurrences
  useEffect(() => {
    if (!mapRef.current || !markerLayersGroupRef.current) return;

    markerLayersGroupRef.current.clearLayers();

    const activeSuspects = suspectsList || db.infratores || [];
    const validSuspectIds = new Set(activeSuspects.map((i) => i.id));

    // 1. Draw Suspect Addresses with influence buffer circles (if enabled)
    if (showAddressesLayer) {
      let validAddresses = addresses.filter(
        (addr) => addr.infrator_id && validSuspectIds.has(addr.infrator_id)
      );

      // Clean map filter: if a gang is selected, display ONLY addresses associated with that gang
      if (selectedGangZone) {
        const intel = getGangIntelligenceDetails(selectedGangZone, activeSuspects, addresses, occurrences);
        const gangAddrIds = new Set(
          intel.residencias.map(
            (a) => a.id || `${a.infrator_id}-${a.logradouro}-${a.geom_ponto?.lat?.toFixed(4)}`
          )
        );
        validAddresses = validAddresses.filter(
          (a) =>
            gangAddrIds.has(a.id || `${a.infrator_id}-${a.logradouro}-${a.geom_ponto?.lat?.toFixed(4)}`) ||
            intel.residencias.some(
              (r) =>
                r.infrator_id === a.infrator_id &&
                r.geom_ponto?.lat === a.geom_ponto?.lat &&
                r.geom_ponto?.lng === a.geom_ponto?.lng
            )
        );
      }

      validAddresses.forEach((addr) => {
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
        interactive: false,
      });

      const suspectInfo = getSuspectInfoForAddress(addr);

      marker.bindPopup(`
        <div style="font-size: 12px; font-family: 'JetBrains Mono', monospace, sans-serif; color: #F3EEE4; min-width: 260px;">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; border-bottom: 1px solid rgba(196, 167, 110, 0.4); padding-bottom: 6px; margin-bottom: 6px;">
            <div style="min-width: 0;">
              <h4 style="margin: 0; color: #F59E0B; font-weight: 700; font-size: 13px; text-transform: uppercase; line-height: 1.25;">
                ${suspectInfo.nome}
              </h4>
              ${suspectInfo.vulgo ? `<div style="color: #DFC897; font-size: 11px; font-weight: 600; margin-top: 2px;">Alcunha: "${suspectInfo.vulgo}"</div>` : ''}
            </div>
            <span style="font-size: 9px; font-weight: 800; background: ${color}; color: #ffffff; padding: 2px 6px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; flex-shrink: 0;">
              ${addr.tipo_endereco || 'Endereço'}
            </span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px; margin-top: 4px;">
            <div><strong style="color: #DFC897;">Tipo:</strong> <span style="color: #FFFFFF; font-weight: 600;">${addr.tipo_endereco}</span></div>
            <div><strong style="color: #DFC897;">Endereço:</strong> <span style="color: #F3EEE4;">${addr.logradouro}, ${addr.bairro || 'Centro'}</span></div>
            <div><strong style="color: #DFC897;">Raio de Atuação:</strong> <span style="color: #38BDF8; font-weight: bold;">${addr.raio_influencia_km || 2.5} km</span></div>
          </div>
        </div>
      `);

      markerLayersGroupRef.current?.addLayer(circle);
      markerLayersGroupRef.current?.addLayer(marker);

      if (isHighlighted) {
        mapRef.current?.setView([lat, lng], 14);
      }
    });
    }

    // 2. Draw Crime Occurrences with Beacons (if enabled)
    if (showOccurrencesLayer) {
      let validOccurrences = occurrences;

      // Clean map filter: if a gang is selected, display ONLY crime occurrences tied to that gang
      if (selectedGangZone) {
        const intel = getGangIntelligenceDetails(selectedGangZone, activeSuspects, addresses, occurrences);
        const gangOcIds = new Set(intel.ocorrencias.map((o) => o.id || o.numero_bo));
        validOccurrences = validOccurrences.filter(
          (o) => gangOcIds.has(o.id || o.numero_bo) || intel.ocorrencias.includes(o)
        );
      }

      validOccurrences.forEach((oc) => {
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

      // Intelligent detection of arrests, qualified authors, and linkages
      const allSuspects = db.infratores || [];
      const fullText = `${oc.descricao_fato || ''} ${oc.modus_operandi || ''} ${(oc as any).historico || ''} ${(oc as any).relato || ''} ${(oc as any).narrativa || ''} ${oc.tipificacao_penal || ''}`;
      const textLower = fullText.toLowerCase();

      // Detect arrest / detention keywords
      const isPrisaoDetectada =
        /pres[oa]s?|pris[aã]o|flagrante|conduzid[oa]s?|detid[oa]s?|apreendid[oa]s?|autuad[oa]s?|recolhid[oa]s?|mandado cumprido|ratificad[oa]|presídio|penitenci[aá]ri[oa]|delegacia|apresentad[oa]s?\s+[àa]o?\s+delegad[oa]|ratificou|autua[cç][aã]o|algemad[oa]s?|condu[cç][aã]o|lavratur/i.test(fullText);

      const autoresVinculados: { nome: string; vulgo?: string; papel: string; preso?: boolean }[] = [];

      // A. Formally attached involved list
      if (oc.envolvidos && Array.isArray(oc.envolvidos) && oc.envolvidos.length > 0) {
        oc.envolvidos.forEach((e: any) => {
          const isAuthorArrested = isPrisaoDetectada || /pres|autuad|flagrante|conduz|detid|apreend/i.test(e.papel || '') || e.preso === true;
          autoresVinculados.push({
            nome: e.nome,
            vulgo: e.vulgo,
            papel: e.papel || (isAuthorArrested ? 'Autor Preso / Autuado' : 'Autor Qualificado'),
            preso: isAuthorArrested,
          });
        });
      }

      // B. Links from infrator_ocorrencia in DB
      if (db.infrator_ocorrencia && db.infrator_ocorrencia.length > 0) {
        const links = db.infrator_ocorrencia.filter(
          (l) => l.ocorrencia_id === oc.id || l.ocorrencia_id === oc.numero_bo
        );
        links.forEach((l) => {
          const suspect = allSuspects.find((s) => s.id === l.infrator_id);
          if (
            suspect &&
            !autoresVinculados.some(
              (a) => a.nome.toLowerCase() === suspect.nome_completo.toLowerCase()
            )
          ) {
            const isSuspectArrested = isPrisaoDetectada || /pres|autuad|flagrante|conduz|detid/i.test(l.papel_no_crime || '') || (suspect as any).situacao_atual === 'PRESO' || suspect.status_mandado_prisao;
            autoresVinculados.push({
              nome: suspect.nome_completo,
              vulgo: suspect.vulgo,
              papel: l.papel_no_crime || (isSuspectArrested ? 'Autor Preso / Autuado' : 'Autor Vinculado'),
              preso: isSuspectArrested,
            });
          }
        });
      }

      // C. Extract authors mentioned in the text (e.g. "AUTORES DE AÇÃO CRIMINAL: ...", "AUTOR: ...")
      const autorPatterns = [
        /AUTOR(?:ES)?\s*(?:DE\s*A[CÇ][AÃ]O\s*CRIMINAL)?\s*:\s*([^.\n]+)/gi,
        /(?:PRESOS?|CONDUZIDOS?|QUALIFICADOS?|INFRATORES?)\s*:\s*([^.\n]+)/gi,
      ];

      autorPatterns.forEach((regex) => {
        let match;
        while ((match = regex.exec(fullText)) !== null) {
          const captured = match[1];
          const segments = captured.split(/[;,]|\se\s/i).map((s) => s.trim());
          segments.forEach((seg) => {
            const cleaned = seg.replace(/^(e\s+|da\s+|do\s+|de\s+)/i, '').trim();
            if (
              cleaned.length > 2 &&
              !/^(vitima|arma|veiculo|local|hora|data)/i.test(cleaned)
            ) {
              if (
                !autoresVinculados.some(
                  (a) =>
                    a.nome.toLowerCase().includes(cleaned.toLowerCase()) ||
                    cleaned.toLowerCase().includes(a.nome.toLowerCase())
                )
              ) {
                const foundInDb = allSuspects.find(
                  (s) =>
                    s.nome_completo.toLowerCase().includes(cleaned.toLowerCase()) ||
                    cleaned.toLowerCase().includes(s.nome_completo.toLowerCase())
                );

                autoresVinculados.push({
                  nome: foundInDb ? foundInDb.nome_completo : cleaned,
                  vulgo: foundInDb ? foundInDb.vulgo : undefined,
                  papel: isPrisaoDetectada ? 'Autor Preso / Qualificado' : 'Autor Qualificado',
                  preso: isPrisaoDetectada,
                });
              }
            }
          });
        }
      });

      // D. Registered suspects in database whose names/nicknames appear in the narrative
      allSuspects.forEach((s) => {
        const nomeNorm = s.nome_completo?.trim().toLowerCase();
        const vulgoNorm = s.vulgo?.trim().toLowerCase();

        if (nomeNorm && nomeNorm.length > 5 && textLower.includes(nomeNorm)) {
          if (!autoresVinculados.some((a) => a.nome.toLowerCase().includes(nomeNorm))) {
            autoresVinculados.push({
              nome: s.nome_completo,
              vulgo: s.vulgo,
              papel: isPrisaoDetectada ? 'Autor Preso / Vinculado' : 'Autor Vinculado',
              preso: isPrisaoDetectada,
            });
          }
        } else if (vulgoNorm && vulgoNorm.length > 2 && textLower.includes(vulgoNorm)) {
          if (
            !autoresVinculados.some(
              (a) =>
                a.vulgo?.toLowerCase() === vulgoNorm ||
                a.nome.toLowerCase() === s.nome_completo.toLowerCase()
            )
          ) {
            autoresVinculados.push({
              nome: s.nome_completo,
              vulgo: s.vulgo,
              papel: isPrisaoDetectada ? 'Autor Preso / Vinculado' : 'Autor Vinculado',
              preso: isPrisaoDetectada,
            });
          }
        }
      });

      const temAutores = autoresVinculados.length > 0;
      const temPrisao = isPrisaoDetectada || autoresVinculados.some((a) => a.preso);

      let involvedHTML = '';
      if (temPrisao && temAutores) {
        involvedHTML = `
          <div style="margin-top: 8px; border-top: 1px solid rgba(16, 185, 129, 0.3); padding-top: 6px; background: rgba(6, 78, 59, 0.25); border-radius: 4px; padding: 6px 8px;">
            <div style="display: flex; align-items: center; gap: 5px; color: #34d399; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
              <span style="display: inline-block; width: 7px; height: 7px; background: #10b981; border-radius: 50%; box-shadow: 0 0 6px #10b981;"></span>
              Autores Presos / Autuados no B.O.:
            </div>
            <ul style="margin: 4px 0 3px 0; padding-left: 14px; font-size: 11px; color: #f1f5f9; line-height: 1.35;">
              ${autoresVinculados
                .map(
                  (e) =>
                    `<li style="margin-bottom: 2px;"><strong>${e.nome}</strong>${
                      e.vulgo ? ` (<em>${e.vulgo}</em>)` : ''
                    } - <span style="color: #34d399; font-weight: 600;">${e.papel}</span></li>`
                )
                .join('')}
            </ul>
            <div style="font-size: 10px; color: #a7f3d0; font-weight: 500; display: flex; align-items: center; gap: 4px; margin-top: 2px;">
              <span>✓</span> Prisão/condução registrada no relato desta ocorrência.
            </div>
          </div>
        `;
      } else if (temPrisao && !temAutores) {
        involvedHTML = `
          <div style="margin-top: 8px; border-top: 1px solid rgba(16, 185, 129, 0.3); padding-top: 6px; background: rgba(6, 78, 59, 0.25); border-radius: 4px; padding: 6px 8px;">
            <div style="display: flex; align-items: center; gap: 5px; color: #34d399; font-size: 11px; font-weight: 700; text-transform: uppercase;">
              <span style="display: inline-block; width: 7px; height: 7px; background: #10b981; border-radius: 50%; box-shadow: 0 0 6px #10b981;"></span>
              Prisão / Condução Registrada
            </div>
            <div style="font-size: 10px; color: #a7f3d0; margin-top: 2px;">
              ✓ Consta registro de prisão/apreensão de autores nos autos deste B.O.
            </div>
          </div>
        `;
      } else if (!temPrisao && temAutores) {
        involvedHTML = `
          <div style="margin-top: 8px; border-top: 1px solid rgba(245, 158, 11, 0.3); padding-top: 6px; background: rgba(120, 53, 15, 0.2); border-radius: 4px; padding: 6px 8px;">
            <div style="display: flex; align-items: center; gap: 5px; color: #fbbf24; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
              <span style="display: inline-block; width: 7px; height: 7px; background: #f59e0b; border-radius: 50%; box-shadow: 0 0 6px #f59e0b;"></span>
              Autores Identificados / Qualificados:
            </div>
            <ul style="margin: 4px 0 3px 0; padding-left: 14px; font-size: 11px; color: #f1f5f9; line-height: 1.35;">
              ${autoresVinculados
                .map(
                  (e) =>
                    `<li style="margin-bottom: 2px;"><strong>${e.nome}</strong>${
                      e.vulgo ? ` (<em>${e.vulgo}</em>)` : ''
                    } - <span style="color: #fbbf24; font-weight: 600;">${e.papel}</span></li>`
                )
                .join('')}
            </ul>
            <div style="font-size: 10px; color: #fde68a; margin-top: 2px;">
              Identificados no histórico policial (Investigação preliminar / Mandado).
            </div>
          </div>
        `;
      } else {
        involvedHTML = `
          <div style="margin-top: 6px; font-style: italic; color: #94a3b8; font-size: 11px; border-top: 1px solid #334155; padding-top: 4px;">
            Autoria não informada / Em apuração preliminar.
          </div>
        `;
      }

      marker.bindPopup(`
        <div style="font-size: 12px; font-family: 'JetBrains Mono', monospace, sans-serif; color: #F3EEE4; max-width: 270px;">
          <h4 style="margin: 0 0 6px 0; color: #f87171; font-weight: bold; border-bottom: 1px solid rgba(239, 68, 68, 0.4); padding-bottom: 4px; display: flex; align-items: center; gap: 6px; font-size: 12px;">
            <span style="display:inline-block; width: 8px; height: 8px; background: #ef4444; border-radius: 50%; box-shadow: 0 0 6px #ef4444;"></span>
            ${oc.numero_bo} - ${oc.tipificacao_penal}
          </h4>
          <p style="margin: 3px 0; font-size: 11px; color: #94a3b8;">
            <strong style="color: #cbd5e1;">Data:</strong> ${new Date(oc.data_hora).toLocaleString('pt-BR')}
          </p>
          <div style="margin: 5px 0; font-size: 11px; line-height: 1.4; color: #cbd5e1; max-height: 90px; overflow-y: auto; background: rgba(0,0,0,0.35); padding: 5px 7px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.08);">
            ${oc.descricao_fato}
          </div>
          <div style="display: grid; grid-template-columns: 1fr; gap: 2px; font-size: 11px; margin: 4px 0;">
            <div><strong style="color: #94a3b8;">Arma:</strong> <span style="color: #e2e8f0;">${oc.armas_utilizadas || 'Não informada'}</span></div>
            <div><strong style="color: #94a3b8;">Veículo:</strong> <span style="color: #e2e8f0;">${oc.veiculo_utilizado || 'Não informado'}</span></div>
          </div>
          ${involvedHTML}
        </div>
      `);

      markerLayersGroupRef.current?.addLayer(marker);
    });
    }
  }, [
    occurrences,
    addresses,
    highlightedSuspectId,
    showAddressesLayer,
    showOccurrencesLayer,
    suspectsList,
    refreshTrigger,
    selectedGangZone,
  ]);

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
        
        {/* Left: Coordinate Target Box & Hover Zone HUD */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 p-2 rounded-md shadow-lg flex items-center gap-3">
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

          {/* Selected Gang Filter Focus Indicator (Clean Mode) */}
          {selectedGangZone && (
            <div
              className="bg-slate-950/95 backdrop-blur-md border px-3 py-1.5 rounded-md shadow-2xl flex items-center gap-2.5 font-mono animate-fade-in pointer-events-auto"
              style={{ borderColor: selectedGangZone.color || '#f59e0b' }}
            >
              <div
                className="w-3 h-3 rounded-full animate-pulse shadow-md"
                style={{ backgroundColor: selectedGangZone.color || '#f59e0b' }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Gangue:</span>
                  <span
                    className="text-[11px] font-extrabold uppercase tracking-wider truncate max-w-[140px] md:max-w-[200px]"
                    style={{ color: selectedGangZone.color || '#f59e0b' }}
                  >
                    {selectedGangZone.gangName || selectedGangZone.name}
                  </span>
                </div>
                <span className="text-[9px] text-emerald-400 block font-semibold">
                  Modo Clean Ativo
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSelectGangZone && onSelectGangZone(null)}
                className="ml-1 p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-700 transition cursor-pointer"
                title="Limpar filtro e exibir todas as gangues"
              >
                <X className="w-3.5 h-3.5 text-rose-400" />
              </button>
            </div>
          )}

          {/* Active Hover Gang Zone HUD Badge */}
          {activeZoneHover && (
            <div
              className="bg-slate-950/95 backdrop-blur-md border px-3.5 py-1.5 rounded-md shadow-2xl flex items-center gap-3 font-mono animate-fade-in pointer-events-auto"
              style={{ borderColor: activeZoneHover.color || '#ef4444' }}
            >
              <div
                className="w-3.5 h-3.5 rounded-full animate-pulse shadow-md"
                style={{ backgroundColor: activeZoneHover.color || '#ef4444' }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase font-bold tracking-wider" style={{ color: activeZoneHover.color || '#ef4444' }}>
                    🛡️ {activeZoneHover.gangName || activeZoneHover.name}
                  </span>
                  {activeZoneHover.dangerLevel && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-white ${
                      activeZoneHover.dangerLevel === 'CRÍTICO' ? 'bg-red-800' : 'bg-amber-700'
                    }`}>
                      {activeZoneHover.dangerLevel}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-300 flex items-center gap-2">
                  <span>{activeZoneHover.areaKm2 ? `${activeZoneHover.areaKm2} km²` : 'Território demarcado'}</span>
                  {activeZoneHover.rivalGang && (
                    <span className="text-red-400 font-semibold">• Rival: {activeZoneHover.rivalGang}</span>
                  )}
                  {(activeZoneHover as any).suspectsInsideCount > 0 && (
                    <span className="text-amber-400 font-bold">• ⚠️ {(activeZoneHover as any).suspectsInsideCount} Infrator(es)</span>
                  )}
                  {(activeZoneHover as any).occurrencesInsideCount > 0 && (
                    <span className="text-rose-400 font-bold">• 🚨 {(activeZoneHover as any).occurrencesInsideCount} B.O.(s)</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Basemap Switcher, Layer Toggles, Gang Controls & Importer Button */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          
          {/* Quick Toggle: Nomes / Rótulos de Gangues */}
          <button
            type="button"
            onClick={() => setShowGangLabels(!showGangLabels)}
            className={`px-2 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 border transition cursor-pointer shadow-md ${
              showGangLabels
                ? 'bg-amber-950/80 text-amber-300 border-amber-600'
                : 'bg-slate-900/90 text-slate-400 hover:bg-slate-800 border-slate-700 opacity-60'
            }`}
            title={showGangLabels ? 'Ocultar nomes/rótulos fixos de gangues sobre o mapa' : 'Exibir nomes/rótulos fixos de gangues sobre o mapa'}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="hidden md:inline">Nomes</span>
            {showGangLabels ? <Eye className="w-3 h-3 text-amber-400" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
          </button>

          {/* Quick Toggle: Residências */}
          <button
            type="button"
            onClick={() => setShowAddressesLayer(!showAddressesLayer)}
            className={`px-2 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 border transition cursor-pointer shadow-md ${
              showAddressesLayer
                ? 'bg-blue-950/80 text-blue-300 border-blue-600'
                : 'bg-slate-900/90 text-slate-400 hover:bg-slate-800 border-slate-700 opacity-60'
            }`}
            title={showAddressesLayer ? 'Ocultar marcadores de residências e endereços' : 'Exibir marcadores de residências'}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span className="hidden md:inline">Residências</span>
            <span className="text-[10px] bg-blue-900/60 px-1 rounded text-blue-200">
              {addresses.filter(a => a.infrator_id && (suspectsList || db.infratores || []).some(s => s.id === a.infrator_id)).length}
            </span>
            {showAddressesLayer ? <Eye className="w-3 h-3 text-blue-400" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
          </button>

          {/* Quick Toggle: B.O. / Ocorrências */}
          <button
            type="button"
            onClick={() => setShowOccurrencesLayer(!showOccurrencesLayer)}
            className={`px-2 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 border transition cursor-pointer shadow-md ${
              showOccurrencesLayer
                ? 'bg-red-950/80 text-red-300 border-red-600'
                : 'bg-slate-900/90 text-slate-400 hover:bg-slate-800 border-slate-700 opacity-60'
            }`}
            title={showOccurrencesLayer ? 'Ocultar marcadores de B.O. / Ocorrências' : 'Exibir marcadores de B.O. / Ocorrências'}
          >
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="hidden md:inline">B.O.s</span>
            <span className="text-[10px] bg-red-900/60 px-1 rounded text-red-200">{occurrences.length}</span>
            {showOccurrencesLayer ? <Eye className="w-3 h-3 text-red-400" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
          </button>

          {/* Sync / Refresh Button */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-amber-400 rounded border border-slate-700 transition cursor-pointer shadow-md"
            title="Atualizar e sincronizar pontos do mapa"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Basemap Style Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsBaseMapMenuOpen(!isBaseMapMenuOpen)}
              className="px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-mono font-bold rounded border border-slate-700 transition cursor-pointer flex items-center gap-1.5 shadow-md"
              title="Mudar estilo de camada do mapa (Satélite, Noturno, Ruas)"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>{BASEMAP_CONFIGS[baseMapStyle].name.split(' ')[0]}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isBaseMapMenuOpen && (
              <div className="absolute right-0 top-9 z-50 w-56 bg-slate-900/98 backdrop-blur-md border border-slate-700 rounded-md shadow-2xl p-1.5 font-mono text-xs space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Camada Base do Mapa
                </div>
                {(Object.keys(BASEMAP_CONFIGS) as BaseMapStyle[]).map((styleKey) => {
                  const cfg = BASEMAP_CONFIGS[styleKey];
                  const isSelected = baseMapStyle === styleKey;
                  return (
                    <button
                      key={styleKey}
                      type="button"
                      onClick={() => {
                        setBaseMapStyle(styleKey);
                        setIsBaseMapMenuOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between text-[11px] transition cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-950/70 text-cyan-300 font-bold border border-cyan-800/60'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {styleKey === 'satellite' ? (
                          <Globe className="w-3.5 h-3.5 text-emerald-400" />
                        ) : styleKey === 'street' ? (
                          <MapIcon className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Radio className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                        <span>{cfg.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Import KML / GeoJSON Button */}
          <button
            type="button"
            onClick={() => setIsImporterOpen(true)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded shadow-lg shadow-amber-500/20 uppercase tracking-wider font-mono flex items-center gap-1.5 transition cursor-pointer"
            title="Importar polígonos e cores do Google My Maps (KML, KMZ, GeoJSON)"
          >
            <Upload className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Importar Gangues</span>
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
