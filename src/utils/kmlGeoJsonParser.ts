import JSZip from 'jszip';
import { GangAreaZone } from '../types';

// Palette of tactical colors for auto-assigning if not specified in KML/GeoJSON
const TACTICAL_COLORS = [
  '#ef4444', // Red (High Alert)
  '#f97316', // Orange
  '#eab308', // Amber / Yellow
  '#84cc16', // Lime
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f43f5e', // Rose
];

/**
 * Converts KML color (aabbggrr hex format) to standard CSS hex (#rrggbb) and opacity (0-1)
 */
export function kmlColorToHexAndOpacity(kmlColorStr: string): { hex: string; opacity: number } {
  if (!kmlColorStr || typeof kmlColorStr !== 'string') {
    return { hex: '#ef4444', opacity: 0.35 };
  }
  const clean = kmlColorStr.trim().replace(/^#/, '');
  if (clean.length === 8) {
    const a = parseInt(clean.substring(0, 2), 16) / 255;
    const b = clean.substring(2, 4);
    const g = clean.substring(4, 6);
    const r = clean.substring(6, 8);
    return {
      hex: `#${r}${g}${b}`,
      opacity: isNaN(a) ? 0.35 : Math.max(0.15, Math.min(0.85, a)),
    };
  } else if (clean.length === 6) {
    return { hex: `#${clean}`, opacity: 0.35 };
  }
  return { hex: '#ef4444', opacity: 0.35 };
}

/**
 * Calculate approximate polygon area in km² (spherical approximation)
 */
function calculatePolygonAreaKm2(coords: [number, number][]): number {
  if (!coords || coords.length < 3) return 0;
  const radius = 6371; // Earth radius in km
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const lat1 = (coords[i][0] * Math.PI) / 180;
    const lng1 = (coords[i][1] * Math.PI) / 180;
    const lat2 = (coords[j][0] * Math.PI) / 180;
    const lng2 = (coords[j][1] * Math.PI) / 180;
    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  area = (Math.abs(area) * radius * radius) / 2;
  return Number(area.toFixed(2));
}

/**
 * Parses raw KML text into an array of GangAreaZone items
 */
export function parseKmlContent(kmlText: string, fileName?: string): GangAreaZone[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
  const zones: GangAreaZone[] = [];

  // 1. Build a lookup map of Style IDs to colors
  const stylesMap: Record<string, { colorHex: string; opacity: number; strokeHex: string; strokeWidth: number }> = {};

  const styleNodes = xmlDoc.querySelectorAll('Style, StyleMap');
  styleNodes.forEach((styleNode) => {
    const styleId = styleNode.getAttribute('id') || '';
    if (!styleId) return;

    let polyColorHex = '';
    let polyOpacity = 0.35;
    let strokeColorHex = '';
    let strokeWidth = 2;

    const polyColorNode = styleNode.querySelector('PolyStyle > color');
    if (polyColorNode && polyColorNode.textContent) {
      const parsed = kmlColorToHexAndOpacity(polyColorNode.textContent);
      polyColorHex = parsed.hex;
      polyOpacity = parsed.opacity;
    }

    const lineColorNode = styleNode.querySelector('LineStyle > color');
    if (lineColorNode && lineColorNode.textContent) {
      const parsed = kmlColorToHexAndOpacity(lineColorNode.textContent);
      strokeColorHex = parsed.hex;
    }

    const widthNode = styleNode.querySelector('LineStyle > width');
    if (widthNode && widthNode.textContent) {
      const w = parseFloat(widthNode.textContent);
      if (!isNaN(w)) strokeWidth = w;
    }

    stylesMap[styleId] = {
      colorHex: polyColorHex || strokeColorHex || '',
      opacity: polyOpacity,
      strokeHex: strokeColorHex || polyColorHex || '',
      strokeWidth,
    };
  });

  // 2. Parse all Placemarks
  const placemarks = xmlDoc.querySelectorAll('Placemark');
  let colorIdx = 0;

  placemarks.forEach((pm, index) => {
    const nameNode = pm.querySelector('name');
    const descNode = pm.querySelector('description');
    const styleUrlNode = pm.querySelector('styleUrl');

    const name = nameNode?.textContent?.trim() || `Área Demarcada #${index + 1}`;
    const description = descNode?.textContent?.trim() || '';

    // Style lookup
    let assignedColor = '';
    let assignedOpacity = 0.35;
    let strokeWidth = 2;

    if (styleUrlNode && styleUrlNode.textContent) {
      const sId = styleUrlNode.textContent.replace(/^#/, '').trim();
      if (stylesMap[sId]) {
        if (stylesMap[sId].colorHex) assignedColor = stylesMap[sId].colorHex;
        if (stylesMap[sId].opacity) assignedOpacity = stylesMap[sId].opacity;
        if (stylesMap[sId].strokeWidth) strokeWidth = stylesMap[sId].strokeWidth;
      }
    }

    // Direct inline Style
    const inlinePolyColor = pm.querySelector('Style > PolyStyle > color');
    if (inlinePolyColor && inlinePolyColor.textContent) {
      const parsed = kmlColorToHexAndOpacity(inlinePolyColor.textContent);
      assignedColor = parsed.hex;
      assignedOpacity = parsed.opacity;
    }

    if (!assignedColor) {
      assignedColor = TACTICAL_COLORS[colorIdx % TACTICAL_COLORS.length];
      colorIdx++;
    }

    // Check for Polygon
    const polygonNodes = pm.querySelectorAll('Polygon');
    if (polygonNodes.length > 0) {
      polygonNodes.forEach((poly, polyIndex) => {
        const outerCoordNode = poly.querySelector('outerBoundaryIs LinearRing coordinates, coordinates');
        if (!outerCoordNode || !outerCoordNode.textContent) return;

        const coords = parseKmlCoordinateString(outerCoordNode.textContent);
        if (coords.length < 3) return;

        // Check for inner holes
        const innerHoles: [number, number][][] = [];
        const innerNodes = poly.querySelectorAll('innerBoundaryIs LinearRing coordinates');
        innerNodes.forEach((inNode) => {
          if (inNode.textContent) {
            const holeCoords = parseKmlCoordinateString(inNode.textContent);
            if (holeCoords.length >= 3) {
              innerHoles.push(holeCoords);
            }
          }
        });

        const area = calculatePolygonAreaKm2(coords);

        zones.push({
          id: `gang-zone-kml-${Date.now()}-${index}-${polyIndex}`,
          name: polygonNodes.length > 1 ? `${name} (Parte ${polyIndex + 1})` : name,
          gangName: extractGangName(name),
          description,
          color: assignedColor,
          fillOpacity: assignedOpacity,
          strokeWidth,
          coordinates: coords,
          innerHoles: innerHoles.length > 0 ? innerHoles : undefined,
          type: 'Polygon',
          visible: true,
          sourceFile: fileName || 'Importação KML',
          areaKm2: area,
        });
      });
      return;
    }

    // Check for LineString
    const lineStringNodes = pm.querySelectorAll('LineString');
    if (lineStringNodes.length > 0) {
      lineStringNodes.forEach((line, lineIndex) => {
        const coordNode = line.querySelector('coordinates');
        if (!coordNode || !coordNode.textContent) return;
        const coords = parseKmlCoordinateString(coordNode.textContent);
        if (coords.length < 2) return;

        zones.push({
          id: `gang-line-kml-${Date.now()}-${index}-${lineIndex}`,
          name: lineStringNodes.length > 1 ? `${name} (Linha ${lineIndex + 1})` : name,
          gangName: extractGangName(name),
          description,
          color: assignedColor,
          strokeWidth: Math.max(3, strokeWidth),
          coordinates: coords,
          type: 'LineString',
          visible: true,
          sourceFile: fileName || 'Importação KML',
        });
      });
      return;
    }

    // Check for Point
    const pointNode = pm.querySelector('Point coordinates');
    if (pointNode && pointNode.textContent) {
      const coords = parseKmlCoordinateString(pointNode.textContent);
      if (coords.length > 0) {
        zones.push({
          id: `gang-pt-kml-${Date.now()}-${index}`,
          name,
          gangName: extractGangName(name),
          description,
          color: assignedColor,
          coordinates: coords,
          pointCoords: coords[0],
          type: 'Point',
          visible: true,
          sourceFile: fileName || 'Importação KML',
        });
      }
    }
  });

  return zones;
}

/**
 * Parses coordinate strings from KML format: "lng,lat,alt lng,lat,alt ..." into [lat, lng][]
 */
function parseKmlCoordinateString(coordString: string): [number, number][] {
  const result: [number, number][] = [];
  const tokens = coordString.trim().split(/\s+/);

  for (const token of tokens) {
    if (!token) continue;
    const parts = token.split(',');
    if (parts.length >= 2) {
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        result.push([lat, lng]);
      }
    }
  }

  return result;
}

/**
 * Parses GeoJSON text or object into GangAreaZone items
 */
export function parseGeoJsonContent(geoJsonContent: string | object, fileName?: string): GangAreaZone[] {
  let data: any;
  if (typeof geoJsonContent === 'string') {
    try {
      data = JSON.parse(geoJsonContent);
    } catch (e) {
      console.error('Falha ao interpretar JSON/GeoJSON:', e);
      return [];
    }
  } else {
    data = geoJsonContent;
  }

  const zones: GangAreaZone[] = [];
  let colorIdx = 0;

  const features = data.type === 'FeatureCollection' ? data.features : data.type === 'Feature' ? [data] : [];

  if (!Array.isArray(features)) return [];

  features.forEach((feat: any, index: number) => {
    const props = feat.properties || {};
    const geom = feat.geometry || {};

    const name = props.name || props.nome || props.title || props.id || `Zona #${index + 1}`;
    const description = props.description || props.descricao || props.observacao || '';
    const gangName = props.gangue || props.faccao || props.gang || extractGangName(name);

    // Color from props
    let color = props.color || props.fill || props.stroke || props['marker-color'] || props.cor || '';
    if (!color || typeof color !== 'string' || !color.startsWith('#')) {
      color = TACTICAL_COLORS[colorIdx % TACTICAL_COLORS.length];
      colorIdx++;
    }

    const fillOpacity = typeof props['fill-opacity'] === 'number' ? props['fill-opacity'] : 0.35;
    const strokeWidth = typeof props['stroke-width'] === 'number' ? props['stroke-width'] : 2.5;

    if (geom.type === 'Polygon' && Array.isArray(geom.coordinates) && geom.coordinates.length > 0) {
      // Outer ring: [[lng, lat], [lng, lat], ...]
      const outerRing = geom.coordinates[0];
      const coords: [number, number][] = outerRing.map((pt: any) => [Number(pt[1]), Number(pt[0])]);

      const innerHoles: [number, number][][] = [];
      if (geom.coordinates.length > 1) {
        for (let i = 1; i < geom.coordinates.length; i++) {
          innerHoles.push(geom.coordinates[i].map((pt: any) => [Number(pt[1]), Number(pt[0])]));
        }
      }

      zones.push({
        id: `gang-zone-geojson-${Date.now()}-${index}`,
        name,
        gangName,
        description,
        color,
        fillOpacity,
        strokeWidth,
        coordinates: coords,
        innerHoles: innerHoles.length > 0 ? innerHoles : undefined,
        type: 'Polygon',
        visible: true,
        sourceFile: fileName || 'Importação GeoJSON',
        areaKm2: calculatePolygonAreaKm2(coords),
      });
    } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
      geom.coordinates.forEach((poly: any, polyIdx: number) => {
        if (Array.isArray(poly) && poly.length > 0) {
          const outer = poly[0];
          const coords: [number, number][] = outer.map((pt: any) => [Number(pt[1]), Number(pt[0])]);
          zones.push({
            id: `gang-zone-geojson-${Date.now()}-${index}-${polyIdx}`,
            name: geom.coordinates.length > 1 ? `${name} (Parte ${polyIdx + 1})` : name,
            gangName,
            description,
            color,
            fillOpacity,
            strokeWidth,
            coordinates: coords,
            type: 'Polygon',
            visible: true,
            sourceFile: fileName || 'Importação GeoJSON',
            areaKm2: calculatePolygonAreaKm2(coords),
          });
        }
      });
    } else if (geom.type === 'LineString' && Array.isArray(geom.coordinates)) {
      const coords: [number, number][] = geom.coordinates.map((pt: any) => [Number(pt[1]), Number(pt[0])]);
      zones.push({
        id: `gang-line-geojson-${Date.now()}-${index}`,
        name,
        gangName,
        description,
        color,
        strokeWidth: Math.max(3, strokeWidth),
        coordinates: coords,
        type: 'LineString',
        visible: true,
        sourceFile: fileName || 'Importação GeoJSON',
      });
    } else if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
      const pt: [number, number] = [Number(geom.coordinates[1]), Number(geom.coordinates[0])];
      zones.push({
        id: `gang-pt-geojson-${Date.now()}-${index}`,
        name,
        gangName,
        description,
        color,
        coordinates: [pt],
        pointCoords: pt,
        type: 'Point',
        visible: true,
        sourceFile: fileName || 'Importação GeoJSON',
      });
    }
  });

  return zones;
}

