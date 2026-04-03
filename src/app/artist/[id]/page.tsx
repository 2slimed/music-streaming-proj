import { Typography } from "@/components/ui/Typography"
import { Button } from "@/components/ui/Button"
import { Play } from "lucide-react"

export default function ArtistPage() {
  return (
    <div className="space-y-8 pb-10">
      {/* Artist Hero Header */}
      <div className="w-full h-[400px] relative overflow-hidden flex items-end p-6 md:p-10 justify-center text-center">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/artisthero/1200/600')] bg-cover bg-center z-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent z-10" />

        <div className="relative z-20 space-y-4 max-w-4xl mx-auto flex flex-col items-center">
          <Typography variant="caption" className="flex items-center gap-2 bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-blue-500/30">
            Verified Artist
          </Typography>
          <Typography variant="h1" className="text-white drop-shadow-lg text-6xl md:text-8xl font-black tracking-tighter">The Weeknd</Typography>
          <Typography variant="body" className="text-white/80">109,240,123 monthly listeners</Typography>
          <div className="flex gap-4 pt-4">
            <Button variant="default" className="rounded-full px-8 gap-2"><Play className="w-4 h-4 fill-current" /> Play</Button>
            <Button variant="outline" className="rounded-full px-8">Follow</Button>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-10 space-y-12">
        {/* Popular Tracks */}
        <section className="space-y-6">
          <Typography variant="h2">Popular</Typography>
          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-2 hover:bg-surface-hover rounded-md cursor-pointer group transition-colors">
                <Typography variant="caption" color="muted" className="w-8 text-center text-lg">{i}</Typography>
                <div className="w-12 h-12 bg-surface rounded-sm overflow-hidden shadow-sm">
                  <img src={`https://picsum.photos/seed/popular${i}/100/100`} alt="Track" className="w-full h-full object-cover" />
                </div>
                <Typography variant="body" className="flex-1 font-medium">Popular Track {i}</Typography>
                <Typography variant="caption" color="muted" className="hidden md:block w-32 text-right">1,234,567,890</Typography>
                <Typography variant="caption" color="muted" className="w-12 text-right">3:21</Typography>
              </div>
            ))}
          </div>
        </section>

        {/* Albums */}
        <section className="space-y-6">
           <Typography variant="h2">Albums</Typography>
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-3 cursor-pointer group">
                  <div className="aspect-square rounded-xl bg-surface hover:bg-surface-hover overflow-hidden relative shadow-lg">
                     <img src={`https://picsum.photos/seed/artistalbum${i}/400/400`} alt="Album Art" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div>
                    <Typography variant="caption" className="block truncate font-semibold">Album Title {i}</Typography>
                    <Typography variant="caption" color="muted" className="block truncate text-xs">2023 • Album</Typography>
                  </div>
                </div>
              ))}
            </div>
        </section>
      </div>
    </div>
  )
}
