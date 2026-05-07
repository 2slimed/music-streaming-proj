import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { prisma } from '@/lib/prisma';
import { findSeedSong, getRecommendations } from '@/lib/ai/recommendation';

export const maxDuration = 60;

// ─── Models: chỉ Gemini (Gemma cần Vertex AI, không dùng được) ─────
const MODEL_PRIORITY = [
  'gemini-2.5-flash',       // 2000 RPM
  'gemini-2.0-flash',       // 2000 RPM
  'gemini-1.5-flash',       // 2000 RPM
  'gemini-2.0-flash-lite',  // 30 RPM
];

// ─── Category centroids cho tìm kiếm theo tâm trạng ─────────────────
type FeatureVector = [number, number, number, number, number];

const CATEGORY_CENTROIDS: Record<string, { centroid: FeatureVector; label: string }> = {
  buồn:    { centroid: [0.175, 0.2,   0.25, 0.5, 0.0], label: 'buồn / sâu lắng' },
  sad:     { centroid: [0.175, 0.2,   0.25, 0.5, 0.0], label: 'buồn / sâu lắng' },
  chill:   { centroid: [0.3,   0.375, 0.4,  0.5, 0.0], label: 'thư giãn / chill' },
  study:   { centroid: [0.25,  0.3,   0.3,  0.5, 0.0], label: 'tập trung / học tập' },
  romantic:{ centroid: [0.375, 0.475, 0.5,  0.5, 0.0], label: 'lãng mạn' },
  happy:   { centroid: [0.65,  0.675, 0.6,  0.5, 0.0], label: 'vui vẻ / hạnh phúc' },
  vui:     { centroid: [0.65,  0.675, 0.6,  0.5, 0.0], label: 'vui vẻ / hạnh phúc' },
  party:   { centroid: [0.8,   0.8,   0.7,  0.5, 0.5], label: 'tiệc tùng / sôi động' },
  workout: { centroid: [0.825, 0.75,  0.6,  0.5, 0.3], label: 'tập luyện / năng lượng' },
};

interface PlaylistTrack {
  id: string;
  name: string;
  artist: string;
  album?: string;
  similarity: string;
}

interface PlaylistResult {
  seedFound: string;
  playlist: PlaylistTrack[];
  notFound: string | null;
  categoryLabel?: string;
}

// ─── Phát hiện category từ message ──────────────────────────────────
function detectCategory(text: string): { centroid: FeatureVector; label: string } | null {
  const lower = text.toLowerCase();
  for (const [key, info] of Object.entries(CATEGORY_CENTROIDS)) {
    if (lower.includes(key)) return info;
  }
  if (/(năng lượng|sôi động|bùng nổ)/.test(lower)) return CATEGORY_CENTROIDS.workout;
  if (/(thư giãn|nhẹ nhàng|êm dịu)/.test(lower)) return CATEGORY_CENTROIDS.chill;
  return null;
}

// ─── Trích xuất tên bài hát ─────────────────────────────────────────
function extractSongName(text: string): string | null {
  const patterns = [
    /(?:giống|giong|tương tự|tuong tu|like|similar\s+to)\s+(?:bài|bai|song|bài hát|bai hat)?\s*["']([^"']+)["']/i,
    /(?:giống|giong|tương tự|tuong tu|like|similar\s+to)\s+(?:bài|bai|song|bài hát|bai hat)?\s+([A-Za-zÀ-ỹ0-9][A-Za-zÀ-ỹ0-9 \-']{1,50}?)(?:\s*(?:không|khong|nhé|nhe|\?|$))/i,
    /(?:bài|bai|ca khúc|ca khuc|song|track)\s+["']([^"']+)["']/i,
    /["']([^"']{2,50})["']/,
    // Tên bài đơn giản: "tìm X" hoặc "kiếm X"
    /(?:tìm|tim|kiếm|kiem|nghe)\s+(.+?)(?:\s+(?:bài|bai|nhạc|nhac|cho|với))?\s*$/i,
  ];

  for (const pattern of patterns) {
    const m = text.match(pattern);
    const candidate = m?.[1]?.trim();
    if (candidate && candidate.length > 1 && candidate.length < 60) return candidate;
  }
  return null;
}

// ─── Cosine similarity cho category search ──────────────────────────
function dotProduct(a: FeatureVector, b: FeatureVector): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3] + a[4] * b[4];
}
function magnitude(v: FeatureVector): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2] + v[3] * v[3] + v[4] * v[4]);
}
function cosineSimilarity(a: FeatureVector, b: FeatureVector): number {
  const ma = magnitude(a); const mb = magnitude(b);
  if (ma === 0 || mb === 0) return 0;
  return dotProduct(a, b) / (ma * mb);
}

