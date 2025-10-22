import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform, Image, Linking } from 'react-native';
import Colors from '@/constants/colors';
import { useMediaStatus } from '@/src/hooks/useMediaStatus';
import { Download, RefreshCw, CheckCircle2, XCircle } from 'lucide-react-native';

interface Props {
  jobId: string | null;
}

export default function MediaJobPreview({ jobId }: Props) {
  const { data, isLoading, error } = useMediaStatus(jobId, { enabled: !!jobId, pollIntervalMs: 2500 });

  const isImage = useMemo(() => {
    const url = data?.mediaUrl || '';
    return /(\.png|\.jpg|\.jpeg|\.gif|\.webp)$/i.test(url) || url.startsWith('data:image/');
  }, [data?.mediaUrl]);

  const openMedia = async () => {
    if (!data?.mediaUrl) return;
    if (Platform.OS === 'web') {
      window.open(data.mediaUrl, '_blank');
    } else {
      await Linking.openURL(data.mediaUrl);
    }
  };

  return (
    <View style={styles.container} testID="media-job-preview">
      {!jobId && (
        <Text style={styles.muted}>No job started</Text>
      )}
      {!!jobId && (
        <View style={styles.content}>
          {data?.status === 'running' && (
            <View style={styles.row}>
              <ActivityIndicator color={Colors.Colors.cyan.primary} size="small" />
              <Text style={styles.text}>Rendering media…</Text>
              <RefreshCw color={Colors.Colors.cyan.primary} size={16} />
            </View>
          )}
          {data?.status === 'succeeded' && (
            <View style={styles.block}>
              <View style={styles.row}>
                <CheckCircle2 color={Colors.Colors.success} size={18} />
                <Text style={[styles.text, { color: Colors.Colors.success }]}>Ready</Text>
              </View>
              {isImage && data.mediaUrl ? (
                <Image source={{ uri: data.mediaUrl }} style={styles.preview} resizeMode="cover" />
              ) : null}
              <TouchableOpacity style={styles.button} onPress={openMedia} testID="open-media-btn">
                <Download color={Colors.Colors.text.inverse} size={16} />
                <Text style={styles.buttonText}>Open media</Text>
              </TouchableOpacity>
            </View>
          )}
          {data?.status === 'failed' && (
            <View style={styles.row}>
              <XCircle color={Colors.Colors.error} size={18} />
              <Text style={[styles.text, { color: Colors.Colors.error }]}>Failed</Text>
            </View>
          )}
          {isLoading && !data && (
            <View style={styles.row}>
              <ActivityIndicator color={Colors.Colors.cyan.primary} size="small" />
              <Text style={styles.text}>Checking status…</Text>
            </View>
          )}
          {error && (
            <Text style={[styles.text, { color: Colors.Colors.error }]}>{error}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  content: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  block: {
    gap: 8,
  },
  text: {
    color: Colors.Colors.text.primary,
    fontSize: 13,
  },
  muted: {
    color: Colors.Colors.text.muted,
    fontSize: 12,
  },
  button: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.Colors.cyan.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: Colors.Colors.text.inverse,
    fontSize: 13,
    fontWeight: '600',
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
});
