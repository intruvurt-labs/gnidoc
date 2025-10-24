export const uid = (p: string = ""): string => {
  try {
    const g: typeof globalThis | undefined = globalThis as unknown as typeof globalThis;
    const uuid = (g as any)?.crypto?.randomUUID?.();
    if (typeof uuid === "string" && uuid.length > 0) return p + uuid;
  } catch {}
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `${p}${t}-${r}`;
};

export const HISTORY_CAP = 400 as const;
export const SAVE_DEBOUNCE_MS = 350 as const;
