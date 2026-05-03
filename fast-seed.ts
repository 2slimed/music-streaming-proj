import "dotenv/config";
import { prisma } from "./src/lib/prisma";
import fs from "node:fs";
import path from "node:path";

function normalize(t: any) {
  return {
    popularityNorm: t.popularity / 100,
    durationMsNorm: Math.min(t.durationMs / 600_000, 1),
    explicitNorm: t.explicit ? 1.0 : 0.0,
    danceabilityNorm: t.danceability,
    energyNorm: t.energy,
  };
}

async function resolveDeezer(
  trackName: string,
  artists: string,
): Promise<{ deezerId: string | null; previewUrl: string | null; coverUrl: string | null }> {
  try {
    const query = encodeURIComponent(`${artists} ${trackName}`);
    const res = await fetch(`https://api.deezer.com/search?q=${query}&limit=1`);
    if (!res.ok) return { deezerId: null, previewUrl: null, coverUrl: null };
    const data = await res.json();
    const hit = data?.data?.[0];
    if (!hit) return { deezerId: null, previewUrl: null, coverUrl: null };
    return {
      deezerId: hit.id ? String(hit.id) : null,
      previewUrl: hit.preview || null,
      coverUrl: hit.album?.cover_medium || hit.album?.cover || null,
    };
  } catch {
    return { deezerId: null, previewUrl: null, coverUrl: null };
  }
}

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

function parseCsv(filePath: string) {
  const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/).filter(Boolean);
  const header = splitCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const fields = splitCsvLine(line);
    const row: any = {};
    for (let i = 0; i < header.length; i++) {
      row[header[i]] = fields[i];
    }
    return row;
  });
}

async function main() {
  const csvPath = path.resolve(process.cwd(), "data/dataset.csv");
  const records = parseCsv(csvPath);
  
  const mrazTracks = records.filter(r => r.artists?.toLowerCase().includes('mraz'));
  const first50 = records.slice(0, 50);
  const toSeed = [...new Set([...mrazTracks, ...first50])];
  
  console.log(`Seeding ${toSeed.length} tracks...`);

  let count = 0;
  for (const row of toSeed) {
    if (!row.track_id || !row.track_name) continue;

    const popularity = parseInt(row.popularity, 10) || 0;
    const durationMs = parseInt(row.duration_ms, 10) || 0;
    const explicit = row.explicit === "True" || row.explicit === "true";
    const danceability = parseFloat(row.danceability) || 0;
    const energy = parseFloat(row.energy) || 0;

    const norms = normalize({ popularity, durationMs, explicit, danceability, energy });
    const { deezerId, previewUrl, coverUrl } = await resolveDeezer(row.track_name, row.artists);

    await prisma.track.upsert({
      where: { trackId: row.track_id },
      update: {
        ...norms, artists: row.artists, albumName: row.album_name, trackName: row.track_name,
        popularity, durationMs, explicit, danceability, energy,
        ...(deezerId ? { externalId: deezerId } : {}),
        ...(previewUrl ? { previewUrl } : {}),
        ...(coverUrl ? { coverUrl } : {})
      },
      create: {
        trackId: row.track_id, artists: row.artists, albumName: row.album_name, trackName: row.track_name,
        popularity, durationMs, explicit, danceability, energy,
        ...(deezerId ? { externalId: deezerId } : {}),
        previewUrl, coverUrl, ...norms
      }
    });

    count++;
    if (count % 10 === 0) console.log(`Seeded ${count}/${toSeed.length}`);
    await new Promise(r => setTimeout(r, 50));
  }
  console.log(`Done seeding ${count} tracks!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
