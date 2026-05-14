import fs from "node:fs";
import path from "node:path";
import { google } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;
export const runtime = "nodejs";

const MODEL_PRIORITY = [
  // Gemma has much higher RPD on this key, but it is less reliable for structured outputs.
  { id: "gemma-4-31b-it", label: "Gemma 4 31B", mode: "text-json" },
  // Flash Lite has higher RPD than Flash and supports structured outputs reliably.
  { id: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash Lite", mode: "structured" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", mode: "structured" },
  // Last-resort text models with low RPD on the current quota table.
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash", mode: "structured" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", mode: "structured" },
] as const;

const PRIMARY_MODEL = MODEL_PRIORITY[0].id;
const MIN_RECOMMENDATIONS = 20;
const MAX_CANDIDATES_FOR_GEMINI = 260;

type ChatRole = "user" | "assistant" | "system";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface CsvExtra {
  trackId: string;
  artists: string;
  albumName: string;
  trackName: string;
  popularity: number;
  durationMs: number;
  explicit: boolean;
  danceability: number;
  energy: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
  trackGenre: string;
}

interface CsvIndex {
  byTrackId: Map<string, CsvExtra>;
  byGenre: Map<string, CsvExtra[]>;
  allRows: CsvExtra[];
}

interface DbTrack {
  id: string;
  trackId: string;
  trackName: string;
  artists: string;
  albumName: string;
  popularity: number;
  durationMs: number;
  explicit: boolean;
  danceability: number;
  energy: number;
}

interface CandidateTrack {
  id: string;
  sourceTrackId: string;
  title: string;
  artist: string;
  album: string;
  popularity: number;
  durationMs: number;
  explicit: boolean;
  danceability: number;
  energy: number;
  trackGenre?: string;
  tempo?: number;
  valence?: number;
  acousticness?: number;
  instrumentalness?: number;
  speechiness?: number;
  liveness?: number;
}

interface PlaylistTrack {
  id: string;
  name: string;
  artist: string;
  album?: string;
  similarity: string;
}

interface PlaylistResult {
  seedFound: string;
  playlistName: string;
  playlist: PlaylistTrack[];
  notFound: string | null;
  matchedCount: number;
  requestedCount: number;
}

const intentSchema = z.object({
  intent: z.enum(["similar_song", "mood_search", "general_chat"]),
  songTitle: z.string().nullable().optional(),
  artistName: z.string().nullable().optional(),
  mood: z.string().nullable().optional(),
  languageHint: z.string().nullable().optional(),
  genreHint: z.string().nullable().optional(),
  count: z.number().int().min(MIN_RECOMMENDATIONS).max(50).default(MIN_RECOMMENDATIONS),
});

type ParsedIntent = z.infer<typeof intentSchema>;

const recommendationSchema = z.object({
  reply: z.string().min(1),
  playlistName: z.string().min(1),
  recommendations: z.array(z.object({
    id: z.string().optional(),
    sourceTrackId: z.string().optional(),
    title: z.string().min(1),
    artist: z.string().min(1),
    reason: z.string().optional(),
  })),
});

type GeminiRecommendation = z.infer<typeof recommendationSchema>;

let csvIndexPromise: Promise<CsvIndex> | null = null;

function hasGeminiKey() {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim());
}

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced) return fenced;

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text.trim();
}