// ─── Tìm nhạc theo category KNN ─────────────────────────────────────
async function searchByCategory(centroid: FeatureVector, label: string, count: number = 50): Promise<PlaylistResult> {
  const allTracks = await prisma.track.findMany({
    select: {
      id: true, trackName: true, artists: true, albumName: true,
      energyNorm: true, danceabilityNorm: true, popularityNorm: true, durationMsNorm: true, explicitNorm: true,
    },
  });

  const results = allTracks
    .map((t) => ({
      id: t.id, name: t.trackName, artist: t.artists, album: t.albumName,
      vector: [t.energyNorm, t.danceabilityNorm, t.popularityNorm, t.durationMsNorm, t.explicitNorm] as FeatureVector,
    }))
    .map((t) => ({ ...t, similarity: cosineSimilarity(centroid, t.vector) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, count)
    .map((t) => ({
      id: t.id, name: t.name, artist: t.artist, album: t.album,
      similarity: `${(t.similarity * 100).toFixed(1)}%`,
    }));

  return { seedFound: '', playlist: results, notFound: null, categoryLabel: label };
}

// ─── Tìm playlist tổng hợp ──────────────────────────────────────────
async function searchPlaylist(message: string): Promise<PlaylistResult | null> {
  // 1. Thử tìm theo category
  const category = detectCategory(message);
  if (category) {
    console.log('[Chat] Tìm theo category:', category.label);
    return searchByCategory(category.centroid, category.label);
  }

  // 2. Thử tìm bài hát tương tự
  const songName = extractSongName(message);
  console.log('[Chat] Tên bài hát trích xuất:', songName);

  if (!songName) return null;

  const seed = await findSeedSong(songName);
  if (!seed) {
    return { seedFound: '', playlist: [], notFound: songName };
  }

  const pl = await getRecommendations(seed, 50);
  console.log('[Chat] Đã tạo playlist:', pl.length, 'bài');
  return { seedFound: `${seed.track_name} — ${seed.artists}`, playlist: pl, notFound: null };
}

// ─── Format danh sách nhạc thành text ───────────────────────────────
function formatTrackList(tracks: PlaylistTrack[], maxShow: number = 10): string {
  if (!tracks.length) return '';
  return tracks.slice(0, maxShow)
    .map((t, i) => `${i + 1}. **${t.name}** — ${t.artist}${t.similarity ? ` (${t.similarity})` : ''}`)
    .join('\n');
}

// ─── Sinh text rule-based khi Gemini lỗi ────────────────────────────
function generateFallbackText(userMsg: string, playlistData: PlaylistResult | null): string {
  if (!playlistData || playlistData.playlist.length === 0) {
    if (playlistData?.notFound) {
      return `Không tìm thấy bài **"${playlistData.notFound}"** trong thư viện (114,000+ bài). Bạn thử kiểm tra lại tên hoặc hỏi theo tâm trạng: "nhạc chill", "bài hát vui", "workout"...`;
    }
    return `Mình chưa tìm thấy kết quả phù hợp. Hãy thử:\n- **Tên bài hát**: "tìm bài Yesterday"\n- **Tâm trạng**: "nhạc chill", "workout", "nhạc buồn"\n- **Nghệ sĩ**: "bài của Sơn Tùng"`;
  }

  if (playlistData.categoryLabel) {
    const list = formatTrackList(playlistData.playlist, 10);
    return `Đây là những bài hát phù hợp với **${playlistData.categoryLabel}**:\n\n${list}\n\n_Tìm thấy ${playlistData.playlist.length} bài — bạn muốn lưu playlist này không?_`;
  }

  if (playlistData.seedFound) {
    const list = formatTrackList(playlistData.playlist, 10);
    return `Đây là **${playlistData.playlist.length}** bài hát tương tự **${playlistData.seedFound}**:\n\n${list}\n\n_Bạn muốn mình điều chỉnh thêm gì không?_`;
  }

  const list = formatTrackList(playlistData.playlist, 10);
  return `Mình tìm thấy những bài này cho bạn:\n\n${list}`;
}

// ─── Gọi Gemini ─────────────────────────────────────────────────────
async function callGemini(
  userMsg: string,
  systemContext: string,
): Promise<{ text: string; model: string }> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.warn('[Chat] GOOGLE_GENERATIVE_AI_API_KEY chưa được cấu hình');
    return { text: '', model: '' };
  }

  for (const modelId of MODEL_PRIORITY) {
    try {
      console.log('[Chat] Thử model:', modelId);
      const result = await generateText({
        model: google(modelId),
        prompt: userMsg,
        system: systemContext,
        maxOutputTokens: 1024,
      });
      console.log('[Chat] Thành công với model:', modelId);
      return { text: result.text ?? '', model: modelId };
    } catch (err: unknown) {
      console.warn(`[Chat] Model ${modelId} LỖI:`, (err as Error)?.message ?? String(err));
      continue;
    }
  }
  console.warn('[Chat] Tất cả models đều thất bại → dùng fallback rule-based');
  return { text: '', model: '' };
}

