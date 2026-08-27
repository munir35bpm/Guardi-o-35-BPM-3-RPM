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

/**
 * Helper to deduplicate addresses and return unique list plus redundant IDs to clean up in Firestore
 */
export function deduplicateAddresses(list: EnderecoAtuacao[]): { unique: EnderecoAtuacao[]; duplicatesToDelete: string[] } {
  const seen = new Map<string, string>();
  const unique: EnderecoAtuacao[] = [];
  const duplicatesToDelete: string[] = [];

  for (const addr of list) {
    if (!addr) continue;
    const lat = Number(addr.geom_ponto?.lat || 0).toFixed(4);
    const lng = Number(addr.geom_ponto?.lng || 0).toFixed(4);
    const logr = (addr.logradouro || '').toLowerCase().trim();
    const tipo = (addr.tipo_endereco || 'Residência').toLowerCase().trim();
    const infId = addr.infrator_id || '';
    const key = `${infId}|${tipo}|${logr}|${lat}|${lng}`;

    if (seen.has(key)) {
      if (addr.id) {
        duplicatesToDelete.push(addr.id);
      }
    } else {
      if (addr.id) {
        seen.set(key, addr.id);
      }
      unique.push(addr);
    }
  }

  return { unique, duplicatesToDelete };
}

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
    } else {
      db.infratores = [];
      db.caracteristicas_fisicas = [];
    }

    // Filter and clean orphaned addresses (addresses for suspects that were deleted)
    const validSuspectIds = new Set((infratores || []).map((i: any) => i.id));
    const activeEnderecos = (enderecos || []).filter((addr: EnderecoAtuacao) => {
      if (!addr) return false;
      // If the address belongs to a specific infrator, verify that infrator exists
      if (addr.infrator_id) {
        return validSuspectIds.has(addr.infrator_id);
      }
      return false; // Do not keep anonymous/detached residency pins
    });

    // Clean up orphaned address records from Firestore
    const orphanedAddrs = (enderecos || []).filter((addr: EnderecoAtuacao) => {
      if (!addr || !addr.id) return false;
      return !addr.infrator_id || !validSuspectIds.has(addr.infrator_id);
    });
    if (orphanedAddrs.length > 0) {
      console.log(`🧹 [Firestore] Removendo ${orphanedAddrs.length} endereços residenciais de infratores excluídos...`);
      for (const orphan of orphanedAddrs) {
        if (orphan.id) {
          removeEndereco(orphan.id).catch(() => null);
        }
      }
    }

    const { unique, duplicatesToDelete } = deduplicateAddresses(activeEnderecos);
    db.enderecos_atuacao = unique;
    if (duplicatesToDelete.length > 0) {
      for (const dupId of duplicatesToDelete) {
        removeEndereco(dupId).catch(() => null);
      }
    }

    if (ocorrencias.length > 0) {
      db.ocorrencias_criminais = ocorrencias;
    } else {
      db.ocorrencias_criminais = [];
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
        if (list) {
          db.infratores = list;
          db.caracteristicas_fisicas = list
            .filter((i: any) => i.fisicas)
            .map((i: any) => i.fisicas);
          
          // Re-validate addresses against active suspects
          const currentValidIds = new Set(list.map((i: any) => i.id));
          db.enderecos_atuacao = db.enderecos_atuacao.filter(
            (a) => a.infrator_id && currentValidIds.has(a.infrator_id)
          );
          if (onDataChange) onDataChange();
        }
      },
      onEnderecosChange: (list) => {
        if (list) {
          const currentValidIds = new Set(db.infratores.map((i: any) => i.id));
          const validList = list.filter(
            (addr) => addr.infrator_id && currentValidIds.has(addr.infrator_id)
          );
          const { unique, duplicatesToDelete } = deduplicateAddresses(validList);
          db.enderecos_atuacao = unique;
          if (duplicatesToDelete.length > 0) {
            for (const dupId of duplicatesToDelete) {
              removeEndereco(dupId).catch(() => null);
            }
          }
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
      galeria_fotos: suspectFull.galeria_fotos || [],
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
        await saveEndereco({
          ...addr,
          infrator_nome: addr.infrator_nome || suspectFull.nome_completo,
          infrator_vulgo: addr.infrator_vulgo || suspectFull.vulgo
        });
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
export async function deleteSuspectFromFirebase(suspectId: string, addressIds?: string[]): Promise<void> {
  try {
    await removeInfrator(suspectId);
    
    // 1. Fetch current addresses directly from Firestore to ensure no orphans remain
    const firestoreAddrs = await fetchEnderecos().catch(() => []);
    const toDelete = firestoreAddrs.filter(
      (a) => a.infrator_id === suspectId || (addressIds && addressIds.includes(a.id))
    );
    for (const a of toDelete) {
      if (a.id) {
        await removeEndereco(a.id);
      }
    }

    // 2. Also remove any provided addressIds directly
    if (addressIds && addressIds.length > 0) {
      for (const aId of addressIds) {
        await removeEndereco(aId);
      }
    }

    // 3. Clean local memory state
    db.enderecos_atuacao = db.enderecos_atuacao.filter(
      (a) => a.infrator_id !== suspectId && (!addressIds || !addressIds.includes(a.id))
    );
  } catch (err) {
    console.error('Erro ao excluir infrator e endereços do Firestore:', err);
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
 * Removes an occurrence from Firestore.
 */
export async function deleteOccurrenceFromFirebase(occurrenceId: string, numeroBo?: string): Promise<void> {
  try {
    await removeOcorrencia(occurrenceId);
    if (numeroBo) {
      const allOcs = await fetchOcorrencias().catch(() => []);
      const matches = allOcs.filter((o) => o.numero_bo === numeroBo && o.id !== occurrenceId);
      for (const m of matches) {
        if (m.id) {
          await removeOcorrencia(m.id);
        }
      }
    }
    db.ocorrencias_criminais = db.ocorrencias_criminais.filter(
      (o) => o.id !== occurrenceId && (!numeroBo || o.numero_bo !== numeroBo)
    );
  } catch (err) {
    console.error('Erro ao excluir ocorrência do Firestore:', err);
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
