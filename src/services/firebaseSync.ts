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
  fetchInfratorOcorrencias,
  saveInfratorOcorrencia,
  removeInfratorOcorrencia,
  removeInfratorOcorrenciasByInfrator,
  removeInfratorOcorrenciasByOcorrencia,
  fetchGangAreas,
  saveGangArea,
  saveGangAreasBatch,
  removeGangArea,
  fetchOrcrimOrganogramas,
  saveOrcrimOrganograma,
  removeOrcrimOrganograma,
  subscribeToDatabase
} from './firestoreService';
import { db } from '../backend/db';
import {
  Infrator,
  EnderecoAtuacao,
  OcorrenciaCriminal,
  VinculoComparsa,
  GangAreaZone,
  SuspectWithDetails,
  InfratorOcorrencia,
  OrcrimData
} from '../types';
import { DEFAULT_GANG_AREAS_35BPM } from '../utils/kmlGeoJsonParser';

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
    const [infratores, enderecos, ocorrencias, vinculos, gangAreas, infratorOcorrencias, orcrimList] = await Promise.all([
      fetchInfratores().catch(() => []),
      fetchEnderecos().catch(() => []),
      fetchOcorrencias().catch(() => []),
      fetchVinculos().catch(() => []),
      fetchGangAreas().catch(() => []),
      fetchInfratorOcorrencias().catch(() => []),
      fetchOrcrimOrganogramas().catch(() => []),
    ]);

    // Populate local in-memory DB with Firestore data
    if (infratores.length > 0) {
      db.infratores = infratores;
      db.caracteristicas_fisicas = infratores
        .filter((i: any) => i.fisicas)
        .map((i: any) => i.fisicas);
    }

    // Filter and clean orphaned addresses (addresses for suspects that were deleted)
    const validSuspectIds = new Set((infratores || []).map((i: any) => i.id));
    const activeEnderecos = (enderecos || []).filter((addr: EnderecoAtuacao) => {
      if (!addr) return false;
      if (addr.infrator_id) {
        return validSuspectIds.has(addr.infrator_id);
      }
      return false;
    });

    // Clean up orphaned address records from Firestore
    const orphanedAddrs = (enderecos || []).filter((addr: EnderecoAtuacao) => {
      if (!addr || !addr.id) return false;
      return !addr.infrator_id || !validSuspectIds.has(addr.infrator_id);
    });
    if (orphanedAddrs.length > 0) {
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

    // Occurrences
    const ocMap = new Map<string, OcorrenciaCriminal>();
    for (const oc of ocorrencias) {
      if (oc && oc.id) {
        ocMap.set(oc.id, oc);
      }
    }

    // Infrator-Ocorrencia links
    const linkList: InfratorOcorrencia[] = [...infratorOcorrencias];

    // For any infrator with embedded ocorrencias, sync them into occurrence and link state
    for (const inf of infratores) {
      const embeddedOcs = (inf as any).ocorrencias;
      if (Array.isArray(embeddedOcs) && embeddedOcs.length > 0) {
        for (const emb of embeddedOcs) {
          if (!emb) continue;
          const ocId = emb.id || `oc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          if (!ocMap.has(ocId)) {
            const newOc: OcorrenciaCriminal = {
              id: ocId,
              numero_bo: emb.numero_bo || 'S/N',
              data_hora: emb.data_hora || new Date().toISOString(),
              tipificacao_penal: emb.tipificacao_penal || 'Não informada',
              descricao_fato: emb.descricao_fato || '',
              modus_operandi: emb.modus_operandi || '',
              armas_utilizadas: emb.armas_utilizadas || '',
              veiculo_utilizado: emb.veiculo_utilizado || '',
              geom_crime: emb.geom_crime || {
                lat: emb.lat !== undefined ? Number(emb.lat) : -19.7712,
                lng: emb.lng !== undefined ? Number(emb.lng) : -43.8564,
              }
            };
            ocMap.set(ocId, newOc);
            // Save to firestore in background
            saveOcorrencia(newOc).catch(() => null);
          }

          const alreadyLinked = linkList.some(
            (l) => l.infrator_id === inf.id && (l.ocorrencia_id === ocId || l.ocorrencia_id === emb.numero_bo)
          );
          if (!alreadyLinked) {
            const newLink: InfratorOcorrencia = {
              infrator_id: inf.id,
              ocorrencia_id: ocId,
              papel_no_crime: emb.papel || emb.papel_no_crime || 'Autor',
            };
            linkList.push(newLink);
            saveInfratorOcorrencia(inf.id, ocId, newLink.papel_no_crime).catch(() => null);
          }
        }
      }
    }

    db.ocorrencias_criminais = Array.from(ocMap.values());
    db.infrator_ocorrencia = linkList;

    if (vinculos.length > 0) {
      db.vinculos_comparsas = vinculos;
    }
    if (gangAreas.length > 0) {
      db.gang_areas = gangAreas;
    } else if (db.gang_areas.length === 0) {
      db.gang_areas = DEFAULT_GANG_AREAS_35BPM;
    }

    // Populate ORCRIM Organograms
    if (orcrimList && orcrimList.length > 0) {
      db.orcrim_organogramas = orcrimList;
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('guardiao_orcrim_cache', JSON.stringify(orcrimList));
        } catch (e) {
          // ignore storage quota
        }
      }
    } else {
      // If Firestore is empty, check if local storage or memory has cached organograms, and sync to Firestore
      let localOrcrim: OrcrimData[] = [];
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const cached = window.localStorage.getItem('guardiao_orcrim_cache');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              localOrcrim = parsed;
            }
          }
        } catch (e) {}
      }
      if (localOrcrim.length === 0 && db.orcrim_organogramas && db.orcrim_organogramas.length > 0) {
        localOrcrim = db.orcrim_organogramas;
      }
      if (localOrcrim.length > 0) {
        db.orcrim_organogramas = localOrcrim;
        for (const item of localOrcrim) {
          saveOrcrimOrganograma(item).catch(() => null);
        }
      }
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

          // Also check embedded occurrences from incoming snapshot
          for (const inf of list) {
            const embedded = (inf as any).ocorrencias;
            if (Array.isArray(embedded) && embedded.length > 0) {
              for (const emb of embedded) {
                if (!emb) continue;
                const ocId = emb.id;
                if (ocId && !db.ocorrencias_criminais.some((o) => o.id === ocId)) {
                  db.ocorrencias_criminais.push({
                    id: ocId,
                    numero_bo: emb.numero_bo || 'S/N',
                    data_hora: emb.data_hora || new Date().toISOString(),
                    tipificacao_penal: emb.tipificacao_penal || 'Não informada',
                    descricao_fato: emb.descricao_fato || '',
                    modus_operandi: emb.modus_operandi || '',
                    armas_utilizadas: emb.armas_utilizadas || '',
                    veiculo_utilizado: emb.veiculo_utilizado || '',
                    geom_crime: emb.geom_crime || {
                      lat: emb.lat !== undefined ? Number(emb.lat) : -19.7712,
                      lng: emb.lng !== undefined ? Number(emb.lng) : -43.8564,
                    }
                  });
                }
                if (ocId && !db.infrator_ocorrencia.some((l) => l.infrator_id === inf.id && l.ocorrencia_id === ocId)) {
                  db.linkInfratorOcorrencia(inf.id, ocId, emb.papel || emb.papel_no_crime || 'Autor');
                }
              }
            }
          }

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
      onInfratorOcorrenciasChange: (list) => {
        if (list) {
          db.infrator_ocorrencia = list;
          if (onDataChange) onDataChange();
        }
      },
      onGangAreasChange: (list) => {
        if (list && list.length > 0) {
          db.gang_areas = list;
          if (onDataChange) onDataChange();
        }
      },
      onOrcrimChange: (list) => {
        if (list && list.length > 0) {
          db.orcrim_organogramas = list;
          if (typeof window !== 'undefined' && window.localStorage) {
            try {
              window.localStorage.setItem('guardiao_orcrim_cache', JSON.stringify(list));
            } catch (e) {}
          }
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
  if (!suspectFull || !suspectFull.id) return;
  try {
    // Normalize occurrences
    const normalizedOccurrences = (suspectFull.ocorrencias || []).map((oc: any, idx: number) => ({
      id: oc.id || `oc-${Date.now()}-${idx}`,
      numero_bo: (oc.numero_bo || 'S/N').trim(),
      data_hora: oc.data_hora || new Date().toISOString(),
      tipificacao_penal: (oc.tipificacao_penal || 'Não informada').trim(),
      descricao_fato: oc.descricao_fato || '',
      modus_operandi: oc.modus_operandi || '',
      armas_utilizadas: oc.armas_utilizadas || '',
      veiculo_utilizado: oc.veiculo_utilizado || '',
      papel: oc.papel || oc.papel_no_crime || 'Autor',
      geom_crime: {
        lat: oc.geom_crime?.lat !== undefined ? Number(oc.geom_crime.lat) : (oc.lat !== undefined ? Number(oc.lat) : -19.7712),
        lng: oc.geom_crime?.lng !== undefined ? Number(oc.geom_crime.lng) : (oc.lng !== undefined ? Number(oc.lng) : -43.8564)
      }
    }));

    // 1. Save Infrator doc (with embedded occurrences for instantaneous single-document retrieval)
    const infratorData: Infrator & { fisicas?: any; enderecos?: any; ocorrencias?: any } = {
      id: suspectFull.id,
      nome_completo: suspectFull.nome_completo || 'Infrator',
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
      ocorrencias: normalizedOccurrences,
    };
    if (suspectFull.fisicas) {
      infratorData.fisicas = suspectFull.fisicas;
    }
    await saveInfrator(infratorData);

    // 2. Save associated addresses
    if (suspectFull.enderecos && suspectFull.enderecos.length > 0) {
      for (const addr of suspectFull.enderecos) {
        if (!addr) continue;
        const anyAddr = addr as any;
        const endId = addr.id || `end-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await saveEndereco({
          ...addr,
          id: endId,
          infrator_id: addr.infrator_id || suspectFull.id,
          infrator_nome: addr.infrator_nome || suspectFull.nome_completo,
          infrator_vulgo: addr.infrator_vulgo || suspectFull.vulgo,
          tipo_endereco: addr.tipo_endereco || 'Residência',
          logradouro: addr.logradouro || 'Não informado',
          bairro: addr.bairro || 'Centro',
          cidade: addr.cidade || 'Santa Luzia',
          raio_influencia_km: Number(addr.raio_influencia_km) || 2.5,
          geom_ponto: {
            lat: addr.geom_ponto?.lat !== undefined ? Number(addr.geom_ponto.lat) : (anyAddr.lat !== undefined ? Number(anyAddr.lat) : -19.7712),
            lng: addr.geom_ponto?.lng !== undefined ? Number(addr.geom_ponto.lng) : (anyAddr.lng !== undefined ? Number(anyAddr.lng) : -43.8564)
          }
        });
      }
    }

    // 3. Save associated occurrences and linkages to collections
    for (const oc of normalizedOccurrences) {
      const ocObj: OcorrenciaCriminal = {
        id: oc.id,
        numero_bo: oc.numero_bo,
        data_hora: oc.data_hora,
        tipificacao_penal: oc.tipificacao_penal,
        descricao_fato: oc.descricao_fato,
        modus_operandi: oc.modus_operandi,
        armas_utilizadas: oc.armas_utilizadas,
        veiculo_utilizado: oc.veiculo_utilizado,
        geom_crime: oc.geom_crime
      };
      await saveOcorrencia(ocObj);
      await saveInfratorOcorrencia(suspectFull.id, oc.id, oc.papel);
      db.linkInfratorOcorrencia(suspectFull.id, oc.id, oc.papel);
      if (!db.ocorrencias_criminais.some((o) => o.id === oc.id)) {
        db.ocorrencias_criminais.push(ocObj);
      }
    }
  } catch (err) {
    console.error('Erro ao persistir infrator no Firestore:', err);
  }
}

