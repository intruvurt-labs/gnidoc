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
import Svg, { Path, Circle } from 'react-native-svg';
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
  Cloud,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useWorkflow, WorkflowNode, WorkflowConnection } from '@/contexts/WorkflowContext';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
const CANVAS_WIDTH = width * 3;
const CANVAS_HEIGHT = height * 3;
const SNAP_DISTANCE = 30;

const NODE_TYPES = [
  { type: 'trigger' as const, label: 'Trigger', icon: Zap, color: Colors.Colors.cyan.primary },
  { type: 'ai-agent' as const, label: 'AI Agent', icon: Zap, color: Colors.Colors.red.primary },
  { type: 'code' as const, label: 'Code', icon: Code, color: Colors.Colors.success },
  { type: 'condition' as const, label: 'Condition', icon: GitBranch, color: Colors.Colors.warning },
  { type: 'api' as const, label: 'API Call', icon: Globe, color: Colors.Colors.cyan.primary },
  { type: 'database' as const, label: 'Database', icon: Database, color: Colors.Colors.red.primary },
  { type: 'transform' as const, label: 'Transform', icon: Filter, color: Colors.Colors.success },
  { type: 'action' as const, label: 'Action', icon: Box, color: Colors.Colors.warning },
  { type: 'weather' as const, label: 'Weather', icon: Cloud, color: Colors.Colors.cyan.primary },
];

interface DraggableNodeProps {
  node: WorkflowNode;
  onPress: () => void;
  onLongPress: () => void;
  onPositionChange: (x: number, y: number) => void;
  isSelected: boolean;
  isConnecting: boolean;
  zoom: number;
  canvasOffset: { x: number; y: number };
  onStartConnection: () => void;
  onEndConnection: () => void;
}

