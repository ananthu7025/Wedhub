/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect } from "react";

const ScriptComponent = () => {
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("bootstrap/dist/js/bootstrap" as any)
        .then(() => {})
        .catch((err) => {
          console.error("Failed to load Bootstrap:", err);
        });
    }
  }, []);

  return null;
};

export default ScriptComponent;
