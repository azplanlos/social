import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface BackgroundOption {
  id: string;
  name: string;
  value: string; // CSS gradient oder URL
  type: 'gradient' | 'image';
  custom?: boolean;
}

// Standard-Hintergründe
export const DEFAULT_BACKGROUNDS: BackgroundOption[] = [
  {
    id: 'liquid-glass',
    name: 'Liquid Glass',
    value: 'linear-gradient(135deg, #667eea 0%, #764ba2 30%, #f093fb 60%, #4facfe 100%)',
    type: 'gradient',
  },
  {
    id: 'sunset',
    name: 'Sonnenuntergang',
    value: 'linear-gradient(135deg, #f97316 0%, #ec4899 40%, #8b5cf6 100%)',
    type: 'gradient',
  },
  {
    id: 'ocean',
    name: 'Ozean',
    value: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 40%, #2dd4bf 100%)',
    type: 'gradient',
  },
  {
    id: 'forest',
    name: 'Wald',
    value: 'linear-gradient(135deg, #10b981 0%, #059669 40%, #047857 100%)',
    type: 'gradient',
  },
  {
    id: 'midnight',
    name: 'Mitternacht',
    value: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)',
    type: 'gradient',
  },
  {
    id: 'rose',
    name: 'Rose',
    value: 'linear-gradient(135deg, #fb7185 0%, #e11d48 40%, #be123c 100%)',
    type: 'gradient',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    value: 'linear-gradient(135deg, #a78bfa 0%, #6366f1 30%, #06b6d4 60%, #34d399 100%)',
    type: 'gradient',
  },
  {
    id: 'dark',
    name: 'Dunkel',
    value: 'linear-gradient(135deg, #1f2937 0%, #111827 50%, #0f172a 100%)',
    type: 'gradient',
  },
];

// Helle Hintergründe für den Light-Mode
export const LIGHT_BACKGROUNDS: BackgroundOption[] = [
  {
    id: 'light-sky',
    name: 'Himmel',
    value: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 30%, #7dd3fc 60%, #38bdf8 100%)',
    type: 'gradient',
  },
  {
    id: 'light-lavender',
    name: 'Lavendel',
    value: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 30%, #d8b4fe 60%, #c084fc 100%)',
    type: 'gradient',
  },
  {
    id: 'light-peach',
    name: 'Pfirsich',
    value: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 30%, #fdba74 60%, #fb923c 100%)',
    type: 'gradient',
  },
  {
    id: 'light-mint',
    name: 'Minze',
    value: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 30%, #6ee7b7 60%, #34d399 100%)',
    type: 'gradient',
  },
  {
    id: 'light-rose',
    name: 'Rosé',
    value: 'linear-gradient(135deg, #fff1f2 0%, #fecdd3 30%, #fda4af 60%, #fb7185 100%)',
    type: 'gradient',
  },
  {
    id: 'light-cloud',
    name: 'Wolke',
    value: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 30%, #e2e8f0 60%, #cbd5e1 100%)',
    type: 'gradient',
  },
  {
    id: 'light-sunrise',
    name: 'Sonnenaufgang',
    value: 'linear-gradient(135deg, #fef9c3 0%, #fde68a 30%, #fbbf24 50%, #f97316 80%, #ef4444 100%)',
    type: 'gradient',
  },
  {
    id: 'light-aqua',
    name: 'Aqua',
    value: 'linear-gradient(135deg, #ecfeff 0%, #a5f3fc 30%, #67e8f9 60%, #22d3ee 100%)',
    type: 'gradient',
  },
];

const STORAGE_KEY = 'app-background';
const CUSTOM_BG_KEY = 'app-custom-backgrounds';

interface BackgroundContextType {
  currentBackground: BackgroundOption;
  backgrounds: BackgroundOption[];
  setBackground: (bg: BackgroundOption) => void;
  addCustomBackground: (name: string, value: string, type: 'gradient' | 'image') => void;
  removeCustomBackground: (id: string) => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  // Lade gespeicherte Custom-Hintergründe
  const loadCustomBackgrounds = (): BackgroundOption[] => {
    try {
      const stored = localStorage.getItem(CUSTOM_BG_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // Lade den aktuell gewählten Hintergrund
  const loadCurrentBackground = (): BackgroundOption => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed;
      }
    } catch { /* default */ }
    return DEFAULT_BACKGROUNDS[0];
  };

  const [customBackgrounds, setCustomBackgrounds] = useState<BackgroundOption[]>(loadCustomBackgrounds);
  const [currentBackground, setCurrentBackground] = useState<BackgroundOption>(loadCurrentBackground);

  const backgrounds = [...DEFAULT_BACKGROUNDS, ...customBackgrounds];

  // Hintergrund auf body anwenden
  useEffect(() => {
    if (currentBackground.type === 'image') {
      document.body.style.background = `url(${currentBackground.value}) center/cover no-repeat fixed`;
    } else {
      document.body.style.background = currentBackground.value;
    }
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.minHeight = '100vh';
  }, [currentBackground]);

  const setBackground = useCallback((bg: BackgroundOption) => {
    setCurrentBackground(bg);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bg));
  }, []);

  const addCustomBackground = useCallback((name: string, value: string, type: 'gradient' | 'image') => {
    const newBg: BackgroundOption = {
      id: 'custom-' + Date.now(),
      name,
      value,
      type,
      custom: true,
    };
    setCustomBackgrounds(prev => {
      const updated = [...prev, newBg];
      localStorage.setItem(CUSTOM_BG_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeCustomBackground = useCallback((id: string) => {
    setCustomBackgrounds(prev => {
      const updated = prev.filter(bg => bg.id !== id);
      localStorage.setItem(CUSTOM_BG_KEY, JSON.stringify(updated));
      return updated;
    });
    // Falls der gelöschte Hintergrund aktiv war, auf Default zurücksetzen
    setCurrentBackground(curr => {
      if (curr.id === id) {
        const defaultBg = DEFAULT_BACKGROUNDS[0];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultBg));
        return defaultBg;
      }
      return curr;
    });
  }, []);

  return (
    <BackgroundContext.Provider value={{ currentBackground, backgrounds, setBackground, addCustomBackground, removeCustomBackground }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  const context = useContext(BackgroundContext);
  if (!context) {
    throw new Error('useBackground muss innerhalb von BackgroundProvider verwendet werden');
  }
  return context;
}
