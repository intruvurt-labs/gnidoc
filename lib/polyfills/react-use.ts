import React from "react";

if (!(React as any).use && typeof (React as any).useContext === "function") {
  (React as any).use = (React as any).useContext;
  console.log("[polyfill] React.use polyfilled to React.useContext for compatibility");
}
