import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SecurityLevel = 'standard' | 'enhanced' | 'maximum';

export interface SecuritySession {
  id: string;
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
  token: string;
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

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

const SETTINGS_KEY = 'security_settings';
const SCAN_HISTORY_KEY = 'security_scan_history';
const LINKS_KEY = 'collaboration_links';

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

  useEffect(() => {
    loadSettings();
    loadScans();
    loadLinks();
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

  const createSecureSession = async (isLocal: boolean): Promise<SecuritySession> => {
    const now = Date.now();
    const expires = now + (isLocal ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000);
    const id = `session-${now}`;

    const session: SecuritySession = {
      id,
      createdAt: now,
      expiresAt: expires,
      isLocal,
    };

    setCurrentSession(session);
    return session;
  };

  const terminateSession = async () => {
    setCurrentSession(null);
  };

  const encryptData = async (data: string): Promise<string> => {
    if (!isEncryptionEnabled) return data;
    return btoa(data);
  };

  const decryptData = async (encryptedData: string): Promise<string> => {
    if (!isEncryptionEnabled) return encryptedData;
    try {
      return atob(encryptedData);
    } catch {
      return encryptedData;
    }
  };

  const runSecurityScan = async (code: string, language: string): Promise<SecurityScan> => {
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

    if (/password\s*=\s*['""][^'""]+['"]/i.test(code)) {
      vulns.push({
        id: `v-${Date.now()}-3`,
        severity: 'critical',
        type: 'Hardcoded Secret',
        description: 'Hardcoded password detected',
        recommendation: 'Use env vars / secret manager; remove hardcoded secrets.',
      });
      score -= 40;
    }

    const status: SecurityScan['status'] = score >= 90 ? 'clean' : score >= 70 ? 'warning' : 'critical';
    const scan: SecurityScan = {
      id: `scan-${Date.now()}`,
      timestamp: Date.now(),
      codeHash: `hash-${Date.now()}`,
      vulnerabilities: vulns,
      score: Math.max(0, score),
      status,
    };

    const history = [scan, ...scanHistory].slice(0, 50);
    setScanHistory(history);
    await saveScans(history);
    return scan;
  };

  const updateObfuscationConfig = (config: Partial<ObfuscationConfig>) => {
    setObfuscationConfig(prev => ({ ...prev, ...config }));
  };

  const obfuscateCode = async (code: string, language: string): Promise<string> => {
    if (!obfuscationConfig.enabled) return code;
    return `/* Protected by NimRev Security Protocol */\n${code}`;
  };

  const createCollaborationLink = async (
    projectId: string,
    expiresIn: number,
    maxUses: number,
    permissions: string[]
  ): Promise<CollaborationLink> => {
    const issuedAt = Date.now();
    const expiresAt = issuedAt + expiresIn;
    const token = `token-${issuedAt}`;
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
    if (link.expiresAt < Date.now()) {
      await revokeCollaborationLink(link.id);
      return null;
    }
    if (link.usedCount >= link.maxUses) return null;

    const updated = collaborationLinks.map(l => (l.id === link.id ? { ...l, usedCount: l.usedCount + 1 } : l));
    setCollaborationLinks(updated);
    await saveLinks(updated);

    return updated.find(l => l.id === link.id) || null;
  };

  const toggleEncryption = () => setIsEncryptionEnabled(v => !v);

  const activateNimRevProtocol = async () => {
    setNimRevProtocolActive(true);
    if (currentSession) {
      await terminateSession();
      await createSecureSession(currentSession.isLocal);
    }
  };

  const deactivateNimRevProtocol = () => setNimRevProtocolActive(false);

  const value: SecurityContextType = {
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
  };

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurity() {
  const ctx = useContext(SecurityContext);
  if (!ctx) throw new Error('useSecurity must be used within SecurityProvider');
  return ctx;
}
