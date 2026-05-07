"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { Bot, Loader2, Music, Plus, Save, Send, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlassWindow } from "@/components/ui/GlassWindow";
import { Typography } from "@/components/ui/Typography";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
};

interface PlaylistTrack {
  id: string;
  name: string;
  artist: string;
  album?: string;
  similarity?: string;
}

interface PlaylistData {
  seedFound: string;
  playlist: PlaylistTrack[];
}

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Chào bạn, mình là trợ lý AI MelodyMix. Hỏi mình về playlist, tâm trạng nghe nhạc, hoặc tìm bài hát bạn muốn nhé!",
  },
];

function createMessage(role: ChatMessage["role"], content: string, isStreaming?: boolean): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    isStreaming,
  };
}

export default function ChatbotPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedPlaylistId, setSavedPlaylistId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(() => draft.trim().length > 0 && !isLoading, [draft, isLoading]);

  function scrollToBottom() {
    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }

  async function handleSavePlaylist() {
    if (!playlist || playlist.playlist.length === 0 || isSaving) return;

    setIsSaving(true);
    try {
      const songName = playlist.seedFound || "bài hát";
      const playlistName = `Gợi ý tương tự ${songName.split(" — ")[0] || songName}`;

      const created = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: playlistName }),
      }).then((r) => r.json());

      const playlistId = created.id;

      // Add all tracks sequentially
      for (const track of playlist.playlist) {
        await fetch(`/api/playlists/${encodeURIComponent(playlistId)}/tracks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ trackId: track.id }),
        });
      }

      setSavedPlaylistId(playlistId);
      queryClient.invalidateQueries({ queryKey: ["sidebar-playlists"] });
    } catch (err) {
      console.error("Lỗi lưu playlist:", err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = draft.trim();
    if (!content || isLoading) return;

    const userMessage = createMessage("user", content);
    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setIsLoading(true);
    setPlaylist(null);
    setSavedPlaylistId(null);

    const assistantId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const placeholderMsg: ChatMessage = {
      id: `assistant-${assistantId}`,
      role: "assistant",
      content: "",
      isStreaming: true,
    };
    setMessages((prev) => [...prev, placeholderMsg]);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat?stream=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let responseText = "";
      let hasPlaylist = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const jsonStr = trimmed.slice(6);
          if (jsonStr === "[DONE]") continue;

          try {
            const event = JSON.parse(jsonStr);

            switch (event.type) {
              case "text-delta":
                responseText += event.delta;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === `assistant-${assistantId}`
                      ? { ...m, content: responseText }
                      : m
                  )
                );
                scrollToBottom();
                break;

              case "tool-result":
                if (event.result) {
                  hasPlaylist = true;
                  setPlaylist({
                    seedFound: event.result.seedFound,
                    playlist: event.result.playlist ?? [],
                  });
                }
                break;

              case "error":
                responseText = event.error ?? "Có lỗi xảy ra.";
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === `assistant-${assistantId}`
                      ? { ...m, content: responseText, isStreaming: false }
                      : m
                  )
                );
                break;
            }
          } catch {
            // bỏ qua dòng parse lỗi
          }
        }
      }

      if (!responseText && hasPlaylist) {
        responseText = "Mình đã tìm thấy các bài hát tương tự cho bạn! Bạn có thể lưu playlist này vào thư viện.";
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === `assistant-${assistantId}`
            ? { ...m, isStreaming: false, content: responseText || "Mình chưa có câu trả lời, bạn thử lại nhé." }
            : m
        )
      );
    } catch (err: unknown) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === `assistant-${assistantId}`
            ? { ...m, isStreaming: false, content: (err as Error)?.message?.includes("quota")
                ? "API đã hết quota, vui lòng thử lại sau."
                : "Không kết nối được với server. Bạn kiểm tra lại kết nối mạng nhé." }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }

  return (
    <div className="min-h-full p-4 md:p-8 lg:p-10">
      <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-5xl flex-col gap-6">
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-accent shadow-[0_0_24px_rgba(250,88,182,0.18)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <Typography variant="caption" className="text-accent uppercase font-bold tracking-widest">
                MelodyMix AI
              </Typography>
              <Typography variant="h1" className="mt-1">Chatbot</Typography>
            </div>
          </div>
          <Typography color="muted" className="max-w-2xl">
            Trợ lý âm nhạc thông minh — gợi ý bài hát theo tâm trạng, tìm kiếm nghệ sĩ, và tạo playlist. Hỗ trợ bởi Gemini AI.
          </Typography>
        </header>

        <div className="flex flex-1 gap-6">
          {/* ─── Chat panel ──────────────────────────────────────── */}
          <GlassWindow className="flex min-h-[34rem] flex-1 flex-col rounded-2xl" intensity="medium">
            <div className="border-b border-white/10 px-5 py-4 md:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <Typography variant="h4" className="text-base md:text-lg">
                    Listening Assistant
                  </Typography>
                  <Typography variant="caption" color="muted">
                    Gemini AI · KNN tìm nhạc tương tự
                  </Typography>
                </div>
              </div>
            </div>

            <div
              ref={listRef}
              className="flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-6"
            >
              {messages.map((message) => {
                const isUser = message.role === "user";

                return (
                  <div
                    key={message.id}
                    className={`flex items-end gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-accent">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap md:max-w-[68%] ${
                        isUser
                          ? "bg-accent text-white shadow-[0_0_22px_rgba(250,88,182,0.2)]"
                          : "border border-white/10 bg-white/8 text-foreground"
                      }`}
                    >
                      {message.content}
                      {message.isStreaming && (
                        <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-accent align-middle" />
                      )}
                    </div>
                    {isUser && (
                      <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                        <UserRound className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && messages[messages.length - 1]?.role === "assistant" && !messages[messages.length - 1]?.isStreaming && (
                <div className="flex items-end gap-3 justify-start">
                  <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-accent">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="border-t border-white/10 p-4 md:p-5">
              <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-background/50 p-2 focus-within:border-accent/60 focus-within:shadow-[0_0_24px_rgba(250,88,182,0.12)]">
                <label htmlFor="chatbot-message" className="sr-only">
                  Tin nhắn
                </label>
                <textarea
                  id="chatbot-message"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={1}
                  placeholder="Hỏi về playlist, tâm trạng, hoặc tìm bài hát..."
                  className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted"
                />
                <Button type="submit" size="icon" disabled={!canSend} aria-label="Gửi tin nhắn">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </GlassWindow>

          {/* ─── Playlist sidebar ────────────────────────────────── */}
          {playlist && playlist.playlist.length > 0 && (
            <div className="hidden w-80 shrink-0 xl:block">
              <GlassWindow className="sticky top-6 max-h-[calc(100vh-12rem)] overflow-y-auto rounded-2xl p-5" intensity="medium">
                <div className="mb-4 flex items-center gap-2">
                  <Music className="h-5 w-5 text-accent" />
                  <Typography variant="h4" className="text-base">
                    Playlist gợi ý
                  </Typography>
                </div>

                {playlist.seedFound && (
                  <Typography variant="caption" color="muted" className="mb-3 block">
                    Tương tự: <span className="text-accent">{playlist.seedFound}</span>
                  </Typography>
                )}

                <div className="space-y-2">
                  {playlist.playlist.map((track, i) => (
                    <div
                      key={`${track.id || track.name}-${i}`}
                      className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 transition-colors hover:bg-white/10"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Typography className="truncate text-sm font-medium">
                            {track.name}
                          </Typography>
                          <Typography variant="caption" color="muted" className="truncate">
                            {track.artist}
                          </Typography>
                        </div>
                        {track.similarity && (
                          <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                            {track.similarity}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 border-t border-white/10 pt-3 space-y-2">
                  {session?.user ? (
                    savedPlaylistId ? (
                      <div className="space-y-2">
                        <Typography variant="caption" className="text-emerald-400 flex items-center gap-1">
                          <Save className="h-3 w-3" /> Đã lưu vào thư viện
                        </Typography>
                        <Link
                          href={`/playlist/${savedPlaylistId}`}
                          className="block text-xs text-accent hover:underline"
                        >
                          Xem playlist →
                        </Link>
                      </div>
                    ) : (
                      <Button
                        onClick={handleSavePlaylist}
                        disabled={isSaving}
                        className="w-full gap-2"
                        size="sm"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        {isSaving ? "Đang lưu..." : "Lưu Playlist vào thư viện"}
                      </Button>
                    )
                  ) : (
                    <Typography variant="caption" color="muted" className="text-center block">
                      <Link href="/login" className="text-accent hover:underline">Đăng nhập</Link> để lưu playlist
                    </Typography>
                  )}
                </div>
              </GlassWindow>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
