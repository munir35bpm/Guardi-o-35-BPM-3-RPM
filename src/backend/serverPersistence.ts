import fs from 'fs';
import path from 'path';
import { db } from './db.js';
import {
  fetchInfratores,
  fetchEnderecos,
  fetchOcorrencias,
  fetchGangAreas,
  fetchVinculos,
  fetchInfratorOcorrencias,
  saveInfrator,
  removeInfrator,
  saveEndereco,
  removeEndereco,
  saveOcorrencia,
  removeOcorrencia,
  saveGangArea,
  saveGangAreasBatch,
  removeGangArea,
  fetchOrcrimOrganogramas,
  saveOrcrimOrganograma,
  removeOrcrimOrganograma,
} from '../services/firestoreService.js';
import { DEFAULT_GANG_AREAS_35BPM } from '../utils/kmlGeoJsonParser.js';
import {
  Infrator,
  EnderecoAtuacao,
  OcorrenciaCriminal,
  GangAreaZone,
  InfratorOcorrencia,
  VinculoComparsa,
  CaracteristicasFisicas,
  OrcrimData,
} from '../types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const CACHE_FILE = path.join(DATA_DIR, 'db-persistence.json');

let hasInitialSyncRun = false;

/**
 * Ensures the data directory exists
 */
function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn('Não foi possível criar diretório data:', e);
  }
}

/**
 * Persists current in-memory database to disk JSON file
 */
export function saveDatabaseToDiskCache(): void {
  try {
    ensureDataDir();
    const payload = {
      timestamp: new Date().toISOString(),
      infratores: db.infratores,
      caracteristicas_fisicas: db.caracteristicas_fisicas,
      enderecos_atuacao: db.enderecos_atuacao,
      ocorrencias_criminais: db.ocorrencias_criminais,
      infrator_ocorrencia: db.infrator_ocorrencia,
      vinculos_comparsas: db.vinculos_comparsas,
      gang_areas: db.gang_areas,
      orcrim_organogramas: db.orcrim_organogramas,
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Erro ao salvar cache de banco no disco:', err);
  }
}

/**
 * Loads database from disk JSON file if available
 */
export function loadDatabaseFromDiskCache(): boolean {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.infratores)) {
        db.infratores = data.infratores;
        db.caracteristicas_fisicas = data.caracteristicas_fisicas || [];
        db.enderecos_atuacao = data.enderecos_atuacao || [];
        db.ocorrencias_criminais = data.ocorrencias_criminais || [];
        db.infrator_ocorrencia = data.infrator_ocorrencia || [];
        db.vinculos_comparsas = data.vinculos_comparsas || [];
        if (Array.isArray(data.gang_areas) && data.gang_areas.length > 0) {
          db.gang_areas = data.gang_areas;
        }
        if (Array.isArray(data.orcrim_organogramas) && data.orcrim_organogramas.length > 0) {
          db.orcrim_organogramas = data.orcrim_organogramas;
        }
        console.log(`💾 Banco carregado do cache em disco: ${db.infratores.length} infratores, ${db.orcrim_organogramas.length} ORCRIMs.`);
        return true;
      }
    }
  } catch (err) {
    console.warn('Erro ao ler cache de banco no disco:', err);
  }
  return false;
}

/**
 * Fully synchronizes server database with Firestore (cloud source of truth)
 * and backs up to disk.
 */
