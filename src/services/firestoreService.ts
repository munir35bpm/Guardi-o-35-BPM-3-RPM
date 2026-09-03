import {
  firestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from '../lib/firebase';
import {
  Infrator,
  EnderecoAtuacao,
  OcorrenciaCriminal,
  InfratorOcorrencia,
  VinculoComparsa,
  GangAreaZone
} from '../types';
import { db } from '../backend/db';

// Firestore Collection Names
export const COLLECTIONS = {
  INFRATORES: 'infratores',
  ENDERECOS: 'enderecos_atuacao',
  OCORRENCIAS: 'ocorrencias_criminais',
  VINCULOS_CRIMES: 'infrator_ocorrencia',
  VINCULOS_COMPARSAS: 'vinculos_comparsas',
  GANG_AREAS: 'gang_areas',
};

// Helper to recursively remove undefined fields and convert invalid structures for Firestore
export function sanitizeForFirestore(obj: any): any {
  if (obj === undefined || obj === null) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item));
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned;
  }
  return obj;
}

// ==========================================
// INFRATORES CRUD
// ==========================================

export async function fetchInfratores(): Promise<Infrator[]> {
  try {
    const colRef = collection(firestore, COLLECTIONS.INFRATORES);
    const snapshot = await getDocs(colRef);
    const list: Infrator[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Infrator);
    });
    return list;
  } catch (error) {
    console.error('Erro ao buscar infratores do Firestore:', error);
    return [];
  }
}

export async function saveInfrator(infrator: Infrator | (Partial<Infrator> & { id: string; [key: string]: any })): Promise<void> {
  try {
    const docRef = doc(firestore, COLLECTIONS.INFRATORES, infrator.id);
    const sanitized = sanitizeForFirestore(infrator);
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    console.warn('Erro ao salvar infrator no Firestore (persistido localmente):', err);
  }
}

export async function removeInfrator(id: string): Promise<void> {
  try {
    const docRef = doc(firestore, COLLECTIONS.INFRATORES, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Erro ao remover infrator do Firestore:', err);
  }
}

// ==========================================
// ENDEREÇOS DE ATUAÇÃO CRUD
// ==========================================

export async function fetchEnderecos(): Promise<EnderecoAtuacao[]> {
  try {
    const colRef = collection(firestore, COLLECTIONS.ENDERECOS);
    const snapshot = await getDocs(colRef);
    const list: EnderecoAtuacao[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as EnderecoAtuacao);
    });
    return list;
  } catch (error) {
    console.error('Erro ao buscar endereços do Firestore:', error);
    return [];
  }
}

export async function saveEndereco(endereco: EnderecoAtuacao): Promise<void> {
  try {
    const docRef = doc(firestore, COLLECTIONS.ENDERECOS, endereco.id);
    const sanitized = sanitizeForFirestore(endereco);
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    console.warn('Erro ao salvar endereço no Firestore:', err);
  }
}

export async function removeEndereco(id: string): Promise<void> {
  try {
    const docRef = doc(firestore, COLLECTIONS.ENDERECOS, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Erro ao remover endereço do Firestore:', err);
  }
}

// ==========================================
// OCORRÊNCIAS / BO CRUD
// ==========================================

export async function fetchOcorrencias(): Promise<OcorrenciaCriminal[]> {
  try {
    const colRef = collection(firestore, COLLECTIONS.OCORRENCIAS);
    const snapshot = await getDocs(colRef);
    const list: OcorrenciaCriminal[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as OcorrenciaCriminal);
    });
    return list;
  } catch (error) {
    console.error('Erro ao buscar ocorrências do Firestore:', error);
    return [];
  }
}

export async function saveOcorrencia(ocorrencia: OcorrenciaCriminal): Promise<void> {
  const docRef = doc(firestore, COLLECTIONS.OCORRENCIAS, ocorrencia.id);
  const sanitized = sanitizeForFirestore(ocorrencia);
  await setDoc(docRef, sanitized, { merge: true });
}

