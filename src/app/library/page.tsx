import { Typography } from "@/components/ui/Typography"
import { Button } from "@/components/ui/Button"
import { Play } from "lucide-react"
import Link from "next/link"

export default function LibraryPage() {
  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <Typography variant="h1">Library</Typography>
      </div>

      <div className="space-y-6">
        <Typography variant="h3">Playlists & Saved</Typography>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {/* Liked Songs Special Card */}
          <div className="aspect-square rounded-xl bg-gradient-to-br from-indigo-500 to-accent shadow-lg flex flex-col justify-end p-4 cursor-pointer hover-scale">
            <Typography variant="h3" className="text-white drop-shadow-md">Liked Songs</Typography>
            <Typography variant="caption" className="text-white/80">142 songs</Typography>
          </div>

          {[1, 2, 3, 4].map((i) => (
            <Link href={`/playlist/${i}`} key={i} className="space-y-3 cursor-pointer group">
              <div className="aspect-square rounded-xl bg-surface hover:bg-surface-hover overflow-hidden relative shadow-lg">
                <img src={`https://picsum.photos/seed/playlist${i}/400/400`} alt="Playlist" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="default" size="icon" className="rounded-full h-12 w-12 hover:scale-110">
                    <Play className="fill-current w-5 h-5 ml-1" />
                  </Button>
                </div>
              </div>
              <div>
                <Typography variant="caption" className="block truncate font-semibold">My Playlist #{i}</Typography>
                <Typography variant="caption" color="muted" className="block truncate text-xs hover:underline">User</Typography>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
