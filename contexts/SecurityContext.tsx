// SecurityContext.tsx (drop-in replacement)
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/** ───────────────── Types ───────────────── */
export type SecurityLevel = 'standard' | 'enhanced' | 'maximum';
export type EncryptionAlgorithm = 'AES-256' | 'RSA-2048' | 'NimRev-Quantum';

export interface SecuritySession {
  id: string;
  encryptionKeyRef: string; // SecureStore key name
  algorithm: EncryptionAlgorithm;
  createdAt: number;
  expiresAt: number;
  isLocal: boolean;
}

export interface SecurityScan {
  id: string;
  timestamp: number;
  codeHash: string;
  vulnerabilities: SecurityVulnerability[];
  score: number;
  status: 'clean' | 'warning' | 'critical';
}

export interface SecurityVulnerability {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  line?: number;
  file?: string;
  recommendation: string;
}

export interface ObfuscationConfig {
  enabled: boolean;
  level: 'light' | 'medium' | 'heavy';
  preserveNames: boolean;
  encryptStrings: boolean;
  controlFlowFlattening: boolean;
}

export interface CollaborationLink {
  id: string;
  url: string;
  token: string;         // signed token
  expiresAt: number;
  maxUses: number;
  usedCount: number;
  projectId: string;
  permissions: string[];
  createdAt: number;
}

interface SecurityContextType {
  securityLevel: SecurityLevel;
  setSecurityLevel: (level: SecurityLevel) => void;

  currentSession: SecuritySession | null;
  createSecureSession: (isLocal: boolean) => Promise<SecuritySession>;
  terminateSession: () => Promise<void>;

  encryptData: (data: string) => Promise<string>;
  decryptData: (encryptedData: string) => Promise<string>;

  scanHistory: SecurityScan[];
  runSecurityScan: (code: string, language: string) => Promise<SecurityScan>;

  obfuscationConfig: ObfuscationConfig;
  updateObfuscationConfig: (config: Partial<ObfuscationConfig>) => void;
  obfuscateCode: (code: string, language: string) => Promise<string>;

  collaborationLinks: CollaborationLink[];
  createCollaborationLink: (projectId: string, expiresIn: number, maxUses: number, permissions: string[]) => Promise<CollaborationLink>;
  revokeCollaborationLink: (linkId: string) => Promise<void>;
  validateCollaborationLink: (token: string) => Promise<CollaborationLink | null>;

  isEncryptionEnabled: boolean;
  toggleEncryption: () => void;

  nimRevProtocolActive: boolean;
  activateNimRevProtocol: () => Promise<void>;
  deactivateNimRevProtocol: () => void;
}

/** ───────────────── Constants & Helpers ───────────────── */
const SETTINGS_KEY = 'security_settings';
const SCAN_HISTORY_KEY = 'security_scan_history';
const LINKS_KEY = 'collaboration_links';
const MASTER_HMAC_KEY = 'nimrev_master_hmac_key'; // SecureStore
const SESSION_KEY_PREFIX = 'nimrev_session_key_'; // SecureStore

// hex helpers (RN safe)
const toHex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string) => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out.buffer;
};

// random bytes
async function randBytes(len: number) {
  // WebCrypto is available via react-native-webcrypto polyfill
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return arr.buffer;
}

// AES-GCM utils
async function importAesKey(rawKey: ArrayBuffer) {
  return await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function aesEncrypt(plaintext: string, keyRawHex: string) {
  const key = await importAesKey(fromHex(keyRawHex));
  const iv = await randBytes(12);
  const enc = new TextEncoder().encode(plaintext);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
  return JSON.stringify({ iv: toHex(iv), ct: toHex(ct) });
}

async function aesDecrypt(payloadJson: string, keyRawHex: string) {
  try {
    const { iv, ct } = JSON.parse(payloadJson);
    const key = await importAesKey(fromHex(keyRawHex));
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromHex(iv) }, key, fromHex(ct));
    return new TextDecoder().decode(pt);
  } catch {
    // return raw on failure to keep UX soft-fail
    return payloadJson;
  }
}

// HMAC SHA-256 for token signing (client-side; prefer server)
async function getOrCreateMasterHmacKeyHex() {
  if (Platform.OS === 'web') {
    const existing = await AsyncStorage.getItem(MASTER_HMAC_KEY);
    if (existing) return existing;
    const raw = await randBytes(32);
    const hex = toHex(raw);
    await AsyncStorage.setItem(MASTER_HMAC_KEY, hex);
    return hex;
  }
  const existing = await SecureStore.getItemAsync(MASTER_HMAC_KEY);
  if (existing) return existing;
  const raw = await randBytes(32);
  const hex = toHex(raw);
  await SecureStore.setItemAsync(MASTER_HMAC_KEY, hex);
  return hex;
}

