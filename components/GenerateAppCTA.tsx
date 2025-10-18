import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import Colors from '@/constants/colors';

async function startBuild(payload: any, idempotencyKey: string) {
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASE}/orchestrations/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-idempotency-key': idempotencyKey,
    },
    body: JSON.stringify({
      blueprint: payload?.blueprint,
      options: { minModels: 2, consensus: 0.6 }
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function wsUrl(runId: string) {
  const base = process.env.EXPO_PUBLIC_API_BASE!.replace(/^http/i, 'ws');
  return `${base}/orchestrations/${runId}/stream`;
}

export default function GenerateAppCTA({
  blueprint,
  onDone,
  label = 'Generate App',
  style,
  testID = 'generate-app-cta',
}: {
  blueprint?: any;
  onDone?: (runId: string) => void;
  label?: string;
  style?: any;
  testID?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState<'idle'|'starting'|'building'|'finalizing'|'done'|'error'>('idle');
  const [log, setLog] = useState<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const qc = useQueryClient();

  const idempotencyKey = useMemo(
    () => Crypto.randomUUID(),
    [blueprint]
  );

  const mutation = useMutation({
    mutationFn: () => startBuild({ blueprint }, idempotencyKey),
    onMutate: () => {
      setVisible(true);
      setStage('starting');
      setLog((l) => [...l, 'Starting multi-model build…']);
    },
    onError: (e: any) => {
      setStage('error');
      setLog((l) => [...l, `❌ ${e?.message || 'Build failed to start'}`]);
    },
    onSuccess: ({ runId }) => {
      setStage('building');
      setLog((l) => [...l, `Run ID: ${runId}`, 'Connecting to build stream…']);
      const ws = new WebSocket(wsUrl(runId));
      socketRef.current = ws;

      ws.onopen = () => setLog((l) => [...l, '✅ Stream connected']);
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'stage') setStage(msg.value);
          if (msg.type === 'progress') setLog((l) => [...l, `• ${msg.message}`]);
          if (msg.type === 'vote') setLog((l) => [...l, `🗳 vote: ${msg.model} → ${msg.score}`]);
          if (msg.type === 'consensus') setLog((l) => [...l, `🤝 consensus = ${msg.score}`]);
          if (msg.type === 'error') {
            setStage('error');
            setLog((l) => [...l, `❌ ${msg.message}`]);
          }
          if (msg.type === 'done') {
            setStage('done');
            setLog((l) => [...l, '✅ Build completed. Packaging app…']);
            qc.invalidateQueries({ queryKey: ['runs'] });
            Notifications.scheduleNotificationAsync({
              content: {
                title: 'gnidoC build complete',
                body: 'Your app is ready. Tap to view the summary.',
                data: { runId },
              },
              trigger: null,
            });
            setTimeout(() => {
              setVisible(false);
              onDone?.(runId);
              router.push(`/build-summary/${runId}` as any);
            }, 800);
          }
        } catch {
          setLog((l) => [...l, String(evt.data)]);
        }
      };
      ws.onerror = () => {
        setStage('error');
        setLog((l) => [...l, `❌ Stream error`]);
      };
      ws.onclose = () => {
        socketRef.current = null;
      };
    },
  });

  const handleGenerateApp = () => {
    mutation.mutate();
  };

  return (
    <View>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={handleGenerateApp}
        style={[styles.button, style]}
        testID={testID}
      >
        <Text style={styles.buttonText}>{label}</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Building your app…
            </Text>
            <Text style={styles.modalStage}>
              Stage: {stage}
            </Text>
            {stage !== 'done' && stage !== 'error' && <ActivityIndicator color={Colors.Colors.cyan.primary} />}
            <ScrollView style={styles.logContainer}>
              {log.slice(-12).map((line, idx) => (
                <Text key={idx} style={styles.logLine}>
                  {line}
                </Text>
              ))}
            </ScrollView>
            {stage === 'error' && (
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.Colors.cyan.primary,
  },
  buttonText: {
    color: Colors.Colors.text.inverse,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center' as const,
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0B0B0B',
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  modalStage: {
    color: '#aaa',
    marginBottom: 12,
  },
  logContainer: {
    marginTop: 12,
    maxHeight: 220,
  },
  logLine: {
    color: '#cfcfcf',
    fontSize: 12,
    marginBottom: 4,
  },
  closeButton: {
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.Colors.red.primary,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
});
