import { Typography } from "@/components/ui/Typography"
import { Button } from "@/components/ui/Button"
import { Play, Heart, MoreHorizontal, Clock, Sparkles } from "lucide-react"

export default function PlaylistPage() {
  return (
    <div className="space-y-8 pb-10">
      {/* Playlist Header Block */}
      <div className="w-full h-[400px] relative overflow-hidden flex items-end p-6 md:p-10">
        {/* Soft background gradient based on playlist vibe */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-background to-background z-0" />

        <div className="relative z-20 flex flex-col md:flex-row items-end gap-6 w-full">
          <div className="w-48 h-48 md:w-64 md:h-64 rounded-xl shadow-[0_0_40px_rgba(154,123,255,0.2)] overflow-hidden shrink-0 flex items-center justify-center bg-gradient-to-tr from-accent to-purple-600">
             <Sparkles className="w-24 h-24 text-white opacity-50" />
          </div>
          <div className="space-y-4 flex-1">
            <Typography variant="caption" className="uppercase font-bold tracking-widest text-accent flex items-center gap-2">
               <Sparkles className="w-4 h-4" /> AI Generated Playlist
            </Typography>
            <Typography variant="h1" className="text-white drop-shadow-md text-4xl md:text-6xl font-bold">Midnight Synthwave Study</Typography>
            <Typography variant="body" className="text-white/80 max-w-2xl">
              Danh sách nhạc lofi tổng hợp dựa trên yêu cầu: "Giai điệu chậm rải, không lời, phong cách cyberpunk ban đêm".
            </Typography>
            <div className="flex items-center gap-2">
              <Typography variant="caption" className="font-semibold">MelodyMix AI</Typography>
              <Typography variant="caption" color="muted">• 50 songs, 2 hr 45 min</Typography>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 md:px-10 flex items-center gap-4">
        <Button variant="default" size="icon" className="w-14 h-14 rounded-full shadow-[0_0_20px_rgba(250,88,182,0.4)]">
          <Play className="fill-current w-6 h-6 ml-1" />
        </Button>
        <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full border border-white/20">
          <Heart className="w-6 h-6 text-muted" />
        </Button>
        <Button variant="ghost" size="icon" className="w-12 h-12">
          <MoreHorizontal className="w-6 h-6 text-muted" />
        </Button>
      </div>

      {/* Track List */}
      <div className="px-6 md:px-10">
        <div className="w-full border-b border-white/5 pb-2 mb-4 flex px-4">
          <Typography variant="caption" color="muted" className="w-12">#</Typography>
          <Typography variant="caption" color="muted" className="flex-1">Title</Typography>
          <Typography variant="caption" color="muted" className="hidden md:block flex-1">Album</Typography>
          <Typography variant="caption" color="muted" className="w-12 flex justify-end"><Clock className="w-4 h-4" /></Typography>
        </div>

        <div className="space-y-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="flex items-center px-4 py-3 hover:bg-surface-hover rounded-md cursor-pointer group transition-colors">
              <Typography variant="caption" color="muted" className="w-12 group-hover:hidden">{i}</Typography>
              <div className="w-12 hidden group-hover:flex">
                <Play className="w-4 h-4 fill-current text-foreground" />
              </div>
              <div className="flex-1 flex gap-3 items-center">
                 <img src={`https://picsum.photos/seed/track${i}/40/40`} className="w-10 h-10 rounded-md" alt="Track" />
                 <div>
                   <Typography variant="body" className="font-medium">Synth Night {i}</Typography>
                   <Typography variant="caption" color="muted">Cyber Artist</Typography>
                 </div>
              </div>
              <Typography variant="caption" color="muted" className="hidden md:block flex-1 line-clamp-1">Neon Dreams EP</Typography>
              <Typography variant="caption" color="muted" className="w-12 text-right">4:0{i % 10}</Typography>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
