'use client';

import { AnimatePresence, motion } from 'motion/react';
import { type ReceivedChatMessage } from '@livekit/components-react';
import { ShimmerText } from '@/components/livekit/shimmer-text';
import { cn } from '@/lib/utils';

const MotionMessage = motion.create('p');

const VIEW_MOTION_PROPS = {
  variants: {
    visible: {
      opacity: 1,
      transition: {
        ease: 'easeIn',
        duration: 0.5,
        delay: 0.8,
      },
    },
    hidden: {
      opacity: 0,
      transition: {
        ease: 'easeIn',
        duration: 0.5,
        delay: 0,
      },
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
};

interface PreConnectMessageProps {
  messages?: ReceivedChatMessage[];
  className?: string;
}

export function PreConnectMessage({ className, messages = [] }: PreConnectMessageProps) {
  const showHint = messages.length === 0;

  return (
    <AnimatePresence>
      {showHint && (
        <MotionMessage
          {...VIEW_MOTION_PROPS}
          aria-hidden={!showHint}
          className={cn('pointer-events-none text-center', className)}
        >
          <ShimmerText className="text-xs sm:text-sm font-medium text-white/80">
            The host is ready. Say something when you&apos;re ready to begin.
          </ShimmerText>
        </MotionMessage>
      )}
    </AnimatePresence>
  );
}
