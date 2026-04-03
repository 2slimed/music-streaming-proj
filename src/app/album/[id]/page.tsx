import { Typography } from "@/components/ui/Typography"
import { Button } from "@/components/ui/Button"
import { Play, Heart, MoreHorizontal, Clock } from "lucide-react"

export default function AlbumCardPage() {
  return (
    <div className="space-y-8 pb-10">
      {/* Album Header Block */}
      <div className="w-full h-[400px] relative overflow-hidden flex items-end p-6 md:p-10">
        {/* Blurred background */}
        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/album cover/800/800')] bg-cover bg-center blur-3xl opacity-50 z-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />

        <div className="relative z-20 flex flex-col md:flex-row items-end gap-6 w-full">
          <div className="w-48 h-48 md:w-64 md:h-64 rounded-xl shadow-2xl overflow-hidden shrink-0">
            <img src="https://picsum.photos/seed/album cover/800/800" alt="Album" className="w-full h-full object-cover" />
          </div>
          <div className="space-y-4 flex-1">
            <Typography variant="caption" className="uppercase font-bold tracking-widest">Album</Typography>
            <Typography variant="h1" className="text-white drop-shadow-md text-5xl md:text-7xl font-bold">Dawn FM</Typography>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-surface overflow-hidden">
                <img src="https://picsum.photos/seed/artist2/100/100" alt="Artist" className="w-full h-full object-cover" />
              </div>
              <Typography variant="caption" className="font-semibold">The Weeknd</Typography>
              <Typography variant="caption" color="muted">• 2022 • 16 songs, 51 min</Typography>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 md:px-10 flex items-center gap-4">
        <Button variant="default" size="icon" className="w-14 h-14 rounded-full shadow-lg">
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
          <Typography variant="caption" color="muted" className="w-12 flex justify-end"><Clock className="w-4 h-4" /></Typography>
        </div>

        <div className="space-y-1">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex items-center px-4 py-3 hover:bg-surface-hover rounded-md cursor-pointer group transition-colors">
              <Typography variant="caption" color="muted" className="w-12 group-hover:hidden">{i}</Typography>
              <div className="w-12 hidden group-hover:flex">
                <Play className="w-4 h-4 fill-current text-foreground" />
              </div>
              <div className="flex-1">
                <Typography variant="body" className="font-medium">Track Name {i}</Typography>
                <Typography variant="caption" color="muted">The Weeknd</Typography>
              </div>
              <Typography variant="caption" color="muted" className="w-12 text-right">3:42</Typography>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
