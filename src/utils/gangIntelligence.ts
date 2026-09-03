import { GangAreaZone, Infrator, EnderecoAtuacao, OcorrenciaCriminal } from '../types';
import { isPointInPolygon } from './kmlGeoJsonParser';
import { db } from '../backend/db';

/**
 * Normaliza strings de nomes de gangue para comparação inteligente
 */
export function normalizeGangName(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrai palavras-chave principais do nome da gangue para cruzamento
 */
function extractGangKeywords(name: string): string[] {
  const normalized = normalizeGangName(name);
  const stopWords = new Set([
    'gangue', 'faccao', 'do', 'da', 'de', 'dos', 'das', 'o', 'a', 'os', 'as',
    'bairro', 'setor', 'vila', 'morro', 'comunidade', 'regiao', 'rival', 'grupo',
    'comando', 'ponto', 'area', 'territorio'
  ]);

  return normalized
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !stopWords.has(w));
}

/**
 * Verifica se um suspeito pertence a uma demarcação de gangue por afiliação ou residência territorial
 */
export function isSuspectInGangZone(
  suspect: Infrator,
  zone: GangAreaZone,
  allAddresses: EnderecoAtuacao[] = []
): boolean {
  if (!suspect || !zone) return false;

  const zoneGangName = normalizeGangName(zone.gangName || zone.name || '');
  const suspectGang = normalizeGangName(suspect.gangue_faccao || '');

  // 1. Afiliação direta
  const isGangValid =
    suspectGang &&
    suspectGang !== 'nenhuma' &&
    suspectGang !== 'sem faccao' &&
    suspectGang !== 'sem gangue' &&
    suspectGang !== 'nao informada' &&
    suspectGang !== 'infratores sem gangue';

  if (isGangValid) {
    if (zoneGangName.includes(suspectGang) || suspectGang.includes(zoneGangName)) {
      return true;
    }

    const keywords = extractGangKeywords(zone.gangName || zone.name || '');
    for (const kw of keywords) {
      if (suspectGang.includes(kw)) {
        return true;
      }
    }
  }

  // 2. Pertencimento territorial espacial (se reside dentro do polígono)
  if (zone.type === 'Polygon' && Array.isArray(zone.coordinates) && zone.coordinates.length >= 3) {
    const suspectAddresses = [
      ...((suspect as any).enderecos || []),
      ...allAddresses.filter((a) => a.infrator_id === suspect.id),
    ];

    for (const addr of suspectAddresses) {
      const lat = addr.geom_ponto?.lat;
      const lng = addr.geom_ponto?.lng;
      if (lat && lng && isPointInPolygon([lat, lng], zone.coordinates)) {
        return true;
      }
    }
  }

  return false;
}

export interface GangIntelligenceData {
  zone: GangAreaZone;
  integrantes: Infrator[];
  residencias: EnderecoAtuacao[];
  ocorrencias: OcorrenciaCriminal[];
  mandadosAtivosCount: number;
}

/**
 * Consolida a inteligência completa de uma gangue para exibição tática
 */
