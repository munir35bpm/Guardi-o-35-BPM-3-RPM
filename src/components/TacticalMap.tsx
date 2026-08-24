import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { OcorrenciaCriminal, EnderecoAtuacao } from '../types';
import { MapPin, Crosshair, Navigation, AlertCircle } from 'lucide-react';
import { db } from '../backend/db';

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
  const [mapCenter, setMapCenter] = useState<[number, number]>([-23.60, -46.65]); // Default Sao Paulo
  const [loading, setLoading] = useState(true);

  // Group of layers so we can easily clear and redraw them
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  const fetchMapData = async () => {
    try {
      const [resOc, resAdd] = await Promise.all([
        fetch('/api/ocorrencias').catch(() => null),
        fetch('/api/enderecos').catch(() => null),
      ]);
      if (resOc && resAdd && resOc.ok && resAdd.ok) {
        const dataOc = await resOc.json();
        const dataAdd = await resAdd.json();
        setOccurrences(dataOc);
        setAddresses(dataAdd);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Backend indisponível para mapa, usando dados locais:', e);
    }
    // Fallback local
    setOccurrences(db.ocorrencias_criminais);
    setAddresses(db.enderecos_atuacao);
    setLoading(false);
  };

  useEffect(() => {
    fetchMapData();
  }, [highlightedSuspectId]);

  // Initial Map Setup
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create the map
    const map = L.map(mapContainerRef.current, {
      center: [-23.59, -46.64],
      zoom: 12,
      maxZoom: 18,
    });

    // Add High Contrast Dark tile layer for advanced tactical feel
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    }).addTo(map);

    layersGroupRef.current = L.layerGroup().addTo(map);
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

  // Redraw layers (Markers, Popups, Buffers) when data loads or changes
  useEffect(() => {
    if (!mapRef.current || !layersGroupRef.current) return;

    // Clear previous items
    layersGroupRef.current.clearLayers();

    // 1. Draw Suspect Addresses with influence buffer circles
    addresses.forEach((addr) => {
      const isHighlighted = highlightedSuspectId === addr.infrator_id;
      const lat = addr.geom_ponto.lat;
      const lng = addr.geom_ponto.lng;

      // Skip invalid coords
      if (!lat || !lng) return;

      // Color scheme based on address type
      const color =
        addr.tipo_endereco === 'Residência' ? '#3b82f6' : // Blue
        addr.tipo_endereco === 'Esconderijo' ? '#ea580c' : // Orange
        addr.tipo_endereco === 'Ponto de Venda' ? '#a855f7' : // Purple
        '#eab308'; // Yellow Area

      // Custom SVG DivIcon representing a shield
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
              ${addr.tipo_endereco[0]}
            </span>
          </div>
        `,
        iconSize: isHighlighted ? [28, 28] : [22, 22],
        iconAnchor: isHighlighted ? [14, 14] : [11, 11],
      });

      // Marker
      const marker = L.marker([lat, lng], { icon: addressIcon });

      // Circular Area representing sphere of operational influence
      const circle = L.circle([lat, lng], {
        radius: addr.raio_influencia_km * 1000,
        fillColor: color,
        fillOpacity: isHighlighted ? 0.22 : 0.08,
        color: isHighlighted ? '#f59e0b' : color,
        weight: isHighlighted ? 2.5 : 1,
        dashArray: '3, 4',
      });

      // Add popup
      marker.bindPopup(`
        <div style="font-size: 13px; font-family: sans-serif; color: #1e293b;">
          <h4 style="margin: 0 0 5px 0; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            ${addr.infrator_nome} (${addr.infrator_vulgo})
          </h4>
          <p style="margin: 3px 0;"><strong>Tipo:</strong> ${addr.tipo_endereco}</p>
          <p style="margin: 3px 0;"><strong>Endereço:</strong> ${addr.logradouro}, ${addr.bairro}</p>
          <p style="margin: 3px 0;"><strong>Raio de Atuação:</strong> ${addr.raio_influencia_km} km</p>
        </div>
      `);

      layersGroupRef.current?.addLayer(circle);
      layersGroupRef.current?.addLayer(marker);

      if (isHighlighted) {
        // Pan and Zoom to the highlighted suspect's location
        mapRef.current?.setView([lat, lng], 13);
      }
    });

    // 2. Draw Crime Occurrences with Beacons
    occurrences.forEach((oc) => {
      const lat = oc.geom_crime.lat;
      const lng = oc.geom_crime.lng;

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

      const involvedHTML = oc.envolvidos && oc.envolvidos.length > 0
        ? `<div style="margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
            <strong style="color: #475569; font-size: 11px; text-transform: uppercase;">Infratores Vinculados:</strong>
            <ul style="margin: 3px 0; padding-left: 14px; font-size: 11px;">
              ${oc.envolvidos.map(e => `<li>${e.nome} (${e.vulgo}) - <strong>${e.papel}</strong></li>`).join('')}
            </ul>
           </div>`
        : '<div style="margin-top: 6px; font-style: italic; color: #94a3b8; font-size: 11px;">Nenhum autor autuado diretamente neste B.O.</div>';

      marker.bindPopup(`
        <div style="font-size: 13px; font-family: sans-serif; color: #1e293b; max-width: 250px;">
          <h4 style="margin: 0 0 5px 0; color: #991b1b; font-weight: bold; border-bottom: 1px solid #fecaca; padding-bottom: 4px; display: flex; align-items: center; gap: 4px;">
            <span style="display:inline-block; width: 8px; height: 8px; background: #ef4444; border-radius: 50%;"></span>
            ${oc.numero_bo} - ${oc.tipificacao_penal}
          </h4>
          <p style="margin: 3px 0; font-size: 11px; color: #64748b;"><strong>Data:</strong> ${new Date(oc.data_hora).toLocaleString('pt-BR')}</p>
          <p style="margin: 4px 0; font-size: 12px; font-weight: 500; color: #334155; max-height: 80px; overflow-y: auto;">
            ${oc.descricao_fato}
          </p>
          <p style="margin: 2px 0; font-size: 11px;"><strong>Arma:</strong> ${oc.armas_utilizadas}</p>
          <p style="margin: 2px 0; font-size: 11px;"><strong>Veículo:</strong> ${oc.veiculo_utilizado}</p>
          ${involvedHTML}
        </div>
      `);

      layersGroupRef.current?.addLayer(marker);
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
      mapRef.current.setView([lat, lng], 13);
    }
  };

  return (
    <div className="relative w-full h-[540px] border border-slate-800 rounded-lg overflow-hidden bg-slate-950 flex flex-col shadow-lg">
      {/* Map Overlay Controls */}
      <div className="absolute top-3 left-12 z-[1000] bg-slate-900/95 border border-slate-800 p-2.5 rounded-md shadow-md max-w-sm">
        <div className="flex items-start gap-2">
          <Navigation className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0 animate-bounce" />
          <div>
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Centro de Coordenadas de Alvo</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Clique em qualquer local no mapa para estabelecer as coordenadas para processamento do analisador de B.O. ou busca de suspeitos.
            </p>
            {selectedCoords ? (
              <div className="mt-2 text-xs bg-slate-950 p-1.5 rounded font-mono text-emerald-400 flex items-center gap-1.5 border border-slate-800">
                <Crosshair className="w-3.5 h-3.5" />
                Lat: {selectedCoords.lat.toFixed(5)} | Lng: {selectedCoords.lng.toFixed(5)}
              </div>
            ) : (
              <div className="mt-2 text-[10px] text-amber-500 font-semibold italic flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Clique para fixar mira de inteligência
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Legend overlay */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-slate-900/90 border border-slate-800 p-3 rounded-md shadow-md text-xs text-slate-300 space-y-2">
        <h5 className="font-bold text-slate-100 uppercase text-[10px] tracking-wider border-b border-slate-800 pb-1">Simbologia Tática</h5>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ef4444] border border-white inline-block"></span>
            <span>Ocorrência B.O.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#3b82f6] inline-block"></span>
            <span>Residência</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-[#ea580c] inline-block rounded-sm"></span>
            <span>Esconderijo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-[#eab308] inline-block rounded-sm"></span>
            <span>Área de Atuação</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1">
          Linhas tracejadas indicam o raio de influência.
        </div>
      </div>

      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
