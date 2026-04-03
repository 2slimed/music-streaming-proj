import Link from "next/link"
import { Typography } from "@/components/ui/Typography"
import { Button } from "@/components/ui/Button"
import { PlayCircle, Home, Library, Music2 } from "lucide-react"

export function Sidebar() {
  return (
    <aside className="w-64 bg-surface border-r border-white/5 hidden md:flex flex-col">
      <div className="p-6">
        <Typography variant="h3" className="flex items-center gap-2">
          <Music2 className="w-6 h-6 text-accent" />
          MelodyMix
        </Typography>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-24 pt-4">
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start gap-3">
            <PlayCircle className="w-5 h-5 text-accent" /> Listen Now
          </Button>
        </Link>
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Home className="w-5 h-5 text-accent" /> Browse
          </Button>
        </Link>
        <Link href="/library">
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Library className="w-5 h-5 text-accent" /> Library
          </Button>
        </Link>
        
        <div className="my-4 border-t border-white/5" />
        
        <Link href="/playlist/chill-vibes" className="w-full block">
          <Button variant="ghost" className="w-full justify-start text-muted">Chill Vibes</Button>
        </Link>
        <Link href="/playlist/midnight-drive" className="w-full block">
          <Button variant="ghost" className="w-full justify-start text-muted">Midnight Drive</Button>
        </Link>
      </nav>
    </aside>
  )
}
