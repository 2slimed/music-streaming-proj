import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { TrackListItem } from "@/components/ui/TrackListItem";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Play, Shuffle, Disc3 } from "lucide-react";

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const decodedName = decodeURIComponent(resolvedParams.id);

  // Tìm nghệ sĩ trong bảng Artist (nếu có thông tin nâng cao)
  const artist = await prisma.artist.findUnique({
    where: { name: decodedName },
  });

  // Tìm các bài hát của nghệ sĩ này
  const tracks = await prisma.track.findMany({
    where: {
      artists: {
        contains: decodedName,
      },
    },
    orderBy: { popularity: "desc" },
    take: 50, // Giới hạn 50 bài phổ biến nhất
  });

  if (tracks.length === 0) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      {/* Header Nghệ sĩ */}
      <div className="relative h-64 md:h-80 w-full flex items-end p-6 md:p-10 shrink-0">
        {/* Background Overlay */}
        <div 
          className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" 
        />
        {artist?.imageUrl ? (
          <img
            src={artist.imageUrl}
            alt={decodedName}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-surface" />
        )}

        {/* Thông tin */}
        <div className="relative z-20 flex gap-6 items-end">
          {artist?.imageUrl ? (
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden shadow-2xl border-4 border-background/20 hidden sm:block">
              <img
                src={artist.imageUrl}
                alt={decodedName}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-surface-hover shadow-2xl flex items-center justify-center hidden sm:flex">
              <Disc3 className="w-16 h-16 text-muted opacity-50" />
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <Typography variant="caption" className="uppercase tracking-widest text-accent font-semibold">
              Nghệ sĩ
            </Typography>
            <Typography variant="h1" className="text-4xl md:text-6xl font-black text-white drop-shadow-md">
              {decodedName}
            </Typography>
            {artist?.bio && (
              <Typography variant="body" color="muted" className="line-clamp-2 max-w-2xl mt-2">
                {artist.bio}
              </Typography>
            )}
            <Typography variant="caption" color="muted" className="mt-1">
              {tracks.length} bài hát
            </Typography>
          </div>
        </div>
      </div>

      {/* Hành động */}
      <div className="flex items-center gap-4 px-6 md:px-10 py-6 shrink-0 relative z-20 bg-gradient-to-b from-background to-transparent">
        <Button size="icon" className="w-14 h-14 rounded-full bg-accent hover:bg-accent/90 shadow-lg hover:scale-105 transition-transform text-black">
          <Play className="w-6 h-6 fill-current" />
        </Button>
        <Button variant="ghost" size="icon" className="w-10 h-10 text-muted hover:text-white hover:bg-white/10 rounded-full">
          <Shuffle className="w-5 h-5" />
        </Button>
        <Button variant="outline" className="rounded-full border-muted/30 hover:border-white transition-colors">
          Theo dõi
        </Button>
      </div>

      {/* Danh sách bài hát */}
      <div className="flex-1 px-6 md:px-10 pb-20">
        <Typography variant="h3" className="mb-4 font-bold">Phổ biến</Typography>
        <div className="space-y-1">
          {tracks.map((track, i) => (
            <TrackListItem
              key={track.id}
              track={track}
              index={i}
              queue={tracks}
              showAlbum={true}
              showCover={true}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
