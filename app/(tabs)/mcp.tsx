import { Stack } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useMCP } from '@/contexts/MCPContext';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { Play, Link as LinkIcon, RefreshCw } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function MCPScreen() {
  const { primary, text, card, border, background } = useTheme();
  const { servers, connect, events, clearEvents } = useMCP();
  const [selected, setSelected] = useState<string | null>(null);

  const positions = useMemo(() => {
    const radius = Math.min(width * 0.35, 220);
    const center = { x: width / 2, y: 220 };
    return servers.map((s, i) => {
      const angle = (i / Math.max(servers.length, 1)) * Math.PI * 2;
      return {
        id: s.id,
        name: s.name,
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      };
    });
  }, [servers]);

  const selectedEvents = useMemo(() => events.filter((e) => e.serverId === selected).slice(-8), [events, selected]);

  return (
    <View style={[styles.container, { backgroundColor: background }]} testID="mcp-screen">
      <Stack.Screen options={{ title: 'MCP Canvas', headerShown: true }} />

      <View style={styles.header}>
        <Text style={[styles.title, { color: text }]}>MCP Servers</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.chip, { borderColor: border }]} onPress={() => clearEvents(selected ?? undefined)}>
            <RefreshCw color={text} size={16} />
            <Text style={[styles.chipText, { color: text }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.canvas, { backgroundColor: card, borderColor: border }]}>
        <Svg width="100%" height="100%">
          {positions.length > 1 && positions.map((p, i) => (
            <Line
              key={`ln-${p.id}`}
              x1={positions[0]?.x ?? 0}
              y1={positions[0]?.y ?? 0}
              x2={p.x}
              y2={p.y}
              stroke={primary}
              strokeOpacity={0.25}
              strokeWidth={2}
            />
          ))}
          {positions.map((p) => (
            <React.Fragment key={p.id}>
              <Circle
                cx={p.x}
                cy={p.y}
                r={36}
                fill={selected === p.id ? primary : 'transparent'}
                stroke={primary}
                strokeWidth={2}
              />
              <SvgText x={p.x} y={p.y + 56} fill={primary} fontSize="12" textAnchor="middle">
                {p.name}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {positions.map((p) => (
            <TouchableOpacity
              key={`btn-${p.id}`}
              activeOpacity={0.7}
              onPress={() => setSelected((cur) => (cur === p.id ? null : p.id))}
              style={{ position: 'absolute', left: p.x - 42, top: p.y - 42, width: 84, height: 84 }}
              testID={`mcp-node-${p.id}`}
            />
          ))}
        </View>
      </View>

      <View style={[styles.panel, { backgroundColor: card, borderColor: border }]}>
        {selected ? (
          <ServerPanel id={selected} />
        ) : (
          <Text style={{ color: text, opacity: 0.7 }}>Select a server node to inspect</Text>
        )}
      </View>

      <View style={styles.footer}>
        {servers.map((s) => (
          <TouchableOpacity key={s.id} style={[styles.actionBtn, { borderColor: border }]} onPress={() => connect(s.id)} testID={`connect-${s.id}`}>
            <LinkIcon color={primary} size={18} />
            <Text style={[styles.actionText, { color: primary }]}>{s.name}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: primary }]} onPress={() => Platform.OS === 'web' ? console.log('exec preview') : console.log('exec')} testID="mcp-exec">
          <Play color="#0b0b0f" size={18} />
          <Text style={styles.primaryText}>Execute</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ServerPanel({ id }: { id: string }) {
  const { servers, events } = useMCP();
  const { text, border, card } = useTheme();
  const s = servers.find((x) => x.id === id);
  if (!s) return null;
  const evs = events.filter((e) => e.serverId === id).slice(-8).reverse();

  return (
    <View style={[styles.serverPanel]}>
      <Text style={[styles.serverTitle, { color: text }]}>{s.name}</Text>
      <Text style={{ color: text, opacity: 0.7, marginBottom: 8 }}>{s.capabilities.join(', ')}</Text>
      <View style={[styles.eventList, { borderColor: border, backgroundColor: card }]}>
        {evs.map((e) => (
          <Text key={e.at} style={{ color: text, fontSize: 12, marginVertical: 2 }} numberOfLines={2}>
            {e.msg.type}: {e.msg.method ?? 'event'}
          </Text>
        ))}
        {evs.length === 0 && (
          <Text style={{ color: text, opacity: 0.7, fontSize: 12 }}>No events yet</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  chipText: { fontSize: 12, fontWeight: '600' },
  canvas: { flex: 1, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  panel: { minHeight: 120, borderRadius: 12, borderWidth: 1, padding: 12 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  actionText: { fontSize: 12, fontWeight: '700' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  primaryText: { color: '#0b0b0f', fontSize: 14, fontWeight: '800' },
  serverPanel: { },
  serverTitle: { fontSize: 16, fontWeight: '700' },
  eventList: { borderWidth: 1, padding: 8, borderRadius: 8 },
});
