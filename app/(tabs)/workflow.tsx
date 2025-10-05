import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  PanResponder,
  Animated,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Workflow as WorkflowIcon,
  Play,
  Plus,
  Save,
  Trash2,
  Settings,
  Zap,
  Code,
  Database,
  GitBranch,
  Filter,
  Globe,
  Box,
  ArrowRight,
  X,
  Copy,
  Eye,
  Pause,
  RotateCw,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useWorkflow, WorkflowNode, WorkflowConnection } from '@/contexts/WorkflowContext';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const NODE_TYPES = [
  { type: 'trigger' as const, label: 'Trigger', icon: Zap, color: Colors.Colors.cyan.primary },
  { type: 'ai-agent' as const, label: 'AI Agent', icon: Zap, color: Colors.Colors.red.primary },
  { type: 'code' as const, label: 'Code', icon: Code, color: Colors.Colors.success },
  { type: 'condition' as const, label: 'Condition', icon: GitBranch, color: Colors.Colors.warning },
  { type: 'api' as const, label: 'API Call', icon: Globe, color: Colors.Colors.cyan.primary },
  { type: 'database' as const, label: 'Database', icon: Database, color: Colors.Colors.red.primary },
  { type: 'transform' as const, label: 'Transform', icon: Filter, color: Colors.Colors.success },
  { type: 'action' as const, label: 'Action', icon: Box, color: Colors.Colors.warning },
];

