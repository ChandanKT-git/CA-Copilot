import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { PageHeader, StatusPill, Empty } from "@/components/primitives";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, FileText, Trash2, Eye, Loader2 } from "lucide-react";

const ACCEPT = ".pdf,.csv,.xlsx,.xls,.txt,.md,.json";

function fmtSize(b) {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB"];
  let i = 0;
  let n = b;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);
  const inputRef = useRef();

  const load = () => {
    setLoading(true);
    api.get("/documents").then((r) => setDocs(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const doUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const r = await api.post("/documents/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`${r.data.filename} parsed · ${r.data.num_chunks} chunks`);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const openView = async (doc) => {
    const r = await api.get(`/documents/${doc.id}`);
    setViewDoc(r.data);
  };

  const remove = async (doc) => {
    await api.delete(`/documents/${doc.id}`);
    toast.success("Document removed");
    load();
  };

  return (
    <div data-testid="documents-page">
      <PageHeader
        eyebrow="Knowledge base"
        title="Documents"
        description="Upload Form 16, 26AS, bank statements, ledgers or notes. Each file is parsed and indexed for the RAG copilot."
      />

      <div className="px-6 py-8 md:px-10">
        <div
          data-testid="upload-dropzone"
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); doUpload(e.dataTransfer.files[0]); }}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center border border-dashed px-6 py-14 text-center transition-colors duration-200 ${
            drag ? "border-foreground bg-accent" : "border-border hover:bg-accent/50"
          }`}
        >
          <input ref={inputRef} data-testid="file-input" type="file" accept={ACCEPT} className="hidden" onChange={(e) => doUpload(e.target.files[0])} />
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          )}
          <p className="mt-4 text-sm">{uploading ? "Parsing & indexing…" : "Drop a file or click to upload"}</p>
          <p className="mt-1 font-mono text-[0.7rem] text-muted-foreground">PDF · CSV · XLSX · TXT · JSON · max 15MB</p>
        </div>

        <div className="mt-10">
          <p className="label-caps mb-4">{docs.length} document{docs.length !== 1 && "s"}</p>
          {loading ? (
            <div className="grid place-items-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : docs.length === 0 ? (
            <Empty icon={FileText} title="No documents yet" body="Upload your first client document to build the knowledge base the copilot answers from." />
          ) : (
            <div className="border border-border">
              <div className="hidden grid-cols-[1fr_140px_90px_90px_100px_80px] items-center gap-4 border-b border-border bg-accent/40 px-4 py-3 md:grid">
                {["File", "Type", "Chunks", "Size", "Status", ""].map((h, i) => (
                  <span key={i} className="label-caps">{h}</span>
                ))}
              </div>
              {docs.map((d) => (
                <div key={d.id} data-testid={`document-row-${d.id}`} className="grid grid-cols-1 items-center gap-2 border-b border-border px-4 py-4 last:border-b-0 md:grid-cols-[1fr_140px_90px_90px_100px_80px] md:gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                    <span className="truncate text-sm">{d.filename}</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{d.doc_type}</span>
                  <span className="font-mono text-xs">{d.num_chunks}</span>
                  <span className="font-mono text-xs text-muted-foreground">{fmtSize(d.size)}</span>
                  <StatusPill status={d.status} />
                  <div className="flex items-center gap-1">
                    <button data-testid={`view-doc-${d.id}`} onClick={() => openView(d)} className="grid h-8 w-8 place-items-center text-muted-foreground transition-colors hover:text-foreground" aria-label="View">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button data-testid={`delete-doc-${d.id}`} onClick={() => remove(d)} className="grid h-8 w-8 place-items-center text-muted-foreground transition-colors hover:text-destructive" aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!viewDoc} onOpenChange={(o) => !o && setViewDoc(null)}>
        <DialogContent className="max-w-2xl border-border">
          <DialogHeader>
            <DialogTitle className="font-light tracking-tight">{viewDoc?.filename}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-muted-foreground">
              <span>{viewDoc?.doc_type}</span>
              <span>{viewDoc?.num_chunks} chunks</span>
              <span>{viewDoc?.char_count?.toLocaleString()} chars</span>
            </div>
            {viewDoc?.chunks?.map((c) => (
              <div key={c.id} className="border border-border p-4">
                <p className="label-caps mb-2">chunk {c.index}</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{c.text.slice(0, 600)}{c.text.length > 600 && "…"}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
