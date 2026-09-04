/**
 * Serviço de Autenticação e Controle de Acesso do Administrador (PMMG • 35º BPM)
 * Sincronizado centralmente via Firebase Firestore para que TODAS as sessões
 * e dispositivos respeitem estritamente o PIN Mestre definido pelo operador.
 * 
 * Por padrão, qualquer usuário externo que acesse o link fica em MODO CONSULTA (Somente Leitura).
 */

import { firestore, doc, getDoc, setDoc, onSnapshot } from '../lib/firebase';

const PIN_STORAGE_KEY = 'guardiao_admin_pin_hash_v2';
const SESSION_STORAGE_KEY = 'guardiao_admin_session_auth_v2';
const REMEMBER_STORAGE_KEY = 'guardiao_admin_remember_token_v2';

// PINs padrão aceitos na inicialização (compatibilidade total e flexibilidade maiúscula/minúscula)
const DEFAULT_INITIAL_PINS = ['PMMG35BPM', '35bpm', 'pmmg35bpm', '35BPM'];

// Hashing seguro simples de 32-bit com sal para ofuscação no banco
export function simpleHash(text: string): string {
  const salted = `35bpm_guardiao_pmmg_${text.trim().toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'pmmg_hash_' + Math.abs(hash).toString(16);
}

// Global subscribers for reactive state updates
type AuthListener = (isAuthenticated: boolean) => void;
const listeners = new Set<AuthListener>();

function notifyListeners(isAuth: boolean) {
  listeners.forEach((fn) => {
    try {
      fn(isAuth);
    } catch (e) {
      console.error('Error in auth listener:', e);
    }
  });
}

// Em memória: hash ativo do PIN sincronizado
let activeCloudPinHash: string | null = null;

// Inicializa escuta em tempo real do PIN Mestre no Firestore
if (typeof window !== 'undefined') {
  try {
    const secDocRef = doc(firestore, 'system_config', 'admin_security');
    onSnapshot(
      secDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && data.pin_hash) {
            activeCloudPinHash = data.pin_hash;
            localStorage.setItem(PIN_STORAGE_KEY, data.pin_hash);
          }
        } else {
          // Documento não existe ainda: cria com o PIN padrão PMMG35BPM
          const defaultHash = simpleHash('PMMG35BPM');
          activeCloudPinHash = defaultHash;
          localStorage.setItem(PIN_STORAGE_KEY, defaultHash);
          setDoc(secDocRef, {
            pin_hash: defaultHash,
            updated_at: new Date().toISOString(),
            description: 'PIN Mestre de Controle de Alimentação 35º BPM',
          }).catch((err) => {
            console.warn('Não foi possível gravar PIN inicial no Firestore:', err);
          });
        }
      },
      (err) => {
        console.warn('Aviso: escuta de PIN no Firestore em fallback local:', err);
      }
    );
  } catch (e) {
    console.warn('Erro ao configurar sincronização de PIN:', e);
  }
}

/**
 * Retorna o hash do PIN atualmente configurado
 */
export function getStoredPinHash(): string {
  if (activeCloudPinHash) return activeCloudPinHash;
  if (typeof window === 'undefined') return simpleHash('PMMG35BPM');
  const stored = localStorage.getItem(PIN_STORAGE_KEY);
  if (stored) {
    activeCloudPinHash = stored;
    return stored;
  }
  const defaultHash = simpleHash('PMMG35BPM');
  activeCloudPinHash = defaultHash;
  return defaultHash;
}

/**
 * Verifica se a sessão atual está autenticada como Administrador
 */
export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Verifica sessionStorage (sessão da aba atual)
  const sessionToken = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (sessionToken === 'authorized_admin') {
    return true;
  }

  // 2. Verifica se marcou para lembrar neste navegador (com expiração de 30 dias)
  const rememberToken = localStorage.getItem(REMEMBER_STORAGE_KEY);
  if (rememberToken) {
    try {
      const parsed = JSON.parse(rememberToken);
      if (parsed.expiresAt && Date.now() < parsed.expiresAt) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, 'authorized_admin');
        return true;
      } else {
        localStorage.removeItem(REMEMBER_STORAGE_KEY);
      }
    } catch (e) {
      localStorage.removeItem(REMEMBER_STORAGE_KEY);
    }
  }

  return false;
}

/**
 * Valida o PIN fornecido contra o hash armazenado
 */
export function verifyPin(inputPin: string): boolean {
  if (!inputPin || inputPin.trim().length === 0) return false;
  const currentHash = getStoredPinHash();
  const inputHash = simpleHash(inputPin);

  // 1. Verifica se bate exatamente com o hash salvo (seja personalizado ou padrão)
  if (currentHash === inputHash) return true;

  // 2. Se o hash atual for o padrão inicial, aceita qualquer uma das variações padrão
  const defaultHashes = DEFAULT_INITIAL_PINS.map((p) => simpleHash(p));
  const isCurrentlyDefault = defaultHashes.includes(currentHash);
  if (isCurrentlyDefault && defaultHashes.includes(inputHash)) {
    return true;
  }

  return false;
}

/**
 * Realiza o login/desbloqueio do modo Administrador
 */
export function loginAdmin(pin: string, remember30Days = false): { success: boolean; message: string } {
  if (!pin || pin.trim().length === 0) {
    return { success: false, message: 'Digite o PIN de Administrador.' };
  }

  if (verifyPin(pin)) {
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'authorized_admin');

    if (remember30Days) {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      localStorage.setItem(
        REMEMBER_STORAGE_KEY,
        JSON.stringify({
          authorized: true,
          expiresAt: Date.now() + thirtyDaysMs,
        })
      );
    }

    notifyListeners(true);
    return { success: true, message: 'Modo Alimentação liberado com sucesso!' };
  }

  return { success: false, message: 'PIN incorreto. Acesso de alteração restrito ao Administrador.' };
}

/**
 * Realiza o bloqueio / logout do modo Administrador voltando para Modo Leitura
 */
export function logoutAdmin(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(REMEMBER_STORAGE_KEY);
  }
  notifyListeners(false);
}

/**
 * Altera o PIN de Administrador e sincroniza com o Firestore e localStorage
 */
export async function changeAdminPin(
  currentPin: string,
  newPin: string
): Promise<{ success: boolean; message: string }> {
  if (!verifyPin(currentPin)) {
    return { success: false, message: 'O PIN atual informado está incorreto.' };
  }

  if (!newPin || newPin.trim().length < 4) {
    return { success: false, message: 'O novo PIN deve ter no mínimo 4 dígitos/caracteres.' };
  }

  const newHash = simpleHash(newPin);
  activeCloudPinHash = newHash;
  localStorage.setItem(PIN_STORAGE_KEY, newHash);

  // Sincroniza imediatamente com o Firebase Firestore
  try {
    const secDocRef = doc(firestore, 'system_config', 'admin_security');
    await setDoc(secDocRef, {
      pin_hash: newHash,
      updated_at: new Date().toISOString(),
      updated_by: 'admin_session',
    });
  } catch (err) {
    console.error('Erro ao sincronizar novo PIN no Firestore:', err);
  }

  return { success: true, message: 'PIN Mestre atualizado com sucesso em todos os dispositivos!' };
}

/**
 * Permite que componentes React escutem alterações de autenticação
 */
export function subscribeToAuth(callback: AuthListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
