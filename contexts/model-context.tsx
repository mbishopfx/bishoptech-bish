"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { DEFAULT_MODEL } from "@/lib/ai/ai-providers";

interface ModelContextType {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export function ModelProvider({ children, initialModel }: { children: ReactNode; initialModel?: string }) {
  // Initialize from server-provided cookie value to avoid hydration mismatch
  const [selectedModel, setSelectedModelState] = useState<string>(initialModel ?? DEFAULT_MODEL);

  // On mount, if no initialModel provided but localStorage has a value, sync it
  useEffect(() => {
    if (!initialModel && typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedModel");
      if (stored && stored !== selectedModel) {
        setSelectedModelState(stored);
        // Also ensure cookie is set for future SSR
        document.cookie = `selectedModel=${stored}; path=/; max-age=${60 * 60 * 24 * 365}`;
      }
    }
  // We intentionally exclude selectedModel from deps to avoid re-running when it changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialModel]);

  const setSelectedModel = (model: string) => {
    setSelectedModelState(model);
    try {
      localStorage.setItem("selectedModel", model);
    } catch {}
    try {
      document.cookie = `selectedModel=${model}; path=/; max-age=${60 * 60 * 24 * 365}`;
    } catch {}
  };

  return (
    <ModelContext.Provider value={{ selectedModel, setSelectedModel }}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModel() {
  const context = useContext(ModelContext);
  if (context === undefined) {
    throw new Error("useModel must be used within a ModelProvider");
  }
  return context;
}
