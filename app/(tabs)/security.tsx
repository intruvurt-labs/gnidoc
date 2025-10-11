import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';

import { Stack } from 'expo-router';
import { 
  Shield, 
  Lock, 
  Unlock, 
  Eye, 
  Scan, 
  Link2, 
  Copy, 
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Brain,
  Zap,
  Clock,
  Users,
} from 'lucide-react-native';
import { useSecurity } from '@/contexts/SecurityContext';

export default function SecurityScreen() {
  const {
    securityLevel,
    setSecurityLevel,
    currentSession,
    createSecureSession,
    terminateSession,
    scanHistory,
    runSecurityScan,
    obfuscationConfig,
    updateObfuscationConfig,
    obfuscateCode,
    collaborationLinks,
    createCollaborationLink,
    revokeCollaborationLink,
    isEncryptionEnabled,
    toggleEncryption,
    nimRevProtocolActive,
    activateNimRevProtocol,
    deactivateNimRevProtocol,
  } = useSecurity();

  const [activeTab, setActiveTab] = useState<'overview' | 'scan' | 'obfuscate' | 'collab'>('overview');
  const [scanCode, setScanCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState(scanHistory[0] || null);

  const [obfuscateInput, setObfuscateInput] = useState('');
  const [obfuscatedOutput, setObfuscatedOutput] = useState('');
  const [isObfuscating, setIsObfuscating] = useState(false);

  const [showCreateLink, setShowCreateLink] = useState(false);
  const [linkProjectId, setLinkProjectId] = useState('');
  const [linkExpiry, setLinkExpiry] = useState('24');
  const [linkMaxUses, setLinkMaxUses] = useState('10');

  useEffect(() => {
    if (scanHistory.length > 0) {
      setLastScan(scanHistory[0]);
    }
  }, [scanHistory]);

  const handleCreateSession = async (isLocal: boolean) => {
    try {
      await createSecureSession(isLocal);
      Alert.alert('Success', `${isLocal ? 'Local' : 'Cloud'} secure session created`);
    } catch {
      Alert.alert('Error', 'Failed to create session');
    }
  };

  const handleRunScan = async () => {
    if (!scanCode.trim()) {
      Alert.alert('Error', 'Please enter code to scan');
      return;
    }

    setIsScanning(true);
    try {
      const result = await runSecurityScan(scanCode, 'javascript');
      setLastScan(result);
      Alert.alert(
        'Scan Complete',
        `Security Score: ${result.score}/100\nStatus: ${result.status.toUpperCase()}\nVulnerabilities: ${result.vulnerabilities.length}`
      );
    } catch {
      Alert.alert('Error', 'Failed to run security scan');
    } finally {
      setIsScanning(false);
    }
  };

  const handleObfuscate = async () => {
    if (!obfuscateInput.trim()) {
      Alert.alert('Error', 'Please enter code to obfuscate');
      return;
    }

    setIsObfuscating(true);
    try {
      const result = await obfuscateCode(obfuscateInput, 'javascript');
      setObfuscatedOutput(result);
    } catch {
      Alert.alert('Error', 'Failed to obfuscate code');
    } finally {
      setIsObfuscating(false);
    }
  };

  const handleCreateCollabLink = async () => {
    if (!linkProjectId.trim()) {
      Alert.alert('Error', 'Please enter project ID');
      return;
    }

    try {
      const expiresIn = parseInt(linkExpiry) * 60 * 60 * 1000;
      const maxUses = parseInt(linkMaxUses);
      
      const link = await createCollaborationLink(
        linkProjectId,
        expiresIn,
        maxUses,
        ['read', 'comment']
      );

      Alert.alert('Success', `Link created: ${link.url}`);
      setShowCreateLink(false);
      setLinkProjectId('');
    } catch {
      Alert.alert('Error', 'Failed to create collaboration link');
    }
  };

  const renderOverview = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.brandingSection}>
        <View style={styles.brandingHeader}>
          <Brain size={40} color="#00FFFF" />
          <Text style={styles.brandingTitle}>gnidoC TerceS</Text>
          <Lock size={32} color="#CCFF00" />
        </View>
        <Text style={styles.brandingSubtitle}>NimRev Security Protocol</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Shield size={24} color="#00FFFF" />
          <Text style={styles.cardTitle}>Security Level</Text>
        </View>
        <View style={styles.securityLevelButtons}>
          {(['standard', 'enhanced', 'maximum'] as const).map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.levelButton,
                securityLevel === level && styles.levelButtonActive,
              ]}
              onPress={() => setSecurityLevel(level)}
            >
              <Text style={[
                styles.levelButtonText,
                securityLevel === level && styles.levelButtonTextActive,
              ]}>
                {level.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Zap size={24} color="#CCFF00" />
          <Text style={styles.cardTitle}>NimRev Quantum Protocol</Text>
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>
            {nimRevProtocolActive ? 'ACTIVE' : 'INACTIVE'}
          </Text>
          <Switch
            value={nimRevProtocolActive}
            onValueChange={nimRevProtocolActive ? deactivateNimRevProtocol : activateNimRevProtocol}
            trackColor={{ false: '#333', true: '#00FFFF' }}
            thumbColor={nimRevProtocolActive ? '#CCFF00' : '#666'}
          />
        </View>
        {nimRevProtocolActive && (
          <Text style={styles.protocolInfo}>
            Quantum-resistant encryption active. All data encrypted with NimRev-Quantum algorithm.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Lock size={24} color="#00FFFF" />
          <Text style={styles.cardTitle}>Encrypted Sessions</Text>
        </View>
        {currentSession ? (
          <View style={styles.sessionInfo}>
            <View style={styles.sessionRow}>
              <Text style={styles.sessionLabel}>Algorithm:</Text>
              <Text style={styles.sessionValue}>{currentSession.algorithm}</Text>
            </View>
            <View style={styles.sessionRow}>
              <Text style={styles.sessionLabel}>Type:</Text>
              <Text style={styles.sessionValue}>
                {currentSession.isLocal ? 'Local' : 'Cloud'}
              </Text>
            </View>
            <View style={styles.sessionRow}>
              <Text style={styles.sessionLabel}>Expires:</Text>
              <Text style={styles.sessionValue}>
                {new Date(currentSession.expiresAt).toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={terminateSession}
            >
              <Text style={styles.dangerButtonText}>Terminate Session</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sessionButtons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => handleCreateSession(true)}
            >
              <Text style={styles.primaryButtonText}>Create Local Session</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => handleCreateSession(false)}
            >
              <Text style={styles.secondaryButtonText}>Create Cloud Session</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          {isEncryptionEnabled ? (
            <Lock size={24} color="#00FFFF" />
          ) : (
            <Unlock size={24} color="#FF6B6B" />
          )}
          <Text style={styles.cardTitle}>Data Encryption</Text>
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>
            {isEncryptionEnabled ? 'ENABLED' : 'DISABLED'}
          </Text>
          <Switch
            value={isEncryptionEnabled}
            onValueChange={toggleEncryption}
            trackColor={{ false: '#333', true: '#00FFFF' }}
            thumbColor={isEncryptionEnabled ? '#CCFF00' : '#666'}
          />
        </View>
      </View>

      {lastScan && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Scan size={24} color="#00FFFF" />
            <Text style={styles.cardTitle}>Last Security Scan</Text>
          </View>
          <View style={styles.scanSummary}>
            <View style={styles.scanScore}>
              <Text style={styles.scanScoreValue}>{lastScan.score}</Text>
              <Text style={styles.scanScoreLabel}>/100</Text>
            </View>
            <View style={styles.scanStatus}>
              {lastScan.status === 'clean' && <CheckCircle size={32} color="#4CAF50" />}
              {lastScan.status === 'warning' && <AlertTriangle size={32} color="#FFA726" />}
              {lastScan.status === 'critical' && <XCircle size={32} color="#FF6B6B" />}
              <Text style={[
                styles.scanStatusText,
                lastScan.status === 'clean' && styles.scanStatusClean,
                lastScan.status === 'warning' && styles.scanStatusWarning,
                lastScan.status === 'critical' && styles.scanStatusCritical,
              ]}>
                {lastScan.status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.scanVulns}>
              {lastScan.vulnerabilities.length} vulnerabilities found
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderScan = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Scan size={24} color="#00FFFF" />
          <Text style={styles.cardTitle}>RATSCan Security Scanner</Text>
        </View>
        <TextInput
          style={styles.codeInput}
          value={scanCode}
          onChangeText={setScanCode}
          placeholder="Paste your code here..."
          placeholderTextColor="#666"
          multiline
        />
        <TouchableOpacity
          style={[styles.primaryButton, isScanning && styles.buttonDisabled]}
          onPress={handleRunScan}
          disabled={isScanning}
        >
          {isScanning ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.primaryButtonText}>Run Security Scan</Text>
          )}
        </TouchableOpacity>
      </View>

      {lastScan && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Scan Results</Text>
          <View style={styles.scanDetails}>
            <View style={styles.scanDetailRow}>
              <Text style={styles.scanDetailLabel}>Score:</Text>
              <Text style={styles.scanDetailValue}>{lastScan.score}/100</Text>
            </View>
            <View style={styles.scanDetailRow}>
              <Text style={styles.scanDetailLabel}>Status:</Text>
              <Text style={[
                styles.scanDetailValue,
                lastScan.status === 'clean' && styles.scanStatusClean,
                lastScan.status === 'warning' && styles.scanStatusWarning,
                lastScan.status === 'critical' && styles.scanStatusCritical,
              ]}>
                {lastScan.status.toUpperCase()}
              </Text>
            </View>
            <View style={styles.scanDetailRow}>
              <Text style={styles.scanDetailLabel}>Vulnerabilities:</Text>
              <Text style={styles.scanDetailValue}>{lastScan.vulnerabilities.length}</Text>
            </View>
          </View>

          {lastScan.vulnerabilities.length > 0 && (
            <View style={styles.vulnerabilities}>
              <Text style={styles.vulnerabilitiesTitle}>Vulnerabilities:</Text>
              {lastScan.vulnerabilities.map((vuln) => (
                <View key={vuln.id} style={styles.vulnerability}>
                  <View style={styles.vulnHeader}>
                    <View style={[
                      styles.severityBadge,
                      vuln.severity === 'critical' && styles.severityCritical,
                      vuln.severity === 'high' && styles.severityHigh,
                      vuln.severity === 'medium' && styles.severityMedium,
                      vuln.severity === 'low' && styles.severityLow,
                    ]}>
                      <Text style={styles.severityText}>{vuln.severity.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.vulnType}>{vuln.type}</Text>
                  </View>
                  <Text style={styles.vulnDescription}>{vuln.description}</Text>
                  <Text style={styles.vulnRecommendation}>
                    💡 {vuln.recommendation}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );

  const renderObfuscate = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Eye size={24} color="#00FFFF" />
          <Text style={styles.cardTitle}>Code Obfuscation</Text>
        </View>

        <View style={styles.obfuscationSettings}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Enable Obfuscation</Text>
            <Switch
              value={obfuscationConfig.enabled}
              onValueChange={(value) => updateObfuscationConfig({ enabled: value })}
              trackColor={{ false: '#333', true: '#00FFFF' }}
              thumbColor={obfuscationConfig.enabled ? '#CCFF00' : '#666'}
            />
          </View>

          <View style={styles.obfuscationLevel}>
            <Text style={styles.obfuscationLevelLabel}>Obfuscation Level:</Text>
            <View style={styles.levelButtons}>
              {(['light', 'medium', 'heavy'] as const).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.levelButtonSmall,
                    obfuscationConfig.level === level && styles.levelButtonActive,
                  ]}
                  onPress={() => updateObfuscationConfig({ level })}
                >
                  <Text style={[
                    styles.levelButtonTextSmall,
                    obfuscationConfig.level === level && styles.levelButtonTextActive,
                  ]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Encrypt Strings</Text>
            <Switch
              value={obfuscationConfig.encryptStrings}
              onValueChange={(value) => updateObfuscationConfig({ encryptStrings: value })}
              trackColor={{ false: '#333', true: '#00FFFF' }}
              thumbColor={obfuscationConfig.encryptStrings ? '#CCFF00' : '#666'}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Control Flow Flattening</Text>
            <Switch
              value={obfuscationConfig.controlFlowFlattening}
              onValueChange={(value) => updateObfuscationConfig({ controlFlowFlattening: value })}
              trackColor={{ false: '#333', true: '#00FFFF' }}
              thumbColor={obfuscationConfig.controlFlowFlattening ? '#CCFF00' : '#666'}
            />
          </View>
        </View>

        <TextInput
          style={styles.codeInput}
          value={obfuscateInput}
          onChangeText={setObfuscateInput}
          placeholder="Enter code to obfuscate..."
          placeholderTextColor="#666"
          multiline
        />

        <TouchableOpacity
          style={[styles.primaryButton, isObfuscating && styles.buttonDisabled]}
          onPress={handleObfuscate}
          disabled={isObfuscating}
        >
          {isObfuscating ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.primaryButtonText}>Obfuscate Code</Text>
          )}
        </TouchableOpacity>

        {obfuscatedOutput && (
          <View style={styles.outputSection}>
            <Text style={styles.outputLabel}>Obfuscated Output:</Text>
            <ScrollView style={styles.outputScroll}>
              <Text style={styles.outputText}>{obfuscatedOutput}</Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => {
                Alert.alert('Copied', 'Obfuscated code copied to clipboard');
              }}
            >
              <Copy size={16} color="#00FFFF" />
              <Text style={styles.copyButtonText}>Copy</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderCollab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Link2 size={24} color="#00FFFF" />
          <Text style={styles.cardTitle}>Secure Collaboration Links</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setShowCreateLink(true)}
        >
          <Text style={styles.primaryButtonText}>Create New Link</Text>
        </TouchableOpacity>

        <View style={styles.linksList}>
          {collaborationLinks.map((link) => (
            <View key={link.id} style={styles.linkCard}>
              <View style={styles.linkHeader}>
                <Users size={20} color="#00FFFF" />
                <Text style={styles.linkProject}>{link.projectId}</Text>
              </View>
              <Text style={styles.linkUrl} numberOfLines={1}>{link.url}</Text>
              <View style={styles.linkStats}>
                <View style={styles.linkStat}>
                  <Clock size={16} color="#CCFF00" />
                  <Text style={styles.linkStatText}>
                    Expires: {new Date(link.expiresAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.linkStat}>
                  <Text style={styles.linkStatText}>
                    Uses: {link.usedCount}/{link.maxUses}
                  </Text>
                </View>
              </View>
              <View style={styles.linkActions}>
                <TouchableOpacity
                  style={styles.linkActionButton}
                  onPress={() => Alert.alert('Copied', 'Link copied to clipboard')}
                >
                  <Copy size={16} color="#00FFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.linkActionButton}
                  onPress={() => revokeCollaborationLink(link.id)}
                >
                  <Trash2 size={16} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {collaborationLinks.length === 0 && (
            <Text style={styles.emptyText}>No collaboration links created yet</Text>
          )}
        </View>
      </View>

      <Modal
        visible={showCreateLink}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateLink(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Collaboration Link</Text>
            
            <TextInput
              style={styles.input}
              value={linkProjectId}
              onChangeText={setLinkProjectId}
              placeholder="Project ID"
              placeholderTextColor="#666"
            />

            <TextInput
              style={styles.input}
              value={linkExpiry}
              onChangeText={setLinkExpiry}
              placeholder="Expires in (hours)"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              value={linkMaxUses}
              onChangeText={setLinkMaxUses}
              placeholder="Max uses"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowCreateLink(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleCreateCollabLink}
              >
                <Text style={styles.modalButtonTextPrimary}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Security & Privacy',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#00FFFF',
          headerTitleStyle: { 
            color: '#00FFFF',
            textShadowColor: '#000',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 2,
          },
        }}
      />

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Shield size={20} color={activeTab === 'overview' ? '#000' : '#00FFFF'} />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'scan' && styles.tabActive]}
          onPress={() => setActiveTab('scan')}
        >
          <Scan size={20} color={activeTab === 'scan' ? '#000' : '#00FFFF'} />
          <Text style={[styles.tabText, activeTab === 'scan' && styles.tabTextActive]}>
            RATSCan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'obfuscate' && styles.tabActive]}
          onPress={() => setActiveTab('obfuscate')}
        >
          <Eye size={20} color={activeTab === 'obfuscate' ? '#000' : '#00FFFF'} />
          <Text style={[styles.tabText, activeTab === 'obfuscate' && styles.tabTextActive]}>
            Obfuscate
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'collab' && styles.tabActive]}
          onPress={() => setActiveTab('collab')}
        >
          <Link2 size={20} color={activeTab === 'collab' ? '#000' : '#00FFFF'} />
          <Text style={[styles.tabText, activeTab === 'collab' && styles.tabTextActive]}>
            Collab
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'scan' && renderScan()}
      {activeTab === 'obfuscate' && renderObfuscate()}
      {activeTab === 'collab' && renderCollab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#00FFFF',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#00FFFF',
  },
  tabText: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#000',
  },
  tabContent: {
    flex: 1,
  },
  brandingSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#00FFFF',
    marginBottom: 16,
  },
  brandingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00FFFF',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  brandingSubtitle: {
    fontSize: 14,
    color: '#CCFF00',
    marginTop: 8,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#00FFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00FFFF',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  securityLevelButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  levelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00FFFF',
    alignItems: 'center',
  },
  levelButtonActive: {
    backgroundColor: '#00FFFF',
  },
  levelButtonText: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  levelButtonTextActive: {
    color: '#000',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    color: '#CCFF00',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  protocolInfo: {
    color: '#00FFFF',
    fontSize: 12,
    marginTop: 12,
    lineHeight: 18,
  },
  sessionInfo: {
    gap: 12,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionLabel: {
    color: '#CCFF00',
    fontSize: 14,
  },
  sessionValue: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sessionButtons: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#00FFFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00FFFF',
  },
  secondaryButtonText: {
    color: '#00FFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  dangerButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  scanSummary: {
    alignItems: 'center',
    gap: 12,
  },
  scanScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scanScoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00FFFF',
  },
  scanScoreLabel: {
    fontSize: 24,
    color: '#666',
  },
  scanStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanStatusText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scanStatusClean: {
    color: '#4CAF50',
  },
  scanStatusWarning: {
    color: '#FFA726',
  },
  scanStatusCritical: {
    color: '#FF6B6B',
  },
  scanVulns: {
    color: '#CCFF00',
    fontSize: 14,
  },
  codeInput: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#00FFFF',
    borderRadius: 8,
    padding: 12,
    color: '#00FFFF',
    fontSize: 14,
    fontFamily: 'monospace',
    minHeight: 200,
    marginBottom: 16,
  },
  scanDetails: {
    gap: 12,
    marginTop: 16,
  },
  scanDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scanDetailLabel: {
    color: '#CCFF00',
    fontSize: 14,
  },
  scanDetailValue: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  vulnerabilities: {
    marginTop: 16,
    gap: 12,
  },
  vulnerabilitiesTitle: {
    color: '#CCFF00',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  vulnerability: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    gap: 8,
  },
  vulnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityCritical: {
    backgroundColor: '#FF6B6B',
  },
  severityHigh: {
    backgroundColor: '#FFA726',
  },
  severityMedium: {
    backgroundColor: '#FFD54F',
  },
  severityLow: {
    backgroundColor: '#4CAF50',
  },
  severityText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  vulnType: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  vulnDescription: {
    color: '#CCC',
    fontSize: 13,
    lineHeight: 18,
  },
  vulnRecommendation: {
    color: '#CCFF00',
    fontSize: 12,
    lineHeight: 16,
  },
  obfuscationSettings: {
    gap: 16,
    marginBottom: 16,
  },
  obfuscationLevel: {
    gap: 8,
  },
  obfuscationLevelLabel: {
    color: '#CCFF00',
    fontSize: 14,
    fontWeight: '600',
  },
  levelButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  levelButtonSmall: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00FFFF',
    alignItems: 'center',
  },
  levelButtonTextSmall: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  outputSection: {
    marginTop: 16,
    gap: 8,
  },
  outputLabel: {
    color: '#CCFF00',
    fontSize: 14,
    fontWeight: '600',
  },
  outputScroll: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#00FFFF',
    borderRadius: 8,
    padding: 12,
    maxHeight: 300,
  },
  outputText: {
    color: '#00FFFF',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00FFFF',
  },
  copyButtonText: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  linksList: {
    marginTop: 16,
    gap: 12,
  },
  linkCard: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#00FFFF',
    gap: 8,
  },
  linkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkProject: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  linkUrl: {
    color: '#CCFF00',
    fontSize: 12,
  },
  linkStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  linkStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkStatText: {
    color: '#CCC',
    fontSize: 11,
  },
  linkActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  linkActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#00FFFF',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00FFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#00FFFF',
    borderRadius: 8,
    padding: 12,
    color: '#00FFFF',
    fontSize: 14,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00FFFF',
  },
  modalButtonPrimary: {
    backgroundColor: '#00FFFF',
  },
  modalButtonText: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
});
