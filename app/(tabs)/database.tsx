import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Database,
  Play,
  Save,
  History,
  Settings,
  Table,
  BarChart3,
  X,
  Check,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useDatabase } from '@/contexts/DatabaseContext';

type TabType = 'query' | 'tables' | 'history' | 'saved' | 'analytics';

export default function DatabaseScreen() {
  const insets = useSafeAreaInsets();
  const {
    activeConnection,
    connections,
    queryHistory,
    savedQueries,
    executeQuery,
    saveQuery,
    setActiveConnectionById,
  } = useDatabase();

  const [activeTab, setActiveTab] = useState<TabType>('query');
  const [sqlQuery, setSqlQuery] = useState<string>('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveQueryName, setSaveQueryName] = useState('');
  const [saveQueryDesc, setSaveQueryDesc] = useState('');
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  const handleExecuteQuery = async () => {
    if (!sqlQuery.trim()) {
      Alert.alert('Error', 'Please enter a SQL query');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setQueryResult(null);

    try {
      const result = await executeQuery(sqlQuery);
      setQueryResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSaveQuery = async () => {
    if (!saveQueryName.trim()) {
      Alert.alert('Error', 'Please enter a query name');
      return;
    }

    try {
      await saveQuery(saveQueryName, sqlQuery, saveQueryDesc);
      setShowSaveModal(false);
      setSaveQueryName('');
      setSaveQueryDesc('');
      Alert.alert('Success', 'Query saved successfully');
    } catch {
      Alert.alert('Error', 'Failed to save query');
    }
  };

  const loadSavedQuery = (query: string) => {
    setSqlQuery(query);
    setActiveTab('query');
  };

  const renderQueryEditor = () => (
    <View style={styles.editorContainer}>
      <View style={styles.editorHeader}>
        <Text style={styles.editorTitle}>SQL Query Editor</Text>
        <View style={styles.editorActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowSaveModal(true)}
            disabled={!sqlQuery.trim()}
          >
            <Save color={sqlQuery.trim() ? Colors.Colors.cyan.primary : Colors.Colors.text.muted} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.executeButton]}
            onPress={handleExecuteQuery}
            disabled={isExecuting || !sqlQuery.trim()}
          >
            {isExecuting ? (
              <ActivityIndicator size="small" color={Colors.Colors.text.secondary} />
            ) : (
              <>
                <Play color={Colors.Colors.text.secondary} size={20} />
                <Text style={styles.executeButtonText}>Execute</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={styles.queryInput}
        value={sqlQuery}
        onChangeText={setSqlQuery}
        placeholder="Enter your SQL query here..."
        placeholderTextColor={Colors.Colors.text.muted}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
      />

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {queryResult && (
        <View style={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>Query Results</Text>
            <Text style={styles.resultMeta}>
              {queryResult.rowCount} rows • {queryResult.command}
            </Text>
          </View>

          <ScrollView horizontal style={styles.tableScroll}>
            <View>
              <View style={styles.tableHeader}>
                {queryResult.fields?.map((field: any, idx: number) => (
                  <View key={idx} style={styles.tableHeaderCell}>
                    <Text style={styles.tableHeaderText}>{field.name}</Text>
                  </View>
                ))}
              </View>

              <ScrollView style={styles.tableBody}>
                {queryResult.rows?.map((row: any, rowIdx: number) => (
                  <View key={rowIdx} style={styles.tableRow}>
                    {queryResult.fields?.map((field: any, colIdx: number) => (
                      <View key={colIdx} style={styles.tableCell}>
                        <Text style={styles.tableCellText}>
                          {row[field.name] !== null ? String(row[field.name]) : 'NULL'}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderHistory = () => (
    <ScrollView style={styles.listContainer}>
      <Text style={styles.sectionTitle}>Query History</Text>
      {queryHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <History color={Colors.Colors.text.muted} size={48} />
          <Text style={styles.emptyStateText}>No query history yet</Text>
        </View>
      ) : (
        queryHistory.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.historyItem}
            onPress={() => loadSavedQuery(item.query)}
          >
            <View style={styles.historyHeader}>
              <View style={[styles.statusBadge, item.success ? styles.successBadge : styles.errorBadge]}>
                <Text style={styles.statusText}>{item.success ? 'Success' : 'Failed'}</Text>
              </View>
              <Text style={styles.historyTime}>
                {new Date(item.timestamp).toLocaleString()}
              </Text>
            </View>
            <Text style={styles.historyQuery} numberOfLines={2}>
              {item.query}
            </Text>
            <View style={styles.historyFooter}>
              <Text style={styles.historyMeta}>{item.duration}ms</Text>
              {item.rowCount !== undefined && (
                <Text style={styles.historyMeta}>{item.rowCount} rows</Text>
              )}
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  const renderSavedQueries = () => (
    <ScrollView style={styles.listContainer}>
      <Text style={styles.sectionTitle}>Saved Queries</Text>
      {savedQueries.length === 0 ? (
        <View style={styles.emptyState}>
          <Save color={Colors.Colors.text.muted} size={48} />
          <Text style={styles.emptyStateText}>No saved queries yet</Text>
        </View>
      ) : (
        savedQueries.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.savedItem}
            onPress={() => loadSavedQuery(item.query)}
          >
            <Text style={styles.savedName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.savedDesc}>{item.description}</Text>
            )}
            <Text style={styles.savedQuery} numberOfLines={2}>
              {item.query}
            </Text>
            <Text style={styles.savedDate}>
              Created: {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  const renderConnectionModal = () => (
    <Modal
      visible={showConnectionModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowConnectionModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Connection</Text>
            <TouchableOpacity onPress={() => setShowConnectionModal(false)}>
              <X color={Colors.Colors.text.primary} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.connectionList}>
            {connections.map((conn) => (
              <TouchableOpacity
                key={conn.id}
                style={[
                  styles.connectionItem,
                  conn.isActive && styles.activeConnectionItem,
                ]}
                onPress={() => {
                  setActiveConnectionById(conn.id);
                  setShowConnectionModal(false);
                }}
              >
                <View style={styles.connectionInfo}>
                  <Text style={styles.connectionName}>{conn.name}</Text>
                  <Text style={styles.connectionDetails}>
                    {conn.host}:{conn.port}/{conn.database}
                  </Text>
                </View>
                {conn.isActive && (
                  <Check color={Colors.Colors.cyan.primary} size={20} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderSaveQueryModal = () => (
    <Modal
      visible={showSaveModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSaveModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Save Query</Text>
            <TouchableOpacity onPress={() => setShowSaveModal(false)}>
              <X color={Colors.Colors.text.primary} size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>Query Name *</Text>
            <TextInput
              style={styles.modalInput}
              value={saveQueryName}
              onChangeText={setSaveQueryName}
              placeholder="Enter query name"
              placeholderTextColor={Colors.Colors.text.muted}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={saveQueryDesc}
              onChangeText={setSaveQueryDesc}
              placeholder="Enter description (optional)"
              placeholderTextColor={Colors.Colors.text.muted}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveQuery}
            >
              <Text style={styles.saveButtonText}>Save Query</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <Database color={Colors.Colors.cyan.primary} size={28} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Database Manager</Text>
            {activeConnection && (
              <TouchableOpacity onPress={() => setShowConnectionModal(true)}>
                <Text style={styles.headerSubtitle}>
                  {activeConnection.name} • {activeConnection.database}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={() => setShowConnectionModal(true)}>
          <Settings color={Colors.Colors.cyan.primary} size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'query' && styles.activeTab]}
          onPress={() => setActiveTab('query')}
        >
          <Play color={activeTab === 'query' ? Colors.Colors.cyan.primary : Colors.Colors.text.muted} size={20} />
          <Text style={[styles.tabText, activeTab === 'query' && styles.activeTabText]}>Query</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'tables' && styles.activeTab]}
          onPress={() => setActiveTab('tables')}
        >
          <Table color={activeTab === 'tables' ? Colors.Colors.cyan.primary : Colors.Colors.text.muted} size={20} />
          <Text style={[styles.tabText, activeTab === 'tables' && styles.activeTabText]}>Tables</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <History color={activeTab === 'history' ? Colors.Colors.cyan.primary : Colors.Colors.text.muted} size={20} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
          onPress={() => setActiveTab('saved')}
        >
          <Save color={activeTab === 'saved' ? Colors.Colors.cyan.primary : Colors.Colors.text.muted} size={20} />
          <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>Saved</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
          onPress={() => setActiveTab('analytics')}
        >
          <BarChart3 color={activeTab === 'analytics' ? Colors.Colors.cyan.primary : Colors.Colors.text.muted} size={20} />
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]}>Analytics</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'query' && renderQueryEditor()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'saved' && renderSavedQueries()}
        {activeTab === 'tables' && (
          <View style={styles.emptyState}>
            <Table color={Colors.Colors.text.muted} size={48} />
            <Text style={styles.emptyStateText}>Table browser coming soon</Text>
          </View>
        )}
        {activeTab === 'analytics' && (
          <View style={styles.emptyState}>
            <BarChart3 color={Colors.Colors.text.muted} size={48} />
            <Text style={styles.emptyStateText}>Analytics coming soon</Text>
          </View>
        )}
      </View>

      {renderConnectionModal()}
      {renderSaveQueryModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  headerText: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  tabBar: {
    flexDirection: 'row' as const,
    backgroundColor: Colors.Colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  tab: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.Colors.cyan.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.text.muted,
  },
  activeTabText: {
    color: Colors.Colors.cyan.primary,
  },
  content: {
    flex: 1,
  },
  editorContainer: {
    flex: 1,
    padding: 16,
  },
  editorHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  editorTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
  editorActions: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  executeButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: Colors.Colors.cyan.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  executeButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.inverse,
  },
  queryInput: {
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    fontFamily: 'monospace',
    minHeight: 200,
    textAlignVertical: 'top' as const,
  },
  errorContainer: {
    backgroundColor: Colors.Colors.error + '20',
    borderWidth: 1,
    borderColor: Colors.Colors.error,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    color: Colors.Colors.error,
    fontSize: 14,
  },
  resultContainer: {
    marginTop: 16,
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
  resultMeta: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  tableScroll: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row' as const,
    backgroundColor: Colors.Colors.background.card,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableHeaderCell: {
    minWidth: 150,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: Colors.Colors.border.muted,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.Colors.text.primary,
  },
  tableBody: {
    maxHeight: 400,
  },
  tableRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  tableCell: {
    minWidth: 150,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: Colors.Colors.border.muted,
  },
  tableCellText: {
    fontSize: 12,
    color: Colors.Colors.text.secondary,
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.Colors.text.primary,
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.Colors.text.muted,
  },
  historyItem: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  historyHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  successBadge: {
    backgroundColor: Colors.Colors.success + '20',
  },
  errorBadge: {
    backgroundColor: Colors.Colors.error + '20',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.Colors.text.secondary,
  },
  historyTime: {
    fontSize: 10,
    color: Colors.Colors.text.muted,
  },
  historyQuery: {
    fontSize: 12,
    color: Colors.Colors.text.secondary,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  historyFooter: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  historyMeta: {
    fontSize: 10,
    color: Colors.Colors.text.muted,
  },
  savedItem: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  savedName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
    marginBottom: 4,
  },
  savedDesc: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginBottom: 8,
  },
  savedQuery: {
    fontSize: 12,
    color: Colors.Colors.text.secondary,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  savedDate: {
    fontSize: 10,
    color: Colors.Colors.text.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.Colors.background.overlay,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.Colors.border.primary,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.Colors.text.primary,
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: Colors.Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    marginBottom: 16,
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  saveButton: {
    backgroundColor: Colors.Colors.cyan.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center' as const,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.text.inverse,
  },
  connectionList: {
    maxHeight: 400,
  },
  connectionItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  activeConnectionItem: {
    backgroundColor: Colors.Colors.cyan.primary + '10',
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
    marginBottom: 4,
  },
  connectionDetails: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
});
