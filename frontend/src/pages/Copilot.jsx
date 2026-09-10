import { useEffect, useRef, useState } from "react";
import api, { API_BASE } from "@/lib/api";
import { Empty } from "@/components/primitives";
import { toast } from "sonner";
import { Plus, Send, MessageSquareText, FileText, Loader2, Trash2, CornerDownLeft } from "lucide-react";

const SUGGESTIONS = [
  "Summarise the TDS deducted in the uploaded Form 26AS.",
  "Which tax regime is better for a ₹18L salary with ₹1.5L 80C?",
  "List deductions claimable under Chapter VI-A for a salaried client.",
  "What documents do I need to file ITR-2 for capital gains?",
];

export default function Copilot() {
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [docCount, setDocCount] = useState(0);
  const scrollRef = useRef();

  const loadSessions = () => api.get("/copilot/sessions").then((r) => setSessions(r.data));

  useEffect(() => {
    loadSessions();
    api.get("/documents").then((r) => setDocCount(r.data.length));
  }, []);

  useEffect(() => {
    if (activeId) {
      api.get(`/copilot/sessions/${activeId}/messages`).then((r) => setMessages(r.data));
    } else {
      setMessages([]);
    }
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const newChat = () => {
    setActiveId(null);
    setMessages([]);
    setInput("");
  };

  const removeSession = async (id, e) => {
    e.stopPropagation();
    await api.delete(`/copilot/sessions/${id}`);
    if (id === activeId) newChat();
    loadSessions();
  };

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || streaming) return;
    setInput("");
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", content: message, sources: [] }]);
    const assistantId = `a-${Date.now()}`;
    setMessages((m) => [...m, { id: assistantId, role: "assistant", content: "", sources: [], pending: true }]);
    setStreaming(true);

    try {
      const res = await fetch(`${API_BASE}/copilot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ message, session_id: activeId }),
      });
      if (!res.ok || !res.body) throw new Error("stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sessionForThis = activeId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          if (!line.startsWith("data:")) continue;
          const payload = JSON.parse(line.slice(5).trim());
          if (payload.type === "meta") {
            sessionForThis = payload.session_id;
            setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, sources: payload.sources } : x)));
          } else if (payload.type === "token") {
            setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, content: x.content + payload.content, pending: false } : x)));
          } else if (payload.type === "error") {
            setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, content: payload.content, pending: false } : x)));
          }
        }
      }
      if (!activeId && sessionForThis) {
        setActiveId(sessionForThis);
        loadSessions();
      } else {
        loadSessions();
      }
    } catch (e) {
      toast.error("The copilot is unavailable right now");
      setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, content: "Sorry, something went wrong.", pending: false } : x)));
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div data-testid="copilot-page" className="grid h-[calc(100dvh-56px)] grid-cols-1 md:grid-cols-[260px_1fr] md:h-[100dvh]">
      {/* Sessions */}
      <aside className="hidden flex-col border-r border-border md:flex">
        <div className="border-b border-border p-4">
          <button
            data-testid="new-chat-button"
            onClick={newChat}
            className="flex w-full items-center justify-center gap-2 border border-border py-2.5 text-sm transition-colors duration-200 hover:bg-accent"
          >
            <Plus className="h-4 w-4" /> New conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.length === 0 && <p className="px-3 py-4 text-xs text-muted-foreground">No conversations yet.</p>}
          {sessions.map((s) => (
            <button
              key={s.id}
              data-testid={`session-${s.id}`}
              onClick={() => setActiveId(s.id)}
              className={`group flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors duration-200 ${
                activeId === s.id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60"
              }`}
            >
              <span className="truncate">{s.title}</span>
              <Trash2
                onClick={(e) => removeSession(s.id, e)}
                className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              />
            </button>
          ))}
        </div>
        <div className="border-t border-border px-4 py-3">
          <p className="font-mono text-[0.7rem] text-muted-foreground">
            {docCount} document{docCount !== 1 && "s"} in scope
          </p>
        </div>
      </aside>

      {/* Chat */}
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-3.5">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-sm">CoPilot</span>
          </div>
          <span className="label-caps">RAG · Gemini 3.1 Pro</span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-6 text-center">
              <div className="h-4 w-4 bg-foreground" />
              <h2 className="mt-6 text-2xl font-light tracking-tight">Ask about your documents</h2>
              <p className="mt-3 max-w-[46ch] text-sm text-muted-foreground">
                {docCount === 0
                  ? "Upload documents first for grounded, cited answers — or ask a general CA question now."
                  : "Answers are retrieved from your indexed documents with inline source citations."}
              </p>
              <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    data-testid="suggestion-chip"
                    onClick={() => send(s)}
                    className="border border-border p-4 text-left text-sm text-foreground/80 transition-colors duration-200 hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
              {messages.map((m) => (
                <div key={m.id} data-testid={`message-${m.role}`} className="animate-fade-in">
                  <p className="label-caps mb-2">{m.role === "user" ? "You" : "CoPilot"}</p>
                  {m.pending && !m.content ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> <span className="text-sm">Retrieving & reasoning…</span>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">{m.content}</p>
                  )}
                  {m.role === "assistant" && m.sources?.length > 0 && (
                    <div className="mt-4 border-t border-border pt-4">
                      <p className="label-caps mb-2">Sources</p>
                      <div className="flex flex-wrap gap-2">
                        {m.sources.map((s, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1 font-mono text-[0.7rem] text-muted-foreground">
                            <FileText className="h-3 w-3" /> [{i + 1}] {s.filename} · {(s.score * 100).toFixed(0)}%
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-3">
            <textarea
              data-testid="copilot-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask a question…"
              className="max-h-40 min-h-[48px] flex-1 resize-none border border-input bg-background px-4 py-3 text-sm outline-none transition-colors duration-200 focus:border-ring"
            />
            <button
              data-testid="copilot-send-button"
              onClick={() => send()}
              disabled={streaming || !input.trim()}
              className="grid h-12 w-12 shrink-0 place-items-center bg-foreground text-background transition-transform duration-200 active:translate-y-px disabled:opacity-50"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="mx-auto mt-2 flex max-w-3xl items-center gap-1.5 font-mono text-[0.7rem] text-muted-foreground">
            <CornerDownLeft className="h-3 w-3" /> to send · Shift+Enter for newline
          </p>
        </div>
      </div>
    </div>
  );
}
