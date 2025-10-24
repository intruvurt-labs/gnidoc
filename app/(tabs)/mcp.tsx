import { Stack } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform, TextInput, FlatList, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useMCP } from '@/contexts/MCPContext';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { Play, Link as LinkIcon, RefreshCw, Link2, Unplug, Radio, FolderOpenDot, Smartphone } from 'lucide-react-native';

import { useMCPCommand } from '@/src/hooks/useMCP';

const { width } = Dimensions.get('window');

export default function MCPScreen() {
  const { primary, text, card, border, background } = useTheme();
  const { servers, connect, disconnect, isConnected, events, clearEvents, discoverFrom, addServers } = useMCP();
  const [selected, setSelected] = useState<string | null>(null);
  const [discoveryUrl, setDiscoveryUrl] = useState<string>('');

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

  return (
    <View style={[styles.container, { backgroundColor: background }]} testID="mcp-screen">
      <Stack.Screen options={{ title: 'MCP', headerShown: true }} />

      <View style={styles.header}>
        <Text style={[styles.title, { color: text }]}>MCP</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => addServers([
              { id: 'expo-file-system', name: 'Expo FileSystem', capabilities: ['file_operations'] as any, transport: 'inprocess', health: 'healthy' as const },
            ])}
            style={[styles.chip, { borderColor: border }]} testID="add-fs-server"
          >
            <FolderOpenDot color={text} size={16} />
            <Text style={[styles.chipText, { color: text }]}>Add Local FS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => addServers([
              { id: 'expo-device', name: 'Expo Device', capabilities: ['automation'] as any, transport: 'inprocess', health: 'healthy' as const },
            ])}
            style={[styles.chip, { borderColor: border }]} testID="add-device-server"
          >
            <Smartphone color={text} size={16} />
            <Text style={[styles.chipText, { color: text }]}>Add Device</Text>
          </TouchableOpacity>
          <View style={[styles.discoverContainer, { borderColor: border, backgroundColor: card }]}>
            <Link2 color={text} size={16} />
            <TextInput
              value={discoveryUrl}
              onChangeText={setDiscoveryUrl}
              placeholder="https://example.com/mcp/discover.json"
              placeholderTextColor={text}
              style={[styles.input, { color: text }]}
              autoCapitalize="none"
              autoCorrect={false}
              testID="mcp-discovery-input"
            />
            <TouchableOpacity
              onPress={() => discoveryUrl.trim() && discoverFrom([discoveryUrl.trim()])}
              style={[styles.chip, { borderColor: border }]} testID="mcp-discover-btn"
            >
              <Radio color={text} size={16} />
              <Text style={[styles.chipText, { color: text }]}>Discover</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.chip, { borderColor: border }]} onPress={() => clearEvents(selected ?? undefined)}>
            <RefreshCw color={text} size={16} />
            <Text style={[styles.chipText, { color: text }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.canvas, { backgroundColor: card, borderColor: border }] }>
        <Svg width="100%" height="100%">
          {positions.length > 1 && positions.map((p) => (
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

      <View style={[styles.panel, { backgroundColor: card, borderColor: border }] }>
        {selected ? (
          <ServerPanel id={selected} />
        ) : (
          <Text style={{ color: text, opacity: 0.7 }}>Select a server node to inspect</Text>
        )}
      </View>

      <View style={styles.footer}>
        {servers.map((s) => {
          const connected = isConnected(s.id);
          return (
            <View key={s.id} style={styles.footerRow}>
              <TouchableOpacity style={[styles.actionBtn, { borderColor: border }]} onPress={() => connect(s.id)} testID={`connect-${s.id}`}>
                <LinkIcon color={primary} size={18} />
                <Text style={[styles.actionText, { color: primary }]}>{s.name}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { borderColor: border }]} onPress={() => disconnect(s.id)} testID={`disconnect-${s.id}`}>
                <Unplug color={connected ? '#DC2626' : '#6B7280'} size={18} />
                <Text style={[styles.actionText, { color: connected ? '#DC2626' : '#6B7280' }]}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          );
        })}
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: primary }]} onPress={() => Platform.OS === 'web' ? console.log('exec preview') : console.log('exec')} testID="mcp-exec">
          <Play color="#0b0b0f" size={18} />
          <Text style={styles.primaryText}>Execute</Text>
        </TouchableOpacity>
      </View>

      {selected && (
        <LiveLog serverId={selected} />
      )}
    </View>
  );
}