export function getGangIntelligenceDetails(
  zone: GangAreaZone,
  suspectsList: Infrator[] = [],
  addressesList: EnderecoAtuacao[] = [],
  occurrencesList: OcorrenciaCriminal[] = []
): GangIntelligenceData {
  const suspects = suspectsList.length > 0 ? suspectsList : db.infratores || [];
  const addresses = addressesList.length > 0 ? addressesList : db.enderecos_atuacao || [];
  const occurrences = occurrencesList.length > 0 ? occurrencesList : db.ocorrencias_criminais || [];

  // 1. Integrantes
  const integrantes = suspects.filter((s) => isSuspectInGangZone(s, zone, addresses));
  const integranteIds = new Set(integrantes.map((s) => s.id));
  const integranteNomes = integrantes.map((s) => normalizeGangName(s.nome_completo));
  const integranteVulgos = integrantes.map((s) => normalizeGangName(s.vulgo || '')).filter(Boolean);

  const mandadosAtivosCount = integrantes.filter((s) => Boolean(s.status_mandado_prisao)).length;

  // 2. Residências dos integrantes & endereços dentro do território
  const residenciasSeen = new Set<string>();
  const residencias: EnderecoAtuacao[] = [];

  addresses.forEach((addr) => {
    if (!addr.geom_ponto?.lat || !addr.geom_ponto?.lng) return;
    const isMemberAddress = addr.infrator_id && integranteIds.has(addr.infrator_id);
    const isInsideTerritory =
      zone.type === 'Polygon' &&
      Array.isArray(zone.coordinates) &&
      zone.coordinates.length >= 3 &&
      isPointInPolygon([addr.geom_ponto.lat, addr.geom_ponto.lng], zone.coordinates);

    if (isMemberAddress || isInsideTerritory) {
      const key = `${addr.infrator_id || ''}-${addr.logradouro}-${addr.geom_ponto.lat.toFixed(4)}-${addr.geom_ponto.lng.toFixed(4)}`;
      if (!residenciasSeen.has(key)) {
        residenciasSeen.add(key);
        residencias.push(addr);
      }
    }
  });

  // 3. Ocorrências e B.O.s vinculados à gangue ou no território
  const zoneNameNormalized = normalizeGangName(zone.gangName || zone.name || '');
  const zoneKeywords = extractGangKeywords(zone.gangName || zone.name || '');

  const ocorrenciasSeen = new Set<string>();
  const ocorrencias: OcorrenciaCriminal[] = [];

  occurrences.forEach((oc) => {
    const ocId = oc.id || oc.numero_bo;
    if (!ocId || ocorrenciasSeen.has(ocId)) return;

    let isMatch = false;

    // A. Localização geográfica dentro do polígono da gangue
    if (
      oc.geom_crime?.lat &&
      oc.geom_crime?.lng &&
      zone.type === 'Polygon' &&
      Array.isArray(zone.coordinates) &&
      zone.coordinates.length >= 3
    ) {
      if (isPointInPolygon([oc.geom_crime.lat, oc.geom_crime.lng], zone.coordinates)) {
        isMatch = true;
      }
    }

    // B. Envolvidos formais vinculados a membros da gangue
    const envolvidosList = (oc as any).envolvidos;
    if (!isMatch && envolvidosList && Array.isArray(envolvidosList)) {
      for (const env of envolvidosList) {
        if (env.infrator_id && integranteIds.has(env.infrator_id)) {
          isMatch = true;
          break;
        }
        const envNome = normalizeGangName(env.nome || '');
        if (integranteNomes.some((n) => n && (n.includes(envNome) || envNome.includes(n)))) {
          isMatch = true;
          break;
        }
      }
    }

    // C. Tabela de vínculos db.infrator_ocorrencia
    if (!isMatch && db.infrator_ocorrencia && db.infrator_ocorrencia.length > 0) {
      const links = db.infrator_ocorrencia.filter(
        (l) => (l.ocorrencia_id === oc.id || l.ocorrencia_id === oc.numero_bo) && integranteIds.has(l.infrator_id)
      );
      if (links.length > 0) {
        isMatch = true;
      }
    }

    // D. Menção textual à gangue ou aos integrantes no relato/histórico
    if (!isMatch) {
      const fullText = normalizeGangName(
        `${oc.descricao_fato || ''} ${oc.modus_operandi || ''} ${(oc as any).historico || ''} ${oc.tipificacao_penal || ''}`
      );
      if (zoneNameNormalized && fullText.includes(zoneNameNormalized)) {
        isMatch = true;
      } else if (zoneKeywords.some((kw) => fullText.includes(kw))) {
        isMatch = true;
      } else if (
        integranteVulgos.some((v) => v.length >= 3 && fullText.includes(v)) ||
        integranteNomes.some((n) => n.length >= 4 && fullText.includes(n))
      ) {
        isMatch = true;
      }
    }

    if (isMatch) {
      ocorrenciasSeen.add(ocId);
      ocorrencias.push(oc);
    }
  });

  return {
    zone,
    integrantes,
    residencias,
    ocorrencias,
    mandadosAtivosCount,
  };
}
