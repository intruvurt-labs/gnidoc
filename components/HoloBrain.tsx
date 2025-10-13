import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Activity, Zap, Clock, TrendingUp } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface MetricRing {
  metric: 'build' | 'ship' | 'uptime' | 'latency';
  color: string;
  value: number;
}

interface HoloBrainProps {
  rings: MetricRing[];
}

export default function HoloBrain({ rings }: HoloBrainProps) {
  const getIcon = (metric: string) => {
    switch (metric) {
      case 'build':
        return <Zap color={Colors.Colors.magenta.primary} size={20} />;
      case 'ship':
        return <TrendingUp color={Colors.Colors.lime.primary} size={20} />;
      case 'uptime':
        return <Activity color={Colors.Colors.cyan.primary} size={20} />;
      case 'latency':
        return <Clock color={Colors.Colors.red.primary} size={20} />;
      default:
        return <Activity color={Colors.Colors.cyan.primary} size={20} />;
    }
  };

  const getLabel = (metric: string) => {
    switch (metric) {
      case 'build':
        return 'Build';
      case 'ship':
        return 'Ship';
      case 'uptime':
        return 'Uptime';
      case 'latency':
        return 'Latency';
      default:
        return metric;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.brainContainer}>
        <View style={styles.centerCircle}>
          <Text style={styles.centerText}>DEPLOY</Text>
        </View>

        {rings.map((ring, index) => {
          const angle = (index / rings.length) * 2 * Math.PI;
          const radius = 100;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <View
              key={`metric-ring-${ring.metric}-${index}`}
              style={[
                styles.metricNode,
                {
                  left: 150 + x - 40,
                  top: 150 + y - 40,
                  borderColor: ring.color,
                },
              ]}
            >
              {getIcon(ring.metric)}
              <Text style={[styles.metricLabel, { color: ring.color }]}>
                {getLabel(ring.metric)}
              </Text>
              <Text style={[styles.metricValue, { color: ring.color }]}>
                {ring.value}%
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        {rings.map((ring, index) => (
          <View key={`legend-item-${ring.metric}-${index}`} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: ring.color }]} />
            <Text style={styles.legendText}>
              {getLabel(ring.metric)}: {ring.value}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  brainContainer: {
    width: 300,
    height: 300,
    position: 'relative',
    marginBottom: 24,
  },
  centerCircle: {
    position: 'absolute',
    left: 110,
    top: 110,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 3,
    borderColor: Colors.Colors.cyan.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.Colors.cyan.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  centerText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.Colors.cyan.primary,
  },
  metricNode: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
});
