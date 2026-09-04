/**
 * Serviço de Autenticação e Controle de Acesso do Administrador (PMMG • 35º BPM)
 * Permite alternar entre "Modo Consulta (Somente Leitura)" e "Modo Alimentação (Administrador)"
 * garantindo que apenas o usuário autorizado (com PIN mestre) possa criar, editar ou excluir dados.
 */

const PIN_STORAGE_KEY = 'guardiao_admin_pin_hash_v1';
const SESSION_STORAGE_KEY = 'guardiao_admin_session_auth_v1';
const REMEMBER_STORAGE_KEY = 'guardiao_admin_remember_token_v1';

// PIN padrão de fábrica para primeira inicialização (PMMG 35º BPM)
const DEFAULT_INITIAL_PIN = '35bpm';

// Simple hashing function for PIN comparison and persistence
function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
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

/**
 * Retorna o hash do PIN atualmente configurado
 */
export function getStoredPinHash(): string {
  if (typeof window === 'undefined') return simpleHash(DEFAULT_INITIAL_PIN);
  const stored = localStorage.getItem(PIN_STORAGE_KEY);
  if (!stored) {
    // Configura o PIN inicial
    const initialHash = simpleHash(DEFAULT_INITIAL_PIN);
    localStorage.setItem(PIN_STORAGE_KEY, initialHash);
    return initialHash;
  }
  return stored;
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
        // Renova na session para acesso rápido
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
  if (!inputPin) return false;
  const currentHash = getStoredPinHash();
  const inputHash = simpleHash(inputPin.trim());
  const inputHashLower = simpleHash(inputPin.trim().toLowerCase());
  return currentHash === inputHash || currentHash === inputHashLower;
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

  return { success: false, message: 'PIN incorreto. Acesso restrito ao Administrador.' };
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
 * Altera o PIN de Administrador
 */
export function changeAdminPin(
  currentPin: string,
  newPin: string
): { success: boolean; message: string } {
  if (!verifyPin(currentPin)) {
    return { success: false, message: 'O PIN atual informado está incorreto.' };
  }

  if (!newPin || newPin.trim().length < 4) {
    return { success: false, message: 'O novo PIN deve ter no mínimo 4 caracteres.' };
  }

  const newHash = simpleHash(newPin.trim());
  localStorage.setItem(PIN_STORAGE_KEY, newHash);
  return { success: true, message: 'PIN de Administrador alterado com sucesso!' };
}

/**
 * Redefine o PIN para o padrão do 35º BPM (35bpm)
 */
export function resetToDefaultPin(): void {
  const initialHash = simpleHash(DEFAULT_INITIAL_PIN);
  localStorage.setItem(PIN_STORAGE_KEY, initialHash);
}

/**
 * Permite que componentes React ou serviços escutem alterações no estado de autenticação
 */
export function subscribeToAuth(callback: AuthListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export const DEFAULT_PIN_HINT = DEFAULT_INITIAL_PIN;