// ─── Build system prompt ─────────────────────────────────────────────
function buildSystemContext(playlistData: PlaylistResult | null): string {
  let ctx = 'Bạn là trợ lý AI chuyên gợi ý âm nhạc, tên MelodyMix AI. Trả lời ngắn gọn, thân thiện, tự nhiên bằng tiếng Việt.';

  if (playlistData && playlistData.playlist.length > 0) {
    const top10 = playlistData.playlist.slice(0, 10).map((t, i) =>
      `${i + 1}. ${t.name} - ${t.artist} (độ tương đồng: ${t.similarity})`
    ).join('\n');

    if (playlistData.categoryLabel) {
      ctx += `\n\n[KẾT QUẢ TÌM KIẾM]\nThể loại: ${playlistData.categoryLabel}\nTìm thấy ${playlistData.playlist.length} bài. Hãy giới thiệu và liệt kê top 10:\n${top10}`;
    } else {
      ctx += `\n\n[KẾT QUẢ TÌM KIẾM]\nBài gốc: ${playlistData.seedFound}\nTìm thấy ${playlistData.playlist.length} bài tương tự. Hãy giới thiệu và liệt kê top 10:\n${top10}`;
    }
  } else if (playlistData?.notFound) {
    ctx += `\n\n[KHÔNG TÌM THẤY] "${playlistData.notFound}" không có trong database. Gợi ý người dùng thử lại hoặc tìm theo tâm trạng (chill, vui, buồn...).`;
  } else {
    ctx += '\n\nNgười dùng có thể hỏi về: tên bài hát cụ thể, thể loại/tâm trạng (chill, vui, buồn, workout, party...), hoặc tìm nghệ sĩ. Nếu không hiểu, hãy gợi ý các cách tìm nhạc.';
  }

  return ctx;
}

// ─── Streaming response ─────────────────────────────────────────────
async function handleStream(req: Request): Promise<Response> {
  const { message } = await req.json();
  const userMsg: string = message?.trim() ?? '';

  const encoder = new TextEncoder();
  const send = (ctrl: ReadableStreamDefaultController, data: object) => {
    ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  const playlistData = await searchPlaylist(userMsg);
  const systemContext = buildSystemContext(playlistData);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        send(controller, { type: 'start' });

        // Luôn gửi playlist data nếu có
        if (playlistData && playlistData.playlist.length > 0) {
          send(controller, {
            type: 'tool-result',
            result: {
              seedFound: playlistData.seedFound || playlistData.categoryLabel || '',
              playlist: playlistData.playlist.slice(0, 20),
            },
          });
        }

        // Gọi Gemini để sinh text, nếu lỗi thì dùng fallback
        const { text } = await callGemini(userMsg, systemContext);
        const finalText = text || generateFallbackText(userMsg, playlistData);

        send(controller, { type: 'text-start', id: '0' });
        send(controller, { type: 'text-delta', id: '0', delta: finalText });
        send(controller, { type: 'text-end', id: '0' });
        send(controller, { type: 'finish', finishReason: 'stop' });
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// ─── Main Route Handler ─────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const stream = searchParams.get('stream') !== 'false';

    if (stream) return handleStream(req);

    // Non-streaming JSON mode
    const { message } = await req.json();
    const userMsg: string = message?.trim() ?? '';

    if (!userMsg) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    const playlistData = await searchPlaylist(userMsg);
    const systemContext = buildSystemContext(playlistData);
    const { text, model } = await callGemini(userMsg, systemContext);
    const finalText = text || generateFallbackText(userMsg, playlistData);

    return Response.json({
      reply: finalText,
      model: model || null,
      playlist: playlistData?.playlist?.slice(0, 20) ?? null,
      seedFound: playlistData?.seedFound || playlistData?.categoryLabel || null,
    });
  } catch (err: unknown) {
    const msg = (err as Error)?.message ?? 'Unknown error';
    console.error('[Chat] Fatal error:', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
