import { useState, useMemo, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';

interface AppBuilderState {
  currentStep: 'idle' | 'planning' | 'design' | 'backend' | 'database' | 'deployment' | 'complete';
  appDescription: string;
  generatedAppId?: string;
  isGenerating: boolean;
  error?: string;
}

interface AppBuilderContextValue {
  state: AppBuilderState;
  setAppDescription: (description: string) => void;
  startGeneration: () => void;
  setCurrentStep: (step: AppBuilderState['currentStep']) => void;
  setGeneratedAppId: (id: string) => void;
  setError: (error: string) => void;
  resetBuilder: () => void;
}

const initialState: AppBuilderState = {
  currentStep: 'idle',
  appDescription: '',
  isGenerating: false,
};

export const [AppBuilderProvider, useAppBuilder] = createContextHook<AppBuilderContextValue>(() => {
  const [state, setState] = useState<AppBuilderState>(initialState);

  const setAppDescription = useCallback((description: string) => {
    setState(prev => ({ ...prev, appDescription: description }));
  }, []);

  const startGeneration = useCallback(() => {
    setState(prev => ({ ...prev, isGenerating: true, currentStep: 'planning', error: undefined }));
  }, []);

  const setCurrentStep = useCallback((step: AppBuilderState['currentStep']) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const setGeneratedAppId = useCallback((id: string) => {
    setState(prev => ({ ...prev, generatedAppId: id }));
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, isGenerating: false }));
  }, []);

  const resetBuilder = useCallback(() => {
    setState(initialState);
  }, []);

  return useMemo(() => ({
    state,
    setAppDescription,
    startGeneration,
    setCurrentStep,
    setGeneratedAppId,
    setError,
    resetBuilder,
  }), [state, setAppDescription, startGeneration, setCurrentStep, setGeneratedAppId, setError, resetBuilder]);
});
