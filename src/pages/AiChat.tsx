import { useCallback, useEffect, useRef, useState } from "react";
import { aiChat, getFeedbackSummary, getTopIssues } from "@/lib/api";
import { Bot, Send, Loader2, AlertTriangle, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface FeedbackSummaryData {
  summary: string;
  stats: Record<string, number>;
}

// ── Component ─────────────────────────────────────────────────────────────────

const AiChat = () => {
  const [tab, setTab] = useState<"chat" | "summary">("chat");

  // ── Chat state ────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Summary state ─────────────────────────────────────────────────────────
  const [summaryData, setSummaryData] = useState<FeedbackSummaryData | null>(null);
  const [topIssues, setTopIssues] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setSending(true);

    try {
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await aiChat(apiMessages);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Ошибка: ${errMsg}` },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, messages, sending]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Load summary tab data ─────────────────────────────────────────────────
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const [fb, issues] = await Promise.all([
        getFeedbackSummary(),
        getTopIssues(),
      ]);
      setSummaryData(fb);
      setTopIssues(issues.issues);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Unknown error";
      setSummaryError(`Не удалось загрузить сводку: ${errMsg}`);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "summary" && !summaryData && !summaryLoading) {
      loadSummary();
    }
  }, [tab, summaryData, summaryLoading, loadSummary]);

  // ── Card class (reused from Analytics) ────────────────────────────────────
  const cardClass =
    "rounded-2xl border border-white/40 dark:border-slate-700/60 bg-gradient-to-br from-white/80 via-white/75 to-cyan-50/80 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-cyan-950/30 backdrop-blur-md";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg shadow-lg text-white"
            style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}
          >
            <Bot size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Ассистент</h1>
            <p className="text-xs text-muted-foreground">
              Задайте вопрос о состоянии проекта или посмотрите сводку проблем
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(
          [
            { key: "chat", label: "Чат", icon: Bot },
            { key: "summary", label: "Сводка проблем", icon: BarChart3 },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-primary text-white"
                : "border border-input bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Chat Tab ──────────────────────────────────────────────────────────── */}
      {tab === "chat" && (
        <div className={`${cardClass} flex flex-col`} style={{ height: "calc(100vh - 280px)", minHeight: 400 }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Bot size={48} className="mb-4 opacity-30" />
                <p className="text-sm">Начните диалог -- спросите о заказах, медиках, финансах...</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-teal-600 text-white rounded-br-md"
                      : "bg-gray-100 dark:bg-slate-800 text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm bg-gray-100 dark:bg-slate-800 text-muted-foreground rounded-bl-md flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Думаю...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border/50 p-3 flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напишите вопрос..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-colors"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* ── Summary Tab ───────────────────────────────────────────────────────── */}
      {tab === "summary" && (
        <div className="space-y-6">
          {summaryLoading && (
            <div className="space-y-4">
              <div className={`${cardClass} p-6`}>
                <Skeleton className="h-5 w-48 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`${cardClass} p-5 h-24`}>
                    <Skeleton className="h-3 w-1/2 mb-3" />
                    <Skeleton className="h-7 w-3/4" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {summaryError && (
            <div className={`${cardClass} p-6 flex items-center gap-3 text-red-500`}>
              <AlertTriangle size={20} />
              <div>
                <p className="font-medium">{summaryError}</p>
                <button
                  onClick={loadSummary}
                  className="text-sm underline mt-1 hover:text-red-400 transition-colors"
                >
                  Повторить
                </button>
              </div>
            </div>
          )}

          {!summaryLoading && !summaryError && summaryData && (
            <>
              {/* Stats cards */}
              {Object.keys(summaryData.stats).length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(summaryData.stats).map(([label, value]) => (
                    <div key={label} className={`${cardClass} p-5`}>
                      <p className="text-xs text-muted-foreground truncate">{label}</p>
                      <p className="mt-1 text-xl font-bold">{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary text */}
              <div className={`${cardClass} p-6`}>
                <h2 className="text-base font-semibold mb-3">Сводка обратной связи</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {summaryData.summary}
                </p>
              </div>

              {/* Top issues */}
              {topIssues && (
                <div className={`${cardClass} p-6`}>
                  <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500" />
                    Топ проблем
                  </h2>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {topIssues}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AiChat;