export async function removeOcorrencia(id: string, numero_bo?: string): Promise<void> {
  try {
    const docRef = doc(firestore, COLLECTIONS.OCORRENCIAS, id);
    await deleteDoc(docRef).catch(() => null);

    if (numero_bo && numero_bo !== id) {
      const boDocRef = doc(firestore, COLLECTIONS.OCORRENCIAS, numero_bo);
      await deleteDoc(boDocRef).catch(() => null);
    }

    // Double check collection to delete any docs matching id or numero_bo
    const colRef = collection(firestore, COLLECTIONS.OCORRENCIAS);
    const snapshot = await getDocs(colRef).catch(() => null);
    if (snapshot) {
      const promises: Promise<void>[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as OcorrenciaCriminal;
        if (
          docSnap.id === id ||
          (numero_bo && docSnap.id === numero_bo) ||
          (d && d.id === id) ||
          (numero_bo && d && d.numero_bo === numero_bo)
        ) {
          promises.push(deleteDoc(doc(firestore, COLLECTIONS.OCORRENCIAS, docSnap.id)).catch(() => {}));
        }
      });
      await Promise.all(promises);
    }
  } catch (err) {
    console.warn('Erro ao remover ocorrência do Firestore:', err);
  }
}

// ==========================================
// VÍNCULOS DE INFRATOR COM OCORRÊNCIAS / BO
// ==========================================

export async function fetchInfratorOcorrencias(): Promise<InfratorOcorrencia[]> {
  try {
    const colRef = collection(firestore, COLLECTIONS.VINCULOS_CRIMES);
    const snapshot = await getDocs(colRef);
    const list: InfratorOcorrencia[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as InfratorOcorrencia);
    });
    return list;
  } catch (error) {
    console.error('Erro ao buscar vínculos infrator-ocorrência do Firestore:', error);
    return [];
  }
}

export async function saveInfratorOcorrencia(
  infrator_id: string,
  ocorrencia_id: string,
  papel_no_crime: string = 'Autor'
): Promise<void> {
  const id = `${infrator_id}_${ocorrencia_id}`;
  const docRef = doc(firestore, COLLECTIONS.VINCULOS_CRIMES, id);
  const data: InfratorOcorrencia = {
    infrator_id,
    ocorrencia_id,
    papel_no_crime: papel_no_crime || 'Autor',
  };
  const sanitized = sanitizeForFirestore(data);
  await setDoc(docRef, sanitized, { merge: true });
}

export async function removeInfratorOcorrencia(
  infrator_id: string,
  ocorrencia_id: string,
  numero_bo?: string
): Promise<void> {
  try {
    const id = `${infrator_id}_${ocorrencia_id}`;
    await deleteDoc(doc(firestore, COLLECTIONS.VINCULOS_CRIMES, id)).catch(() => null);

    if (numero_bo && numero_bo !== ocorrencia_id) {
      const boLinkKey = `${infrator_id}_${numero_bo}`;
      await deleteDoc(doc(firestore, COLLECTIONS.VINCULOS_CRIMES, boLinkKey)).catch(() => null);
    }

    const colRef = collection(firestore, COLLECTIONS.VINCULOS_CRIMES);
    const snapshot = await getDocs(colRef).catch(() => null);
    if (snapshot) {
      const promises: Promise<void>[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as InfratorOcorrencia;
        if (
          d.infrator_id === infrator_id &&
          (d.ocorrencia_id === ocorrencia_id || (numero_bo && d.ocorrencia_id === numero_bo))
        ) {
          promises.push(deleteDoc(doc(firestore, COLLECTIONS.VINCULOS_CRIMES, docSnap.id)).catch(() => {}));
        }
      });
      await Promise.all(promises);
    }
  } catch (err) {
    console.warn('Erro ao remover vínculo infrator-ocorrência do Firestore:', err);
  }
}

export async function removeInfratorOcorrenciasByInfrator(infrator_id: string): Promise<void> {
  try {
    const colRef = collection(firestore, COLLECTIONS.VINCULOS_CRIMES);
    const getDocsPromise = getDocs(colRef).catch(() => null);
    const snapshot = await Promise.race([
      getDocsPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
    ]);
    if (snapshot) {
      const promises: Promise<void>[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as InfratorOcorrencia;
        if (d.infrator_id === infrator_id) {
          promises.push(deleteDoc(doc(firestore, COLLECTIONS.VINCULOS_CRIMES, docSnap.id)).catch(() => {}));
        }
      });
      await Promise.all(promises);
    }
  } catch (err) {
    console.warn('Erro ao remover vínculos do infrator:', err);
  }
}

