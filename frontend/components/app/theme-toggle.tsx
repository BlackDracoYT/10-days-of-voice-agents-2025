'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Monitor, Moon, Sun } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

// Constants
const THEME_STORAGE_KEY = 'theme-preference';
const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

// Minified script to prevent FOUC (Flash of Unstyled Content)
const THEME_SCRIPT = `
  (function() {
    try {
      const doc = document.documentElement;
      const localTheme = localStorage.getItem("${THEME_STORAGE_KEY}");
      const systemTheme = window.matchMedia("${THEME_MEDIA_QUERY}").matches ? "dark" : "light";
      
      doc.classList.remove("light", "dark");
      
      if (localTheme === "dark" || (!localTheme && systemTheme === "dark") || (localTheme === "system" && systemTheme === "dark")) {
        doc.classList.add("dark");
      } else {
        doc.classList.add("light");
      }
    } catch (e) {}
  })();
`
  .replace(/\n/g, '')
  .replace(/\s+/g, ' ');

export type ThemeMode = 'dark' | 'light' | 'system';

export function ApplyThemeScript() {
  return (
    <script
      id="theme-script"
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode | undefined>(undefined);

  // 1. Initialize state on mount
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode;
    setTheme(stored ?? 'system');
  }, []);

  // 2. Listen for system changes when mode is 'system'
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);

    const handleChange = () => {
      const doc = document.documentElement;
      doc.classList.remove('light', 'dark');
      doc.classList.add(mediaQuery.matches ? 'dark' : 'light');
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const updateTheme = (newTheme: ThemeMode) => {
    const doc = document.documentElement;

    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    setTheme(newTheme);

    doc.classList.remove('light', 'dark');

    if (newTheme === 'system') {
      const systemTheme = window.matchMedia(THEME_MEDIA_QUERY).matches ? 'dark' : 'light';
      doc.classList.add(systemTheme);
    } else {
      doc.classList.add(newTheme);
    }
  };

  // Prevent hydration mismatch by rendering a placeholder until mounted
  if (!theme) {
    return (
      <div
        className={cn(
          'h-9 w-40 rounded-full border border-white/15 bg-white/5 backdrop-blur-xl animate-pulse',
          'dark:bg-white/5',
          className
        )}
      />
    );
  }

  const modes: ThemeMode[] = ['light', 'system', 'dark'];
  const activeIndex = modes.indexOf(theme);
  const segmentWidth = 100 / modes.length;

  return (
    <div
      className={cn(
        'relative flex h-9 w-44 items-center rounded-full border border-white/20',
        'bg-white/10 backdrop-blur-xl shadow-[0_12px_30px_rgba(15,23,42,0.55)]',
        'text-[11px] font-medium text-white/60',
        className
      )}
      role="radiogroup"
      aria-label="Theme toggle"
    >
      {/* Sliding highlight pill */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-y-[4px] my-auto rounded-full',
          'bg-white/90 text-slate-900 shadow-sm dark:bg-neutral-800/95'
        )}
        style={{
          width: `${segmentWidth}%`,
          transform: `translateX(${activeIndex * 100}%)`,
          transition: 'transform 200ms ease-out',
        }}
      />

      <ThemeButton
        mode="light"
        current={theme}
        onClick={() => updateTheme('light')}
        icon={<Sun weight={theme === 'light' ? 'fill' : 'bold'} />}
        label="Light"
      />
      <ThemeButton
        mode="system"
        current={theme}
        onClick={() => updateTheme('system')}
        icon={<Monitor weight={theme === 'system' ? 'fill' : 'bold'} />}
        label="Auto"
      />
      <ThemeButton
        mode="dark"
        current={theme}
        onClick={() => updateTheme('dark')}
        icon={<Moon weight={theme === 'dark' ? 'fill' : 'bold'} />}
        label="Dark"
      />
    </div>
  );
}

// Sub-component for cleaner render logic
function ThemeButton({
  mode,
  current,
  onClick,
  icon,
  label,
}: {
  mode: ThemeMode;
  current: ThemeMode;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  const isActive = current === mode;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isActive}
      aria-label={`Switch to ${label} theme`}
      onClick={onClick}
      className={cn(
        'relative z-10 flex flex-1 items-center justify-center gap-1 rounded-full px-2 py-1',
        'transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
        isActive
          ? 'text-slate-900 dark:text-neutral-50'
          : 'text-white/50 hover:text-white/90'
      )}
    >
      <span className="text-[14px] leading-none">{icon}</span>
      <span className="hidden sm:inline-block leading-none">{label}</span>
    </button>
  );
}
