import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };

    console.log('[ErrorBoundary] Error report:', JSON.stringify(errorReport, null, 2));
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <AlertTriangle color={Colors.Colors.red.primary} size={64} />
            </View>

            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              The app encountered an unexpected error. Don't worry, your data is safe.
            </Text>

            {this.state.error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Error Details:</Text>
                <ScrollView style={styles.errorScroll}>
                  <Text style={styles.errorText}>{this.state.error.message}</Text>
                  {this.state.error.stack && (
                    <Text style={styles.stackTrace}>{this.state.error.stack}</Text>
                  )}
                </ScrollView>
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity style={styles.primaryButton} onPress={this.handleReset}>
                <RefreshCw color={Colors.Colors.text.inverse} size={20} />
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={this.handleReload}>
                <Home color={Colors.Colors.text.secondary} size={20} />
                <Text style={styles.secondaryButtonText}>Reload App</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.helpText}>
              If this problem persists, please contact support@intruvurt.space
            </Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    maxWidth: 500,
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
    padding: 20,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: Colors.Colors.red.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  errorContainer: {
    width: '100%',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    maxHeight: 200,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
    marginBottom: 8,
  },
  errorScroll: {
    maxHeight: 150,
  },
  errorText: {
    fontSize: 13,
    color: Colors.Colors.red.primary,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  stackTrace: {
    fontSize: 11,
    color: Colors.Colors.text.muted,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  actions: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.Colors.cyan.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
  },
  primaryButtonText: {
    color: Colors.Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.Colors.background.card,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  secondaryButtonText: {
    color: Colors.Colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
