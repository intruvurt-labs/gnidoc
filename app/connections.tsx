import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { Stack } from 'expo-router';
import { Plus, X, Database, Trash2, Edit } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useDatabase, DatabaseConnection } from '@/contexts/DatabaseContext';

export default function ConnectionsScreen() {
  const { connections, addConnection, updateConnection, deleteConnection } = useDatabase();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingConnection, setEditingConnection] = useState<DatabaseConnection | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: '5432',
    database: '',
    username: '',
    password: '',
    ssl: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      host: '',
      port: '5432',
      database: '',
      username: '',
      password: '',
      ssl: true,
    });
    setEditingConnection(null);
  };

  const handleAddConnection = async () => {
    if (!formData.name || !formData.host || !formData.database || !formData.username) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await addConnection({
        name: formData.name,
        host: formData.host,
        port: parseInt(formData.port) || 5432,
        database: formData.database,
        username: formData.username,
        password: formData.password,
        ssl: formData.ssl,
      });

      setShowAddModal(false);
      resetForm();
      Alert.alert('Success', 'Connection added successfully');
    } catch {
      Alert.alert('Error', 'Failed to add connection');
    }
  };

  const handleUpdateConnection = async () => {
    if (!editingConnection) return;

    if (!formData.name || !formData.host || !formData.database || !formData.username) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await updateConnection(editingConnection.id, {
        name: formData.name,
        host: formData.host,
        port: parseInt(formData.port) || 5432,
        database: formData.database,
        username: formData.username,
        password: formData.password,
        ssl: formData.ssl,
      });

      setShowAddModal(false);
      resetForm();
      Alert.alert('Success', 'Connection updated successfully');
    } catch {
      Alert.alert('Error', 'Failed to update connection');
    }
  };

  const handleDeleteConnection = (id: string, name: string) => {
    Alert.alert(
      'Delete Connection',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConnection(id);
              Alert.alert('Success', 'Connection deleted');
            } catch {
              Alert.alert('Error', 'Failed to delete connection');
            }
          },
        },
      ]
    );
  };

  const handleEditConnection = (conn: DatabaseConnection) => {
    setEditingConnection(conn);
    setFormData({
      name: conn.name,
      host: conn.host,
      port: conn.port.toString(),
      database: conn.database,
      username: conn.username,
      password: conn.password,
      ssl: conn.ssl,
    });
    setShowAddModal(true);
  };

  const loadDigitalOceanConnection = () => {
    setFormData({
      name: 'Digital Ocean PostgreSQL',
      host: process.env.EXPO_PUBLIC_DB_HOST || '',
      port: process.env.EXPO_PUBLIC_DB_PORT || '25060',
      database: process.env.EXPO_PUBLIC_DB_NAME || 'defaultdb',
      username: process.env.EXPO_PUBLIC_DB_USER || '',
      password: process.env.EXPO_PUBLIC_DB_PASSWORD || '',
      ssl: true,
    });
    setShowAddModal(true);
  };

  const renderConnectionModal = () => (
    <Modal
      visible={showAddModal}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setShowAddModal(false);
        resetForm();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingConnection ? 'Edit Connection' : 'Add Connection'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowAddModal(false);
                resetForm();
              }}
            >
              <X color={Colors.Colors.text.primary} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.inputLabel}>Connection Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="My Database"
              placeholderTextColor={Colors.Colors.text.muted}
            />

            <Text style={styles.inputLabel}>Host *</Text>
            <TextInput
              style={styles.input}
              value={formData.host}
              onChangeText={(text) => setFormData({ ...formData, host: text })}
              placeholder="localhost or db.example.com"
              placeholderTextColor={Colors.Colors.text.muted}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Port *</Text>
            <TextInput
              style={styles.input}
              value={formData.port}
              onChangeText={(text) => setFormData({ ...formData, port: text })}
              placeholder="5432"
              placeholderTextColor={Colors.Colors.text.muted}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Database *</Text>
            <TextInput
              style={styles.input}
              value={formData.database}
              onChangeText={(text) => setFormData({ ...formData, database: text })}
              placeholder="postgres"
              placeholderTextColor={Colors.Colors.text.muted}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Username *</Text>
            <TextInput
              style={styles.input}
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
              placeholder="postgres"
              placeholderTextColor={Colors.Colors.text.muted}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Password *</Text>
            <TextInput
              style={styles.input}
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              placeholder="••••••••"
              placeholderTextColor={Colors.Colors.text.muted}
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={styles.switchContainer}>
              <Text style={styles.inputLabel}>SSL Connection</Text>
              <Switch
                value={formData.ssl}
                onValueChange={(value) => setFormData({ ...formData, ssl: value })}
                trackColor={{
                  false: Colors.Colors.border.muted,
                  true: Colors.Colors.cyan.primary,
                }}
                thumbColor={Colors.Colors.text.secondary}
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={editingConnection ? handleUpdateConnection : handleAddConnection}
            >
              <Text style={styles.saveButtonText}>
                {editingConnection ? 'Update Connection' : 'Add Connection'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Database Connections',
          headerStyle: {
            backgroundColor: Colors.Colors.background.primary,
          },
          headerTintColor: Colors.Colors.text.primary,
        }}
      />

      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Manage Connections</Text>
          <Text style={styles.headerSubtitle}>
            {connections.length} connection{connections.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {connections.length === 0 && (
          <View style={styles.emptyState}>
            <Database color={Colors.Colors.text.muted} size={64} />
            <Text style={styles.emptyTitle}>No Connections</Text>
            <Text style={styles.emptyText}>
              Add your first database connection to get started
            </Text>
            <TouchableOpacity
              style={styles.quickAddButton}
              onPress={loadDigitalOceanConnection}
            >
              <Text style={styles.quickAddButtonText}>
                Quick Add: Digital Ocean DB
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView style={styles.connectionsList}>
          {connections.map((conn) => (
            <View key={conn.id} style={styles.connectionCard}>
              <View style={styles.connectionHeader}>
                <View style={styles.connectionIcon}>
                  <Database color={Colors.Colors.cyan.primary} size={24} />
                </View>
                <View style={styles.connectionInfo}>
                  <Text style={styles.connectionName}>{conn.name}</Text>
                  <Text style={styles.connectionDetails}>
                    {conn.username}@{conn.host}:{conn.port}/{conn.database}
                  </Text>
                </View>
              </View>

              <View style={styles.connectionMeta}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{conn.ssl ? 'SSL' : 'No SSL'}</Text>
                </View>
                {conn.isActive && (
                  <View style={[styles.badge, styles.activeBadge]}>
                    <Text style={styles.badgeText}>Active</Text>
                  </View>
                )}
              </View>

              <View style={styles.connectionActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditConnection(conn)}
                >
                  <Edit color={Colors.Colors.cyan.primary} size={18} />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteConnection(conn.id, conn.name)}
                >
                  <Trash2 color={Colors.Colors.error} size={18} />
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddModal(true)}
        >
          <Plus color={Colors.Colors.text.inverse} size={28} />
        </TouchableOpacity>

        {renderConnectionModal()}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.Colors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.Colors.text.muted,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 40,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.Colors.text.primary,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.Colors.text.muted,
    textAlign: 'center' as const,
  },
  quickAddButton: {
    backgroundColor: Colors.Colors.cyan.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  quickAddButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.inverse,
  },
  connectionsList: {
    flex: 1,
    padding: 16,
  },
  connectionCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  connectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 12,
  },
  connectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.Colors.cyan.primary + '20',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.Colors.text.primary,
    marginBottom: 4,
  },
  connectionDetails: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    fontFamily: 'monospace',
  },
  connectionMeta: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: Colors.Colors.background.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  activeBadge: {
    backgroundColor: Colors.Colors.cyan.primary + '20',
    borderColor: Colors.Colors.cyan.primary,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.Colors.text.secondary,
  },
  connectionActions: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  deleteButton: {
    borderColor: Colors.Colors.error + '40',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
  deleteButtonText: {
    color: Colors.Colors.error,
  },
  fab: {
    position: 'absolute' as const,
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.Colors.cyan.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    maxHeight: '90%',
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
    fontSize: 20,
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
    marginTop: 8,
  },
  input: {
    backgroundColor: Colors.Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    marginBottom: 8,
  },
  switchContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginVertical: 12,
  },
  saveButton: {
    backgroundColor: Colors.Colors.cyan.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center' as const,
    marginTop: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.Colors.text.inverse,
  },
});