export async function removeInfratorOcorrenciasByOcorrencia(
  ocorrencia_id: string,
  numero_bo?: string
): Promise<void> {
  try {
    const colRef = collection(firestore, COLLECTIONS.VINCULOS_CRIMES);
    const getDocsPromise = getDocs(colRef).catch(() => null);
    const snapshot = await Promise.race([
      getDocsPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
    ]);
    if (snapshot) {
      const promises: Promise<void>[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as InfratorOcorrencia;
        if (
          d.ocorrencia_id === ocorrencia_id ||
          (numero_bo && d.ocorrencia_id === numero_bo) ||
          (docSnap.id && docSnap.id.endsWith(`_${ocorrencia_id}`)) ||
          (numero_bo && docSnap.id && docSnap.id.endsWith(`_${numero_bo}`))
        ) {
          promises.push(deleteDoc(doc(firestore, COLLECTIONS.VINCULOS_CRIMES, docSnap.id)).catch(() => {}));
        }
      });
      await Promise.all(promises);
    }
  } catch (err) {
    console.warn('Erro ao remover vínculos da ocorrência:', err);
  }
}

// ==========================================
// VÍNCULOS DE COMPARSAS CRUD
// ==========================================

export async function fetchVinculos(): Promise<VinculoComparsa[]> {
  try {
    const colRef = collection(firestore, COLLECTIONS.VINCULOS_COMPARSAS);
    const snapshot = await getDocs(colRef);
    const list: VinculoComparsa[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as VinculoComparsa);
    });
    return list;
  } catch (error) {
    console.error('Erro ao buscar vínculos do Firestore:', error);
    return [];
  }
}

export async function saveVinculo(vinculo: VinculoComparsa): Promise<void> {
  try {
    const id = `${vinculo.infrator_origem_id}_${vinculo.infrator_destino_id}`;
    const docRef = doc(firestore, COLLECTIONS.VINCULOS_COMPARSAS, id);
    const sanitized = sanitizeForFirestore(vinculo);
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    console.warn('Erro ao salvar vínculo no Firestore:', err);
  }
}

export async function removeVinculo(origemId: string, destinoId: string): Promise<void> {
  const id1 = `${origemId}_${destinoId}`;
  const id2 = `${destinoId}_${origemId}`;
  await Promise.all([
    deleteDoc(doc(firestore, COLLECTIONS.VINCULOS_COMPARSAS, id1)).catch(() => null),
    deleteDoc(doc(firestore, COLLECTIONS.VINCULOS_COMPARSAS, id2)).catch(() => null),
  ]);
}

// ==========================================
// ÁREAS DE GANGUES / TERRITÓRIOS
// ==========================================

export function serializeGangAreaForFirestore(area: GangAreaZone): any {
  const points = (area.coordinates || []).map((pt) => {
    if (Array.isArray(pt)) return { lat: Number(pt[0]), lng: Number(pt[1]) };
    if (pt && typeof pt === 'object') return { lat: Number((pt as any).lat), lng: Number((pt as any).lng) };
    return { lat: 0, lng: 0 };
  });

  return {
    ...area,
    coordinates: points,
    rawCoordinatesJson: JSON.stringify(area.coordinates || []),
    rawInnerHolesJson: area.innerHoles ? JSON.stringify(area.innerHoles) : null,
    innerHoles: null, // Avoid Firestore nested array error
  };
}

export function deserializeGangAreaFromFirestore(data: any): GangAreaZone {
  if (!data) return data;
  let coordinates: [number, number][] = [];
  if (data.rawCoordinatesJson) {
    try {
      coordinates = JSON.parse(data.rawCoordinatesJson);
    } catch (e) {}
  }
  if ((!coordinates || coordinates.length === 0) && Array.isArray(data.coordinates)) {
    coordinates = data.coordinates.map((pt: any) => {
      if (Array.isArray(pt)) return [Number(pt[0]), Number(pt[1])];
      if (pt && typeof pt === 'object') return [Number(pt.lat), Number(pt.lng)];
      return [0, 0];
    });
  }

  let innerHoles: [number, number][][] | undefined = undefined;
  if (data.rawInnerHolesJson) {
    try {
      innerHoles = JSON.parse(data.rawInnerHolesJson);
    } catch (e) {}
  }

  return {
    ...data,
    coordinates,
    innerHoles: innerHoles || undefined,
  };
}

export async function fetchGangAreas(): Promise<GangAreaZone[]> {
  try {
    const colRef = collection(firestore, COLLECTIONS.GANG_AREAS);
    const snapshot = await getDocs(colRef);
    const list: GangAreaZone[] = [];
    snapshot.forEach((docSnap) => {
      list.push(deserializeGangAreaFromFirestore(docSnap.data()));
    });
    return list;
  } catch (error) {
    console.error('Erro ao buscar áreas de gangue do Firestore:', error);
    return [];
  }
}