export default function WorkflowScreen() {
  const insets = useSafeAreaInsets();
  const {
    workflows,
    currentWorkflow,
    executions,
    isExecuting,
    loadWorkflows,
    createWorkflow,
    updateWorkflow,
    setCurrentWorkflow,
    addNode,
    updateNode,
    deleteNode,
    addConnection,
    deleteConnection,
    executeWorkflow,
  } = useWorkflow();

  const [showNodePalette, setShowNodePalette] = useState<boolean>(false);
  const [showWorkflowList, setShowWorkflowList] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [showNodeConfig, setShowNodeConfig] = useState<boolean>(false);
  const [canvasOffset, setCanvasOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [newWorkflowName, setNewWorkflowName] = useState<string>('');
  const [showExecutionLogs, setShowExecutionLogs] = useState<boolean>(false);

  React.useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) {
      Alert.alert('Error', 'Please enter a workflow name');
      return;
    }

    try {
      await createWorkflow(newWorkflowName, 'New workflow');
      setNewWorkflowName('');
      setShowWorkflowList(false);
      Alert.alert('Success', `Workflow "${newWorkflowName}" created`);
    } catch (error) {
      Alert.alert('Error', 'Failed to create workflow');
      console.error('[Workflow] Create error:', error);
    }
  };

  const handleAddNode = async (nodeType: WorkflowNode['type']) => {
    if (!currentWorkflow) {
      Alert.alert('No Workflow', 'Please create or select a workflow first');
      return;
    }

    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }

    const nodeTypeConfig = NODE_TYPES.find(nt => nt.type === nodeType);
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: nodeType,
      label: nodeTypeConfig?.label || nodeType,
      position: {
        x: 150 + Math.random() * 200,
        y: 150 + Math.random() * 200,
      },
      data: {},
      config: {
        color: nodeTypeConfig?.color,
        inputs: nodeType === 'trigger' ? [] : ['input'],
        outputs: ['output'],
      },
    };

    await addNode(currentWorkflow.id, newNode);
    setShowNodePalette(false);
    console.log(`[Workflow] Added node: ${newNode.label}`);
  };

  const handleNodePress = (node: WorkflowNode) => {
    setSelectedNode(node);
    setShowNodeConfig(true);
  };

  const handleNodeLongPress = async (node: WorkflowNode) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      node.label,
      'What would you like to do?',
      [
        { text: 'Configure', onPress: () => handleNodePress(node) },
        { text: 'Duplicate', onPress: () => handleDuplicateNode(node) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteNode(node.id),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDuplicateNode = async (node: WorkflowNode) => {
    if (!currentWorkflow) return;

    const duplicatedNode: WorkflowNode = {
      ...node,
      id: `node-${Date.now()}`,
      label: `${node.label} (Copy)`,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
    };

    await addNode(currentWorkflow.id, duplicatedNode);
    console.log(`[Workflow] Duplicated node: ${node.label}`);
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!currentWorkflow) return;

    Alert.alert(
      'Delete Node',
      'Are you sure you want to delete this node?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteNode(currentWorkflow.id, nodeId);
            if (selectedNode?.id === nodeId) {
              setSelectedNode(null);
              setShowNodeConfig(false);
            }
            console.log(`[Workflow] Deleted node: ${nodeId}`);
          },
        },
      ]
    );
  };

  const handleConnectNodes = async (sourceId: string, targetId: string) => {
    if (!currentWorkflow) return;

    const existingConnection = currentWorkflow.connections.find(
      c => c.source === sourceId && c.target === targetId
    );

    if (existingConnection) {
      Alert.alert('Connection Exists', 'These nodes are already connected');
      return;
    }

    const newConnection: WorkflowConnection = {
      id: `conn-${Date.now()}`,
      source: sourceId,
      target: targetId,
    };

    await addConnection(currentWorkflow.id, newConnection);
    setConnectingFrom(null);
    console.log(`[Workflow] Connected ${sourceId} to ${targetId}`);
  };

  const handleExecuteWorkflow = async () => {
    if (!currentWorkflow) {
      Alert.alert('No Workflow', 'Please select a workflow to execute');
      return;
    }

    if (currentWorkflow.nodes.length === 0) {
      Alert.alert('Empty Workflow', 'Please add nodes to your workflow first');
      return;
    }

    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      console.log(`[Workflow] Executing workflow: ${currentWorkflow.name}`);
      const execution = await executeWorkflow(currentWorkflow.id);
      
      if (execution) {
        setShowExecutionLogs(true);
        Alert.alert(
          'Execution Complete',
          `Workflow "${currentWorkflow.name}" executed successfully!\n\nStatus: ${execution.status}\nNodes executed: ${currentWorkflow.nodes.length}\nDuration: ${execution.endTime && execution.startTime ? Math.round((execution.endTime.getTime() - execution.startTime.getTime()) / 1000) : 0}s`,
          [
            { text: 'View Logs', onPress: () => setShowExecutionLogs(true) },
            { text: 'OK' },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Execution Failed', error instanceof Error ? error.message : 'Unknown error');
      console.error('[Workflow] Execution error:', error);
    }
  };

  const handleSaveWorkflow = async () => {
    if (!currentWorkflow) return;

    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Alert.alert('Saved', `Workflow "${currentWorkflow.name}" saved successfully`);
    console.log(`[Workflow] Saved workflow: ${currentWorkflow.name}`);
  };

  const renderNode = (node: WorkflowNode) => {
    const nodeTypeConfig = NODE_TYPES.find(nt => nt.type === node.type);
    const Icon = nodeTypeConfig?.icon || Box;
    const isSelected = selectedNode?.id === node.id;
    const isConnecting = connectingFrom === node.id;

    return (
      <TouchableOpacity
        key={node.id}
        style={[
          styles.node,
          {
            left: node.position.x * zoom + canvasOffset.x,
            top: node.position.y * zoom + canvasOffset.y,
            borderColor: node.config.color || Colors.Colors.border.primary,
            backgroundColor: isSelected
              ? Colors.Colors.background.card
              : Colors.Colors.background.secondary,
            borderWidth: isSelected ? 2 : 1,
            transform: [{ scale: isConnecting ? 1.1 : 1 }],
          },
        ]}
        onPress={() => handleNodePress(node)}
        onLongPress={() => handleNodeLongPress(node)}
      >
        <View style={styles.nodeHeader}>
          <Icon color={node.config.color || Colors.Colors.text.primary} size={16} />
          <Text style={styles.nodeLabel} numberOfLines={1}>
            {node.label}
          </Text>
        </View>
        <Text style={styles.nodeType}>{node.type}</Text>

        {node.config.inputs && node.config.inputs.length > 0 && (
          <TouchableOpacity
            style={[styles.nodePort, styles.nodePortInput]}
            onPress={() => {
              if (connectingFrom && connectingFrom !== node.id) {
                handleConnectNodes(connectingFrom, node.id);
              }
            }}
          >
            <View style={[styles.nodePortDot, { backgroundColor: node.config.color }]} />
          </TouchableOpacity>
        )}

        {node.config.outputs && node.config.outputs.length > 0 && (
          <TouchableOpacity
            style={[styles.nodePort, styles.nodePortOutput]}
            onPress={() => {
              setConnectingFrom(connectingFrom === node.id ? null : node.id);
            }}
          >
            <View style={[styles.nodePortDot, { backgroundColor: node.config.color }]} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderConnection = (connection: WorkflowConnection) => {
    const sourceNode = currentWorkflow?.nodes.find(n => n.id === connection.source);
    const targetNode = currentWorkflow?.nodes.find(n => n.id === connection.target);

    if (!sourceNode || !targetNode) return null;

    const startX = (sourceNode.position.x + 60) * zoom + canvasOffset.x;
    const startY = (sourceNode.position.y + 30) * zoom + canvasOffset.y;
    const endX = (targetNode.position.x) * zoom + canvasOffset.x;
    const endY = (targetNode.position.y + 30) * zoom + canvasOffset.y;

    return (
      <View
        key={connection.id}
        style={[
          styles.connection,
          {
            left: startX,
            top: startY,
            width: Math.abs(endX - startX),
            height: 2,
            transform: [
              { rotate: `${Math.atan2(endY - startY, endX - startX)}rad` },
            ],
          },
        ]}
      />
    );
  };

  const latestExecution = executions.length > 0 ? executions[executions.length - 1] : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <WorkflowIcon color={Colors.Colors.cyan.primary} size={24} />
        <Text style={styles.headerTitle}>Workflow Automation</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowWorkflowList(true)}
        >
          <Settings color={Colors.Colors.text.muted} size={20} />
        </TouchableOpacity>
      </View>

      {currentWorkflow && (
        <View style={styles.workflowInfo}>
          <View style={{ flex: 1 }}>
            <Text style={styles.workflowName}>{currentWorkflow.name}</Text>
            <Text style={styles.workflowMeta}>
              {currentWorkflow.nodes.length} nodes • {currentWorkflow.connections.length} connections • {currentWorkflow.runCount} runs
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentWorkflow.status) }]}>
            <Text style={styles.statusText}>{currentWorkflow.status}</Text>
          </View>
        </View>
      )}

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => setShowNodePalette(true)}
        >
          <Plus color={Colors.Colors.cyan.primary} size={18} />
          <Text style={styles.toolbarButtonText}>Add Node</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolbarButton, isExecuting && styles.toolbarButtonDisabled]}
          onPress={handleExecuteWorkflow}
          disabled={isExecuting}
        >
          <Play color={Colors.Colors.success} size={18} />
          <Text style={styles.toolbarButtonText}>
            {isExecuting ? 'Running...' : 'Run'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolbarButton} onPress={handleSaveWorkflow}>
          <Save color={Colors.Colors.warning} size={18} />
          <Text style={styles.toolbarButtonText}>Save</Text>
        </TouchableOpacity>

        {latestExecution && (
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => setShowExecutionLogs(true)}
          >
            <Eye color={Colors.Colors.text.muted} size={18} />
            <Text style={styles.toolbarButtonText}>Logs</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.canvas}
        horizontal
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          style={styles.canvasInner}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.canvasContent}>
            {currentWorkflow?.connections.map(renderConnection)}
            {currentWorkflow?.nodes.map(renderNode)}

            {!currentWorkflow && (
              <View style={styles.emptyState}>
                <WorkflowIcon color={Colors.Colors.text.muted} size={64} />
                <Text style={styles.emptyStateTitle}>No Workflow Selected</Text>
                <Text style={styles.emptyStateText}>
                  Create a new workflow to start building automation
                </Text>
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => setShowWorkflowList(true)}
                >
                  <Plus color={Colors.Colors.text.inverse} size={20} />
                  <Text style={styles.emptyStateButtonText}>Create Workflow</Text>
                </TouchableOpacity>
              </View>
            )}

            {currentWorkflow && currentWorkflow.nodes.length === 0 && (
              <View style={styles.emptyState}>
                <Box color={Colors.Colors.text.muted} size={64} />
                <Text style={styles.emptyStateTitle}>Empty Canvas</Text>
                <Text style={styles.emptyStateText}>
                  Add nodes to start building your workflow
                </Text>
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => setShowNodePalette(true)}
                >
                  <Plus color={Colors.Colors.text.inverse} size={20} />
                  <Text style={styles.emptyStateButtonText}>Add First Node</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </ScrollView>

      {connectingFrom && (
        <View style={styles.connectingBanner}>
          <Text style={styles.connectingText}>
            Connecting from node... Tap target node to connect
          </Text>
          <TouchableOpacity onPress={() => setConnectingFrom(null)}>
            <X color={Colors.Colors.text.inverse} size={20} />
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showNodePalette} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Node</Text>
              <TouchableOpacity onPress={() => setShowNodePalette(false)}>
                <X color={Colors.Colors.text.muted} size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.nodePalette}>
              {NODE_TYPES.map(nodeType => {
                const Icon = nodeType.icon;
                return (
                  <TouchableOpacity
                    key={nodeType.type}
                    style={styles.nodePaletteItem}
                    onPress={() => handleAddNode(nodeType.type)}
                  >
                    <View
                      style={[
                        styles.nodePaletteIcon,
                        { backgroundColor: nodeType.color + '20' },
                      ]}
                    >
                      <Icon color={nodeType.color} size={24} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.nodePaletteLabel}>{nodeType.label}</Text>
                      <Text style={styles.nodePaletteType}>{nodeType.type}</Text>
                    </View>
                    <ArrowRight color={Colors.Colors.text.muted} size={20} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showWorkflowList} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Workflows</Text>
              <TouchableOpacity onPress={() => setShowWorkflowList(false)}>
                <X color={Colors.Colors.text.muted} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.createWorkflowSection}>
              <TextInput
                style={styles.workflowNameInput}
                placeholder="New workflow name..."
                placeholderTextColor={Colors.Colors.text.muted}
                value={newWorkflowName}
                onChangeText={setNewWorkflowName}
              />
              <TouchableOpacity
                style={styles.createWorkflowButton}
                onPress={handleCreateWorkflow}
              >
                <Plus color={Colors.Colors.text.inverse} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.workflowList}>
              {workflows.map(workflow => (
                <TouchableOpacity
                  key={workflow.id}
                  style={[
                    styles.workflowListItem,
                    currentWorkflow?.id === workflow.id && styles.workflowListItemActive,
                  ]}
                  onPress={() => {
                    setCurrentWorkflow(workflow);
                    setShowWorkflowList(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.workflowListName}>{workflow.name}</Text>
                    <Text style={styles.workflowListMeta}>
                      {workflow.nodes.length} nodes • {workflow.runCount} runs
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.workflowListStatus,
                      { backgroundColor: getStatusColor(workflow.status) },
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showExecutionLogs} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Execution Logs</Text>
              <TouchableOpacity onPress={() => setShowExecutionLogs(false)}>
                <X color={Colors.Colors.text.muted} size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.logsList}>
              {latestExecution?.logs.map(log => (
                <View key={log.id} style={styles.logItem}>
                  <View
                    style={[
                      styles.logLevel,
                      { backgroundColor: getLogLevelColor(log.level) },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logMessage}>{log.message}</Text>
                    <Text style={styles.logTime}>
                      {log.timestamp.toLocaleTimeString()}
                    </Text>
                  </View>
                </View>
              ))}
              {!latestExecution && (
                <Text style={styles.emptyLogsText}>No execution logs available</Text>
              )}
            </ScrollView>
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
    case 'paused':
      return Colors.Colors.warning;
    case 'error':
      return Colors.Colors.error;
    default:
      return Colors.Colors.text.muted;
  }
}

function getLogLevelColor(level: string): string {
  switch (level) {
    case 'success':
      return Colors.Colors.success;
    case 'warning':
      return Colors.Colors.warning;
    case 'error':
      return Colors.Colors.error;
    default:
      return Colors.Colors.cyan.primary;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Colors.cyanOrange.primary,
  },
  headerButton: {
    padding: 8,
  },
  workflowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.Colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
    gap: 12,
  },
  workflowName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.cyanRed.primary,
  },
  workflowMeta: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.Colors.text.inverse,
    textTransform: 'uppercase',
  },
  toolbar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.Colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
    gap: 12,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  toolbarButtonDisabled: {
    opacity: 0.6,
  },
  toolbarButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.Colors.text.secondary,
  },
  canvas: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
  },
  canvasInner: {
    flex: 1,
  },
  canvasContent: {
    width: width * 3,
    height: height * 3,
    position: 'relative',
  },
  node: {
    position: 'absolute',
    width: 120,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  nodeLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
  },
  nodeType: {
    fontSize: 10,
    color: Colors.Colors.text.muted,
    textTransform: 'uppercase',
  },
  nodePort: {
    position: 'absolute',
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodePortInput: {
    left: -8,
    top: '50%',
    marginTop: -8,
  },
  nodePortOutput: {
    right: -8,
    top: '50%',
    marginTop: -8,
  },
  nodePortDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.Colors.background.card,
  },
  connection: {
    position: 'absolute',
    height: 2,
    backgroundColor: Colors.Colors.cyan.primary,
    opacity: 0.6,
  },
  connectingBanner: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: Colors.Colors.cyan.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectingText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Colors.text.inverse,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Colors.cyanRed.primary,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.Colors.text.muted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.cyan.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.inverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.Colors.background.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.Colors.cyanOrange.primary,
  },
  nodePalette: {
    padding: 20,
  },
  nodePaletteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  nodePaletteIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodePaletteLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
  },
  nodePaletteType: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginTop: 2,
  },
  createWorkflowSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  workflowNameInput: {
    flex: 1,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.Colors.text.primary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  createWorkflowButton: {
    backgroundColor: Colors.Colors.cyan.primary,
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workflowList: {
    padding: 20,
  },
  workflowListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  workflowListItemActive: {
    backgroundColor: Colors.Colors.cyan.primary + '20',
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary,
  },
  workflowListName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
  },
  workflowListMeta: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginTop: 2,
  },
  workflowListStatus: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  logsList: {
    padding: 20,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.Colors.background.secondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  logLevel: {
    width: 4,
    height: '100%',
    borderRadius: 2,
  },
  logMessage: {
    fontSize: 14,
    color: Colors.Colors.text.primary,
    marginBottom: 4,
  },
  logTime: {
    fontSize: 11,
    color: Colors.Colors.text.muted,
  },
  emptyLogsText: {
    fontSize: 14,
    color: Colors.Colors.text.muted,
    textAlign: 'center',
    paddingVertical: 40,
  },
});