export async function syncServerWithFirestore(): Promise<void> {
  // First load from disk cache as immediate base
  loadDatabaseFromDiskCache();

  try {
    console.log('🔄 Sincronizando servidor com Firestore...');
    const [
      firestoreInfratores,
      firestoreEnderecos,
      firestoreOcorrencias,
      firestoreGangAreas,
      firestoreInfratorOcorrencias,
      firestoreVinculos,
      firestoreOrcrim,
    ] = await Promise.all([
      fetchInfratores().catch(() => [] as Infrator[]),
      fetchEnderecos().catch(() => [] as EnderecoAtuacao[]),
      fetchOcorrencias().catch(() => [] as OcorrenciaCriminal[]),
      fetchGangAreas().catch(() => [] as GangAreaZone[]),
      fetchInfratorOcorrencias().catch(() => [] as InfratorOcorrencia[]),
      fetchVinculos().catch(() => [] as VinculoComparsa[]),
      fetchOrcrimOrganogramas().catch(() => [] as OrcrimData[]),
    ]);

    if (firestoreInfratores.length > 0) {
      db.infratores = firestoreInfratores;
      // Rebuild physical characteristics from infratores
      const fisicasList: CaracteristicasFisicas[] = [];
      for (const inf of firestoreInfratores) {
        if ((inf as any).fisicas) {
          fisicasList.push((inf as any).fisicas);
        }
      }
      if (fisicasList.length > 0) {
        db.caracteristicas_fisicas = fisicasList;
      }
      console.log(`✅ ${firestoreInfratores.length} infratores carregados do Firestore.`);
    }

    if (firestoreEnderecos.length > 0) {
      db.enderecos_atuacao = firestoreEnderecos;
      console.log(`✅ ${firestoreEnderecos.length} endereços carregados do Firestore.`);
    }

    if (firestoreOcorrencias.length > 0) {
      db.ocorrencias_criminais = firestoreOcorrencias;
      console.log(`✅ ${firestoreOcorrencias.length} ocorrências carregadas do Firestore.`);
    }

    if (firestoreInfratorOcorrencias.length > 0) {
      db.infrator_ocorrencia = firestoreInfratorOcorrencias;
    }

    if (firestoreVinculos.length > 0) {
      db.vinculos_comparsas = firestoreVinculos;
    }

    if (firestoreGangAreas.length > 0) {
      db.gang_areas = firestoreGangAreas;
      console.log(`✅ ${firestoreGangAreas.length} áreas de gangue carregadas do Firestore.`);
    } else {
      // Seed default gang areas if Firestore was empty
      db.gang_areas = DEFAULT_GANG_AREAS_35BPM;
      saveGangAreasBatch(DEFAULT_GANG_AREAS_35BPM, true).catch(() => null);
      console.log(`📍 Áreas de gangue padrão do 35º BPM inicializadas (${DEFAULT_GANG_AREAS_35BPM.length} zonas).`);
    }

    if (firestoreOrcrim.length > 0) {
      // Merge with any existing ones from disk cache so newly saved ones are never lost
      const mergedMap = new Map<string, OrcrimData>();
      for (const item of db.orcrim_organogramas) {
        const key = item.id || item.gangue_info?.nome_gangue;
        if (key) mergedMap.set(key, item);
      }
      for (const item of firestoreOrcrim) {
        const key = item.id || item.gangue_info?.nome_gangue;
        if (key) mergedMap.set(key, item);
      }
      db.orcrim_organogramas = Array.from(mergedMap.values());
      console.log(`✅ ${db.orcrim_organogramas.length} organogramas ORCRIM carregados e sincronizados.`);
    } else if (db.orcrim_organogramas.length > 0) {
      for (const item of db.orcrim_organogramas) {
        saveOrcrimOrganograma(item).catch(() => null);
      }
    }

    // Persist snapshot to disk
    saveDatabaseToDiskCache();
    hasInitialSyncRun = true;
  } catch (err) {
    console.error('Erro ao sincronizar servidor com Firestore:', err);
    if (db.gang_areas.length === 0) {
      db.gang_areas = DEFAULT_GANG_AREAS_35BPM;
    }
  }
}

/**
 * Middleware or helper to ensure data is loaded before responding
 */
export async function ensureServerDataLoaded(): Promise<void> {
  if (!hasInitialSyncRun || db.infratores.length === 0) {
    await syncServerWithFirestore();
  }
}