function ServerPanel({ id }: { id: string }) {
  const { servers, events } = useMCP();
  const { text, border, card, primary } = useTheme();
  const s = servers.find((x) => x.id === id);
  const [output, setOutput] = useState<string>('');
  const [fsPath, setFsPath] = useState<string>('/');
  const fsCmd = useMCPCommand('expo-file-system');
  const devCmd = useMCPCommand('expo-device');

  const onRunFsList = useCallback(async () => {
    const res = await fsCmd.sendCommand<{ files: string[] }>('listFiles', { path: fsPath });
    if (res.ok) setOutput(`Files at ${fsPath}:\n` + res.data!.files.join('\n'));
    else Alert.alert('FS Error', res.error ?? 'Unknown error');
  }, [fsCmd, fsPath]);

  const onRunFsRead = useCallback(async () => {
    const res = await fsCmd.sendCommand<{ content: string }>('readFile', { path: fsPath });
    if (res.ok) setOutput(`Read ${fsPath}:\n` + (res.data!.content ?? ''));
    else Alert.alert('FS Error', res.error ?? 'Unknown error');
  }, [fsCmd, fsPath]);

  const onGyro = useCallback(async () => {
    const res = await devCmd.sendCommand<{ gyro?: { x: number; y: number; z: number }; error?: string }>('getGyroscopeSample', {});
    if (res.ok) setOutput(`Gyro: ${JSON.stringify(res.data)}`);
    else Alert.alert('Device Error', res.error ?? 'Unknown error');
  }, [devCmd]);

  const onCameraPerm = useCallback(async () => {
    const res = await devCmd.sendCommand<{ canAccessCamera: boolean; platform: string }>('requestCameraPermission', {});
    if (res.ok) setOutput(`Camera permission (${res.data!.platform}): ${res.data!.canAccessCamera}`);
    else Alert.alert('Device Error', res.error ?? 'Unknown error');
  }, [devCmd]);

  if (!s) return null;
  const evs = events.filter((e) => e.serverId === id).slice(-20).reverse();

  return (
    <View style={[styles.serverPanel]}>
      <Text style={[styles.serverTitle, { color: text }]}>{s.name}</Text>
      <Text style={{ color: text, opacity: 0.7, marginBottom: 8 }}>{s.capabilities.join(', ')}</Text>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {s.id === 'expo-file-system' && (
          <>
            <View style={[styles.discoverContainer, { borderColor: border, backgroundColor: card }]}> 
              <TextInput
                value={fsPath}
                onChangeText={setFsPath}
                placeholder="/"
                placeholderTextColor={text}
                style={[styles.input, { color: text }]}
                autoCapitalize="none"
                autoCorrect={false}
                testID="mcp-fs-path"
              />
              <TouchableOpacity onPress={onRunFsList} style={[styles.chip, { borderColor: border }]} testID="mcp-fs-list">
                <Text style={[styles.chipText, { color: primary }]}>List</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onRunFsRead} style={[styles.chip, { borderColor: border }]} testID="mcp-fs-read">
                <Text style={[styles.chipText, { color: primary }]}>Read</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        {s.id === 'expo-device' && (
          <>
            <TouchableOpacity onPress={onGyro} style={[styles.chip, { borderColor: border }]} testID="mcp-gyro">
              <Text style={[styles.chipText, { color: primary }]}>Gyroscope</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onCameraPerm} style={[styles.chip, { borderColor: border }]} testID="mcp-camera">
              <Text style={[styles.chipText, { color: primary }]}>Camera Permission</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {output.length > 0 && (
        <View style={[styles.eventList, { borderColor: border, backgroundColor: card }]}> 
          <Text style={{ color: text, fontSize: 12 }} selectable>
            {output}
          </Text>
        </View>
      )}

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

function LiveLog({ serverId }: { serverId: string }) {
  const { events } = useMCP();
  const { text, border, card } = useTheme();
  const listRef = useRef<FlatList<{ id: string; at: number }>>(null);

  return (
    <View style={[styles.logContainer, { backgroundColor: card, borderColor: border }]}>
      <Text style={[styles.logTitle, { color: text }]}>Live Logs</Text>
      <FlatList
        ref={listRef}
        data={events.filter((e) => e.serverId === serverId).slice(-200).reverse()}
        keyExtractor={(it) => String(it.at)}
        renderItem={({ item }) => (
          <Text style={[styles.logLine, { color: text }]} numberOfLines={2}>
            [{new Date(item.at).toLocaleTimeString()}] {item.msg.type} {item.msg.method ?? 'event'}
          </Text>
        )}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        style={styles.logList}
        testID="mcp-live-logs"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  chipText: { fontSize: 12, fontWeight: '600' },
  discoverContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, paddingHorizontal: 8, borderRadius: 8 },
  input: { minWidth: 180, paddingVertical: 6 },
  canvas: { flex: 1, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  panel: { minHeight: 120, borderRadius: 12, borderWidth: 1, padding: 12 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  footerRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  actionText: { fontSize: 12, fontWeight: '700' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  primaryText: { color: '#0b0b0f', fontSize: 14, fontWeight: '800' },
  serverPanel: { },
  serverTitle: { fontSize: 16, fontWeight: '700' },
  eventList: { borderWidth: 1, padding: 8, borderRadius: 8 },
  logContainer: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8 },
  logTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  logList: { maxHeight: 180 },
  logLine: { fontSize: 11 },
});
