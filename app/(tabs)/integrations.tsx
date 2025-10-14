 import React, { useState } from 'react';
+ import React, { useEffect, useRef, useState } from 'react';
 import {
   View,
   Text,
   StyleSheet,
   ScrollView,
   TouchableOpacity,
   TextInput,
 } from 'react-native';
 import { useSafeAreaInsets } from 'react-native-safe-area-context';
 import { Terminal as TerminalIcon, Play, Square, Trash2, History, Folder, Package, GitBranch } from 'lucide-react-native';
 import Colors from '@/constants/colors';
+ import AsyncStorage from '@react-native-async-storage/async-storage';
+ import * as Haptics from 'expo-haptics';
+ import { nanoid } from 'nanoid/non-secure';
+ import { simulateCommand } from '@/services/terminalSim';

 interface CommandHistoryItem {
-  command: string;
-  output: string;
-  timestamp: Date;
-  status: 'success' | 'error';
+  id: string;
+  command: string;
+  output: string;
+  timestamp: string; // ISO
+  status: 'success' | 'error' | 'cancelled';
 }

 export default function TerminalScreen() {
   const [command, setCommand] = useState<string>('');
   const insets = useSafeAreaInsets();
   const [history, setHistory] = useState<CommandHistoryItem[]>([]);
   const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
-
-  const [isRunning, setIsRunning] = useState<boolean>(false);
+  const [isRunning, setIsRunning] = useState<boolean>(false);
+  const abortRef = useRef<AbortController | null>(null);
+  const scrollRef = useRef<ScrollView>(null);

+  const STORAGE_KEY = 'terminal_history_v1';
+  const MAX_ITEMS = 100;

+  // load persisted history
+  useEffect(() => {
+    (async () => {
+      try {
+        const raw = await AsyncStorage.getItem(STORAGE_KEY);
+        if (raw) setHistory(JSON.parse(raw));
+      } catch {}
+    })();
+  }, []);
+
+  // persist on change
+  useEffect(() => {
+    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_ITEMS))).catch(() => {});
+  }, [history]);

   const executeCommand = async (cmdToExecute?: string) => {
     const cmd = (cmdToExecute || command).trim();
     if (!cmd) return;
 
+    Haptics.selectionAsync().catch(() => {});
     setIsRunning(true);
-    const newCommand: CommandHistoryItem = {
-      command: cmd,
-      output: 'Executing...',
-      timestamp: new Date(),
-      status: 'success'
-    };
+    const id = nanoid();
+    const newCommand: CommandHistoryItem = {
+      id,
+      command: cmd,
+      output: 'Executing...',
+      timestamp: new Date().toISOString(),
+      status: 'success'
+    };
 
     setHistory(prev => [...prev, newCommand]);
     setCommand('');
 
-    // Simulate realistic command execution
+    // Cancellable execution
     try {
-      const output = await simulateCommand(cmd);
-      setHistory(prev => prev.map((item, index) => 
-        index === prev.length - 1 
-          ? { ...item, output, status: 'success' as const }
-          : item
-      ));
+      abortRef.current?.abort();
+      abortRef.current = new AbortController();
+      const { output, status } = await simulateCommand(cmd, abortRef.current.signal);
+      Haptics.impactAsync(status === 'success' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
+      setHistory(prev => prev.map(item => item.id === id ? { ...item, output, status } : item));
     } catch (error) {
-      setHistory(prev => prev.map((item, index) => 
-        index === prev.length - 1 
-          ? { ...item, output: error as string, status: 'error' as const }
-          : item
-      ));
+      setHistory(prev => prev.map(item => item.id === id ? { ...item, output: String(error), status: 'error' as const } : item));
     } finally {
       setIsRunning(false);
     }
   };

-  const simulateCommand = async (cmd: string): Promise<string> => {
-    // ... (removed - moved to services/terminalSim)
-  };
+  // Auto-scroll to bottom on new lines
+  useEffect(() => {
+    scrollRef.current?.scrollToEnd({ animated: true });
+  }, [history, isRunning]);

   const clearHistory = () => {
     setHistory([]);
   };
@@
-      <View style={styles.terminalContainer}>
-        <ScrollView 
+      <View style={styles.terminalContainer} accessibilityRole="summary" accessibilityLabel="Terminal output">
+        <ScrollView
+          ref={scrollRef}
           style={styles.terminalOutput} 
           contentContainerStyle={{ paddingBottom: 20 }}
           showsVerticalScrollIndicator={false}
         >
-          {history.map((item, index) => {
-            const itemKey = `cmd-${index}-${item.timestamp.getTime()}`;
+          {history.map((item) => {
+            const itemKey = item.id;
-            const isExpanded = expandedItems[itemKey] || false;
-            const outputLines = item.output.split('\n');
+            const isExpanded = !!expandedItems[itemKey];
+            const outputLines = (item.output || '').split('\n');
             const shouldTruncate = outputLines.length > 5;
             const displayOutput = shouldTruncate && !isExpanded 
               ? outputLines.slice(0, 5).join('\n') + '\n...' 
               : item.output;
 
             return (
               <View key={itemKey} style={styles.commandBlock}>
-                <TouchableOpacity 
+                <TouchableOpacity
+                  accessibilityRole="button"
+                  accessibilityLabel={`Command ${item.command}. ${isExpanded ? 'Collapse' : 'Expand'} output`}
                   style={styles.commandHeader}
                   onPress={() => {
                     setExpandedItems(prev => ({
                       ...prev,
                       [itemKey]: !prev[itemKey]
                     }));
                   }}
                   onLongPress={() => executeCommand(item.command)}
                 >
                   <Text style={styles.prompt}>$ </Text>
                   <Text style={styles.commandText}>{item.command}</Text>
                   <Text style={styles.timestamp}>
-                    {item.timestamp.toLocaleTimeString()}
+                    {new Date(item.timestamp).toLocaleTimeString()}
                   </Text>
                 </TouchableOpacity>
                 <Text style={[
                   styles.outputText,
                   item.status === 'error' && styles.errorText
                 ]}>
                   {displayOutput}
                 </Text>
                 {shouldTruncate && (
                   <TouchableOpacity 
                     style={styles.expandButton}
                     onPress={() => {
                       setExpandedItems(prev => ({
                         ...prev,
                         [itemKey]: !prev[itemKey]
                       }));
                     }}
                   >
                     <Text style={styles.expandButtonText}>
                       {isExpanded ? '▲ Show Less' : '▼ Show More'}
                     </Text>
                   </TouchableOpacity>
                 )}
               </View>
             );
           })}
           {isRunning && (
             <View style={styles.loadingIndicator}>
               <Text style={styles.loadingText}>Executing command...</Text>
             </View>
           )}
         </ScrollView>
       </View>
@@
-          <TouchableOpacity
-            style={[styles.actionButton, styles.runButton]}
-            onPress={() => executeCommand()}
-            disabled={isRunning || !command.trim()}
-          >
-            {isRunning ? (
-              <Square color={Colors.Colors.text.inverse} size={16} />
-            ) : (
-              <Play color={Colors.Colors.text.inverse} size={16} />
-            )}
-            <Text style={styles.runButtonText}>
-              {isRunning ? 'Stop' : 'Run'}
-            </Text>
-          </TouchableOpacity>
+          <TouchableOpacity
+            style={[styles.actionButton, styles.runButton]}
+            onPress={() => {
+              if (isRunning) {
+                abortRef.current?.abort();
+                setIsRunning(false);
+                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
+              } else {
+                executeCommand();
+              }
+            }}
+            disabled={!isRunning && !command.trim()}
+            accessibilityRole="button"
+            accessibilityLabel={isRunning ? 'Stop command' : 'Run command'}
+          >
+            {isRunning
+              ? <Square color={Colors.Colors.text.inverse} size={16} />
+              : <Play color={Colors.Colors.text.inverse} size={16} />}
+            <Text style={styles.runButtonText}>{isRunning ? 'Stop' : 'Run'}</Text>
+          </TouchableOpacity>
