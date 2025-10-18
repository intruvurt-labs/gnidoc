import React, { useState, useEffect } from 'react';
import { Image } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FileText,
  BarChart3,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  RefreshCw,
  Play,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useProjectAnalysis } from '@/contexts/AgentContext';

const { width } = Dimensions.get('window');

interface AnalysisMetric {
  title: string;
  value: string;
  change: string;
  status: 'good' | 'warning' | 'error';
  icon: React.ReactNode;
}

interface CodeIssue {
  id?: string;
  type: 'error' | 'warning' | 'info';
  file: string;
  line: number;
  message: string;
}

export default function AnalysisScreen() {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'issues' | 'metrics'>('overview');
  const insets = useSafeAreaInsets();
  const { analysis, runAnalysis, isAnalyzing } = useProjectAnalysis();

  useEffect(() => {
    if (!analysis) {
      runAnalysis();
    }
  }, [analysis, runAnalysis]);

  const handleRunAnalysis = () => {
    if (isAnalyzing) return;
    runAnalysis();
  };

  const metrics: AnalysisMetric[] = analysis ? [
    {
      title: 'Code Quality',
      value: `${analysis.quality}%`,
      change: analysis.quality > 90 ? '+2%' : analysis.quality > 70 ? '0%' : '-5%',
      status: analysis.quality > 90 ? 'good' : analysis.quality > 70 ? 'warning' : 'error',
      icon: <Shield color={analysis.quality > 90 ? Colors.Colors.success : analysis.quality > 70 ? Colors.Colors.warning : Colors.Colors.error} size={20} />
    },
    {
      title: 'Test Coverage',
      value: `${analysis.coverage}%`,
      change: analysis.coverage > 80 ? '+5%' : analysis.coverage > 50 ? '0%' : '-10%',
      status: analysis.coverage > 80 ? 'good' : analysis.coverage > 50 ? 'warning' : 'error',
      icon: <CheckCircle color={analysis.coverage > 80 ? Colors.Colors.success : analysis.coverage > 50 ? Colors.Colors.warning : Colors.Colors.error} size={20} />
    },
    {
      title: 'Performance',
      value: `${analysis.performance}%`,
      change: analysis.performance > 85 ? '+3%' : analysis.performance > 70 ? '0%' : '-3%',
      status: analysis.performance > 85 ? 'good' : analysis.performance > 70 ? 'warning' : 'error',
      icon: <TrendingUp color={analysis.performance > 85 ? Colors.Colors.success : analysis.performance > 70 ? Colors.Colors.warning : Colors.Colors.error} size={20} />
    },
    {
      title: 'Security Score',
      value: `${analysis.security}%`,
      change: analysis.security > 90 ? '+1%' : analysis.security > 75 ? '0%' : '-2%',
      status: analysis.security > 90 ? 'good' : analysis.security > 75 ? 'warning' : 'error',
      icon: <Shield color={analysis.security > 90 ? Colors.Colors.success : analysis.security > 75 ? Colors.Colors.warning : Colors.Colors.error} size={20} />
    },
  ] : [];

  const issues: CodeIssue[] = analysis?.issues || [];

  const getStatusColor = (status: 'good' | 'warning' | 'error') => {
    switch (status) {
      case 'good': return Colors.Colors.success;
      case 'warning': return Colors.Colors.warning;
      case 'error': return Colors.Colors.error;
      default: return Colors.Colors.text.muted;
    }
  };

  const getIssueIcon = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error': return <XCircle color={Colors.Colors.error} size={16} />;
      case 'warning': return <AlertTriangle color={Colors.Colors.warning} size={16} />;
      case 'info': return <CheckCircle color={Colors.Colors.info} size={16} />;
    }
  };

  const tabs = [
    { id: 'overview' as const, title: 'Overview', icon: <BarChart3 size={18} /> },
    { id: 'issues' as const, title: 'Issues', icon: <AlertTriangle size={18} /> },
    { id: 'metrics' as const, title: 'Metrics', icon: <TrendingUp size={18} /> },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Image 
          source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/sebbcbl3qyfm3upp7u2ct' }}
          style={{ width: 28, height: 28 }}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Project Analysis</Text>
        <TouchableOpacity 
          style={[styles.refreshButton, isAnalyzing && styles.refreshButtonActive]} 
          onPress={handleRunAnalysis}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <RefreshCw color={Colors.Colors.cyan.primary} size={18} />
          ) : (
            <Play color={Colors.Colors.text.muted} size={18} />
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabButton,
              selectedTab === tab.id && styles.activeTab
            ]}
            onPress={() => setSelectedTab(tab.id as any)}
          >
            <Text>{tab.icon}</Text>
            <Text style={[
              styles.tabText,
              selectedTab === tab.id && styles.activeTabText
            ]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedTab === 'overview' && (
          <>
            {/* Metrics Grid */}
            <View style={styles.metricsGrid}>
              {metrics.map((metric, index) => (
                <View key={`metric-${index}-${metric.title}`} style={[styles.metricCard, { borderColor: getStatusColor(metric.status) }]}>
                  <View style={styles.metricHeader}>
                    <Text>{metric.icon}</Text>
                    <Text style={styles.metricTitle}>{metric.title}</Text>
                  </View>
                  <Text style={[styles.metricValue, { color: getStatusColor(metric.status) }]}>
                    {metric.value}
                  </Text>
                  <Text style={styles.metricChange}>{metric.change}</Text>
                </View>
              ))}
            </View>

            {/* Quick Summary */}
            <View style={styles.summaryContainer}>
              <Text style={styles.sectionTitle}>Analysis Summary</Text>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryText}>
                  {analysis ? (
                    `Your codebase shows ${analysis.quality > 90 ? 'excellent' : analysis.quality > 70 ? 'good' : 'needs improvement'} health with ${analysis.quality}% code quality score. 
                    Test coverage is at ${analysis.coverage}%. ${issues.filter(i => i.type === 'error').length > 0 ? `Consider addressing the ${issues.filter(i => i.type === 'error').length} critical errors` : 'No critical errors found'}.
                    Performance score: ${analysis.performance}%, Security score: ${analysis.security}%.`
                  ) : (
                    'Run analysis to see your project health summary.'
                  )}
                </Text>
              </View>
            </View>
          </>
        )}

        {selectedTab === 'issues' && (
          <View style={styles.issuesContainer}>
            <Text style={styles.sectionTitle}>Code Issues ({issues.length})</Text>
            {issues.map((issue, index) => (
              <TouchableOpacity key={`issue-${index}-${issue.id || issue.file}-${issue.line}`} style={styles.issueCard}>
                <View style={styles.issueHeader}>
                  <Text>{getIssueIcon(issue.type)}</Text>
                  <Text style={styles.issueFile}>{issue.file}</Text>
                  <Text style={styles.issueLine}>:{issue.line}</Text>
                </View>
                <Text style={styles.issueMessage}>{issue.message}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedTab === 'metrics' && (
          <View style={styles.metricsContainer}>
            <Text style={styles.sectionTitle}>Detailed Metrics</Text>
            
            <View style={styles.metricSection}>
              <Text style={styles.metricSectionTitle}>Code Quality Breakdown</Text>
              {analysis ? (
                <>
                  <View style={styles.progressItem}>
                    <Text style={styles.progressLabel}>Code Quality</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { 
                        width: `${analysis.quality}%`, 
                        backgroundColor: analysis.quality > 90 ? Colors.Colors.success : analysis.quality > 70 ? Colors.Colors.warning : Colors.Colors.error 
                      }]} />
                    </View>
                    <Text style={styles.progressValue}>{analysis.quality}%</Text>
                  </View>
                  <View style={styles.progressItem}>
                    <Text style={styles.progressLabel}>Test Coverage</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { 
                        width: `${analysis.coverage}%`, 
                        backgroundColor: analysis.coverage > 80 ? Colors.Colors.success : analysis.coverage > 50 ? Colors.Colors.warning : Colors.Colors.error 
                      }]} />
                    </View>
                    <Text style={styles.progressValue}>{analysis.coverage}%</Text>
                  </View>
                  <View style={styles.progressItem}>
                    <Text style={styles.progressLabel}>Performance</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { 
                        width: `${analysis.performance}%`, 
                        backgroundColor: analysis.performance > 85 ? Colors.Colors.success : analysis.performance > 70 ? Colors.Colors.warning : Colors.Colors.error 
                      }]} />
                    </View>
                    <Text style={styles.progressValue}>{analysis.performance}%</Text>
                  </View>
                  <View style={styles.progressItem}>
                    <Text style={styles.progressLabel}>Security</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { 
                        width: `${analysis.security}%`, 
                        backgroundColor: analysis.security > 90 ? Colors.Colors.success : analysis.security > 75 ? Colors.Colors.warning : Colors.Colors.error 
                      }]} />
                    </View>
                    <Text style={styles.progressValue}>{analysis.security}%</Text>
                  </View>
                </>
              ) : (
                <Text style={styles.noDataText}>Run analysis to see detailed metrics</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
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
    color: Colors.Colors.cyanRed.primary,
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonActive: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 6,
  },
  noDataText: {
    color: Colors.Colors.text.muted,
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    marginHorizontal: 2,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: Colors.Colors.cyan.primary,
    borderColor: Colors.Colors.cyan.primary,
  },
  tabText: {
    color: Colors.Colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.Colors.text.inverse,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    width: (width - 52) / 2,
    borderWidth: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metricTitle: {
    color: Colors.Colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricChange: {
    color: Colors.Colors.text.muted,
    fontSize: 10,
  },
  summaryContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: Colors.Colors.cyanRed.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  summaryText: {
    color: Colors.Colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  issuesContainer: {
    marginBottom: 24,
  },
  issueCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  issueFile: {
    color: Colors.Colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  issueLine: {
    color: Colors.Colors.text.muted,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  issueMessage: {
    color: Colors.Colors.text.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  metricsContainer: {
    marginBottom: 24,
  },
  metricSection: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  metricSectionTitle: {
    color: Colors.Colors.cyanRed.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  progressLabel: {
    color: Colors.Colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
    minWidth: 100,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressValue: {
    color: Colors.Colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 35,
  },
});