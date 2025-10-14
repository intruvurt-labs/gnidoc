import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AlertTriangle, XCircle } from 'lucide-react-native';
import type { DemoScanResult } from '@/lib/noDemoDetector';
import { Deep } from '@/constants/colors';

type Props = {
  scanResult: DemoScanResult;
  creditsAwarded: number;
  timestamp?: string;
  onDismiss?: () => void;
};

export function PolicyViolationCard({ scanResult, creditsAwarded, timestamp, onDismiss }: Props) {
  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return Deep.red.accent;
      case 'medium':
        return '#F59E0B';
      case 'low':
        return Deep.lime.base;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AlertTriangle size={20} color={Deep.red.accent} />
          <Text style={styles.title}>Demo Code Detected</Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss}>
            <XCircle size={20} color={Deep.text.muted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Offending Lines</Text>
          <Text style={styles.statValue}>{scanResult.offendingLines}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total Lines</Text>
          <Text style={styles.statValue}>{scanResult.totalLines}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Confidence</Text>
          <Text style={styles.statValue}>{(scanResult.confidence * 100).toFixed(0)}%</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Bix Awarded</Text>
          <Text style={[styles.statValue, { color: Deep.lime.base }]}>+{creditsAwarded}</Text>
        </View>
      </View>

      {timestamp && (
        <Text style={styles.timestamp}>
          {new Date(timestamp).toLocaleString()}
        </Text>
      )}

      {scanResult.findings.length > 0 && (
        <View style={styles.findings}>
          <Text style={styles.findingsTitle}>Violations Found:</Text>
          <ScrollView style={styles.findingsList} nestedScrollEnabled>
            {scanResult.findings.slice(0, 5).map((finding, idx) => (
              <View key={idx} style={styles.finding}>
                <View style={styles.findingHeader}>
                  <Text style={styles.findingLine}>Line {finding.line}</Text>
                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(finding.severity) },
                    ]}
                  >
                    <Text style={styles.severityText}>{finding.severity}</Text>
                  </View>
                </View>
                <Text style={styles.findingText} numberOfLines={2}>
                  {finding.text.trim()}
                </Text>
              </View>
            ))}
            {scanResult.findings.length > 5 && (
              <Text style={styles.moreFindings}>
                +{scanResult.findings.length - 5} more violations
              </Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Deep.ink,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Deep.red.base,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Deep.text.primary,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: Deep.text.muted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Deep.text.primary,
  },
  timestamp: {
    fontSize: 11,
    color: Deep.text.muted,
    marginBottom: 12,
  },
  findings: {
    marginTop: 8,
  },
  findingsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Deep.text.primary,
    marginBottom: 8,
  },
  findingsList: {
    maxHeight: 200,
  },
  finding: {
    backgroundColor: 'rgba(13, 110, 120, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  findingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  findingLine: {
    fontSize: 12,
    fontWeight: '600',
    color: Deep.cyan.line,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    color: Deep.ink,
    textTransform: 'uppercase',
  },
  findingText: {
    fontSize: 11,
    color: Deep.text.muted,
    fontFamily: 'monospace',
  },
  moreFindings: {
    fontSize: 12,
    color: Deep.text.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});
