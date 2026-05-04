"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, Send, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlassWindow } from "@/components/ui/GlassWindow";
import { Typography } from "@/components/ui/Typography";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Hi, I am MelodyMix Chatbot. Ask me for playlist ideas, listening moods, or help finding your next track.",
  },
];

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
  };
}

function getFakeAssistantReply(message: string): string {
  const prompt = message.trim().toLowerCase();

  if (prompt.includes("playlist") || prompt.includes("mix")) {
    return "I would start with a focused 12-track mix: one warm opener, three familiar anchors, six discoveries, and two late-night closers. Tell me the mood and I will shape it tighter.";
  }

  if (prompt.includes("sad") || prompt.includes("chill") || prompt.includes("study")) {
    return "That sounds like a softer session. Try low-tempo tracks, airy vocals, and songs with gentle percussion so the mood stays present without taking over.";
  }

  if (prompt.includes("workout") || prompt.includes("run") || prompt.includes("energy")) {
    return "For energy, I would build around a steady BPM climb: bright opener, punchy middle section, then a final track that feels like crossing the finish line.";
  }

  return "I am a placeholder for now, but the chat flow is ready. Once the real AI endpoint exists, this reply function can be swapped for a server call without rebuilding the interface.";
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");

  const canSend = useMemo(() => draft.trim().length > 0, [draft]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = draft.trim();
    if (!content) return;

    const userMessage = createMessage("user", content);
    const assistantMessage = createMessage("assistant", getFakeAssistantReply(content));

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
      assistantMessage,
    ]);
    setDraft("");
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
            A session-only chat space for music ideas, mood matching, and playlist prompts.
          </Typography>
        </header>

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
                  Current session only
                </Typography>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-6">
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
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 md:max-w-[68%] ${
                      isUser
                        ? "bg-accent text-white shadow-[0_0_22px_rgba(250,88,182,0.2)]"
                        : "border border-white/10 bg-white/8 text-foreground"
                    }`}
                  >
                    {message.content}
                  </div>
                  {isUser && (
                    <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                      <UserRound className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-white/10 p-4 md:p-5">
            <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-background/50 p-2 focus-within:border-accent/60 focus-within:shadow-[0_0_24px_rgba(250,88,182,0.12)]">
              <label htmlFor="chatbot-message" className="sr-only">
                Message
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
                placeholder="Ask for a playlist, mood, or music idea..."
                className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted"
              />
              <Button type="submit" size="icon" disabled={!canSend} aria-label="Send message">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </GlassWindow>
      </div>
    </div>
  );
}
