import { Button } from "@/components/ui/Button"
import { Typography } from "@/components/ui/Typography"
import { Play, Music2, Menu } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="w-full">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-white/5">
        <Typography variant="h4" className="flex items-center gap-2">
          <Music2 className="w-6 h-6 text-accent" /> MelodyMix
        </Typography>
        <Button variant="ghost" size="icon"><Menu className="w-6 h-6" /></Button>
      </header>

      {/* Content Container */}
      <div className="p-6 md:p-10 space-y-12">
        
        {/* Top Hero Banner */}
        <section>
          <div className="w-full h-64 md:h-80 rounded-3xl relative overflow-hidden flex items-end p-8 bg-[url('https://images.unsplash.com/photo-1614613535308-eb5fbbf2d098?q=80&w=3174&auto=format&fit=crop')] bg-cover bg-center">
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
            <div className="relative z-10 space-y-4 max-w-2xl">
              <Typography variant="caption" className="text-accent uppercase font-bold tracking-widest">Featured Playlist</Typography>
              <Typography variant="h1" className="text-white drop-shadow-md">Midnight City</Typography>
              <Typography variant="body" className="text-white/80 drop-shadow-sm">The best electronic and synthwave tracks curated by AI.</Typography>
              <div className="flex gap-4 pt-4">
                <Button variant="default" className="gap-2 rounded-full px-8"><Play className="fill-current w-4 h-4" /> Play</Button>
                <Button variant="outline" className="rounded-full px-8">Shuffle</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Listen Now */}
        <section className="space-y-6">
          <div className="flex items-end justify-between">
            <Typography variant="h2">Listen Now</Typography>
            <Button variant="ghost" className="text-sm">See All</Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Link href={`/album/${i}`} key={i} className="space-y-3 cursor-pointer group">
                <div className="aspect-square rounded-xl bg-surface hover:bg-surface-hover overflow-hidden relative shadow-lg">
                   <img src={`https://picsum.photos/seed/${i}/400/400`} alt="Album Art" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <Button variant="default" size="icon" className="rounded-full h-12 w-12 hover:scale-110 shadow-xl transition-transform">
                        <Play className="fill-current w-5 h-5 ml-1" />
                     </Button>
                   </div>
                </div>
                <div>
                  <Typography variant="caption" className="block truncate font-semibold">Album Title {i}</Typography>
                  <Typography variant="caption" color="muted" className="block truncate text-xs hover:underline">Artist Name</Typography>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
