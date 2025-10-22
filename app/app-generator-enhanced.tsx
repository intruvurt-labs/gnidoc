import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppGeneratorStore } from "@/lib/appGeneratorStore";
import { Check, AlertCircle, Loader2, Sparkles, Download } from "lucide-react-native";

export default function AppGeneratorEnhancedScreen() {
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");

  const {
    currentStep,
    inference,
    plan,
    specifications,
    buildResult,
    error,
    progress,
    start,
    reset,
    retry,
  } = useAppGeneratorStore();

  const handleGenerate = () => {
    if (prompt.trim().length < 10) {
      alert("Prompt must be at least 10 characters");
      return;
    }
    start(prompt, context);
  };

  const getStepStatus = (step: string) => {
    const steps = ["scanning", "dryrun", "spec", "building", "complete"];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);
    
    if (currentStep === "error") return "error";
    if (stepIndex < currentIndex) return "complete";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: "Enhanced App Generator",
          headerStyle: { backgroundColor: "#0a0a0a" },
          headerTintColor: "#fff",
        }}
      />
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Sparkles size={32} color="#60a5fa" />
          <Text style={styles.title}>Multi-Model App Builder</Text>
          <Text style={styles.subtitle}>
            Powered by GPT-4o, Claude 3.5, Gemini 1.5
          </Text>
        </View>

        {currentStep === "idle" && (
          <View style={styles.inputSection}>
            <Text style={styles.label}>Describe your app *</Text>
            <TextInput
              style={styles.textArea}
              placeholder="E.g., Build a task manager with auth, database, and team collaboration"
              placeholderTextColor="#6b7280"
              value={prompt}
              onChangeText={setPrompt}
              multiline
              numberOfLines={4}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Additional context (optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Any specific requirements, tech stack preferences, or constraints"
              placeholderTextColor="#6b7280"
              value={context}
              onChangeText={setContext}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.button, prompt.trim().length < 10 && styles.buttonDisabled]}
              onPress={handleGenerate}
              disabled={prompt.trim().length < 10}
            >
              <Text style={styles.buttonText}>Generate App</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentStep !== "idle" && (
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>

            <View style={styles.stepsContainer}>
              <StepItem
                label="Scan & Infer"
                status={getStepStatus("scanning")}
                description={inference ? `App type: ${inference.appType}` : "Analyzing requirements"}
              />
              <StepItem
                label="Dry Run"
                status={getStepStatus("dryrun")}
                description={plan ? `${plan.structure?.length || 0} files planned` : "Planning structure"}
              />
              <StepItem
                label="Specifications"
                status={getStepStatus("spec")}
                description={specifications ? `${specifications.specifications?.length || 0} specs generated` : "Creating specs"}
              />
              <StepItem
                label="Build"
                status={getStepStatus("building")}
                description={buildResult ? `${buildResult.filesCreated} files created` : "Building project"}
              />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <AlertCircle size={20} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={retry}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {currentStep === "complete" && buildResult && (
              <View style={styles.successBox}>
                <Check size={24} color="#10b981" />
                <Text style={styles.successTitle}>App Generated Successfully!</Text>
                <Text style={styles.successSubtitle}>
                  {buildResult.filesCreated} files • {(buildResult.zipSize / 1024).toFixed(0)} KB
                </Text>
                
                {buildResult.buildSuccess ? (
                  <Text style={styles.buildStatus}>✓ Build successful - ready to deploy</Text>
                ) : (
                  <Text style={styles.buildWarning}>⚠ Manual fixes needed (build failed)</Text>
                )}

                <TouchableOpacity style={styles.downloadButton}>
                  <Download size={20} color="#fff" />
                  <Text style={styles.downloadButtonText}>Download ZIP</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.resetButton} onPress={reset}>
                  <Text style={styles.resetButtonText}>Generate Another</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {(inference || plan || specifications) && currentStep !== "complete" && (
          <View style={styles.detailsSection}>
            {inference && (
              <DetailCard title="Inference" data={inference} />
            )}
            {plan && (
              <DetailCard title="Plan" data={plan} />
            )}
            {specifications && (
              <DetailCard title="Specifications" data={specifications} />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface StepItemProps {
  label: string;
  status: "pending" | "active" | "complete" | "error";
  description?: string;
}

function StepItem({ label, status, description }: StepItemProps) {
  return (
    <View style={styles.stepItem}>
      <View style={styles.stepIndicator}>
        {status === "complete" && <Check size={16} color="#10b981" />}
        {status === "active" && <Loader2 size={16} color="#60a5fa" />}
        {status === "error" && <AlertCircle size={16} color="#ef4444" />}
        {status === "pending" && <View style={styles.stepDot} />}
      </View>
      <View style={styles.stepContent}>
        <Text style={[
          styles.stepLabel,
          status === "active" && styles.stepLabelActive,
          status === "complete" && styles.stepLabelComplete,
        ]}>
          {label}
        </Text>
        {description && (
          <Text style={styles.stepDescription}>{description}</Text>
        )}
      </View>
    </View>
  );
}

function DetailCard({ title, data }: { title: string; data: any }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <View style={styles.detailCard}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)}>
        <Text style={styles.detailCardTitle}>{title}</Text>
      </TouchableOpacity>
      {expanded && (
        <ScrollView horizontal>
          <Text style={styles.detailCardContent}>
            {JSON.stringify(data, null, 2)}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
  },
  inputSection: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#d1d5db",
    marginBottom: 6,
  },
  textArea: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: "#374151",
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  progressSection: {
    gap: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#1a1a1a",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#60a5fa",
  },
  stepsContainer: {
    gap: 16,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1a1a1a",
    borderWidth: 2,
    borderColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4b5563",
  },
  stepContent: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  stepLabelActive: {
    color: "#60a5fa",
  },
  stepLabelComplete: {
    color: "#10b981",
  },
  stepDescription: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: "#7f1d1d",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#991b1b",
    gap: 8,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: "#dc2626",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  successBox: {
    backgroundColor: "#064e3b",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#065f46",
    alignItems: "center",
    gap: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#10b981",
  },
  successSubtitle: {
    fontSize: 14,
    color: "#6ee7b7",
  },
  buildStatus: {
    fontSize: 13,
    color: "#86efac",
    marginTop: 4,
  },
  buildWarning: {
    fontSize: 13,
    color: "#fbbf24",
    marginTop: 4,
  },
  downloadButton: {
    flexDirection: "row",
    backgroundColor: "#10b981",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  downloadButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  resetButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  resetButtonText: {
    color: "#6ee7b7",
    fontSize: 14,
    fontWeight: "500",
  },
  detailsSection: {
    marginTop: 24,
    gap: 12,
  },
  detailCard: {
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
  },
  detailCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#60a5fa",
  },
  detailCardContent: {
    fontSize: 12,
    color: "#9ca3af",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginTop: 8,
  },
});