/**
 * Links or creates an occurrence directly linked to a suspect and saves everything to Firestore.
 */
export async function linkOccurrenceToSuspectInFirebase(
  infratorId: string,
  occurrenceData: Partial<OcorrenciaCriminal> & { papel_no_crime?: string; papel?: string; lat?: string | number; lng?: string | number }
): Promise<SuspectWithDetails | null> {
  try {
    const ocId = occurrenceData.id || `oc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const papel = occurrenceData.papel_no_crime || occurrenceData.papel || 'Autor';

    const ocObj: OcorrenciaCriminal = {
      id: ocId,
      numero_bo: (occurrenceData.numero_bo || 'S/N').trim(),
      data_hora: occurrenceData.data_hora || new Date().toISOString(),
      tipificacao_penal: (occurrenceData.tipificacao_penal || 'Roubo / Ocorrência').trim(),
      descricao_fato: occurrenceData.descricao_fato || '',
      modus_operandi: occurrenceData.modus_operandi || '',
      armas_utilizadas: occurrenceData.armas_utilizadas || '',
      veiculo_utilizado: occurrenceData.veiculo_utilizado || '',
      geom_crime: {
        lat: occurrenceData.geom_crime?.lat !== undefined ? Number(occurrenceData.geom_crime.lat) : (occurrenceData.lat !== undefined ? Number(occurrenceData.lat) : -19.7712),
        lng: occurrenceData.geom_crime?.lng !== undefined ? Number(occurrenceData.geom_crime.lng) : (occurrenceData.lng !== undefined ? Number(occurrenceData.lng) : -43.8564),
      }
    };

    // 1. Save occurrence to Firestore
    await saveOcorrencia(ocObj);

    // 2. Save link to Firestore
    await saveInfratorOcorrencia(infratorId, ocId, papel);

    // 3. Update in-memory DB
    const existingOcIdx = db.ocorrencias_criminais.findIndex((o) => o.id === ocId);
    if (existingOcIdx >= 0) {
      db.ocorrencias_criminais[existingOcIdx] = ocObj;
    } else {
      db.ocorrencias_criminais.unshift(ocObj);
    }
    db.linkInfratorOcorrencia(infratorId, ocId, papel);

    // 4. Update full suspect in Firestore
    const fullSuspect = db.getInfratorFull(infratorId);
    if (fullSuspect) {
      await persistSuspectToFirebase(fullSuspect);
    }

    return fullSuspect;
  } catch (err) {
    console.error('Erro ao vincular ocorrência ao infrator no Firebase:', err);
    throw err;
  }
}

/**
 * Unlinks an occurrence from a suspect in Firestore.
 */
export async function unlinkOccurrenceFromSuspectInFirebase(
  infratorId: string,
  ocorrenciaId: string,
  numeroBo?: string
): Promise<SuspectWithDetails | null> {
  try {
    const oc = db.ocorrencias_criminais.find((o) => o.id === ocorrenciaId || o.numero_bo === ocorrenciaId);
    const targetBo = numeroBo || oc?.numero_bo;
    const targetId = oc?.id || ocorrenciaId;

    // 1. Remove link from Firestore
    await removeInfratorOcorrencia(infratorId, targetId, targetBo);

    // 2. Update local db
    db.unlinkInfratorOcorrencia(infratorId, targetId);

    // 3. Update full suspect in Firestore
    const fullSuspect = db.getInfratorFull(infratorId);
    if (fullSuspect) {
      await persistSuspectToFirebase(fullSuspect);
    }

    return fullSuspect;
  } catch (err) {
    console.error('Erro ao desvincular ocorrência do infrator no Firebase:', err);
    throw err;
  }
}

/**
 * Deletes a suspect and their associated addresses and links from Firestore.
 */
export async function deleteSuspectFromFirebase(suspectId: string, addressIds?: string[]): Promise<void> {
  try {
    await removeInfrator(suspectId);
    await removeInfratorOcorrenciasByInfrator(suspectId);
    
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
    db.deleteInfrator(suspectId);
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
    const oc = db.ocorrencias_criminais.find((o) => o.id === occurrenceId || o.numero_bo === occurrenceId);
    const targetBo = numeroBo || oc?.numero_bo;
    const targetId = oc?.id || occurrenceId;

    // 1. Instantly delete from local memory DB
    db.deleteOcorrencia(targetId);

    // 2. Perform Firestore cleanup with timeout protection so it never hangs
    const firestoreCleanup = async () => {
      // Remove occurrence document
      await removeOcorrencia(targetId, targetBo).catch(() => null);
      // Remove relation documents
      await removeInfratorOcorrenciasByOcorrencia(targetId, targetBo).catch(() => null);

      // Only update suspects that were actually linked to this occurrence
      const currentInfratores = db.infratores;
      const affectedSuspects = currentInfratores.filter((inf) => {
        const ocs = (inf as any).ocorrencias;
        return Array.isArray(ocs) && ocs.some(
          (o: any) => o && (o.id === targetId || o.id === occurrenceId || (targetBo && o.numero_bo === targetBo))
        );
      });

      for (const inf of affectedSuspects) {
        const full = db.getInfratorFull(inf.id);
        if (full) {
          await saveInfrator({
            id: full.id,
            nome_completo: full.nome_completo,
            vulgo: full.vulgo,
            foto_url: full.foto_url,
            galeria_fotos: full.galeria_fotos || [],
            gangue_faccao: full.gangue_faccao,
            status_mandado_prisao: !!full.status_mandado_prisao,
            situacao_atual: full.situacao_atual || full.situacao_prisional,
            situacao_prisional: full.situacao_atual || full.situacao_prisional,
            periculosidade: full.periculosidade,
            created_at: full.created_at,
            ocorrencias: full.ocorrencias || [],
            fisicas: full.fisicas,
          } as any).catch(() => null);
        }
      }
    };

    await Promise.race([
      firestoreCleanup(),
      new Promise<void>((resolve) => setTimeout(resolve, 4000)),
    ]);
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

/**
 * Saves or updates an ORCRIM organogram in Firestore, local database and localStorage.
 */
export async function persistOrcrimToFirebase(orcrim: OrcrimData): Promise<void> {
  if (!orcrim || !orcrim.gangue_info) return;
  try {
    // 1. Immediately update in-memory DB
    db.saveOrcrim(orcrim);

    // 2. Immediately cache to localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('guardiao_orcrim_cache', JSON.stringify(db.orcrim_organogramas));
        if (orcrim.id) {
          window.localStorage.setItem('guardiao_last_selected_orcrim', orcrim.id);
        }
      } catch (e) {}
    }

    // 3. Persist to Firestore
    await saveOrcrimOrganograma(orcrim);
  } catch (err) {
    console.error('Erro ao persistir organograma ORCRIM no Firestore:', err);
  }
}

/**
 * Removes an ORCRIM organogram from Firestore, local database and localStorage.
 */
export async function deleteOrcrimFromFirebase(orcrimId: string): Promise<void> {
  if (!orcrimId) return;
  try {
    // 1. Immediately remove from in-memory DB
    db.deleteOrcrim(orcrimId);

    // 2. Immediately update localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('guardiao_orcrim_cache', JSON.stringify(db.orcrim_organogramas));
        const lastSelected = window.localStorage.getItem('guardiao_last_selected_orcrim');
        if (lastSelected === orcrimId) {
          window.localStorage.removeItem('guardiao_last_selected_orcrim');
        }
      } catch (e) {}
    }

    // 3. Remove from Firestore
    await removeOrcrimOrganograma(orcrimId);
  } catch (err) {
    console.error('Erro ao excluir organograma ORCRIM do Firestore:', err);
  }
}


