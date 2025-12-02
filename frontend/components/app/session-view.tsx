'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useLocalParticipant } from '@livekit/components-react';
import { ParticipantEvent, type LocalParticipant } from 'livekit-client';
import type { AppConfig } from '@/app-config';
import { ChatTranscript } from '@/components/app/chat-transcript';
import { PreConnectMessage } from '@/components/app/preconnect-message';
import { TileLayout } from '@/components/app/tile-layout';
import {
  AgentControlBar,
  type ControlBarControls,
} from '@/components/livekit/agent-control-bar/agent-control-bar';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useConnectionTimeout } from '@/hooks/useConnectionTimout';
import { useDebugMode } from '@/hooks/useDebug';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../livekit/scroll-area/scroll-area';

const MotionBottom = motion.create('div');

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';
const BOTTOM_VIEW_MOTION_PROPS = {
  variants: {
    visible: { opacity: 1, translateY: '0%' },
    hidden: { opacity: 0, translateY: '100%' },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.3,
    delay: 0.45,
    ease: 'easeOut',
  },
};

interface FadeProps {
  top?: boolean;
  bottom?: boolean;
  className?: string;
}

export function Fade({ top = false, bottom = false, className }: FadeProps) {
  return (
    <div
      className={cn(
        'pointer-events-none h-4',
        top && 'bg-gradient-to-b from-black/30 to-transparent',
        bottom && 'bg-gradient-to-t from-black/30 to-transparent',
        className
      )}
    />
  );
}

// Subtle geometric background shapes
const SoftShape = ({ className }: { className?: string }) => (
  <div className={cn('absolute rounded-[40%] bg-white/5 blur-3xl', className)} />
);

// Player badge – simplified glass pill
function PlayerBadge({ participant }: { participant?: LocalParticipant }) {
  const [displayName, setDisplayName] = useState('Guest');

  useEffect(() => {
    if (!participant) return;

    const updateName = () => {
      let name = participant.name || '';

      if ((!name || name === 'user' || name === 'identity') && participant.metadata) {
        try {
          const meta = JSON.parse(participant.metadata);
          if (meta.name) name = meta.name;
          if (meta.displayName) name = meta.displayName;
        } catch {
          // ignore
        }
      }

      const finalName =
        name === 'user' || name === 'identity' || name.trim() === '' ? 'Guest' : name;
      setDisplayName(finalName);
    };

    updateName();
    participant.on(ParticipantEvent.NameChanged, updateName);
    participant.on(ParticipantEvent.MetadataChanged, updateName);

    return () => {
      participant.off(ParticipantEvent.NameChanged, updateName);
      participant.off(ParticipantEvent.MetadataChanged, updateName);
    };
  }, [participant]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4, duration: 0.4, ease: 'easeOut' }}
      className="absolute top-6 left-6 z-40 flex items-center gap-3 rounded-2xl
        bg-white/10 px-3 py-2.5 backdrop-blur-xl border border-white/25 shadow-[0_12px_30px_rgba(15,23,42,0.7)]"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 text-sm font-semibold">
        {displayName.charAt(0).toUpperCase() || 'G'}
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/60">
          You&apos;re live
        </span>
        <span className="text-sm font-medium text-white leading-none">{displayName}</span>
      </div>
    </motion.div>
  );
}

interface SessionViewProps {
  appConfig: AppConfig;
}

export const SessionView = ({
  appConfig,
  ...props
}: React.ComponentProps<'section'> & SessionViewProps) => {
  useConnectionTimeout(200_000);
  useDebugMode({ enabled: IN_DEVELOPMENT });

  const { localParticipant } = useLocalParticipant();

  const messages = useChatMessages();
  const [chatOpen, setChatOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const controls: ControlBarControls = {
    leave: true,
    microphone: true,
    chat: appConfig.supportsChatInput,
    camera: appConfig.supportsVideoInput,
    screenShare: appConfig.supportsVideoInput,
  };

  useEffect(() => {
    const lastMessage = messages.at(-1);
    const lastMessageIsLocal = lastMessage?.from?.isLocal === true;

    if (scrollAreaRef.current && lastMessageIsLocal) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <section
      className="relative z-10 h-full w-full overflow-hidden"
      {...props}
    >
      {/* Background */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

        <SoftShape className="top-[-10%] left-[10%] h-40 w-40" />
        <SoftShape className="top-[25%] right-[5%] h-52 w-52" />
        <SoftShape className="bottom-[-15%] left-[25%] h-60 w-60" />
      </div>

      {/* Player badge */}
      <PlayerBadge participant={localParticipant} />

      {/* Chat transcript (right side area) */}
      <div
        className={cn(
          'fixed inset-0 grid grid-cols-1 grid-rows-1',
          !chatOpen && 'pointer-events-none'
        )}
      >
        <Fade top className="absolute inset-x-4 top-0 h-32" />

        <ScrollArea
          ref={scrollAreaRef}
          className="px-4 pt-36 pb-[150px] md:px-6 md:pb-[180px]"
        >
          <ChatTranscript
            hidden={!chatOpen}
            messages={messages}
            className="ml-auto mr-0 md:mr-12 max-w-lg space-y-3 transition-opacity duration-300 ease-out"
          />
        </ScrollArea>
      </div>

      {/* Agent / tiles */}
      <TileLayout chatOpen={chatOpen} />

      {/* Bottom controls */}
      <MotionBottom
        {...BOTTOM_VIEW_MOTION_PROPS}
        className="fixed inset-x-3 bottom-0 z-50 md:inset-x-12"
      >
        {appConfig.isPreConnectBufferEnabled && (
          <PreConnectMessage messages={messages} className="pb-3" />
        )}

        <div className="relative ml-auto mr-0 md:mr-4 max-w-lg pb-4 md:pb-10">
          <Fade bottom className="absolute inset-x-0 top-0 h-4 -translate-y-full" />
          <AgentControlBar controls={controls} onChatOpenChange={setChatOpen} />
        </div>
      </MotionBottom>
    </section>
  );
};
