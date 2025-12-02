import React, { useState } from 'react';
import { Button } from '@/components/livekit/button';

function MinimalWaveIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M8 32C16 32 16 16 24 16C32 16 32 48 40 48C48 48 48 32 56 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const WelcomeView = React.forwardRef<HTMLDivElement, any>(
  ({ startButtonText = 'Join', onStartCall }, ref) => {
    const [name, setName] = useState('');
    const [started, setStarted] = useState(false);

    async function handleStart() {
      setStarted(true);
      onStartCall?.(name.trim());
    }

    return (
      <div
        ref={ref}
        className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white px-4"
      >
        {!started && (
          <section
            className="
              relative w-full max-w-md
              rounded-3xl border border-white/10
              bg-white/5 backdrop-blur-2xl
              shadow-[0_18px_60px_rgba(15,23,42,0.45)]
              px-6 py-8 sm:px-8 sm:py-10
              flex flex-col gap-6
            "
          >
            {/* Subtle top glow */}
            <div className="pointer-events-none absolute inset-x-12 -top-10 h-16 bg-white/10 blur-3xl" />

            {/* Icon + heading */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="inline-flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xl p-3">
                <MinimalWaveIcon className="w-10 h-10 text-white/90" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                  Join the room
                </h2>
                <p className="text-sm text-white/60 max-w-sm">
                  Enter the name you’d like others to see. You can change it later inside the call.
                </p>
              </div>
            </div>

            {/* Input + button */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-white/60">
                Display name
              </label>
              <div className="flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleStart();
                  }}
                  placeholder="Your name"
                  className="
                    flex-1 rounded-2xl border border-white/10
                    bg-white/5 backdrop-blur-xl
                    px-4 py-2.5 text-sm
                    text-white placeholder:text-white/40
                    focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent
                    transition
                  "
                />

                <Button
                  variant="primary"
                  size="default"
                  onClick={handleStart}
                  className="
                    rounded-2xl px-5 text-sm font-medium
                    bg-white text-slate-900
                    hover:bg-slate-100
                    transition
                    whitespace-nowrap
                  "
                >
                  {startButtonText}
                </Button>
              </div>
              <p className="text-[11px] text-white/40">
                Press <span className="font-semibold">Enter</span> to continue
              </p>
            </div>
          </section>
        )}

        {started && (
          <div className="text-center text-white text-xl sm:text-2xl font-medium animate-pulse">
            Preparing your call…
          </div>
        )}
      </div>
    );
  }
);

WelcomeView.displayName = 'WelcomeView';
