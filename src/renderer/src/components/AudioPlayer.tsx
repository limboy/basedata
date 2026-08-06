import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00'
  const total = Math.max(0, Math.floor(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Minimal play/pause + seek bar + time. Stands in for the browser's native
 * `<audio controls>`, which also ships a volume slider and an overflow menu
 * (playback speed, download, loop) we don't want here.
 */
export function AudioPlayer({ src, className }: { src: string; className?: string }): React.JSX.Element {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)

  // A new src is a different clip; drop the stale progress from the last one.
  useEffect(() => {
    setPlaying(false)
    setDuration(0)
    setCurrent(0)
  }, [src])

  const togglePlay = (): void => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>): void => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    audio.currentTime = ratio * duration
    setCurrent(ratio * duration)
  }

  const progress = duration > 0 ? current / duration : 0

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border bg-muted/40 py-1 pl-1 pr-3',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
      />
      <button
        type="button"
        onClick={togglePlay}
        className="mr-2 flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background hover:opacity-85"
      >
        {playing ? (
          <Pause className="size-3" fill="currentColor" />
        ) : (
          <Play className="size-3 translate-x-px" fill="currentColor" />
        )}
      </button>
      <div className="relative h-1 min-w-10 flex-1 rounded-full bg-foreground/15" onClick={seek}>
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-foreground/60"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
        {formatTime(Math.max(0, duration - current))}
      </span>
    </div>
  )
}
