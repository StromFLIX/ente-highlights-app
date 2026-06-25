import { create } from 'zustand';
import * as Storage from '@/lib/storage';

const DEFAULT_BASE_URL = 'https://highlights.ente.stromflix.com';

const KEY = {
  base: 'eh_base_url',
  token: 'eh_jwt',
  email: 'eh_email',
  password: 'eh_password',
};

export class TwoFactorError extends Error {
  constructor() {
    super('two_factor_required');
  }
}

type LoginResponse = { token: string; userId: number; expiresAtUs: number };

async function postLogin(
  baseUrl: string,
  email: string,
  password: string,
  totp?: string,
): Promise<LoginResponse> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, totp }),
  });
  if (res.status === 401) {
    let body: any = {};
    try {
      body = await res.json();
    } catch {}
    if (body?.detail?.error === 'two_factor_required' || body?.error === 'two_factor_required') {
      throw new TwoFactorError();
    }
    throw new Error('Incorrect email or password');
  }
  if (!res.ok) throw new Error(`Login failed (${res.status})`);
  return (await res.json()) as LoginResponse;
}

type AuthState = {
  ready: boolean;
  baseUrl: string;
  token: string | null;
  email: string | null;
  isAuthed: boolean;
  hydrate: () => Promise<void>;
  setBaseUrl: (url: string) => Promise<void>;
  login: (email: string, password: string, totp?: string) => Promise<void>;
  logout: () => Promise<void>;
  silentRelogin: () => Promise<boolean>;
};

export const useAuth = create<AuthState>((set, get) => ({
  ready: false,
  baseUrl: DEFAULT_BASE_URL,
  token: null,
  email: null,
  isAuthed: false,

  hydrate: async () => {
    const [base, token, email] = await Promise.all([
      Storage.getItem(KEY.base),
      Storage.getItem(KEY.token),
      Storage.getItem(KEY.email),
    ]);
    set({
      ready: true,
      baseUrl: base || DEFAULT_BASE_URL,
      token: token || null,
      email: email || null,
      isAuthed: !!token,
    });
  },

  setBaseUrl: async (url: string) => {
    const clean = url.trim().replace(/\/$/, '');
    await Storage.setItem(KEY.base, clean);
    set({ baseUrl: clean });
  },

  login: async (email, password, totp) => {
    const { baseUrl } = get();
    const res = await postLogin(baseUrl, email, password, totp);
    await Promise.all([
      Storage.setItem(KEY.token, res.token),
      Storage.setItem(KEY.email, email),
      Storage.setItem(KEY.password, password),
    ]);
    set({ token: res.token, email, isAuthed: true });
  },

  logout: async () => {
    await Promise.all([
      Storage.deleteItem(KEY.token),
      Storage.deleteItem(KEY.password),
    ]);
    set({ token: null, isAuthed: false });
  },

  silentRelogin: async () => {
    const { baseUrl } = get();
    const [email, password] = await Promise.all([
      Storage.getItem(KEY.email),
      Storage.getItem(KEY.password),
    ]);
    if (!email || !password) return false;
    try {
      const res = await postLogin(baseUrl, email, password);
      await Storage.setItem(KEY.token, res.token);
      set({ token: res.token, email, isAuthed: true });
      return true;
    } catch {
      set({ token: null, isAuthed: false });
      return false;
    }
  },
}));
