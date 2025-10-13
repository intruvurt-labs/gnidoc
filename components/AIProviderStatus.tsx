import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { getProviderSummary } from '@/lib/ai-providers';
import { CheckCircle, XCircle, X } from 'lucide-react-native';

export default function AIProviderStatus() {
  const [summary, setSummary] = useState<ReturnType<typeof getProviderSummary> | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const sum = getProviderSummary();
    setSummary(sum);
  }, []);

  if (!summary) return null;

  return (
    <>
      <TouchableOpacity
        style={styles.statusBadge}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.statusContent}>
          <Text style={styles.statusText}>
            {summary.available}/{summary.total} AI Providers
          </Text>
          {summary.available > 0 ? (
            <CheckCircle size={16} color="#00FF00" />
          ) : (
            <XCircle size={16} color="#FF0000" />
          )}
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI Provider Status</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.providerList}>
              {summary.providers.map(provider => (
                <View key={provider.name} style={styles.providerItem}>
                  <View style={styles.providerLeft}>
                    {provider.available ? (
                      <CheckCircle size={20} color="#00FF00" />
                    ) : (
                      <XCircle size={20} color="#FF0000" />
                    )}
                    <Text style={styles.providerName}>{provider.name}</Text>
                  </View>
                  <Text style={styles.modelCount}>
                    {provider.modelCount} model{provider.modelCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Text style={styles.footerText}>
                Configure API keys in .env to enable more providers
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  statusBadge: {
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00FFFF',
  },
  statusContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#00FFFF',
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#00FFFF',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#00FFFF',
  },
  providerList: {
    padding: 20,
  },
  providerItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  providerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  providerName: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '500' as const,
  },
  modelCount: {
    fontSize: 14,
    color: '#888',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center' as const,
  },
});
