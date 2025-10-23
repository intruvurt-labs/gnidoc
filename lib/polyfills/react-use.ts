import React from "react";

try {
  const r: any = React as any;
  if (typeof r.use !== "function" && typeof r.useContext === "function") {
    r.use = r.useContext.bind(React);
    // @ts-expect-error ensure cjs default interop references also have use
    if (r.default && typeof r.default === "object") {
      // Mirror onto default (in case some modules import react as cjs default)
      (r.default as any).use = r.use;
    }
    // Also attach to globalThis.React if present (defensive)
    if (typeof globalThis !== "undefined") {
      // @ts-expect-error attach to global
      globalThis.React = globalThis.React || React;
      // @ts-expect-error set use on global React
      if (globalThis.React && typeof globalThis.React.use !== "function") {
        // @ts-expect-error
        globalThis.React.use = r.use;
      }
    }
    console.log("[polyfill] React.use shimmed to React.useContext for React 18 environments");
  }
} catch (e) {
  console.log("[polyfill] React.use shim failed", e);
}
