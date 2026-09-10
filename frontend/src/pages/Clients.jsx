import { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, StatusPill, Empty } from "@/components/primitives";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Plus, Send, Loader2, Mail } from "lucide-react";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", pan: "" });
  const [msgClient, setMsgClient] = useState(null);
  const [msg, setMsg] = useState({ subject: "", body: "" });
  const [history, setHistory] = useState([]);
  const [sending, setSending] = useState(false);

  const load = () => { setLoading(true); api.get("/clients").then((r) => setClients(r.data)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post("/clients", form);
      toast.success("Client added");
      setShowAdd(false);
      setForm({ name: "", email: "", pan: "" });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to add client");
    }
  };

  const openMsg = async (c) => {
    setMsgClient(c);
    setMsg({ subject: "", body: "" });
    const r = await api.get(`/clients/${c.id}/messages`);
    setHistory(r.data);
  };

  const sendMsg = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post(`/clients/${msgClient.id}/message`, msg);
      toast.success("Message queued (stub)");
      const r = await api.get(`/clients/${msgClient.id}/messages`);
      setHistory(r.data);
      setMsg({ subject: "", body: "" });
      load();
    } catch (e) {
      toast.error("Failed to queue message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div data-testid="clients-page">
      <PageHeader
        eyebrow="Communication"
        title="Clients"
        description="Manage client records and compose communication. Message delivery is a stub — messages are queued and logged, not actually sent."
        action={
          <button data-testid="add-client-button" onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-foreground px-4 py-2.5 text-sm text-background transition-transform duration-200 active:translate-y-px">
            <Plus className="h-4 w-4" /> Add client
          </button>
        }
      />

      <div className="px-6 py-8 md:px-10">
        {loading ? (
          <div className="grid place-items-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : clients.length === 0 ? (
          <Empty icon={Users} title="No clients yet" body="Add a client to start tracking communication and filing status."
            action={<button onClick={() => setShowAdd(true)} className="bg-foreground px-4 py-2.5 text-sm text-background">Add client</button>} />
        ) : (
          <div className="border border-border">
            <div className="hidden grid-cols-[1fr_1fr_120px_100px_120px] items-center gap-4 border-b border-border bg-accent/40 px-4 py-3 md:grid">
              {["Name", "Email", "PAN", "Status", "Messages"].map((h) => <span key={h} className="label-caps">{h}</span>)}
            </div>
            {clients.map((c) => (
              <div key={c.id} data-testid={`client-row-${c.id}`} className="grid grid-cols-1 items-center gap-2 border-b border-border px-4 py-4 last:border-b-0 md:grid-cols-[1fr_1fr_120px_100px_120px] md:gap-4">
                <span className="text-sm">{c.name}</span>
                <span className="truncate font-mono text-xs text-muted-foreground">{c.email}</span>
                <span className="font-mono text-xs text-muted-foreground">{c.pan || "—"}</span>
                <StatusPill status={c.status} />
                <button data-testid={`message-client-${c.id}`} onClick={() => openMsg(c)} className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  <Send className="h-3.5 w-3.5" /> {c.messages_sent || 0} sent
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add client */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md border-border">
          <DialogHeader><DialogTitle className="font-light tracking-tight">Add client</DialogTitle></DialogHeader>
          <form onSubmit={add} className="space-y-4">
            <div>
              <label className="label-caps">Name</label>
              <input data-testid="client-name-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full border border-input bg-background px-3 py-3 text-sm outline-none focus:border-ring" />
            </div>
            <div>
              <label className="label-caps">Email</label>
              <input data-testid="client-email-input" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-2 w-full border border-input bg-background px-3 py-3 text-sm outline-none focus:border-ring" />
            </div>
            <div>
              <label className="label-caps">PAN (optional)</label>
              <input data-testid="client-pan-input" value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} maxLength={10} className="mt-2 w-full border border-input bg-background px-3 py-3 font-mono text-sm outline-none focus:border-ring" />
            </div>
            <button data-testid="client-save-button" type="submit" className="w-full bg-foreground py-3 text-sm text-background transition-transform duration-200 active:translate-y-px">Save client</button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Compose */}
      <Dialog open={!!msgClient} onOpenChange={(o) => !o && setMsgClient(null)}>
        <DialogContent className="max-w-lg border-border">
          <DialogHeader><DialogTitle className="font-light tracking-tight">Message {msgClient?.name}</DialogTitle></DialogHeader>
          <div className="mb-2 flex items-center gap-2 border border-dashed border-border px-3 py-2 font-mono text-[0.7rem] text-muted-foreground">
            <Mail className="h-3 w-3" /> Stub channel — queued & logged, not delivered
          </div>
          <form onSubmit={sendMsg} className="space-y-4">
            <input data-testid="message-subject-input" required placeholder="Subject" value={msg.subject} onChange={(e) => setMsg({ ...msg, subject: e.target.value })} className="w-full border border-input bg-background px-3 py-3 text-sm outline-none focus:border-ring" />
            <textarea data-testid="message-body-input" required rows={4} placeholder="Message to client…" value={msg.body} onChange={(e) => setMsg({ ...msg, body: e.target.value })} className="w-full resize-none border border-input bg-background px-3 py-3 text-sm outline-none focus:border-ring" />
            <button data-testid="message-send-button" type="submit" disabled={sending} className="flex w-full items-center justify-center gap-2 bg-foreground py-3 text-sm text-background transition-transform duration-200 active:translate-y-px disabled:opacity-60">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Queue message</>}
            </button>
          </form>
          {history.length > 0 && (
            <div className="mt-2 max-h-48 space-y-2 overflow-y-auto border-t border-border pt-4">
              {history.map((h) => (
                <div key={h.id} className="border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm">{h.subject}</p>
                    <span className="font-mono text-[0.7rem] text-muted-foreground">{h.status}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{h.body}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