/**
 * Universal File Reader for KML, KMZ, GeoJSON and JSON
 */
export async function parseMapFile(file: File): Promise<GangAreaZone[]> {
  const fileName = file.name;
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (ext === 'kmz') {
    // Decompress KMZ using JSZip
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // Find the main .kml file inside
    const kmlFiles = Object.keys(zip.files).filter((k) => k.toLowerCase().endsWith('.kml'));
    if (kmlFiles.length === 0) {
      throw new Error('Nenhum arquivo KML encontrado dentro do arquivo KMZ.');
    }
    
    // Prefer doc.kml if exists, else first kml
    const targetKmlName = kmlFiles.find((k) => k.toLowerCase().includes('doc.kml')) || kmlFiles[0];
    const kmlText = await zip.files[targetKmlName].async('text');
    return parseKmlContent(kmlText, fileName);
  } else if (ext === 'kml') {
    const text = await file.text();
    return parseKmlContent(text, fileName);
  } else if (ext === 'geojson' || ext === 'json') {
    const text = await file.text();
    return parseGeoJsonContent(text, fileName);
  } else {
    // Try text parser as fallback
    const text = await file.text();
    if (text.includes('<kml') || text.includes('<Placemark')) {
      return parseKmlContent(text, fileName);
    }
    return parseGeoJsonContent(text, fileName);
  }
}

