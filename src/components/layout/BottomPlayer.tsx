import { GlassWindow } from "@/components/ui/GlassWindow"
import { Typography } from "@/components/ui/Typography"
import { Button } from "@/components/ui/Button"
import Link from "next/link"
import { Play, SkipForward, SkipBack, Shuffle, Repeat, Heart, Volume2, Mic2, Maximize2 } from "lucide-react"

export function BottomPlayer() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-2 md:px-6 md:pb-6 pointer-events-none">
      <GlassWindow intensity="medium" className="pointer-events-auto h-20 md:h-24 w-full max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8 border-t-0 md:rounded-2xl shadow-2xl">
        
        {/* Song Info */}
        <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
          <div className="hidden md:block w-14 h-14 rounded-md bg-surface overflow-hidden shadow-md">
            <img src="https://picsum.photos/seed/current/200/200" alt="Now Playing" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <Typography variant="caption" className="font-semibold line-clamp-1 text-base">Starboy (feat. Daft Punk)</Typography>
            <Link href="/artist/the-weeknd">
              <Typography variant="caption" color="muted" className="text-xs hover:underline cursor-pointer transition-colors hover:text-foreground">
                The Weeknd
              </Typography>
            </Link>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center justify-center flex-1 max-w-2xl px-4">
          <div className="flex items-center gap-4 md:gap-6">
            <Button variant="ghost" size="icon" className="hidden md:flex"><Shuffle className="w-4 h-4 text-muted hover:text-foreground" /></Button>
            <Button variant="ghost" size="icon"><SkipBack className="w-6 h-6 fill-foreground" /></Button>
            <Button variant="default" size="icon" className="w-12 h-12 bg-foreground text-background hover:bg-foreground/90 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              <Play className="w-6 h-6 ml-1 fill-current" />
            </Button>
            <Button variant="ghost" size="icon"><SkipForward className="w-6 h-6 fill-foreground" /></Button>
            <Button variant="ghost" size="icon" className="hidden md:flex"><Repeat className="w-4 h-4 text-muted hover:text-foreground" /></Button>
          </div>
          {/* Progress Bar */}
          <div className="hidden md:flex items-center gap-3 w-full mt-2">
             <Typography variant="caption" className="text-[10px] text-muted w-8 text-right">1:24</Typography>
             <div className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden cursor-pointer group">
               <div className="h-full bg-foreground w-1/3 rounded-full group-hover:bg-accent transition-colors relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100" />
               </div>
             </div>
             <Typography variant="caption" className="text-[10px] text-muted w-8">-2:26</Typography>
          </div>
        </div>

        {/* Right Tools */}
        <div className="hidden md:flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
          <Button variant="ghost" size="icon"><Mic2 className="w-5 h-5 text-muted hover:text-foreground" /></Button>
          <Button variant="ghost" size="icon"><Heart className="w-5 h-5 text-muted hover:text-foreground" /></Button>
          <div className="flex items-center gap-2 w-24">
            <Volume2 className="w-5 h-5 text-muted" />
            <div className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white w-2/3 rounded-full border-r-2 border-white/50" />
            </div>
          </div>
          <Button variant="ghost" size="icon"><Maximize2 className="w-4 h-4 text-muted hover:text-foreground" /></Button>
        </div>
      </GlassWindow>
    </div>
  )
}
