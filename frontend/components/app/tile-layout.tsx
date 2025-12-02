'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Track } from 'livekit-client';
import { AnimatePresence, motion } from 'motion/react';
import {
  type TrackReference,
  VideoTrack,
  useLocalParticipant,
  useTracks,
  useVoiceAssistant,
} from '@livekit/components-react';
import { cn } from '@/lib/utils';

const MotionContainer = motion.create('div');

const ANIMATION_TRANSITION = {
  type: 'spring',
  stiffness: 700,
  damping: 40,
  mass: 1,
};

const classNames = {
  grid: [
    'h-full w-full',
    'grid gap-x-4 place-content-center',
    'grid-cols-[1fr_1fr] grid-rows-[60px_1fr_60px]',
  ],
  agentChatOpenWithSecondTile: ['col-start-1 row-start-1', 'self-center justify-self-end'],
  agentChatOpenWithoutSecondTile: ['col-start-1 row-start-1', 'col-span-2', 'place-content-center'],
  agentChatClosed: ['col-start-1 row-start-1', 'col-span-2 row-span-3', 'place-content-center'],
  secondTileChatOpen: ['col-start-2 row-start-1', 'self-center justify-self-start'],
  secondTileChatClosed: ['col-start-2 row-start-3', 'place-content-end'],
};

export function useLocalTrackRef(source: Track.Source) {
  const { localParticipant } = useLocalParticipant();
  const publication = localParticipant.getTrackPublication(source);
  const trackRef = useMemo<TrackReference | undefined>(
    () => (publication ? { source, participant: localParticipant, publication } : undefined),
    [source, publication, localParticipant]
  );
  return trackRef;
}

/**
 * Minimal ECG-style visualizer on a glass card.
 */
const ECGVisualizer = ({
  trackRef,
  className,
}: {
  trackRef?: TrackReference;
  className?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !trackRef?.publication?.track) return;

    const track = trackRef.publication.track;
    if (!track.mediaStreamTrack) return;

    const stream = new MediaStream([track.mediaStreamTrack]);
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 2048;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Soft line
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#22d3ee'; // cyan-ish
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(56,189,248,0.7)';

      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      source.disconnect();
      analyser.disconnect();
      audioContext.close();
    };
  }, [trackRef]);

  return <canvas ref={canvasRef} className={className} width={260} height={120} />;
};

interface TileLayoutProps {
  chatOpen: boolean;
}

export function TileLayout({ chatOpen }: TileLayoutProps) {
  const {
    state: agentState,
    audioTrack: agentAudioTrack,
    videoTrack: agentVideoTrack,
  } = useVoiceAssistant();
  const [screenShareTrack] = useTracks([Track.Source.ScreenShare]);
  const cameraTrack: TrackReference | undefined = useLocalTrackRef(Track.Source.Camera);

  const isCameraEnabled = cameraTrack && !cameraTrack.publication.isMuted;
  const isScreenShareEnabled = screenShareTrack && !screenShareTrack.publication.isMuted;
  const hasSecondTile = isCameraEnabled || isScreenShareEnabled;

  const animationDelay = chatOpen ? 0 : 0.12;
  const isAvatar = agentVideoTrack !== undefined;
  const videoWidth = agentVideoTrack?.publication.dimensions?.width ?? 0;
  const videoHeight = agentVideoTrack?.publication.dimensions?.height ?? 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-8 bottom-32 z-40 md:top-12 md:bottom-40">
      <div className="relative mx-auto h-full max-w-4xl px-4 md:px-0">
        <div className={cn(classNames.grid)}>
          {/* Agent */}
          <div
            className={cn([
              'grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
              !chatOpen && classNames.agentChatClosed,
              chatOpen && hasSecondTile && classNames.agentChatOpenWithSecondTile,
              chatOpen && !hasSecondTile && classNames.agentChatOpenWithoutSecondTile,
            ])}
          >
            <AnimatePresence mode="popLayout">
              {!isAvatar && (
                <MotionContainer
                  key="agent"
                  layoutId="agent"
                  initial={{ opacity: 0, scale: 0.9, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, scale: chatOpen ? 1 : 1.1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.9, filter: 'blur(6px)' }}
                  transition={{ ...ANIMATION_TRANSITION, delay: animationDelay }}
                  className={cn(
                    'relative overflow-hidden',
                    'bg-white/5 backdrop-blur-xl',
                    'border border-white/15',
                    'shadow-[0_14px_40px_rgba(15,23,42,0.65)]',
                    chatOpen
                      ? 'h-[60px] w-[60px] rounded-2xl'
                      : 'h-[120px] w-[120px] rounded-3xl'
                  )}
                >
                  <ECGVisualizer trackRef={agentAudioTrack} className="relative z-10 h-full w-full" />
                </MotionContainer>
              )}

              {isAvatar && (
                <MotionContainer
                  key="avatar"
                  layoutId="avatar"
                  initial={{
                    scale: 1,
                    opacity: 1,
                    maskImage: 'radial-gradient(circle, black 0%, transparent 0%)',
                  }}
                  animate={{
                    maskImage: chatOpen
                      ? 'radial-gradient(circle, black 100%, transparent 100%)'
                      : 'radial-gradient(circle, black 65%, transparent 80%)',
                    borderRadius: chatOpen ? 16 : 24,
                  }}
                  transition={{
                    ...ANIMATION_TRANSITION,
                    delay: animationDelay,
                    maskImage: { duration: 0.7 },
                  }}
                  className={cn(
                    'relative overflow-hidden bg-black/70 backdrop-blur-xl',
                    'border border-white/15 shadow-[0_14px_40px_rgba(15,23,42,0.7)]',
                    chatOpen
                      ? 'h-[60px] w-[60px]'
                      : 'h-auto w-full max-w-[420px] aspect-video'
                  )}
                >
                  <VideoTrack
                    width={videoWidth}
                    height={videoHeight}
                    trackRef={agentVideoTrack}
                    className={cn(
                      'h-full w-full object-cover',
                      'brightness-[1.02] contrast-[1.02]',
                      chatOpen ? 'scale-110' : 'scale-100'
                    )}
                  />
                </MotionContainer>
              )}
            </AnimatePresence>
          </div>

          {/* Local camera / screen share */}
          <div
            className={cn([
              'grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
              chatOpen && classNames.secondTileChatOpen,
              !chatOpen && classNames.secondTileChatClosed,
            ])}
          >
            <AnimatePresence>
              {( (cameraTrack && isCameraEnabled) || (screenShareTrack && isScreenShareEnabled) ) && (
                <MotionContainer
                  key="camera"
                  layout="position"
                  layoutId="camera"
                  initial={{ opacity: 0, scale: 0.9, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 16 }}
                  transition={{ ...ANIMATION_TRANSITION, delay: animationDelay }}
                  className={cn(
                    'relative overflow-hidden',
                    'bg-white/5 backdrop-blur-xl',
                    'border border-white/12 shadow-[0_12px_36px_rgba(15,23,42,0.6)]',
                    'h-[60px] w-[60px] rounded-2xl'
                  )}
                >
                  <VideoTrack
                    trackRef={cameraTrack || screenShareTrack}
                    width={(cameraTrack || screenShareTrack)?.publication.dimensions?.width ?? 0}
                    height={(cameraTrack || screenShareTrack)?.publication.dimensions?.height ?? 0}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,1)]" />
                </MotionContainer>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