/**
 * Helper to clean and extract gang name from placemark label
 */
function extractGangName(label: string): string {
  if (!label) return 'Organização Criminosa';
  const match = label.match(/(GANGUE\s+DO\s+[A-Z0-9\s]+|PCC|COMANDO\s+VERMELHO|CV|TERCEIRO\s+COMANDO|TCP|ADA|GANGUE\s+[A-Z0-9\s]+)/i);
  if (match) {
    return match[0].trim();
  }
  return label.split(/[-–—:|]/)[0].trim();
}

/**
 * Point in Polygon check (Ray casting algorithm)
 * Tests if coordinate [lat, lng] is inside the polygon coords [[lat, lng], ...]
 */
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Default sample gang areas for Santa Luzia / 35º BPM (Palmital, São Benedito, Du Valle, etc.)
 */
export const DEFAULT_GANG_AREAS_35BPM: GangAreaZone[] = [
  {
    id: 'zone-palmital-setor-norte',
    name: 'Gangue do Palmital (Setor Alto Palmital / Região Norte)',
    gangName: 'GANGUE DO PALMITAL',
    description: 'Área com intensa disputa territorial e pontos de distribuição de entorpecentes.',
    color: '#ef4444', // Red
    fillOpacity: 0.35,
    strokeWidth: 2.5,
    coordinates: [
      [-19.7645, -43.8640],
      [-19.7620, -43.8560],
      [-19.7675, -43.8510],
      [-19.7720, -43.8550],
      [-19.7705, -43.8635],
      [-19.7645, -43.8640],
    ],
    type: 'Polygon',
    visible: true,
    sourceFile: 'PMMG / 35º BPM Inteligência',
    dangerLevel: 'CRÍTICO',
    rivalGang: 'GANGUE DO MULETA',
    areaKm2: 1.42,
  },
  {
    id: 'zone-muleta-sao-benedito',
    name: 'Gangue do Muleta (Bairro São Benedito / Baronesa)',
    gangName: 'GANGUE DO MULETA',
    description: 'Território controlado pela célula do Muleta. Monitoramento de veículos e olheiros.',
    color: '#f97316', // Orange
    fillOpacity: 0.35,
    strokeWidth: 2.5,
    coordinates: [
      [-19.7740, -43.8720],
      [-19.7690, -43.8660],
      [-19.7755, -43.8610],
      [-19.7820, -43.8680],
      [-19.7790, -43.8740],
      [-19.7740, -43.8720],
    ],
    type: 'Polygon',
    visible: true,
    sourceFile: 'PMMG / 35º BPM Inteligência',
    dangerLevel: 'ALTO',
    rivalGang: 'GANGUE DO PALMITAL',
    areaKm2: 1.15,
  },
  {
    id: 'zone-cv-duvalle',
    name: 'Célula CV / Fracção Du Valle (Eixo Rodoviário)',
    gangName: 'COMANDO VERMELHO - DU VALLE',
    description: 'Armazenamento de armamentos e rotas de fuga com acesso à MG-010 / Av. Brasília.',
    color: '#8b5cf6', // Violet/Purple
    fillOpacity: 0.3,
    strokeWidth: 2.5,
    coordinates: [
      [-19.7560, -43.8780],
      [-19.7520, -43.8690],
      [-19.7580, -43.8650],
      [-19.7630, -43.8730],
      [-19.7560, -43.8780],
    ],
    type: 'Polygon',
    visible: true,
    sourceFile: 'PMMG / 35º BPM Inteligência',
    dangerLevel: 'ALTO',
    areaKm2: 0.98,
  },
  {
    id: 'zone-pcc-centro-historico',
    name: 'Sintonia Geral PCC (Setor Centro / Beco dos Artistas)',
    gangName: 'PRIMEIRO COMANDO DA CAPITAL (PCC)',
    description: 'Célula de cobrança e lavagem de dinheiro em comércios de fachada.',
    color: '#eab308', // Amber/Yellow
    fillOpacity: 0.3,
    strokeWidth: 2.5,
    coordinates: [
      [-19.7680, -43.8480],
      [-19.7640, -43.8410],
      [-19.7710, -43.8370],
      [-19.7760, -43.8440],
      [-19.7680, -43.8480],
    ],
    type: 'Polygon',
    visible: true,
    sourceFile: 'PMMG / 35º BPM Inteligência',
    dangerLevel: 'MÉDIO',
    areaKm2: 0.85,
  },
];
