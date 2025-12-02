'use client';

import { useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useRoomContext } from '@livekit/components-react';
import { useSession } from '@/components/app/session-provider';
import { SessionView } from '@/components/app/session-view';
import { WelcomeView } from '@/components/app/welcome-view';

const MotionWelcomeView = motion.create(WelcomeView);
const MotionSessionView = motion.create(SessionView);

const VIEW_MOTION_PROPS = {
  variants: {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: { duration: 0.45, ease: 'easeOut' },
};

export function ViewController() {
  const room = useRoomContext();
  const isSessionActiveRef = useRef(false);
  const { appConfig, isSessionActive, startSession } = useSession();

  isSessionActiveRef.current = isSessionActive;

  const handleAnimationComplete = () => {
    if (!isSessionActiveRef.current && room.state !== 'disconnected') {
      room.disconnect();
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden font-sans bg-[#020617] text-white">
      {/* Soft background gradient + blurred blobs */}
      <div className="pointer-events-none absolute inset-0 -z-20">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

        <div className="absolute -top-32 left-[-10%] h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute top-1/3 right-[-10%] h-80 w-80 rounded-full bg-indigo-400/15 blur-3xl" />
        <div className="absolute bottom-[-20%] left-1/4 h-72 w-72 rounded-full bg-white/5 blur-2xl" />
      </div>

      {/* Subtle brand text top-left */}
      <div className="pointer-events-none absolute left-6 top-6 z-0 select-none text-sm text-white/40 md:left-10 md:top-8">
        <div className="font-semibold tracking-[0.18em] uppercase">Voice Improv</div>
        <div className="mt-1 text-xs text-white/30">by Dr Abhishek</div>
      </div>

      {/* Main animated views */}
      <AnimatePresence mode="wait">
        {!isSessionActive && (
          <MotionWelcomeView
            key="welcome"
            {...VIEW_MOTION_PROPS}
            startButtonText={appConfig.startButtonText}
            onStartCall={startSession}
            className="relative z-10"
          />
        )}

        {isSessionActive && (
          <MotionSessionView
            key="session-view"
            {...VIEW_MOTION_PROPS}
            appConfig={appConfig}
            onAnimationComplete={handleAnimationComplete}
            className="relative z-10"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