export async function saveGangArea(area: GangAreaZone): Promise<void> {
  try {
    const docRef = doc(firestore, COLLECTIONS.GANG_AREAS, area.id);
    const serialized = serializeGangAreaForFirestore(area);
    await setDoc(docRef, sanitizeForFirestore(serialized), { merge: true });
  } catch (err) {
    console.warn('Erro ao salvar gang area no Firestore:', err);
  }
}

export async function saveGangAreasBatch(areas: GangAreaZone[], replaceAll = false): Promise<void> {
  try {
    if (replaceAll) {
      // Clear existing
      const existing = await fetchGangAreas();
      for (const ex of existing) {
        if (ex.id) {
          await deleteDoc(doc(firestore, COLLECTIONS.GANG_AREAS, ex.id)).catch(() => null);
        }
      }
    }
    for (const area of areas) {
      await saveGangArea(area);
    }
  } catch (e) {
    console.error('Erro ao salvar batch de gang areas no Firestore:', e);
  }
}

export async function removeGangArea(id: string): Promise<void> {
  try {
    const docRef = doc(firestore, COLLECTIONS.GANG_AREAS, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Erro ao remover gang area do Firestore:', err);
  }
}

// ==========================================
// REAL-TIME SYNC HELPER
// ==========================================

export function subscribeToDatabase(callbacks: {
  onInfratoresChange?: (data: Infrator[]) => void;
  onEnderecosChange?: (data: EnderecoAtuacao[]) => void;
  onOcorrenciasChange?: (data: OcorrenciaCriminal[]) => void;
  onInfratorOcorrenciasChange?: (data: InfratorOcorrencia[]) => void;
  onGangAreasChange?: (data: GangAreaZone[]) => void;
}) {
  const unsubs: (() => void)[] = [];

  if (callbacks.onInfratoresChange) {
    const unsub = onSnapshot(collection(firestore, COLLECTIONS.INFRATORES), (snap) => {
      const list: Infrator[] = [];
      snap.forEach((d) => list.push(d.data() as Infrator));
      callbacks.onInfratoresChange!(list);
    }, (err) => {
      console.warn('Firestore Infratores onSnapshot error:', err);
    });
    unsubs.push(unsub);
  }

  if (callbacks.onEnderecosChange) {
    const unsub = onSnapshot(collection(firestore, COLLECTIONS.ENDERECOS), (snap) => {
      const list: EnderecoAtuacao[] = [];
      snap.forEach((d) => list.push(d.data() as EnderecoAtuacao));
      callbacks.onEnderecosChange!(list);
    }, (err) => {
      console.warn('Firestore Endereços onSnapshot error:', err);
    });
    unsubs.push(unsub);
  }

  if (callbacks.onOcorrenciasChange) {
    const unsub = onSnapshot(collection(firestore, COLLECTIONS.OCORRENCIAS), (snap) => {
      const list: OcorrenciaCriminal[] = [];
      snap.forEach((d) => list.push(d.data() as OcorrenciaCriminal));
      callbacks.onOcorrenciasChange!(list);
    }, (err) => {
      console.warn('Firestore Ocorrências onSnapshot error:', err);
    });
    unsubs.push(unsub);
  }

  if (callbacks.onInfratorOcorrenciasChange) {
    const unsub = onSnapshot(collection(firestore, COLLECTIONS.VINCULOS_CRIMES), (snap) => {
      const list: InfratorOcorrencia[] = [];
      snap.forEach((d) => list.push(d.data() as InfratorOcorrencia));
      callbacks.onInfratorOcorrenciasChange!(list);
    }, (err) => {
      console.warn('Firestore Infrator-Ocorrência onSnapshot error:', err);
    });
    unsubs.push(unsub);
  }

  if (callbacks.onGangAreasChange) {
    const unsub = onSnapshot(collection(firestore, COLLECTIONS.GANG_AREAS), (snap) => {
      const list: GangAreaZone[] = [];
      snap.forEach((d) => list.push(deserializeGangAreaFromFirestore(d.data())));
      callbacks.onGangAreasChange!(list);
    }, (err) => {
      console.warn('Firestore Gang Areas onSnapshot error:', err);
    });
    unsubs.push(unsub);
  }

  return () => {
    unsubs.forEach((u) => u());
  };
}