async function generateObjectWithModelFallback<Schema extends z.ZodType>(options: {
  schema: Schema;
  system: string;
  prompt: string;
}): Promise<{ object: z.infer<Schema>; modelId: string }> {
  let lastError: unknown = null;

  for (const model of MODEL_PRIORITY) {
    try {
      if (model.mode === "text-json") {
        const result = await generateText({
          model: google(model.id),
          system: `${options.system}

Return exactly one valid JSON object. Do not include markdown, code fences, comments, or extra text.`,
          prompt: options.prompt,
        });
        const parsed = JSON.parse(extractJsonObject(result.text));
        return { object: options.schema.parse(parsed), modelId: model.id };
      }

      const result = await generateObject({
        model: google(model.id),
        schema: options.schema,
        system: options.system,
        prompt: options.prompt,
      });
      return { object: result.object as z.infer<Schema>, modelId: model.id };
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[Chat] Model ${model.label} (${model.id}) failed, trying next model:`, message);
    }
  }

  throw lastError ?? new Error("All configured Gemini/Gemma models failed");
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
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  fields.push(current.trim());
  return fields;
}

function toNumber(value: string | undefined, fallback = 0) {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: string | undefined) {
  return value?.toLowerCase() === "true";
}

async function loadCsvIndex(): Promise<CsvIndex> {
  if (csvIndexPromise) return csvIndexPromise;

  csvIndexPromise = fs.promises
    .readFile(path.join(process.cwd(), "data", "dataset.csv"), "utf-8")
    .then((content) => {
      const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
      const header = splitCsvLine(lines[0] ?? "");
      const column = new Map(header.map((name, index) => [name, index]));
      const byTrackId = new Map<string, CsvExtra>();
      const byGenre = new Map<string, CsvExtra[]>();
      const allRows: CsvExtra[] = [];

      for (const line of lines.slice(1)) {
        const fields = splitCsvLine(line);
        const get = (name: string) => fields[column.get(name) ?? -1] ?? "";
        const trackId = get("track_id");
        if (!trackId) continue;

        const row: CsvExtra = {
          trackId,
          artists: get("artists"),
          albumName: get("album_name"),
          trackName: get("track_name"),
          popularity: Math.round(toNumber(get("popularity"))),
          durationMs: Math.round(toNumber(get("duration_ms"))),
          explicit: toBoolean(get("explicit")),
          danceability: toNumber(get("danceability")),
          energy: toNumber(get("energy")),
          speechiness: toNumber(get("speechiness")),
          acousticness: toNumber(get("acousticness")),
          instrumentalness: toNumber(get("instrumentalness")),
          liveness: toNumber(get("liveness")),
          valence: toNumber(get("valence")),
          tempo: toNumber(get("tempo")),
          trackGenre: get("track_genre"),
        };

        allRows.push(row);
        byTrackId.set(trackId, row);

        if (row.trackGenre) {
          const genreRows = byGenre.get(row.trackGenre) ?? [];
          genreRows.push(row);
          byGenre.set(row.trackGenre, genreRows);
        }
      }

      for (const rows of byGenre.values()) {
        rows.sort((a, b) => b.popularity - a.popularity);
      }

      return { byTrackId, byGenre, allRows };
    })
    .catch((error) => {
      console.warn("[Chat] Could not load data/dataset.csv for enrichment:", error);
      return { byTrackId: new Map(), byGenre: new Map(), allRows: [] };
    });

  return csvIndexPromise;
}

function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactNullable(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function enrichTrack(track: DbTrack, csvIndex: CsvIndex): CandidateTrack {
  const extra = csvIndex.byTrackId.get(track.trackId);

  return {
    id: track.id,
    sourceTrackId: track.trackId,
    title: track.trackName,
    artist: track.artists,
    album: track.albumName,
    popularity: track.popularity,
    durationMs: track.durationMs,
    explicit: track.explicit,
    danceability: extra?.danceability ?? track.danceability,
    energy: extra?.energy ?? track.energy,
    trackGenre: extra?.trackGenre,
    tempo: extra?.tempo,
    valence: extra?.valence,
    acousticness: extra?.acousticness,
    instrumentalness: extra?.instrumentalness,
    speechiness: extra?.speechiness,
    liveness: extra?.liveness,
  };
}

function dedupeCandidates(candidates: CandidateTrack[], limit = MAX_CANDIDATES_FOR_GEMINI) {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const deduped: CandidateTrack[] = [];

  for (const candidate of candidates) {
    const nameKey = `${normalizeText(candidate.title)}::${normalizeText(candidate.artist)}`;
    if (seenIds.has(candidate.id) || seenNames.has(nameKey)) continue;
    seenIds.add(candidate.id);
    seenNames.add(nameKey);
    deduped.push(candidate);
    if (deduped.length >= limit) break;
  }

  return deduped;
}

async function parseIntentWithGemini(
  messages: ChatMessage[],
  userMessage: string,
): Promise<{ intent: ParsedIntent; modelId: string }> {
  const result = await generateObjectWithModelFallback({
    schema: intentSchema,
    system: `You parse music-chat requests for MelodyMix.
Return strict JSON only.
Intent rules:
- similar_song: the user asks for songs similar to a specific track.
- mood_search: the user asks for music by mood, activity, vibe, or energy.
- general_chat: not a recommendation request.
Extract songTitle and artistName when present. Preserve Vietnamese text.`,
    prompt: JSON.stringify({
      latestUserMessage: userMessage,
      recentMessages: messages.slice(-6),
      minimumCount: MIN_RECOMMENDATIONS,
    }),
  });

  return {
    modelId: result.modelId,
    intent: {
      ...result.object,
      songTitle: compactNullable(result.object.songTitle),
      artistName: compactNullable(result.object.artistName),
      mood: compactNullable(result.object.mood),
      languageHint: compactNullable(result.object.languageHint),
      genreHint: compactNullable(result.object.genreHint),
      count: Math.max(result.object.count ?? MIN_RECOMMENDATIONS, MIN_RECOMMENDATIONS),
    },
  };
}

async function findSeedTrack(intent: ParsedIntent, csvIndex: CsvIndex): Promise<CandidateTrack | null> {
  const songTitle = compactNullable(intent.songTitle);
  const artistName = compactNullable(intent.artistName);
  if (!songTitle) return null;

  const where = artistName
    ? {
        AND: [
          { trackName: { contains: songTitle, mode: "insensitive" as const } },
          { artists: { contains: artistName, mode: "insensitive" as const } },
        ],
      }
    : { trackName: { contains: songTitle, mode: "insensitive" as const } };

  let track = await prisma.track.findFirst({
    where,
    orderBy: { popularity: "desc" },
    select: trackSelect,
  });

  if (!track && artistName) {
    track = await prisma.track.findFirst({
      where: {
        OR: [
          { trackName: { contains: songTitle, mode: "insensitive" } },
          { artists: { contains: artistName, mode: "insensitive" } },
        ],
      },
      orderBy: { popularity: "desc" },
      select: trackSelect,
    });
  }

  return track ? enrichTrack(track, csvIndex) : null;
}

const trackSelect = {
  id: true,
  trackId: true,
  trackName: true,
  artists: true,
  albumName: true,
  popularity: true,
  durationMs: true,
  explicit: true,
  danceability: true,
  energy: true,
} as const;

function featureDistanceScore(seed: CandidateTrack, row: CsvExtra) {
  const dance = Math.abs(seed.danceability - row.danceability);
  const energy = Math.abs(seed.energy - row.energy);
  const valence = Math.abs((seed.valence ?? 0.5) - row.valence);
  const tempo = Math.min(Math.abs((seed.tempo ?? 120) - row.tempo) / 180, 1);
  return row.popularity / 100 - dance * 0.35 - energy * 0.35 - valence * 0.2 - tempo * 0.1;
}

function moodScore(row: CsvExtra, mood?: string | null) {
  const normalizedMood = normalizeText(mood ?? "");
  if (/(soi dong|nang luong|quay|party|workout|gym|tap luyen)/.test(normalizedMood)) {
    return row.energy * 0.4 + row.danceability * 0.3 + Math.min(row.tempo / 180, 1) * 0.15 + row.popularity / 100 * 0.15;
  }
  if (/(buon|sad|suy|tam trang|mua)/.test(normalizedMood)) {
    return (1 - row.energy) * 0.3 + (1 - row.valence) * 0.35 + row.acousticness * 0.2 + row.popularity / 100 * 0.15;
  }
  if (/(chill|thu gian|nhe nhang|hoc|tap trung|study|focus)/.test(normalizedMood)) {
    return (1 - Math.abs(row.energy - 0.35)) * 0.25 + row.acousticness * 0.25 + (1 - row.speechiness) * 0.2 + row.popularity / 100 * 0.3;
  }
  if (/(vui|happy|hanh phuc|yeu doi)/.test(normalizedMood)) {
    return row.valence * 0.35 + row.energy * 0.25 + row.danceability * 0.2 + row.popularity / 100 * 0.2;
  }
  return row.popularity / 100 * 0.45 + row.energy * 0.25 + row.danceability * 0.2 + row.valence * 0.1;
}

async function findTracksBySourceIds(sourceTrackIds: string[], csvIndex: CsvIndex): Promise<CandidateTrack[]> {
  if (sourceTrackIds.length === 0) return [];

  const tracks = await prisma.track.findMany({
    where: { trackId: { in: sourceTrackIds } },
    select: trackSelect,
  });
  const order = new Map(sourceTrackIds.map((trackId, index) => [trackId, index]));

  return tracks
    .sort((a, b) => (order.get(a.trackId) ?? 0) - (order.get(b.trackId) ?? 0))
    .map((track) => enrichTrack(track, csvIndex));
}

async function buildSimilarCandidates(seed: CandidateTrack, csvIndex: CsvIndex): Promise<CandidateTrack[]> {
  const candidates: CandidateTrack[] = [];
  const seedGenre = seed.trackGenre;

  if (seedGenre) {
    const genreRows = (csvIndex.byGenre.get(seedGenre) ?? [])
      .filter((row) => row.trackId !== seed.sourceTrackId)
      .sort((a, b) => featureDistanceScore(seed, b) - featureDistanceScore(seed, a))
      .slice(0, 360);
    candidates.push(...await findTracksBySourceIds(genreRows.map((row) => row.trackId), csvIndex));
  }

  const primaryArtist = seed.artist.split(";")[0]?.trim();
  if (primaryArtist) {
    const sameArtist = await prisma.track.findMany({
      where: {
        id: { not: seed.id },
        artists: { contains: primaryArtist, mode: "insensitive" },
      },
      orderBy: { popularity: "desc" },
      take: 60,
      select: trackSelect,
    });
    candidates.push(...sameArtist.map((track) => enrichTrack(track, csvIndex)));
  }

  const nearbyAudio = await prisma.track.findMany({
    where: {
      id: { not: seed.id },
      energy: { gte: Math.max(seed.energy - 0.25, 0), lte: Math.min(seed.energy + 0.25, 1) },
      danceability: { gte: Math.max(seed.danceability - 0.25, 0), lte: Math.min(seed.danceability + 0.25, 1) },
    },
    orderBy: { popularity: "desc" },
    take: 160,
    select: trackSelect,
  });
  candidates.push(...nearbyAudio.map((track) => enrichTrack(track, csvIndex)));

  const popularTracks = await prisma.track.findMany({
    where: { id: { not: seed.id } },
    orderBy: { popularity: "desc" },
    take: 80,
    select: trackSelect,
  });
  candidates.push(...popularTracks.map((track) => enrichTrack(track, csvIndex)));

  return dedupeCandidates(candidates);
}

async function buildMoodCandidates(intent: ParsedIntent, csvIndex: CsvIndex): Promise<CandidateTrack[]> {
  const moodRows = [...csvIndex.allRows]
    .sort((a, b) => moodScore(b, intent.mood ?? intent.genreHint) - moodScore(a, intent.mood ?? intent.genreHint))
    .slice(0, 420);

  const candidates = await findTracksBySourceIds(moodRows.map((row) => row.trackId), csvIndex);

  if (candidates.length >= MAX_CANDIDATES_FOR_GEMINI) {
    return dedupeCandidates(candidates);
  }

  const dbCandidates = await prisma.track.findMany({
    where: {
      energy: { gte: 0.35 },
      danceability: { gte: 0.35 },
    },
    orderBy: { popularity: "desc" },
    take: 180,
    select: trackSelect,
  });

  return dedupeCandidates([
    ...candidates,
    ...dbCandidates.map((track) => enrichTrack(track, csvIndex)),
  ]);
}

function serializeCandidatesForGemini(candidates: CandidateTrack[]) {
  return candidates.map((candidate) => ({
    id: candidate.id,
    sourceTrackId: candidate.sourceTrackId,
    title: candidate.title,
    artist: candidate.artist,
    album: candidate.album,
    popularity: candidate.popularity,
    durationMs: candidate.durationMs,
    explicit: candidate.explicit,
    danceability: Number(candidate.danceability.toFixed(3)),
    energy: Number(candidate.energy.toFixed(3)),
    trackGenre: candidate.trackGenre ?? null,
    tempo: candidate.tempo ? Number(candidate.tempo.toFixed(2)) : null,
    valence: candidate.valence != null ? Number(candidate.valence.toFixed(3)) : null,
    acousticness: candidate.acousticness != null ? Number(candidate.acousticness.toFixed(3)) : null,
    instrumentalness: candidate.instrumentalness != null ? Number(candidate.instrumentalness.toFixed(3)) : null,
    speechiness: candidate.speechiness != null ? Number(candidate.speechiness.toFixed(3)) : null,
  }));
}

async function chooseRecommendationsWithGemini(params: {
  userMessage: string;
  intent: ParsedIntent;
  seedTrack: CandidateTrack | null;
  candidates: CandidateTrack[];
}): Promise<{ recommendation: GeminiRecommendation; modelId: string }> {
  const { userMessage, intent, seedTrack, candidates } = params;
  const result = await generateObjectWithModelFallback({
    schema: recommendationSchema,
    system: `You are MelodyMix's expert music curator.
You MUST choose recommendations only from the provided candidateTracks list.
Do not invent songs. Do not use songs outside candidateTracks.
Priority order:
1. Same language as the seed track or requested language/mood.
2. Same or close genre. trackGenre is weak and may be wrong, so combine it with artist/title/album knowledge.
3. Similar audio traits and vibe: danceability, energy, tempo, valence, acousticness, instrumentalness, speechiness, popularity, duration.
Never choose the seed track itself.
Return strict JSON only. No markdown.
If candidateTracks contains enough useful tracks, return at least ${MIN_RECOMMENDATIONS} recommendations.
Each recommendation should include the candidate id exactly as provided.`,
    prompt: JSON.stringify({
      userMessage,
      intent,
      minimumRecommendations: MIN_RECOMMENDATIONS,
      seedTrack: seedTrack ? serializeCandidatesForGemini([seedTrack])[0] : null,
      candidateTracks: serializeCandidatesForGemini(candidates),
    }),
  });

  return { recommendation: result.object, modelId: result.modelId };
}

function buildPlaylistFromGemini(gemini: GeminiRecommendation, candidates: CandidateTrack[]): PlaylistResult {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const bySourceId = new Map(candidates.map((candidate) => [candidate.sourceTrackId, candidate]));
  const byTitleArtist = new Map(candidates.map((candidate) => [
    `${normalizeText(candidate.title)}::${normalizeText(candidate.artist)}`,
    candidate,
  ]));
  const seen = new Set<string>();
  const playlist: PlaylistTrack[] = [];

  for (const recommendation of gemini.recommendations) {
    const titleArtistKey = `${normalizeText(recommendation.title)}::${normalizeText(recommendation.artist)}`;
    const matched =
      (recommendation.id ? byId.get(recommendation.id) : null) ??
      (recommendation.sourceTrackId ? bySourceId.get(recommendation.sourceTrackId) : null) ??
      byTitleArtist.get(titleArtistKey);

    if (!matched || seen.has(matched.id)) continue;
    seen.add(matched.id);
    playlist.push({
      id: matched.id,
      name: matched.title,
      artist: matched.artist,
      album: matched.album,
      similarity: recommendation.reason || "Gemini pick",
    });
  }

  return {
    seedFound: gemini.playlistName,
    playlistName: gemini.playlistName,
    playlist,
    notFound: null,
    matchedCount: playlist.length,
    requestedCount: gemini.recommendations.length,
  };
}

function friendlyErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (/api key|API_KEY|credential/i.test(message)) {
    return "Gemini chưa được cấu hình. Hãy kiểm tra GOOGLE_GENERATIVE_AI_API_KEY trong file .env.";
  }
  if (/quota|rate|429/i.test(message)) {
    return "Gemini đang hết quota hoặc bị giới hạn tần suất. Vui lòng thử lại sau.";
  }
  if (/ECONNREFUSED|database|Prisma/i.test(message)) {
    return "Mình chưa kết nối được database nên chưa thể kiểm tra bài hát trong thư viện app. Hãy bật database rồi thử lại nhé.";
  }
  return "Gemini hiện không khả dụng nên mình chưa thể tạo playlist theo yêu cầu này.";
}

function sendSse(controller: ReadableStreamDefaultController<Uint8Array>, data: object) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

async function handleRecommendation(userMessage: string, messages: ChatMessage[]) {
  if (!hasGeminiKey()) {
    throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY");
  }

  const csvIndex = await loadCsvIndex();
  const parsed = await parseIntentWithGemini(messages, userMessage);
  const intent = parsed.intent;

  if (intent.intent === "general_chat") {
    const result = await generateObjectWithModelFallback({
      schema: z.object({ reply: z.string().min(1) }),
      system: "You are MelodyMix, a friendly music assistant. Reply naturally in the user's language. Do not recommend a playlist unless asked.",
      prompt: JSON.stringify({ userMessage, recentMessages: messages.slice(-6) }),
    });
    return { reply: result.object.reply, playlistResult: null, modelId: result.modelId };
  }

  let seedTrack: CandidateTrack | null = null;
  let candidates: CandidateTrack[] = [];

  if (intent.intent === "similar_song") {
    seedTrack = await findSeedTrack(intent, csvIndex);
    if (!seedTrack) {
      const label = [intent.songTitle, intent.artistName].filter(Boolean).join(" - ") || userMessage;
      return {
        reply: `Mình chưa tìm thấy "${label}" trong thư viện của app. Bạn thử nhập rõ hơn tên bài hát và nghệ sĩ nhé.`,
        playlistResult: null,
        modelId: parsed.modelId,
      };
    }
    candidates = await buildSimilarCandidates(seedTrack, csvIndex);
  } else {
    candidates = await buildMoodCandidates(intent, csvIndex);
  }

  if (candidates.length === 0) {
    return {
      reply: "Mình chưa tìm được đủ bài hát trong thư viện app để gửi Gemini chọn playlist.",
      playlistResult: null,
      modelId: parsed.modelId,
    };
  }

  const geminiResult = await chooseRecommendationsWithGemini({
    userMessage,
    intent,
    seedTrack,
    candidates,
  });
  const gemini = geminiResult.recommendation;
  const playlistResult = buildPlaylistFromGemini(gemini, candidates);

  let reply = gemini.reply;
  if (playlistResult.playlist.length < MIN_RECOMMENDATIONS) {
    reply += `\n\nMình chỉ match được ${playlistResult.playlist.length}/${gemini.recommendations.length} bài trong thư viện app, nên playlist chỉ gồm các bài có thể phát và lưu được.`;
  }

  return { reply, playlistResult, modelId: geminiResult.modelId };
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const isStream = searchParams.get("stream") !== "false";
    const body = await req.json();
    const messages: ChatMessage[] = Array.isArray(body.messages) && body.messages.length > 0
      ? body.messages
          .filter((message: Partial<ChatMessage>) => message.role && message.content)
          .map((message: ChatMessage) => ({ role: message.role, content: message.content }))
      : [{ role: "user", content: body.message?.trim() ?? "" }];
    const userMessage = messages[messages.length - 1]?.content?.trim();

    if (!userMessage) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    if (!isStream) {
      try {
        const { reply, playlistResult, modelId } = await handleRecommendation(userMessage, messages);
        return Response.json({
          reply,
          model: modelId,
          playlist: playlistResult?.playlist ?? null,
          playlistName: playlistResult?.playlistName ?? null,
          seedFound: playlistResult?.seedFound ?? null,
        });
      } catch (error) {
        return Response.json({ reply: friendlyErrorMessage(error), model: PRIMARY_MODEL, playlist: null }, { status: 503 });
      }
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          sendSse(controller, { type: "start" });
          sendSse(controller, { type: "text-start", id: "0" });
          sendSse(controller, {
            type: "text-delta",
            id: "0",
            delta: "Mình đang phân tích bài hát và chọn playlist từ thư viện app...\n\n",
          });

          const { reply, playlistResult, modelId } = await handleRecommendation(userMessage, messages);
          sendSse(controller, { type: "text-delta", id: "0", delta: reply });

          if (playlistResult && playlistResult.playlist.length > 0) {
            sendSse(controller, {
              type: "tool-result",
              result: {
                seedFound: playlistResult.seedFound,
                playlistName: playlistResult.playlistName,
                playlist: playlistResult.playlist,
                matchedCount: playlistResult.matchedCount,
                requestedCount: playlistResult.requestedCount,
                model: modelId,
              },
            });
          }

          sendSse(controller, { type: "text-end", id: "0" });
          sendSse(controller, { type: "finish", finishReason: "stop" });
        } catch (error) {
          console.error("[Chat] Gemini-grounded recommendation failed:", error);
          sendSse(controller, { type: "text-delta", id: "0", delta: friendlyErrorMessage(error) });
          sendSse(controller, { type: "error", error: friendlyErrorMessage(error) });
        } finally {
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Chat] Fatal error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
