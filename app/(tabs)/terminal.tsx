import React, { useState } from 'react';
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

interface CommandHistoryItem {
  command: string;
  output: string;
  timestamp: Date;
  status: 'success' | 'error';
}

export default function TerminalScreen() {
  const [command, setCommand] = useState<string>('');
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<CommandHistoryItem[]>([
    {
      command: 'npm --version',
      output: '9.8.1',
      timestamp: new Date(),
      status: 'success'
    },
    {
      command: 'git status',
      output: 'On branch main\nYour branch is up to date with \'origin/main\'.\n\nnothing to commit, working tree clean',
      timestamp: new Date(),
      status: 'success'
    }
  ]);

  const [isRunning, setIsRunning] = useState<boolean>(false);

  const executeCommand = async (cmdToExecute?: string) => {
    const cmd = (cmdToExecute || command).trim();
    if (!cmd) return;

    setIsRunning(true);
    const newCommand: CommandHistoryItem = {
      command: cmd,
      output: 'Executing...',
      timestamp: new Date(),
      status: 'success'
    };

    setHistory(prev => [...prev, newCommand]);
    setCommand('');

    // Simulate realistic command execution
    try {
      const output = await simulateCommand(cmd);
      setHistory(prev => prev.map((item, index) => 
        index === prev.length - 1 
          ? { ...item, output, status: 'success' as const }
          : item
      ));
    } catch (error) {
      setHistory(prev => prev.map((item, index) => 
        index === prev.length - 1 
          ? { ...item, output: error as string, status: 'error' as const }
          : item
      ));
    } finally {
      setIsRunning(false);
    }
  };

  const simulateCommand = async (cmd: string): Promise<string> => {
    // Simulate command execution delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
    
    const [baseCmd, ...args] = cmd.split(' ');
    
    switch (baseCmd.toLowerCase()) {
      case 'npm':
        if (args[0] === 'install') {
          const packages = args.slice(1);
          if (packages.length === 0) {
            return `npm WARN read-shrinkwrap This version of npm is compatible with lockfileVersion@1\nnpm WARN read-shrinkwrap but package-lock.json was generated for lockfileVersion@2\nnpm WARN read-shrinkwrap I'll try to do my best with it!\n\nadded 847 packages from 423 contributors and audited 1337 packages in 12.456s\n\nfound 0 vulnerabilities`;
          } else {
            return `+ ${packages.join(' ')}\nadded ${packages.length} package${packages.length > 1 ? 's' : ''} from ${Math.floor(Math.random() * 50) + 10} contributors in ${(Math.random() * 5 + 2).toFixed(2)}s`;
          }
        } else if (args[0] === 'run') {
          const script = args[1];
          switch (script) {
            case 'build':
              return `> expo-app@1.0.0 build\n> expo build\n\n✓ Optimizing JavaScript bundle\n✓ Building native code\n✓ Generating source maps\n\nBuild completed successfully!\nOutput: dist/`;
            case 'start':
              return `> expo-app@1.0.0 start\n> expo start\n\n🌐 Metro waiting on exp://192.168.1.100:19000\n📱 Scan the QR code above with Expo Go (Android) or the Camera app (iOS)\n\nPress ? to show all options`;
            case 'test':
              return `> expo-app@1.0.0 test\n> jest\n\n PASS  src/components/Button.test.tsx\n PASS  src/screens/Home.test.tsx\n PASS  src/utils/helpers.test.tsx\n\nTest Suites: 3 passed, 3 total\nTests:       12 passed, 12 total\nSnapshots:   0 total\nTime:        2.847 s\nRan all test suites.`;
            default:
              return `npm ERR! missing script: ${script}\nnpm ERR! \nnpm ERR! To see a list of scripts, run:\nnpm ERR!   npm run`;
          }
        } else if (args[0] === '--version') {
          return '9.8.1';
        } else {
          return `Usage: npm <command>\n\nwhere <command> is one of:\n    install, run, test, build, start, --version\n\nFor more help, run:\n    npm help`;
        }
        
      case 'git':
        if (args[0] === 'status') {
          return `On branch main\nYour branch is up to date with 'origin/main'.\n\nChanges not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n  (use "git restore <file>..." to discard changes in working directory)\n\tmodified:   src/components/Dashboard.tsx\n\tmodified:   src/contexts/AgentContext.tsx\n\nno changes added to commit (use "git add" or "git commit -a")`;
        } else if (args[0] === 'add') {
          return args[1] === '.' ? 'Added all files to staging area.' : `Added ${args.slice(1).join(' ')} to staging area.`;
        } else if (args[0] === 'commit') {
          return `[main ${Math.random().toString(36).substr(2, 7)}] ${args.slice(2).join(' ') || 'Update files'}\n 2 files changed, 47 insertions(+), 12 deletions(-)`;
        } else if (args[0] === 'push') {
          return `Enumerating objects: 8, done.\nCounting objects: 100% (8/8), done.\nDelta compression using up to 8 threads\nCompressing objects: 100% (4/4), done.\nWriting objects: 100% (4/4), 1.23 KiB | 1.23 MiB/s, done.\nTotal 4 (delta 2), reused 0 (delta 0), pack-reused 0\nTo github.com:user/repo.git\n   abc1234..def5678  main -> main`;
        } else if (args[0] === 'pull') {
          return `Already up to date.`;
        } else {
          return `git: '${args[0]}' is not a git command. See 'git --help'.`;
        }
        
      case 'ls':
      case 'dir':
        return `total 24\ndrwxr-xr-x  8 user  staff   256 Oct  2 12:00 .\ndrwxr-xr-x  3 user  staff    96 Oct  1 10:30 ..\n-rw-r--r--  1 user  staff   123 Oct  2 11:45 .gitignore\ndrwxr-xr-x  4 user  staff   128 Oct  2 12:00 app\ndrwxr-xr-x  3 user  staff    96 Oct  1 15:20 assets\ndrwxr-xr-x  2 user  staff    64 Oct  2 09:15 components\ndrwxr-xr-x  2 user  staff    64 Oct  1 14:30 constants\n-rw-r--r--  1 user  staff  1247 Oct  2 11:30 package.json\n-rw-r--r--  1 user  staff   456 Oct  1 16:45 README.md`;
        
      case 'pwd':
        return '/Users/developer/projects/gnidoc-terces';
        
      case 'whoami':
        return 'developer';
        
      case 'date':
        return new Date().toString();
        
      case 'echo':
        return args.join(' ');
        
      case 'clear':
        setHistory([]);
        return '';
        
      case 'help':
        return `Available commands:\n\nFile Operations:\n  ls, dir          - List directory contents\n  pwd              - Print working directory\n  clear            - Clear terminal history\n\nDevelopment:\n  npm install      - Install dependencies\n  npm run <script> - Run npm scripts (build, start, test)\n  git <command>    - Git operations (status, add, commit, push, pull)\n\nSystem:\n  whoami           - Current user\n  date             - Current date and time\n  echo <text>      - Print text\n  help             - Show this help message\n\nTip: Use the quick command buttons for common operations!`;
        
      case 'expo':
        if (args[0] === 'start') {
          return `Starting Metro Bundler...\n\n🌐 Metro waiting on exp://192.168.1.100:19000\n📱 Scan the QR code with Expo Go (Android) or Camera app (iOS)\n\n› Press a │ open Android\n› Press i │ open iOS simulator\n› Press w │ open web\n› Press r │ reload app\n› Press m │ toggle menu\n› Press ? │ show all commands`;
        } else if (args[0] === 'build') {
          return `Building standalone app...\n\n✓ Checking project configuration\n✓ Optimizing assets\n✓ Building JavaScript bundle\n✓ Compiling native code\n\nBuild completed! Check your build artifacts.`;
        } else {
          return `Expo CLI ${Math.floor(Math.random() * 10) + 40}.0.0\n\nUsage: expo <command>\n\nCommands:\n  start    Start the development server\n  build    Build the app for production\n  publish  Publish the app\n\nFor more help, run: expo --help`;
        }
        
      case 'yarn':
        if (args[0] === 'install') {
          return `yarn install v1.22.19\n[1/4] 🔍  Resolving packages...\n[2/4] 🚚  Fetching packages...\n[3/4] 🔗  Linking dependencies...\n[4/4] 🔨  Building fresh packages...\n✨  Done in ${(Math.random() * 10 + 5).toFixed(2)}s.`;
        } else if (args[0] === 'build') {
          return `yarn run v1.22.19\n$ expo build\n\n✓ JavaScript bundle built successfully\n✓ Assets optimized\n✓ Build completed\n\n✨  Done in ${(Math.random() * 30 + 15).toFixed(2)}s.`;
        } else {
          return `yarn ${args.join(' ')}\nCommand not found. Try: yarn install, yarn build, yarn start`;
        }
        
      default:
        return `Command not found: ${baseCmd}\nType 'help' to see available commands.`;
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const quickCommands = [
    { cmd: 'npm install', icon: <Package color={Colors.Colors.cyan.primary} size={16} /> },
    { cmd: 'npm run build', icon: <Package color={Colors.Colors.warning} size={16} /> },
    { cmd: 'git status', icon: <GitBranch color={Colors.Colors.red.primary} size={16} /> },
    { cmd: 'git add .', icon: <GitBranch color={Colors.Colors.success} size={16} /> },
    { cmd: 'npm test', icon: <Package color={Colors.Colors.success} size={16} /> },
    { cmd: 'expo start', icon: <Play color={Colors.Colors.cyan.primary} size={16} /> },
    { cmd: 'ls', icon: <Folder color={Colors.Colors.warning} size={16} /> },
    { cmd: 'help', icon: <TerminalIcon color={Colors.Colors.text.muted} size={16} /> },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TerminalIcon color={Colors.Colors.cyan.primary} size={24} />
        <Text style={styles.headerTitle}>Terminal</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={clearHistory}>
            <Trash2 color={Colors.Colors.text.muted} size={18} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <History color={Colors.Colors.text.muted} size={18} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Commands */}
      <View style={styles.quickCommandsContainer}>
        <Text style={styles.sectionTitle}>Quick Commands</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {quickCommands.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickCommandButton}
              onPress={() => executeCommand(item.cmd)}
            >
              {item.icon}
              <Text style={styles.quickCommandText}>{item.cmd}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Terminal Output */}
      <View style={styles.terminalContainer}>
        <ScrollView style={styles.terminalOutput} showsVerticalScrollIndicator={false}>
          {history.map((item, index) => (
            <View key={index} style={styles.commandBlock}>
              <View style={styles.commandHeader}>
                <Text style={styles.prompt}>$ </Text>
                <Text style={styles.commandText}>{item.command}</Text>
                <Text style={styles.timestamp}>
                  {item.timestamp.toLocaleTimeString()}
                </Text>
              </View>
              <Text style={[
                styles.outputText,
                item.status === 'error' && styles.errorText
              ]}>
                {item.output}
              </Text>
            </View>
          ))}
          {isRunning && (
            <View style={styles.loadingIndicator}>
              <Text style={styles.loadingText}>Executing command...</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Command Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <Text style={styles.inputPrompt}>$ </Text>
          <TextInput
            style={styles.commandInput}
            value={command}
            onChangeText={setCommand}
            placeholder="Enter command..."
            placeholderTextColor={Colors.Colors.text.muted}
            onSubmitEditing={() => executeCommand()}
            editable={!isRunning}
          />
        </View>
        <View style={styles.inputActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.runButton]}
            onPress={() => executeCommand()}
            disabled={isRunning || !command.trim()}
          >
            {isRunning ? (
              <Square color={Colors.Colors.text.inverse} size={16} />
            ) : (
              <Play color={Colors.Colors.text.inverse} size={16} />
            )}
            <Text style={styles.runButtonText}>
              {isRunning ? 'Stop' : 'Run'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
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
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  quickCommandsContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    color: Colors.Colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  quickCommandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    gap: 6,
  },
  quickCommandText: {
    color: Colors.Colors.text.secondary,
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  terminalContainer: {
    flex: 1,
    marginHorizontal: 20,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.primary,
    marginBottom: 16,
  },
  terminalOutput: {
    flex: 1,
    padding: 16,
  },
  commandBlock: {
    marginBottom: 16,
  },
  commandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  prompt: {
    color: Colors.Colors.cyan.primary,
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
  },
  commandText: {
    flex: 1,
    color: Colors.Colors.text.primary,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  timestamp: {
    color: Colors.Colors.text.muted,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  outputText: {
    color: Colors.Colors.text.secondary,
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 16,
    paddingLeft: 16,
  },
  errorText: {
    color: Colors.Colors.error,
  },
  loadingIndicator: {
    paddingVertical: 8,
  },
  loadingText: {
    color: Colors.Colors.warning,
    fontFamily: 'monospace',
    fontSize: 12,
    fontStyle: 'italic',
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.Colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: Colors.Colors.border.muted,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  inputPrompt: {
    color: Colors.Colors.cyan.primary,
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  commandInput: {
    flex: 1,
    color: Colors.Colors.text.primary,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  inputActions: {
    alignItems: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  runButton: {
    backgroundColor: Colors.Colors.cyan.primary,
  },
  runButtonText: {
    color: Colors.Colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
});