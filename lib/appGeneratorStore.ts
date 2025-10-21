import { create } from "zustand";
import { combine } from "zustand/middleware";
import { trpcClient } from "./trpc";

export type AppGenStep = "idle" | "scanning" | "dryrun" | "spec" | "building" | "complete" | "error";

export interface AppGenState {
  currentStep: AppGenStep;
  prompt: string;
  context?: string;
  inference?: any;
  plan?: any;
  specifications?: any;
  buildResult?: any;
  nonce?: string;
  buildNonce?: string;
  error?: string;
  isLoading: boolean;
  progress: number;
}

export interface AppGenActions {
  start: (prompt: string, context?: string) => Promise<void>;
  reset: () => void;
  retry: () => void;
}

export const useAppGeneratorStore = create(
  combine(
    {
      currentStep: "idle" as AppGenStep,
      prompt: "",
      context: undefined as string | undefined,
      inference: undefined as any,
      plan: undefined as any,
      specifications: undefined as any,
      buildResult: undefined as any,
      nonce: undefined as string | undefined,
      buildNonce: undefined as string | undefined,
      error: undefined as string | undefined,
      isLoading: false,
      progress: 0,
    },
    (set, get) => ({
      start: async (prompt: string, context?: string) => {
    set({ 
      prompt, 
      context, 
      currentStep: "scanning", 
      isLoading: true, 
      progress: 10,
      error: undefined 
    });

    try {
      console.log("[AppGen] Starting scan-infer...");
      const scanResult = await trpcClient.generation.scanInfer.mutate({ prompt, context });
      set({ 
        inference: scanResult.inference, 
        currentStep: "dryrun", 
        progress: 30 
      });

      console.log("[AppGen] Running dry-run...");
      const dryRunResult = await trpcClient.generation.dryRun.mutate({
        prompt,
        inference: scanResult.inference,
        context,
      });
      set({ 
        plan: dryRunResult.plan, 
        nonce: dryRunResult.nonce, 
        currentStep: "spec", 
        progress: 50 
      });

      console.log("[AppGen] Generating specifications...");
      const specResult = await trpcClient.generation.spec.mutate({
        prompt,
        inference: scanResult.inference,
        plan: dryRunResult.plan,
        nonce: dryRunResult.nonce,
        context,
      });
      set({ 
        specifications: specResult.specifications, 
        buildNonce: specResult.buildNonce, 
        currentStep: "building", 
        progress: 70 
      });

      console.log("[AppGen] Building project...");
      const buildResult = await trpcClient.generation.build.mutate({
        prompt,
        specifications: specResult.specifications,
        buildNonce: specResult.buildNonce,
        plan: dryRunResult.plan,
      });
      
      set({ 
        buildResult, 
        currentStep: "complete", 
        isLoading: false, 
        progress: 100 
      });
      
      console.log("[AppGen] Complete!", buildResult);
    } catch (error: any) {
      console.error("[AppGen] Error:", error);
      set({ 
        error: error?.message || "Generation failed", 
        currentStep: "error", 
        isLoading: false 
      });
    }
  },

      reset: () => {
    set({
      currentStep: "idle",
      prompt: "",
      context: undefined,
      inference: undefined,
      plan: undefined,
      specifications: undefined,
      buildResult: undefined,
      nonce: undefined,
      buildNonce: undefined,
      error: undefined,
      isLoading: false,
      progress: 0,
    });
  },

      retry: () => {
        const state = get();
        state.start(state.prompt, state.context);
      },
    })
  )
);