const DraggableNode: React.FC<DraggableNodeProps> = ({
  node,
  onPress,
  onLongPress,
  onPositionChange,
  isSelected,
  isConnecting,
  zoom,
  canvasOffset,
  onStartConnection,
  onEndConnection,
}) => {
  const pan = useRef(new Animated.ValueXY({ x: node.position.x, y: node.position.y })).current;
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        setIsDragging(false);

        const newX = pan.x._value;
        const newY = pan.y._value;

        const boundedX = Math.max(0, Math.min(CANVAS_WIDTH - 120, newX));
        const boundedY = Math.max(0, Math.min(CANVAS_HEIGHT - 100, newY));

        pan.setValue({ x: boundedX, y: boundedY });
        onPositionChange(boundedX, boundedY);

        if (Math.abs(gesture.dx) < 5 && Math.abs(gesture.dy) < 5) {
          onPress();
        }
      },
    })
  ).current;

  const nodeTypeConfig = NODE_TYPES.find((nt) => nt.type === node.type);
  const Icon = nodeTypeConfig?.icon || Box;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.node,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: isDragging ? 1.1 : 1 }],
          borderColor: node.config.color || Colors.Colors.border.primary,
          backgroundColor: isSelected
            ? Colors.Colors.background.card
            : Colors.Colors.background.secondary,
          borderWidth: isSelected ? 2 : 1,
          opacity: isDragging ? 0.8 : 1,
          zIndex: isDragging ? 1000 : 1,
        },
      ]}
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
          onPress={onEndConnection}
        >
          <View style={[styles.nodePortDot, { backgroundColor: node.config.color }]} />
        </TouchableOpacity>
      )}

      {node.config.outputs && node.config.outputs.length > 0 && (
        <TouchableOpacity
          style={[styles.nodePort, styles.nodePortOutput]}
          onPress={onStartConnection}
        >
          <View style={[styles.nodePortDot, { backgroundColor: node.config.color }]} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

export default function WorkflowEnhancedScreen() {
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

    const nodeTypeConfig = NODE_TYPES.find((nt) => nt.type === nodeType);
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

    Alert.alert(node.label, 'What would you like to do?', [
      { text: 'Configure', onPress: () => handleNodePress(node) },
      { text: 'Duplicate', onPress: () => handleDuplicateNode(node) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDeleteNode(node.id),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
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

    Alert.alert('Delete Node', 'Are you sure you want to delete this node?', [
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
    ]);
  };

  const handleConnectNodes = async (sourceId: string, targetId: string) => {
    if (!currentWorkflow) return;

    const existingConnection = currentWorkflow.connections.find(
      (c) => c.source === sourceId && c.target === targetId
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

  const handleNodePositionChange = async (nodeId: string, x: number, y: number) => {
    if (!currentWorkflow) return;
    await updateNode(currentWorkflow.id, nodeId, { position: { x, y } });
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
          `Workflow "${currentWorkflow.name}" executed successfully!\\n\\nStatus: ${execution.status}\\nNodes executed: ${currentWorkflow.nodes.length}\\nDuration: ${execution.endTime && execution.startTime ? Math.round((execution.endTime.getTime() - execution.startTime.getTime()) / 1000) : 0}s`,
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

  const renderConnection = (connection: WorkflowConnection) => {
    const sourceNode = currentWorkflow?.nodes.find((n) => n.id === connection.source);
    const targetNode = currentWorkflow?.nodes.find((n) => n.id === connection.target);

    if (!sourceNode || !targetNode) return null;

    const startX = sourceNode.position.x + 120;
    const startY = sourceNode.position.y + 50;
    const endX = targetNode.position.x;
    const endY = targetNode.position.y + 50;

    const midX = (startX + endX) / 2;

    const pathData = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

    return (
      <Svg
        key={connection.id}
        style={StyleSheet.absoluteFill}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
      >
        <Path
          d={pathData}
          stroke={Colors.Colors.cyan.primary}
          strokeWidth={2}
          fill="none"
          opacity={0.6}
        />
        <Circle
          cx={endX}
          cy={endY}
          r={4}
          fill={Colors.Colors.cyan.primary}
        />
      </Svg>
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
              {currentWorkflow.nodes.length} nodes • {currentWorkflow.connections.length}{' '}
              connections • {currentWorkflow.runCount} runs
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(currentWorkflow.status) },
            ]}
          >
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
          <Text style={styles.toolbarButtonText}>{isExecuting ? 'Running...' : 'Run'}</Text>
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

      <View style={styles.canvas}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ width: CANVAS_WIDTH }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ height: CANVAS_HEIGHT }}
          >
            <View style={styles.canvasContent}>
              {currentWorkflow?.connections.map(renderConnection)}
              {currentWorkflow?.nodes.map((node) => (
                <DraggableNode
                  key={node.id}
                  node={node}
                  onPress={() => handleNodePress(node)}
                  onLongPress={() => handleNodeLongPress(node)}
                  onPositionChange={(x, y) => handleNodePositionChange(node.id, x, y)}
                  isSelected={selectedNode?.id === node.id}
                  isConnecting={connectingFrom === node.id}
                  zoom={zoom}
                  canvasOffset={canvasOffset}
                  onStartConnection={() => {
                    setConnectingFrom(connectingFrom === node.id ? null : node.id);
                  }}
                  onEndConnection={() => {
                    if (connectingFrom && connectingFrom !== node.id) {
                      handleConnectNodes(connectingFrom, node.id);
                    }
                  }}
                />
              ))}

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
      </View>

      {connectingFrom && (
        <View style={styles.connectingBanner}>
          <Text style={styles.connectingText}>
            Connecting from node... Tap target node input port to connect
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
              {NODE_TYPES.map((nodeType) => {
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
              {workflows.map((workflow) => (
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
              {latestExecution?.logs.map((log) => (
                <View key={log.id} style={styles.logItem}>
                  <View
                    style={[
                      styles.logLevel,
                      { backgroundColor: getLogLevelColor(log.level) },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logMessage}>{log.message}</Text>
                    <Text style={styles.logTime}>{log.timestamp.toLocaleTimeString()}</Text>
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
    fontWeight: 'bold' as const,
    color: Colors.Colors.text.primary,
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
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
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
    fontWeight: '600' as const,
    color: Colors.Colors.text.inverse,
    textTransform: 'uppercase' as const,
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
    fontWeight: '600' as const,
    color: Colors.Colors.text.secondary,
  },
  canvas: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
  },
  canvasContent: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    position: 'relative' as const,
  },
  node: {
    position: 'absolute' as const,
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
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
  nodeType: {
    fontSize: 10,
    color: Colors.Colors.text.muted,
    textTransform: 'uppercase' as const,
  },
  nodePort: {
    position: 'absolute' as const,
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
  connectingBanner: {
    position: 'absolute' as const,
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
    fontWeight: '600' as const,
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
    fontWeight: 'bold' as const,
    color: Colors.Colors.text.primary,
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
    fontWeight: '600' as const,
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
    fontWeight: 'bold' as const,
    color: Colors.Colors.text.primary,
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
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
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
