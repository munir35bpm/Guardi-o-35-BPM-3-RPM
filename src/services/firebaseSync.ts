import {
  fetchInfratores,
  saveInfrator,
  removeInfrator,
  fetchEnderecos,
  saveEndereco,
  removeEndereco,
  fetchOcorrencias,
  saveOcorrencia,
  removeOcorrencia,
  fetchVinculos,
  saveVinculo,
  removeVinculo,
  fetchGangAreas,
  saveGangArea,
  saveGangAreasBatch,
  removeGangArea,
  subscribeToDatabase
} from './firestoreService';
import { db } from '../backend/db';
import {
  Infrator,
  EnderecoAtuacao,
  OcorrenciaCriminal,
  VinculoComparsa,
  GangAreaZone,
  SuspectWithDetails
} from '../types';

let isInitialized = false;

/**
 * Initialize and synchronize in-memory database with Firestore.
 * Subscribes to real-time updates so that any changes made are instantly
 * synchronized across tabs, users and persist across page reloads.
 */
export async function initFirebaseSync(onDataChange?: () => void): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  try {
    // 1. Fetch current data from Firestore
    const [infratores, enderecos, ocorrencias, vinculos, gangAreas] = await Promise.all([
      fetchInfratores().catch(() => []),
      fetchEnderecos().catch(() => []),
      fetchOcorrencias().catch(() => []),
      fetchVinculos().catch(() => []),
      fetchGangAreas().catch(() => []),
    ]);

    // Populate local in-memory DB with Firestore data
    if (infratores.length > 0) {
      db.infratores = infratores;
      db.caracteristicas_fisicas = infratores
        .filter((i: any) => i.fisicas)
        .map((i: any) => i.fisicas);
    }
    if (enderecos.length > 0) {
      db.enderecos_atuacao = enderecos;
    }
    if (ocorrencias.length > 0) {
      db.ocorrencias_criminais = ocorrencias;
    }
    if (vinculos.length > 0) {
      db.vinculos_comparsas = vinculos;
    }
    if (gangAreas.length > 0) {
      db.gang_areas = gangAreas;
    }

    if (onDataChange) {
      onDataChange();
    }

    // 2. Setup real-time listeners for live updates
    subscribeToDatabase({
      onInfratoresChange: (list) => {
        if (list && list.length >= 0) {
          db.infratores = list;
          db.caracteristicas_fisicas = list
            .filter((i: any) => i.fisicas)
            .map((i: any) => i.fisicas);
          if (onDataChange) onDataChange();
        }
      },
      onEnderecosChange: (list) => {
        if (list) {
          db.enderecos_atuacao = list;
          if (onDataChange) onDataChange();
        }
      },
      onOcorrenciasChange: (list) => {
        if (list) {
          db.ocorrencias_criminais = list;
          if (onDataChange) onDataChange();
        }
      },
      onGangAreasChange: (list) => {
        if (list && list.length > 0) {
          db.gang_areas = list;
          if (onDataChange) onDataChange();
        }
      }
    });

    console.log('🔥 Firebase Firestore sincronizado com sucesso no 35º BPM Guardião!');
  } catch (error) {
    console.error('Erro na inicialização do Firebase Sync:', error);
  }
}

/**
 * Saves a full suspect (with characteristics, addresses, and occurrences) to Firestore.
 */
export async function persistSuspectToFirebase(suspectFull: SuspectWithDetails): Promise<void> {
  try {
    // 1. Save Infrator doc
    const infratorData: Infrator = {
      id: suspectFull.id,
      nome_completo: suspectFull.nome_completo,
      vulgo: suspectFull.vulgo || '',
      data_nascimento: suspectFull.data_nascimento || '',
      cpf: suspectFull.cpf || '',
      foto_url: suspectFull.foto_url || '',
      gangue_faccao: suspectFull.gangue_faccao || 'Sem facção informada',
      status_mandado_prisao: !!suspectFull.status_mandado_prisao,
      situacao_atual: suspectFull.situacao_atual || suspectFull.situacao_prisional || (suspectFull.status_mandado_prisao ? 'FORAGIDO' : 'EM_LIBERDADE'),
      situacao_prisional: suspectFull.situacao_atual || suspectFull.situacao_prisional || (suspectFull.status_mandado_prisao ? 'FORAGIDO' : 'EM_LIBERDADE'),
      periculosidade: suspectFull.periculosidade || 'Média',
      created_at: suspectFull.created_at || new Date().toISOString(),
    };
    (infratorData as any).fisicas = suspectFull.fisicas;
    await saveInfrator(infratorData);

    // 2. Save associated addresses
    if (suspectFull.enderecos && suspectFull.enderecos.length > 0) {
      for (const addr of suspectFull.enderecos) {
        await saveEndereco(addr);
      }
    }

    // 3. Save associated occurrences
    if (suspectFull.ocorrencias && suspectFull.ocorrencias.length > 0) {
      for (const oc of suspectFull.ocorrencias) {
        await saveOcorrencia(oc);
      }
    }
  } catch (err) {
    console.error('Erro ao persistir infrator no Firestore:', err);
  }
}

/**
 * Deletes a suspect and their associated addresses and links from Firestore.
 */
export async function deleteSuspectFromFirebase(suspectId: string): Promise<void> {
  try {
    await removeInfrator(suspectId);
    
    // Remove related addresses
    const relatedAddrs = db.enderecos_atuacao.filter(a => a.infrator_id === suspectId);
    for (const a of relatedAddrs) {
      await removeEndereco(a.id);
    }
  } catch (err) {
    console.error('Erro ao excluir infrator do Firestore:', err);
  }
}

/**
 * Saves a new address to Firestore.
 */
export async function persistAddressToFirebase(address: EnderecoAtuacao): Promise<void> {
  try {
    await saveEndereco(address);
  } catch (err) {
    console.error('Erro ao persistir endereço no Firestore:', err);
  }
}

/**
 * Removes an address from Firestore.
 */
export async function deleteAddressFromFirebase(addressId: string): Promise<void> {
  try {
    await removeEndereco(addressId);
  } catch (err) {
    console.error('Erro ao excluir endereço do Firestore:', err);
  }
}

/**
 * Saves an occurrence to Firestore.
 */
export async function persistOccurrenceToFirebase(occurrence: OcorrenciaCriminal): Promise<void> {
  try {
    await saveOcorrencia(occurrence);
  } catch (err) {
    console.error('Erro ao persistir ocorrência no Firestore:', err);
  }
}

/**
 * Saves gang areas to Firestore.
 */
export async function persistGangAreasToFirebase(gangAreas: GangAreaZone[], replaceAll = false): Promise<void> {
  try {
    await saveGangAreasBatch(gangAreas, replaceAll);
  } catch (err) {
    console.error('Erro ao persistir áreas de gangues no Firestore:', err);
  }
}