async function hmacSHA256Hex(message: string, hexKey: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    fromHex(hexKey),
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return toHex(sig);
}

// SecureStore helpers for session keys
async function putSessionKey(hexKey: string) {
  const ref = `${SESSION_KEY_PREFIX}${Date.now()}`;
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(ref, hexKey);
    return ref;
  }
  await SecureStore.setItemAsync(ref, hexKey, { keychainService: ref });
  return ref;
}
async function getSessionKeyByRef(ref: string) {
  if (Platform.OS === 'web') {
    return await AsyncStorage.getItem(ref);
  }
  return await SecureStore.getItemAsync(ref);
}
async function deleteSessionKey(ref: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(ref);
    return;
  }
  await SecureStore.deleteItemAsync(ref);
}

/** ───────────────── Context ───────────────── */
const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>('standard');
  const [currentSession, setCurrentSession] = useState<SecuritySession | null>(null);
  const [scanHistory, setScanHistory] = useState<SecurityScan[]>([]);
  const [obfuscationConfig, setObfuscationConfig] = useState<ObfuscationConfig>({
    enabled: false,
    level: 'medium',
    preserveNames: false,
    encryptStrings: true,
    controlFlowFlattening: true,
  });
  const [collaborationLinks, setCollaborationLinks] = useState<CollaborationLink[]>([]);
  const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(true);
  const [nimRevProtocolActive, setNimRevProtocolActive] = useState(false);

  /** ── Load/Save ── */
  useEffect(() => {
    (async () => {
      await loadSettings();
      await loadScans();
      await loadLinks();
      // ensure HMAC key exists
      await getOrCreateMasterHmacKeyHex();
    })();
  }, []);

  useEffect(() => {
    saveSettings();
  }, [securityLevel, obfuscationConfig, isEncryptionEnabled, nimRevProtocolActive]);

  const loadSettings = async () => {
    try {
      const json = await AsyncStorage.getItem(SETTINGS_KEY);
      if (!json) return;
      const parsed = JSON.parse(json);
      setSecurityLevel(parsed.securityLevel || 'standard');
      setObfuscationConfig(parsed.obfuscationConfig || obfuscationConfig);
      setIsEncryptionEnabled(parsed.isEncryptionEnabled ?? true);
      setNimRevProtocolActive(parsed.nimRevProtocolActive || false);
    } catch (e) {
      console.error('[Security] load settings failed', e);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ securityLevel, obfuscationConfig, isEncryptionEnabled, nimRevProtocolActive })
      );
    } catch (e) {
      console.error('[Security] save settings failed', e);
    }
  };

  const loadScans = async () => {
    try {
      const json = await AsyncStorage.getItem(SCAN_HISTORY_KEY);
      if (json) setScanHistory(JSON.parse(json));
    } catch (e) {
      console.error('[Security] load scans failed', e);
    }
  };
  const saveScans = async (history: SecurityScan[]) => {
    try {
      await AsyncStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('[Security] save scans failed', e);
    }
  };

  const loadLinks = async () => {
    try {
      const json = await AsyncStorage.getItem(LINKS_KEY);
      if (!json) return;
      const parsed: CollaborationLink[] = JSON.parse(json);
      const valid = parsed.filter(l => l.expiresAt > Date.now());
      setCollaborationLinks(valid);
    } catch (e) {
      console.error('[Security] load links failed', e);
    }
  };
  const saveLinks = async (links: CollaborationLink[]) => {
    try {
      await AsyncStorage.setItem(LINKS_KEY, JSON.stringify(links));
    } catch (e) {
      console.error('[Security] save links failed', e);
    }
  };

  /** ── Sessions ── */
  const createSecureSession = async (isLocal: boolean): Promise<SecuritySession> => {
    console.log('[Security] creating secure session (local:', isLocal, ')');

    const algorithm: EncryptionAlgorithm =
      nimRevProtocolActive ? 'NimRev-Quantum' : securityLevel === 'maximum' ? 'RSA-2048' : 'AES-256';

    // for this client implementation we use AES-256-GCM. RSA would require a backend or native lib.
    const rawKey = await randBytes(32); // 256-bit
    const hexKey = toHex(rawKey);
    const encryptionKeyRef = await putSessionKey(hexKey);

    const now = Date.now();
    const expires = now + (isLocal ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000);

    const id = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${encryptionKeyRef}:${algorithm}:${now}`
    );

    const session: SecuritySession = {
      id,
      encryptionKeyRef,
      algorithm,
      createdAt: now,
      expiresAt: expires,
      isLocal,
    };

    setCurrentSession(session);
    return session;
  };

  const terminateSession = async () => {
    console.log('[Security] terminating session');
    if (currentSession?.encryptionKeyRef) {
      await deleteSessionKey(currentSession.encryptionKeyRef);
    }
    setCurrentSession(null);
  };

  /** ── Encrypt/Decrypt ── */
  const assertActiveKey = async (): Promise<string | null> => {
    if (!isEncryptionEnabled || !currentSession) return null;
    if (Date.now() > currentSession.expiresAt) {
      // auto-rotate expired session
      await terminateSession();
      return null;
    }
    const hex = await getSessionKeyByRef(currentSession.encryptionKeyRef);
    return hex || null;
  };

  const encryptData = async (data: string): Promise<string> => {
    const keyHex = await assertActiveKey();
    if (!keyHex) return data;
    try {
      return await aesEncrypt(data, keyHex);
    } catch (e) {
      console.error('[Security] encrypt failed:', e);
      return data;
    }
  };

  const decryptData = async (encryptedData: string): Promise<string> => {
    const keyHex = await assertActiveKey();
    if (!keyHex) return encryptedData;
    try {
      return await aesDecrypt(encryptedData, keyHex);
    } catch (e) {
      console.error('[Security] decrypt failed:', e);
      return encryptedData;
    }
  };

  /** ── Static Analyzer (lightweight heuristic) ── */
  const runSecurityScan = async (code: string, language: string): Promise<SecurityScan> => {
    console.log('[Security] scanning', language);

    const codeHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, code);
    const vulns: SecurityVulnerability[] = [];
    let score = 100;

    if (/\beval\s*\(/.test(code)) {
      vulns.push({
        id: `v-${Date.now()}-1`,
        severity: 'critical',
        type: 'Code Injection',
        description: 'Use of eval() detected',
        recommendation: 'Remove eval(); use safe parsers/validated interpreters.',
      });
      score -= 30;
    }

    if (code.includes('dangerouslySetInnerHTML')) {
      vulns.push({
        id: `v-${Date.now()}-2`,
        severity: 'high',
        type: 'XSS',
        description: 'dangerouslySetInnerHTML usage detected',
        recommendation: 'Sanitize HTML and prefer safe React rendering.',
      });
      score -= 20;
    }

    if (/password\s*=\s*['"][^'"]+['"]/i.test(code)) {
      vulns.push({
        id: `v-${Date.now()}-3`,
        severity: 'critical',
        type: 'Hardcoded Secret',
        description: 'Hardcoded password detected',
        recommendation: 'Use env vars / secret manager; remove hardcoded secrets.',
      });
      score -= 40;
    }

    if (/http:\/\//i.test(code) && !/localhost/i.test(code)) {
      vulns.push({
        id: `v-${Date.now()}-4`,
        severity: 'medium',
        type: 'Insecure Transport',
        description: 'HTTP used instead of HTTPS',
        recommendation: 'Use HTTPS for all external traffic.',
      });
      score -= 15;
    }

    if (/console\.(log|error|warn)/g.test(code)) {
      vulns.push({
        id: `v-${Date.now()}-5`,
        severity: 'low',
        type: 'Info Disclosure',
        description: 'Console logging in production-sensitive paths',
        recommendation: 'Strip logs or use structured redacted logging.',
      });
      score -= 5;
    }

    const status: SecurityScan['status'] = score >= 90 ? 'clean' : score >= 70 ? 'warning' : 'critical';
    const scan: SecurityScan = {
      id: `scan-${Date.now()}`,
      timestamp: Date.now(),
      codeHash,
      vulnerabilities: vulns,
      score: Math.max(0, score),
      status,
    };

    const history = [scan, ...scanHistory].slice(0, 50);
    setScanHistory(history);
    await saveScans(history);
    return scan;
  };

  /** ── Obfuscation (deterrent only) ── */
  const updateObfuscationConfig = (config: Partial<ObfuscationConfig>) => {
    setObfuscationConfig(prev => ({ ...prev, ...config }));
  };

  const obfuscateCode = async (code: string, language: string): Promise<string> => {
    if (!obfuscationConfig.enabled) return code;

    let out = code;

    if (obfuscationConfig.encryptStrings) {
      // Replace string literals with a small runtime decoder
      // (kept simple; avoid atob/Buffer in RN)
      const table: string[] = [];
      out = out.replace(/(['"`])(?:(?=(\\?))\2.)*?\1/g, (m) => {
        if (m.length < 4) return m;
        const inner = m.slice(1, -1);
        const hex = toHex(new TextEncoder().encode(inner).buffer as ArrayBuffer);
        const idx = table.push(hex) - 1;
        return `__nrv(${idx})`;
      });
      const decoder =
        `function __nrv(i){const h='${JSON.stringify(table)}';const p=JSON.parse(h)[i];` +
        `const b=new Uint8Array(p.length/2);for(let j=0;j<b.length;j++){b[j]=parseInt(p.substr(j*2,2),16);}return new TextDecoder().decode(b)}`;
      out = `${decoder}\n${out}`;
    }

    if (!obfuscationConfig.preserveNames && obfuscationConfig.level !== 'light') {
      const map = new Map<string, string>();
      let c = 0;
      out = out.replace(/\b(const|let|var|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, (_m, k, name) => {
        if (!map.has(name)) map.set(name, `_n${(c++).toString(36)}`);
        return `${k} ${map.get(name)}`;
      });
    }

    if (obfuscationConfig.controlFlowFlattening && obfuscationConfig.level === 'heavy') {
      out = `(function(){${out}})();`;
    }

    return `/* Protected by NimRev Security Protocol (deterrent only) */\n${out}`;
  };

  /** ── Collaboration Links (signed tokens) ── */
  const createCollaborationLink = async (
    projectId: string,
    expiresIn: number,
    maxUses: number,
    permissions: string[]
  ): Promise<CollaborationLink> => {
    const issuedAt = Date.now();
    const expiresAt = issuedAt + expiresIn;
    const payload = { projectId, exp: expiresAt, max: maxUses, perms: permissions, iat: issuedAt };

    const payloadStr = JSON.stringify(payload);
    const macKey = await getOrCreateMasterHmacKeyHex();
    const sig = await hmacSHA256Hex(payloadStr, macKey);
    const token = `${toHex(new TextEncoder().encode(payloadStr).buffer as ArrayBuffer)}.${sig}`; // hex(payload).hex(sig)

    const id = `link-${issuedAt}`;
    const url = `https://aurebix.com/collab/${token}`;

    const link: CollaborationLink = {
      id,
      url,
      token,
      expiresAt,
      maxUses,
      usedCount: 0,
      projectId,
      permissions,
      createdAt: issuedAt,
    };

    const updated = [...collaborationLinks, link];
    setCollaborationLinks(updated);
    await saveLinks(updated);

    return link;
  };

  const revokeCollaborationLink = async (linkId: string) => {
    const updated = collaborationLinks.filter(l => l.id !== linkId);
    setCollaborationLinks(updated);
    await saveLinks(updated);
  };

  const validateCollaborationLink = async (token: string): Promise<CollaborationLink | null> => {
    const link = collaborationLinks.find(l => l.token === token);
    if (!link) return null;

    // verify signature
    try {
      const [payloadHex, sig] = token.split('.');
      const payloadJson = new TextDecoder().decode(new Uint8Array(fromHex(payloadHex)));
      const macKey = await getOrCreateMasterHmacKeyHex();
      const expected = await hmacSHA256Hex(payloadJson, macKey);
      if (expected !== sig) return null;

      const payload = JSON.parse(payloadJson);

      if (payload.exp < Date.now()) {
        await revokeCollaborationLink(link.id);
        return null;
      }
      if (link.usedCount >= link.maxUses) return null;

      const updated = collaborationLinks.map(l => (l.id === link.id ? { ...l, usedCount: l.usedCount + 1 } : l));
      setCollaborationLinks(updated);
      await saveLinks(updated);

      return updated.find(l => l.id === link.id) || null;
    } catch {
      return null;
    }
  };

  /** ── Toggles / Protocol ── */
  const toggleEncryption = () => setIsEncryptionEnabled(v => !v);

  const activateNimRevProtocol = async () => {
    // Marketing name → still AES-256 client-side, but we rotate keys immediately.
    setNimRevProtocolActive(true);
    if (currentSession) {
      await terminateSession();
      await createSecureSession(currentSession.isLocal);
    }
  };

  const deactivateNimRevProtocol = () => setNimRevProtocolActive(false);

  /** ── Memoized value ── */
  const value: SecurityContextType = useMemo(
    () => ({
      securityLevel,
      setSecurityLevel,
      currentSession,
      createSecureSession,
      terminateSession,
      encryptData,
      decryptData,
      scanHistory,
      runSecurityScan,
      obfuscationConfig,
      updateObfuscationConfig,
      obfuscateCode,
      collaborationLinks,
      createCollaborationLink,
      revokeCollaborationLink,
      validateCollaborationLink,
      isEncryptionEnabled,
      toggleEncryption,
      nimRevProtocolActive,
      activateNimRevProtocol,
      deactivateNimRevProtocol,
    }),
    [
      securityLevel,
      currentSession,
      scanHistory,
      obfuscationConfig,
      collaborationLinks,
      isEncryptionEnabled,
      nimRevProtocolActive,
    ]
  );

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurity() {
  const ctx = useContext(SecurityContext);
  if (!ctx) throw new Error('useSecurity must be used within SecurityProvider');
  return ctx;
}
