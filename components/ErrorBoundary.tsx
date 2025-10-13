import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Linking } from 'react-native';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface Props {
  children: ReactNode;
  /** Optional custom fallback node. If provided, it overrides the built-in UI. */
  fallback?: ReactNode;
  /** Called after an error is caught (in addition to reportError). */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Provide keys that, when changed, reset the boundary (e.g., route/path or build ID). */
  resetKeys?: ReadonlyArray<unknown>;
  /** Called when the boundary resets (via Try Again or resetKeys change). */
  onReset?: () => void;
  /** Optional reporter (e.g., Sentry.captureException). */
  reportError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Override support contact; defaults to support@intruvurt.space */
  supportEmail?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  prevResetKeys?: ReadonlyArray<unknown>;
}

export default class ErrorBoundary extends Component<Props, State> {
  static defaultProps = {
    supportEmail: 'support@intruvurt.space',
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      prevResetKeys: props.resetKeys,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Update state so we can render stack info too.
    this.setState({ error, errorInfo });

    // Notify host app
    this.props.onError?.(error, errorInfo);
    this.props.reportError?.(error, errorInfo);

    // Dev-friendly console logging
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary] Caught error:', error);
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary] Error info:', errorInfo);
    }
  }

  static getDerivedStateFromProps(nextProps: Props, prevState: State): Partial<State> | null {
    // If resetKeys changed (shallow compare), reset error state
    if (!areArraysShallowEqual(nextProps.resetKeys, prevState.prevResetKeys)) {
      return {
        hasError: false,
        error: null,
        errorInfo: null,
        showDetails: false,
        prevResetKeys: nextProps.resetKeys,
      };
    }
    return null;
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    this.props.onReset?.();
  };

  handleReload = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
    } else {
      // On native, a full reload is typically via dev menu; we can just reset boundary.
      this.handleReset();
    }
  };

  openEmail = () => {
    const email = this.props.supportEmail!;
    const subject = encodeURIComponent('App Error Report');
    const body = encodeURIComponent(
      [
        `Hello Support,`,
        ``,
        `An error occurred:`,
        `Message: ${this.state.error?.message ?? 'N/A'}`,
        `Stack: ${this.state.error?.stack ?? 'N/A'}`,
        `Component Stack: ${this.state.errorInfo?.componentStack ?? 'N/A'}`,
        `Device: ${Platform.OS}, ${Platform.Version}`,
        `Time: ${new Date().toISOString()}`,
      ].join('\n')
    );
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`).catch(() => {});
  };

  renderFallback() {
    const { fallback } = this.props;
    if (fallback) return fallback;

    const { error, errorInfo, showDetails } = this.state;

    return (
      <View style={styles.container} accessibilityRole="alert" accessibilityLabel="Application error">
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <AlertTriangle color={Colors.Colors.red.primary} size={64} />
          </View>

          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            The app encountered an unexpected error. Don&apos;t worry, your data is safe.
          </Text>

          {error && (
            <View style={styles.errorContainer}>
              <View style={styles.errorHeader}>
                <Text style={styles.errorTitle}>Error Details</Text>
                <TouchableOpacity
                  onPress={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                  accessibilityRole="button"
                  accessibilityLabel={showDetails ? 'Hide error details' : 'Show error details'}
                  style={styles.disclosure}
                >
                  {showDetails ? (
                    <ChevronUp color={Colors.Colors.text.secondary} size={18} />
                  ) : (
                    <ChevronDown color={Colors.Colors.text.secondary} size={18} />
                  )}
                </TouchableOpacity>
              </View>

              {showDetails && (
                <ScrollView style={styles.errorScroll}>
                  <Text style={styles.errorText}>{error.message}</Text>
                  {!!error.stack && <Text style={styles.stackTrace}>{error.stack}</Text>}
                  {!!errorInfo?.componentStack && (
                    <>
                      <Text style={[styles.errorTitle, { marginTop: 12 }]}>Component Stack</Text>
                      <Text style={styles.stackTrace}>{errorInfo.componentStack}</Text>
                    </>
                  )}
                </ScrollView>
              )}
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={this.handleReset}
              accessibilityRole="button"
              accessibilityLabel="Try again"
            >
              <RefreshCw color={Colors.Colors.text.inverse} size={20} />
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={this.handleReload}
              accessibilityRole="button"
              accessibilityLabel={Platform.OS === 'web' ? 'Reload app' : 'Reset error boundary'}
            >
              <Home color={Colors.Colors.text.secondary} size={20} />
              <Text style={styles.secondaryButtonText}>
                {Platform.OS === 'web' ? 'Reload App' : 'Reset View'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tertiaryButton}
              onPress={this.openEmail}
              accessibilityRole="button"
              accessibilityLabel="Contact support by email"
            >
              <Text style={styles.tertiaryText}>Contact Support</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.helpText}>
            If this problem persists, please contact {this.props.supportEmail}
          </Text>
        </View>
      </View>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderFallback();
    }
    return this.props.children;
  }
}

/** Shallow equality for resetKeys arrays */
function areArraysShallowEqual(a?: ReadonlyArray<unknown>, b?: ReadonlyArray<unknown>) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
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
    maxWidth: 540,
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
    maxHeight: 260,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  disclosure: {
    padding: 6,
    borderRadius: 8,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
  },
  errorScroll: {
    maxHeight: 200,
  },
  errorText: {
    fontSize: 13,
    color: Colors.Colors.red.primary,
    fontFamily: Platform.select({ web: 'monospace', default: 'monospace' }),
    marginBottom: 8,
  },
  stackTrace: {
    fontSize: 11,
    color: Colors.Colors.text.muted,
    fontFamily: Platform.select({ web: 'monospace', default: 'monospace' }),
    lineHeight: 16,
    marginTop: 4,
  },
  actions: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
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
  tertiaryButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tertiaryText: {
    color: Colors.Colors.cyan.primary,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  helpText: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
