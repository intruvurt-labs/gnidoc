import { Platform, AppState, AppStateStatus } from "react-native";

// Shape your server modules implement
export interface MCPServer {
  dispose?: () => Promise<void> | void;
}

// ---- 1) Strong keys so Metro can statically see import() targets
export const MCP_SERVER_TYPES = [
  "expo-file-system",
  "expo-device",
] as const;
export type MCPServerType = (typeof MCP_SERVER_TYPES)[number];

// ---- 2) Lazy loaders (static strings only; no variables)
const serverLoaders: Record<MCPServerType, () => Promise<MCPServer>> = {
  "expo-file-system": async () => {
    const mod = await import("../../servers/expo-file-system-mcp");
    const AnyServer: any =
      (mod as any).default ?? (mod as any).ExpoFileSystemMCPServer;
    if (typeof AnyServer !== "function") {
      throw new Error(
        "[expo-file-system] Expected a default export class or ExpoFileSystemMCPServer"
      );
    }
    return new AnyServer();
  },
  "expo-device": async () => {
    const mod = await import("../../servers/expo-device-mcp");
    const AnyServer: any =
      (mod as any).default ?? (mod as any).ExpoDeviceMCPServer;
    if (typeof AnyServer !== "function") {
      throw new Error(
        "[expo-device] Expected a default export class or ExpoDeviceMCPServer"
      );
    }
    return new AnyServer();
  },
};

// small util to bound stuck inits (bad network, thrown but unawaited imports, etc.)
async function withTimeout<T>(p: Promise<T>, ms = 20_000, tag = "op"): Promise<T> {
  let to: any;
  const timeout = new Promise<never>((_, rej) => {
    to = setTimeout(() => rej(new Error(`[${tag}] timeout after ${ms}ms`)), ms);
  });
  try {
    const res = await Promise.race([p, timeout]);
    return res as T;
  } finally {
    clearTimeout(to);
  }
}

export class MCPSessionManager {
  private static instances = new Map<MCPServerType, MCPServer>();
  private static initializing = new Map<MCPServerType, Promise<MCPServer>>();

  private static wiredMemoryListener = false;
  private static appStateSubscription:
    | { remove?: () => void }
    | undefined;

  // Ensure we subscribe **once**; supports new & old AppState API shapes
  private static ensureMemoryListener() {
    if (this.wiredMemoryListener) return;
    this.wiredMemoryListener = true;

    if (Platform.OS !== "ios") return;

    try {
      // New API: returns Subscription with remove()
      // Note: types don't list 'memoryWarning', but RN iOS emits it.
      const sub: any = (AppState as any).addEventListener?.(
        "memoryWarning",
        () => {
          console.log(
            "[MCPSessionManager] iOS memoryWarning – clearing all MCP servers"
          );
          // Important: avoid capturing 'this' mistakenly; call class directly.
          MCPSessionManager.cleanupUnusedServers(true).catch((e) =>
            console.warn("[MCPSessionManager] cleanup error", e)
          );
        }
      );

      // Fallback: if addEventListener missing (very old RN), no-op safely
      if (sub && typeof sub === "object") {
        this.appStateSubscription = sub;
      }
    } catch (e) {
      console.log(
        "[MCPSessionManager] Failed to bind memoryWarning listener",
        e
      );
    }

    // Optional: also clear on background to be conservative on iOS
    try {
      const bgSub: any = AppState.addEventListener?.(
        "change",
        (state: AppStateStatus) => {
          if (state === "background") {
            MCPSessionManager.cleanupUnusedServers(true).catch(() => {});
          }
        }
      );
      // chain subscriptions if both exist
      if (bgSub && typeof bgSub === "object") {
        const prev = this.appStateSubscription;
        this.appStateSubscription = {
          remove() {
            try { prev?.remove?.(); } catch {}
            try { bgSub?.remove?.(); } catch {}
          },
        };
      }
    } catch {}
  }

  static async getMCPServer(serverType: MCPServerType): Promise<MCPServer> {
    this.ensureMemoryListener();

    // Fast path
    const existing = this.instances.get(serverType);
    if (existing) return existing;

    // Coalesce concurrent inits
    const inflight = this.initializing.get(serverType);
    if (inflight) return inflight;

    const loader = serverLoaders[serverType];
    if (!loader) {
      throw new Error(`Unknown MCP server type: ${serverType as string}`);
    }

    const initPromise = withTimeout(loader(), 25_000, `load:${serverType}`)
      .then((server) => {
        this.instances.set(serverType, server);
        this.initializing.delete(serverType);
        console.log(`[MCPSessionManager] Loaded MCP server: ${serverType}`);
        return server;
      })
      .catch((err) => {
        this.initializing.delete(serverType);
        console.error(
          `[MCPSessionManager] Failed to load server ${serverType}:`,
          err
        );
        throw err;
      });

    this.initializing.set(serverType, initPromise);
    return initPromise;
  }

  static async release(serverType: MCPServerType) {
    const server = this.instances.get(serverType);
    if (!server) return;

    try {
      await server.dispose?.();
    } catch (e) {
      console.log(`[MCPSessionManager] Error disposing ${serverType}`, e);
    } finally {
      this.instances.delete(serverType);
      console.log(`[MCPSessionManager] Released MCP server: ${serverType}`);
    }
  }

  /**
   * Clear all servers (used on iOS memory warning or manual call).
   * When `forceAll` is false on non-iOS, we keep instances (no-op) to avoid churn.
   */
  static async cleanupUnusedServers(forceAll = false) {
    if (Platform.OS === "ios" || forceAll) {
      const keys = Array.from(this.instances.keys());
      await Promise.all(keys.map((k) => this.release(k)));
    } else {
      console.log("[MCPSessionManager] No-op cleanup on this platform");
    }
  }

  /**
   * Optional: call at app shutdown to remove listeners
   */
  static teardown() {
    try {
      this.appStateSubscription?.remove?.();
    } catch {}
    this.wiredMemoryListener = false;
    this.appStateSubscription = undefined;
  }
}
