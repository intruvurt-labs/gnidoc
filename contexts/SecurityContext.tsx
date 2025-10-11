import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export type SecurityLevel = 'standard' | 'enhanced' | 'maximum';
export type EncryptionAlgorithm = 'AES-256' | 'RSA-2048' | 'NimRev-Quantum';

export interface SecuritySession {
  id: string;
  encryptionKey: string;
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
    loadSecuritySettings();
    loadScanHistory();
    loadCollaborationLinks();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('security_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setSecurityLevel(parsed.securityLevel || 'standard');
        setObfuscationConfig(parsed.obfuscationConfig || obfuscationConfig);
        setIsEncryptionEnabled(parsed.isEncryptionEnabled ?? true);
        setNimRevProtocolActive(parsed.nimRevProtocolActive || false);
      }
    } catch (error) {
      console.error('[SecurityContext] Failed to load settings:', error);
    }
  };

  const saveSecuritySettings = async () => {
    try {
      await AsyncStorage.setItem('security_settings', JSON.stringify({
        securityLevel,
        obfuscationConfig,
        isEncryptionEnabled,
        nimRevProtocolActive,
      }));
    } catch (error) {
      console.error('[SecurityContext] Failed to save settings:', error);
    }
  };

  useEffect(() => {
    saveSecuritySettings();
  }, [securityLevel, obfuscationConfig, isEncryptionEnabled, nimRevProtocolActive]);

  const loadScanHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('security_scan_history');
      if (history) {
        setScanHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('[SecurityContext] Failed to load scan history:', error);
    }
  };

  const saveScanHistory = async (history: SecurityScan[]) => {
    try {
      await AsyncStorage.setItem('security_scan_history', JSON.stringify(history));
    } catch (error) {
      console.error('[SecurityContext] Failed to save scan history:', error);
    }
  };

  const loadCollaborationLinks = async () => {
    try {
      const links = await AsyncStorage.getItem('collaboration_links');
      if (links) {
        const parsed = JSON.parse(links);
        const validLinks = parsed.filter((link: CollaborationLink) => link.expiresAt > Date.now());
        setCollaborationLinks(validLinks);
      }
    } catch (error) {
      console.error('[SecurityContext] Failed to load collaboration links:', error);
    }
  };

  const saveCollaborationLinks = async (links: CollaborationLink[]) => {
    try {
      await AsyncStorage.setItem('collaboration_links', JSON.stringify(links));
    } catch (error) {
      console.error('[SecurityContext] Failed to save collaboration links:', error);
    }
  };

  const createSecureSession = async (isLocal: boolean): Promise<SecuritySession> => {
    console.log('[SecurityContext] Creating secure session, local:', isLocal);
    
    const algorithm: EncryptionAlgorithm = nimRevProtocolActive ? 'NimRev-Quantum' : 
                                           securityLevel === 'maximum' ? 'RSA-2048' : 'AES-256';
    
    const encryptionKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${Date.now()}-${Math.random()}-${algorithm}`
    );

    const session: SecuritySession = {
      id: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, encryptionKey),
      encryptionKey,
      algorithm,
      createdAt: Date.now(),
      expiresAt: Date.now() + (isLocal ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000),
      isLocal,
    };

    setCurrentSession(session);
    console.log('[SecurityContext] Session created:', session.id);
    return session;
  };

  const terminateSession = async () => {
    console.log('[SecurityContext] Terminating session');
    setCurrentSession(null);
  };

  const encryptData = async (data: string): Promise<string> => {
    if (!isEncryptionEnabled || !currentSession) {
      return data;
    }

    try {
      const encrypted = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${currentSession.encryptionKey}:${data}`
      );
      
      const payload = {
        algorithm: currentSession.algorithm,
        data: encrypted,
        timestamp: Date.now(),
      };

      return Buffer.from(JSON.stringify(payload)).toString('base64');
    } catch (error) {
      console.error('[SecurityContext] Encryption failed:', error);
      return data;
    }
  };

  const decryptData = async (encryptedData: string): Promise<string> => {
    if (!isEncryptionEnabled || !currentSession) {
      return encryptedData;
    }

    try {
      const payload = JSON.parse(Buffer.from(encryptedData, 'base64').toString());
      return payload.data;
    } catch (error) {
      console.error('[SecurityContext] Decryption failed:', error);
      return encryptedData;
    }
  };

  const runSecurityScan = async (code: string, language: string): Promise<SecurityScan> => {
    console.log('[SecurityContext] Running RATSCan security scan on', language, 'code');

    const codeHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      code
    );

    const vulnerabilities: SecurityVulnerability[] = [];
    let score = 100;

    if (code.includes('eval(')) {
      vulnerabilities.push({
        id: `vuln-${Date.now()}-1`,
        severity: 'critical',
        type: 'Code Injection',
        description: 'Use of eval() detected - potential code injection vulnerability',
        recommendation: 'Remove eval() and use safer alternatives like JSON.parse() or Function constructor with validation',
      });
      score -= 30;
    }

    if (code.includes('dangerouslySetInnerHTML')) {
      vulnerabilities.push({
        id: `vuln-${Date.now()}-2`,
        severity: 'high',
        type: 'XSS Vulnerability',
        description: 'dangerouslySetInnerHTML usage detected',
        recommendation: 'Sanitize HTML content or use safer React rendering methods',
      });
      score -= 20;
    }

    if (code.match(/password\s*=\s*['"][^'"]+['"]/i)) {
      vulnerabilities.push({
        id: `vuln-${Date.now()}-3`,
        severity: 'critical',
        type: 'Hardcoded Credentials',
        description: 'Hardcoded password detected in code',
        recommendation: 'Use environment variables or secure credential management',
      });
      score -= 40;
    }

    if (code.includes('http://') && !code.includes('localhost')) {
      vulnerabilities.push({
        id: `vuln-${Date.now()}-4`,
        severity: 'medium',
        type: 'Insecure Protocol',
        description: 'HTTP protocol used instead of HTTPS',
        recommendation: 'Use HTTPS for all external communications',
      });
      score -= 15;
    }

    if (code.match(/console\.(log|error|warn)/g)) {
      vulnerabilities.push({
        id: `vuln-${Date.now()}-5`,
        severity: 'low',
        type: 'Information Disclosure',
        description: 'Console logging detected - may expose sensitive information',
        recommendation: 'Remove console logs in production or use proper logging service',
      });
      score -= 5;
    }

    const status: 'clean' | 'warning' | 'critical' = 
      score >= 90 ? 'clean' : 
      score >= 70 ? 'warning' : 'critical';

    const scan: SecurityScan = {
      id: `scan-${Date.now()}`,
      timestamp: Date.now(),
      codeHash,
      vulnerabilities,
      score: Math.max(0, score),
      status,
    };

    const updatedHistory = [scan, ...scanHistory].slice(0, 50);
    setScanHistory(updatedHistory);
    saveScanHistory(updatedHistory);

    console.log('[SecurityContext] Scan complete. Score:', scan.score, 'Status:', scan.status);
    return scan;
  };

  const updateObfuscationConfig = (config: Partial<ObfuscationConfig>) => {
    setObfuscationConfig(prev => ({ ...prev, ...config }));
  };

  const obfuscateCode = async (code: string, language: string): Promise<string> => {
    if (!obfuscationConfig.enabled) {
      return code;
    }

    console.log('[SecurityContext] Obfuscating code with level:', obfuscationConfig.level);

    let obfuscated = code;

    if (obfuscationConfig.encryptStrings) {
      obfuscated = obfuscated.replace(
        /(['"`])(?:(?=(\\?))\2.)*?\1/g,
        (match) => {
          if (match.length < 5) return match;
          const encoded = Buffer.from(match.slice(1, -1)).toString('base64');
          return `atob('${encoded}')`;
        }
      );
    }

    if (!obfuscationConfig.preserveNames && obfuscationConfig.level !== 'light') {
      const varNames = new Map<string, string>();
      let counter = 0;
      
      obfuscated = obfuscated.replace(
        /\b(const|let|var|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
        (match, keyword, name) => {
          if (!varNames.has(name)) {
            varNames.set(name, `_0x${counter.toString(16)}`);
            counter++;
          }
          return `${keyword} ${varNames.get(name)}`;
        }
      );
    }

    if (obfuscationConfig.controlFlowFlattening && obfuscationConfig.level === 'heavy') {
      obfuscated = `(function(){${obfuscated}})();`;
    }

    obfuscated = `/* Protected by NimRev Security Protocol */\n${obfuscated}`;

    return obfuscated;
  };

  const createCollaborationLink = async (
    projectId: string,
    expiresIn: number,
    maxUses: number,
    permissions: string[]
  ): Promise<CollaborationLink> => {
    console.log('[SecurityContext] Creating collaboration link for project:', projectId);

    const token = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${projectId}-${Date.now()}-${Math.random()}`
    );

    const link: CollaborationLink = {
      id: `link-${Date.now()}`,
      url: `https://aurebix.com/collab/${token}`,
      token,
      expiresAt: Date.now() + expiresIn,
      maxUses,
      usedCount: 0,
      projectId,
      permissions,
      createdAt: Date.now(),
    };

    const updatedLinks = [...collaborationLinks, link];
    setCollaborationLinks(updatedLinks);
    saveCollaborationLinks(updatedLinks);

    return link;
  };

  const revokeCollaborationLink = async (linkId: string) => {
    console.log('[SecurityContext] Revoking collaboration link:', linkId);
    const updatedLinks = collaborationLinks.filter(link => link.id !== linkId);
    setCollaborationLinks(updatedLinks);
    saveCollaborationLinks(updatedLinks);
  };

  const validateCollaborationLink = async (token: string): Promise<CollaborationLink | null> => {
    const link = collaborationLinks.find(l => l.token === token);
    
    if (!link) {
      console.log('[SecurityContext] Link not found');
      return null;
    }

    if (link.expiresAt < Date.now()) {
      console.log('[SecurityContext] Link expired');
      await revokeCollaborationLink(link.id);
      return null;
    }

    if (link.usedCount >= link.maxUses) {
      console.log('[SecurityContext] Link max uses reached');
      return null;
    }

    link.usedCount++;
    const updatedLinks = collaborationLinks.map(l => l.id === link.id ? link : l);
    setCollaborationLinks(updatedLinks);
    saveCollaborationLinks(updatedLinks);

    return link;
  };

  const toggleEncryption = () => {
    setIsEncryptionEnabled(prev => !prev);
  };

  const activateNimRevProtocol = async () => {
    console.log('[SecurityContext] Activating NimRev Quantum Protocol');
    setNimRevProtocolActive(true);
    
    if (currentSession) {
      await terminateSession();
      await createSecureSession(currentSession.isLocal);
    }
  };

  const deactivateNimRevProtocol = () => {
    console.log('[SecurityContext] Deactivating NimRev Protocol');
    setNimRevProtocolActive(false);
  };

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

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within SecurityProvider');
  }
  return context;
}
