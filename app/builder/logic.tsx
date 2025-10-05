import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  Workflow as WorkflowIcon,
  Zap,
  Code,
  Database,
  GitBranch,
  Play,
  Plus,
  Trash2,
  Settings,
  Sparkles,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useWorkflow, WorkflowNode } from '@/contexts/WorkflowContext';

const NODE_TYPES = [
  { type: 'trigger', icon: <Zap size={20} />, label: 'Trigger', color: Colors.Colors.cyan.primary },
  { type: 'action', icon: <Play size={20} />, label: 'Action', color: Colors.Colors.success },
  { type: 'condition', icon: <GitBranch size={20} />, label: 'Condition', color: Colors.Colors.warning },
  { type: 'ai-agent', icon: <Sparkles size={20} />, label: 'AI Agent', color: Colors.Colors.red.primary },
  { type: 'code', icon: <Code size={20} />, label: 'Code', color: Colors.Colors.cyan.primary },
  { type: 'api', icon: <WorkflowIcon size={20} />, label: 'API Call', color: Colors.Colors.warning },
  { type: 'database', icon: <Database size={20} />, label: 'Database', color: Colors.Colors.success },
];

export default function LogicBuilderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    currentWorkflow,
    workflows,
    setCurrentWorkflow,
    addNode,
    updateNode,
    deleteNode,
    executeWorkflow,
    isExecuting,
  } = useWorkflow();

  const [showAddNode, setShowAddNode] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [showNodeConfig, setShowNodeConfig] = useState<boolean>(false);

  const handleAddNode = useCallback(async (type: string) => {
    if (!currentWorkflow) {
      Alert.alert('Error', 'Please select a workflow first');
      return;
    }

    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: type as any,
      label: `${type} ${currentWorkflow.nodes.length + 1}`,
      position: { x: 100, y: 100 + (currentWorkflow.nodes.length * 100) },
      data: {},
      config: {
        color: NODE_TYPES.find(n => n.type === type)?.color,
        inputs: type === 'trigger' ? [] : ['input'],
        outputs: ['output'],
      },
    };

    await addNode(currentWorkflow.id, newNode);
    setShowAddNode(false);
    Alert.alert('Success', `${type} node added`);
  }, [currentWorkflow, addNode]);

  const handleDeleteNode = useCallback(async () => {
    if (!currentWorkflow || !selectedNode) return;

    Alert.alert(
      'Delete Node',
      'Are you sure you want to delete this node?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteNode(currentWorkflow.id, selectedNode.id);
            setSelectedNode(null);
            Alert.alert('Success', 'Node deleted');
          },
        },
      ]
    );
  }, [currentWorkflow, selectedNode, deleteNode]);

  const handleExecuteWorkflow = useCallback(async () => {
    if (!currentWorkflow) return;

    try {
      const result = await executeWorkflow(currentWorkflow.id, {});
      if (result) {
        Alert.alert(
          'Execution Complete',
          `Status: ${result.status}\nLogs: ${result.logs.length} entries`,
          [{ text: 'OK' }]
        );
      }
    } catch {
      Alert.alert('Error', 'Workflow execution failed');
    }
  }, [currentWorkflow, executeWorkflow]);

  if (!currentWorkflow) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen
          options={{
            title: 'Logic Builder',
            headerShown: true,
            headerStyle: { backgroundColor: Colors.Colors.background.primary },
            headerTintColor: Colors.Colors.text.primary,
          }}
        />
        <View style={styles.emptyState}>
          <WorkflowIcon color={Colors.Colors.cyan.primary} size={48} />
          <Text style={styles.emptyStateText}>No workflow selected</Text>
          <Text style={styles.emptyStateSubtext}>
            Create a workflow from the workflow tab to start building logic
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => router.push('/(tabs)/workflow' as any)}
          >
            <Text style={styles.emptyStateButtonText}>Go to Workflows</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: 'Logic Builder',
          headerShown: true,
          headerStyle: { backgroundColor: Colors.Colors.background.primary },
          headerTintColor: Colors.Colors.text.primary,
        }}
      />

      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          <Text style={styles.workflowName}>{currentWorkflow.name}</Text>
          <Text style={styles.workflowStatus}>{currentWorkflow.status}</Text>
        </View>

        <View style={styles.toolbarRight}>
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => setShowAddNode(true)}
          >
            <Plus color={Colors.Colors.cyan.primary} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolbarButton, isExecuting && styles.toolbarButtonDisabled]}
            onPress={handleExecuteWorkflow}
            disabled={isExecuting}
          >
            <Play color={Colors.Colors.success} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.canvas}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.canvasGrid}>
              {currentWorkflow.nodes.map((node) => (
                <TouchableOpacity
                  key={node.id}
                  style={[
                    styles.node,
                    {
                      left: node.position.x,
                      top: node.position.y,
                      borderColor: node.config.color || Colors.Colors.border.muted,
                    },
                    selectedNode?.id === node.id && styles.nodeSelected,
                  ]}
                  onPress={() => {
                    setSelectedNode(node);
                    setShowNodeConfig(true);
                  }}
                >
                  <View style={[styles.nodeHeader, { backgroundColor: node.config.color + '20' }]}>
                    <Text style={styles.nodeType}>{node.type}</Text>
                  </View>
                  <Text style={styles.nodeLabel}>{node.label}</Text>
                </TouchableOpacity>
              ))}

              {currentWorkflow.nodes.length === 0 && (
                <View style={styles.canvasEmpty}>
                  <WorkflowIcon color={Colors.Colors.text.muted} size={48} />
                  <Text style={styles.canvasEmptyText}>
                    Add nodes to build your workflow logic
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Workflow Info</Text>
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Nodes</Text>
            <Text style={styles.infoValue}>{currentWorkflow.nodes.length}</Text>
          </View>
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Connections</Text>
            <Text style={styles.infoValue}>{currentWorkflow.connections.length}</Text>
          </View>
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Run Count</Text>
            <Text style={styles.infoValue}>{currentWorkflow.runCount}</Text>
          </View>
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, { color: getStatusColor(currentWorkflow.status) }]}>
              {currentWorkflow.status}
            </Text>
          </View>
        </View>
      </View>

      <Modal
        visible={showAddNode}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddNode(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Node</Text>
            <Text style={styles.modalSubtitle}>Choose a node type to add to your workflow</Text>

            <ScrollView style={styles.nodeTypeList}>
              {NODE_TYPES.map((nodeType) => (
                <TouchableOpacity
                  key={nodeType.type}
                  style={styles.nodeTypeItem}
                  onPress={() => handleAddNode(nodeType.type)}
                >
                  <View style={[styles.nodeTypeIcon, { backgroundColor: nodeType.color + '20' }]}>
                    {nodeType.icon}
                  </View>
                  <View style={styles.nodeTypeInfo}>
                    <Text style={styles.nodeTypeLabel}>{nodeType.label}</Text>
                    <Text style={styles.nodeTypeDescription}>{nodeType.type}</Text>
                  </View>
                  <Plus color={Colors.Colors.text.muted} size={20} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAddNode(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showNodeConfig}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNodeConfig(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedNode && (
              <>
                <Text style={styles.modalTitle}>Configure Node</Text>
                <Text style={styles.modalSubtitle}>{selectedNode.type}</Text>

                <View style={styles.configSection}>
                  <Text style={styles.configLabel}>Label</Text>
                  <TextInput
                    style={styles.configInput}
                    value={selectedNode.label}
                    onChangeText={(text) => {
                      if (currentWorkflow) {
                        updateNode(currentWorkflow.id, selectedNode.id, { label: text });
                      }
                    }}
                    placeholderTextColor={Colors.Colors.text.muted}
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonDanger]}
                    onPress={handleDeleteNode}
                  >
                    <Trash2 color={Colors.Colors.text.inverse} size={20} />
                    <Text style={styles.modalButtonText}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonPrimary]}
                    onPress={() => setShowNodeConfig(false)}
                  >
                    <Text style={styles.modalButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return Colors.Colors.success;
    case 'error':
      return Colors.Colors.error;
    case 'paused':
      return Colors.Colors.warning;
    default:
      return Colors.Colors.text.muted;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.Colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  toolbarLeft: {
    flex: 1,
  },
  workflowName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
  },
  workflowStatus: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginTop: 2,
  },
  toolbarRight: {
    flexDirection: 'row',
    gap: 8,
  },
  toolbarButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.Colors.background.secondary,
  },
  toolbarButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  canvas: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
  },
  canvasGrid: {
    flex: 1,
    minHeight: 600,
    position: 'relative',
    padding: 20,
  },
  node: {
    position: 'absolute',
    width: 180,
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  nodeSelected: {
    borderWidth: 3,
    borderColor: Colors.Colors.cyan.primary,
  },
  nodeHeader: {
    padding: 8,
  },
  nodeType: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
    textTransform: 'uppercase',
  },
  nodeLabel: {
    fontSize: 14,
    color: Colors.Colors.text.primary,
    padding: 12,
  },
  canvasEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 400,
  },
  canvasEmptyText: {
    fontSize: 14,
    color: Colors.Colors.text.muted,
    textAlign: 'center',
    marginTop: 16,
  },
  sidebar: {
    width: 250,
    backgroundColor: Colors.Colors.background.card,
    borderLeftWidth: 1,
    borderLeftColor: Colors.Colors.border.muted,
    padding: 16,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
    marginBottom: 16,
  },
  infoSection: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.Colors.text.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: Colors.Colors.cyan.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.inverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    marginBottom: 16,
  },
  nodeTypeList: {
    maxHeight: 400,
  },
  nodeTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
    gap: 12,
  },
  nodeTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeTypeInfo: {
    flex: 1,
  },
  nodeTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
  },
  nodeTypeDescription: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  modalCloseButton: {
    marginTop: 16,
    padding: 14,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
  },
  configSection: {
    marginBottom: 16,
  },
  configLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.Colors.text.secondary,
    marginBottom: 8,
  },
  configInput: {
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    color: Colors.Colors.text.primary,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  modalButtonPrimary: {
    backgroundColor: Colors.Colors.cyan.primary,
  },
  modalButtonDanger: {
    backgroundColor: Colors.Colors.error,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.inverse,
  },
});
