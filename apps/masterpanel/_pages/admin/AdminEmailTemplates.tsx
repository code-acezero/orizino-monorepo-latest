"use client";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { listTemplates, upsertTemplate, deleteTemplate, sendTestEmail } from "@/lib/email-campaigns.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/lib/app-toast";
import {
  Plus, Pencil, Trash2, FileText, FlaskConical, Type, AlignLeft, Image as ImageIcon,
  MousePointerClick, Minus, MoveVertical, Columns as ColumnsIcon, Code, ArrowUp, ArrowDown,
  Copy, Trash, Eye, Smartphone, Monitor, Moon, Sun, Save, Variable, GripVertical, Layers, Sparkles,
} from "lucide-react";
import {
  type Block, type EmailDesign, defaultDesign, renderEmail, applyVariables, COMMON_VARIABLES,
} from "@/lib/email-blocks";
import { EMAIL_PRESETS } from "@/lib/email-presets";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const uid = () => Math.random().toString(36).slice(2, 10);

const BLOCK_LIBRARY: Array<{ type: Block["type"]; label: string; icon: any; make: () => Block }> = [
  { type: "heading", label: "Heading", icon: Type, make: () => ({ id: uid(), type: "heading", level: 1, text: "Your heading", align: "left" }) },
  { type: "paragraph", label: "Paragraph", icon: AlignLeft, make: () => ({ id: uid(), type: "paragraph", text: "Write something meaningful here…", size: 15 }) },
  { type: "image", label: "Image", icon: ImageIcon, make: () => ({ id: uid(), type: "image", src: "https://placehold.co/600x300/png", alt: "", width: 560, radius: 8, align: "center" }) },
  { type: "button", label: "Button", icon: MousePointerClick, make: () => ({ id: uid(), type: "button", text: "Click me", href: "https://example.com", align: "left", background: "#6366f1", color: "#ffffff", radius: 10 }) },
  { type: "divider", label: "Divider", icon: Minus, make: () => ({ id: uid(), type: "divider", color: "#e5e7eb" }) },
  { type: "spacer", label: "Spacer", icon: MoveVertical, make: () => ({ id: uid(), type: "spacer", height: 24 }) },
  { type: "columns", label: "2 Columns", icon: ColumnsIcon, make: () => ({ id: uid(), type: "columns", left: [{ id: uid(), type: "paragraph", text: "Left column" }], right: [{ id: uid(), type: "paragraph", text: "Right column" }] }) },
  { type: "html", label: "Raw HTML", icon: Code, make: () => ({ id: uid(), type: "html", html: "<p>Custom HTML…</p>" }) },
];

function normalizeDesign(t: any): EmailDesign {
  const d = t?.design;
  if (d && typeof d === "object" && Array.isArray(d.blocks)) return { ...defaultDesign(), ...d };
  return defaultDesign();
}

export default function AdminEmailTemplates() {
  const fetchFn = useServerFn(listTemplates);
  const save = useServerFn(upsertTemplate);
  const del = useServerFn(deleteTemplate);
  const sendTest = useServerFn(sendTestEmail);
  const qc = useQueryClient();
  const { data: templates = [] } = useQuery({ queryKey: ["templates"], queryFn: () => fetchFn() });

  const [editing, setEditing] = useState<any | null>(null);
  const [design, setDesign] = useState<EmailDesign>(defaultDesign());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [testTo, setTestTo] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [showVars, setShowVars] = useState(false);
  const [viewMode, setViewMode] = useState<"visual" | "html">("visual");
  const [presetOpen, setPresetOpen] = useState(false);

  useEffect(() => {
    if (editing) setDesign(normalizeDesign(editing));
    setViewMode("visual");
  }, [editing?.id]);

  const html = useMemo(() => renderEmail(design), [design]);
  const inHtmlMode = !!design.customHtml && design.customHtml.trim().length > 0;
  const sampleVars = useMemo(() => Object.fromEntries(COMMON_VARIABLES.map((v) => [v.key, v.sample])), []);
  const previewHtml = useMemo(() => {
    const rendered = applyVariables(html, sampleVars);
    if (theme === "dark") {
      return rendered.replace(
        "<body ",
        `<body data-theme="dark" `
      ).replace(
        /background:#f4f5f7/g, "background:#0b0b10"
      );
    }
    return rendered;
  }, [html, sampleVars, theme]);

  const updateBlock = (id: string, patch: Partial<Block>) => {
    setDesign((d) => ({
      ...d,
      blocks: d.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)),
    }));
  };
  const removeBlock = (id: string) => {
    setDesign((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  };
  const duplicateBlock = (id: string) => {
    setDesign((d) => {
      const idx = d.blocks.findIndex((b) => b.id === id);
      if (idx < 0) return d;
      const clone = JSON.parse(JSON.stringify(d.blocks[idx]));
      clone.id = uid();
      const next = [...d.blocks];
      next.splice(idx + 1, 0, clone);
      return { ...d, blocks: next };
    });
  };
  const moveBlock = (id: string, dir: -1 | 1) => {
    setDesign((d) => {
      const idx = d.blocks.findIndex((b) => b.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= d.blocks.length) return d;
      const next = [...d.blocks];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...d, blocks: next };
    });
  };
  const addBlock = (make: () => Block) => {
    const b = make();
    setDesign((d) => ({ ...d, blocks: [...d.blocks, b] }));
    setSelectedId(b.id);
  };
  const insertVar = (key: string) => {
    if (!selectedId) { toast.info("Select a block first"); return; }
    const b = design.blocks.find((x) => x.id === selectedId);
    if (!b) return;
    const token = `{{${key}}}`;
    if (b.type === "heading" || b.type === "paragraph" || b.type === "button") {
      updateBlock(selectedId, { text: (b as any).text + token } as any);
    } else if (b.type === "html") {
      updateBlock(selectedId, { html: (b as any).html + token } as any);
    } else {
      toast.info("This block doesn't support variables");
    }
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        id: editing.id,
        name: editing.name,
        category: editing.category || "general",
        subject: editing.subject || "",
        design,
        html,
      };
      return save({ data: payload });
    },
    onSuccess: () => {
      toast.success("Template saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const handleTest = async () => {
    if (!testTo || !editing) return;
    setTestSending(true);
    try {
      const rendered = applyVariables(html, sampleVars);
      const r: any = await sendTest({ data: { to: testTo, subject: editing.subject || editing.name, html: rendered } });
      if (r?.error) toast.error(r.error);
      else if (r?.warning) toast.warning(r.warning);
      else if (r?.id) toast.success(`Test sent to ${testTo}`);
      else toast.error("Failed to send");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setTestSending(false); }
  };

  const selected = design.blocks.find((b) => b.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2"><FileText className="w-7 h-7" />Email Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Compose reusable emails with a visual block editor</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setPresetOpen(true)}>
            <Sparkles className="w-4 h-4 mr-1.5" />From preset
          </Button>
          <Button size="sm" onClick={() => { setEditing({ name: "Untitled template", category: "general", subject: "", design: defaultDesign() }); setSelectedId(null); }}>
            <Plus className="w-4 h-4 mr-1.5" />Blank template
          </Button>
        </div>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.length === 0 && (
          <div className="col-span-full text-sm text-muted-foreground italic py-8 text-center border border-dashed border-border rounded-xl">
            No templates yet — click "New template" to start designing.
          </div>
        )}
        {templates.map((t: any) => (
          <button
            key={t.id}
            onClick={() => setEditing(t)}
            className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-medium truncate">{t.name}</h3>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full">{t.category}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{t.subject || <em className="opacity-60">No subject</em>}</p>
            <div className="mt-3 flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(t); }}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={async (e) => {
                e.stopPropagation();
                if (!confirm("Delete this template?")) return;
                await del({ data: { id: t.id } });
                qc.invalidateQueries({ queryKey: ["templates"] });
                toast.success("Deleted");
              }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
            </div>
          </button>
        ))}
      </div>

      {/* Editor dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-[1400px] w-[96vw] p-0 gap-0 h-[92vh] flex flex-col overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b border-border flex-row items-center gap-3 space-y-0">
            <DialogTitle className="text-base font-semibold">Email Template Editor</DialogTitle>
            <div className="flex-1" />
            <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-0.5">
              <button onClick={() => setDevice("desktop")} className={`p-1.5 rounded-full transition-colors ${device === "desktop" ? "bg-card shadow-sm" : "hover:bg-card/60"}`}><Monitor className="w-3.5 h-3.5" /></button>
              <button onClick={() => setDevice("mobile")} className={`p-1.5 rounded-full transition-colors ${device === "mobile" ? "bg-card shadow-sm" : "hover:bg-card/60"}`}><Smartphone className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-0.5" title="Editor mode">
              <button onClick={() => setViewMode("visual")} className={`px-2 py-1 rounded-full text-[11px] flex items-center gap-1 transition-colors ${viewMode === "visual" ? "bg-card shadow-sm" : "hover:bg-card/60"}`}>
                <Layers className="w-3 h-3" />Visual
              </button>
              <button onClick={() => setViewMode("html")} className={`px-2 py-1 rounded-full text-[11px] flex items-center gap-1 transition-colors ${viewMode === "html" ? "bg-card shadow-sm" : "hover:bg-card/60"}`}>
                <Code className="w-3 h-3" />HTML
              </button>
            </div>
            <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-0.5">
              <button onClick={() => setTheme("light")} className={`p-1.5 rounded-full transition-colors ${theme === "light" ? "bg-card shadow-sm" : "hover:bg-card/60"}`}><Sun className="w-3.5 h-3.5" /></button>
              <button onClick={() => setTheme("dark")} className={`p-1.5 rounded-full transition-colors ${theme === "dark" ? "bg-card shadow-sm" : "hover:bg-card/60"}`}><Moon className="w-3.5 h-3.5" /></button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setShowVars((v) => !v)}><Variable className="w-3.5 h-3.5 mr-1" />Variables</Button>
            <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              <Save className="w-3.5 h-3.5 mr-1.5" />{saveMut.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogHeader>

          {/* 3-column workspace */}
          <div className="flex-1 grid grid-cols-[260px_1fr_320px] min-h-0">
            {/* LEFT — block palette + outline */}
            <aside className="border-r border-border overflow-y-auto bg-muted/20">
              <div className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Add block</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {BLOCK_LIBRARY.map((b) => (
                    <button key={b.type} onClick={() => addBlock(b.make)}
                      className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-xs">
                      <b.icon className="w-4 h-4 text-primary" />
                      <span className="text-[11px] text-foreground">{b.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="px-3 pb-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Outline</p>
                <div className="space-y-1">
                  {design.blocks.map((b, i) => (
                    <button key={b.id} onClick={() => setSelectedId(b.id)}
                      className={`group w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left text-xs transition-all ${
                        selectedId === b.id ? "bg-primary/12 text-primary ring-1 ring-primary/30" : "hover:bg-secondary/60 text-foreground"
                      }`}>
                      <GripVertical className="w-3 h-3 opacity-40" />
                      <span className="flex-1 truncate capitalize">{b.type}</span>
                      <span className="text-[10px] text-muted-foreground">{i + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* CENTER — preview */}
            <main className="overflow-y-auto bg-muted/40 p-4">
              {/* Subject / meta strip */}
              <div className="mx-auto mb-3 max-w-[640px] bg-card border border-border rounded-xl p-3 grid grid-cols-3 gap-2">
                <Input placeholder="Template name" value={editing?.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="h-8 text-sm" />
                <Input placeholder="Category" value={editing?.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="h-8 text-sm" />
                <Input placeholder="Subject line" value={editing?.subject ?? ""} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} className="h-8 text-sm" />
              </div>

              {viewMode === "visual" ? (
                <div className="mx-auto bg-card rounded-2xl shadow-xl overflow-hidden border border-border transition-all"
                  style={{ width: device === "mobile" ? 380 : 660, maxWidth: "100%" }}>
                  <iframe title="Email preview" srcDoc={previewHtml} sandbox="" className="w-full bg-white" style={{ height: "calc(92vh - 220px)", border: 0 }} />
                </div>
              ) : (
                <div className="mx-auto max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-3" style={{ height: "calc(92vh - 220px)" }}>
                  <div className="flex flex-col bg-card rounded-xl border border-border overflow-hidden">
                    <div className="px-3 py-2 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Code className="w-3 h-3" />Raw HTML (Gmail-safe: inline styles + tables)</span>
                      <span className="text-[10px] normal-case tracking-normal">
                        {inHtmlMode ? "HTML override active" : "Empty = render blocks"}
                      </span>
                    </div>
                    <Textarea
                      value={design.customHtml ?? ""}
                      onChange={(e) => setDesign((d) => ({ ...d, customHtml: e.target.value }))}
                      placeholder={`Paste hand-written HTML here. Tips:\n• Use <table> for layout, never flex/grid\n• Inline every style with style="…"\n• Stick to web-safe fonts\n• Width 600px, max-width:100%\nLeave empty to use the visual blocks instead.`}
                      className="flex-1 font-mono text-xs rounded-none border-0 resize-none focus-visible:ring-0"
                    />
                    <div className="px-3 py-2 border-t border-border flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDesign((d) => ({ ...d, customHtml: html }))}>
                        Copy blocks → HTML
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDesign((d) => ({ ...d, customHtml: "" }))}>
                        Clear HTML override
                      </Button>
                    </div>
                  </div>
                  <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col">
                    <div className="px-3 py-2 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                      <Eye className="w-3 h-3" />Live preview
                    </div>
                    <iframe title="Email preview" srcDoc={previewHtml} sandbox="" className="flex-1 w-full bg-white" style={{ border: 0 }} />
                  </div>
                </div>
              )}

              {/* Test send */}
              <div className="mx-auto mt-3 max-w-[640px] bg-card border border-border rounded-xl p-3 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-muted-foreground" />
                <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" className="h-8 text-sm flex-1" />
                <Button size="sm" variant="outline" disabled={!testTo || testSending} onClick={handleTest}>
                  {testSending ? "Sending…" : "Send test"}
                </Button>
              </div>
            </main>

            {/* RIGHT — inspector */}
            <aside className="border-l border-border overflow-y-auto bg-muted/20">
              {showVars && (
                <div className="p-3 border-b border-border">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5"><Variable className="w-3 h-3" /> Insert variable</p>
                  <div className="grid grid-cols-2 gap-1">
                    {COMMON_VARIABLES.map((v) => (
                      <button key={v.key} onClick={() => insertVar(v.key)}
                        className="text-left px-2 py-1.5 rounded-md text-[11px] hover:bg-primary/10 hover:text-primary transition-colors">
                        <code className="text-primary">{`{{${v.key}}}`}</code>
                        <div className="text-[10px] text-muted-foreground truncate">{v.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selected ? (
                <BlockInspector
                  block={selected}
                  onChange={(patch) => updateBlock(selected.id, patch)}
                  onDuplicate={() => duplicateBlock(selected.id)}
                  onDelete={() => removeBlock(selected.id)}
                  onMoveUp={() => moveBlock(selected.id, -1)}
                  onMoveDown={() => moveBlock(selected.id, 1)}
                />
              ) : (
                <GlobalInspector design={design} onChange={(patch) => setDesign((d) => ({ ...d, ...patch }))} />
              )}
            </aside>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={presetOpen} onOpenChange={setPresetOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Start from a preset</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
            {EMAIL_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => {
                  setPresetOpen(false);
                  setEditing({ name: p.name, category: p.category, subject: p.subject, design: p.build() });
                  setSelectedId(null);
                }}
                className="text-left rounded-lg border border-border bg-card p-3 hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{p.name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full">{p.category}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{p.description}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Inspectors ─── */

function GlobalInspector({ design, onChange }: { design: EmailDesign; onChange: (patch: Partial<EmailDesign>) => void }) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-xs font-semibold text-foreground mb-1">Global styles</p>
        <p className="text-[11px] text-muted-foreground">Select any block on the left to edit it, or tweak document defaults below.</p>
      </div>
      <Field label="Body background"><ColorInput value={design.bodyBackground ?? "#f4f5f7"} onChange={(v) => onChange({ bodyBackground: v })} /></Field>
      <Field label="Container background"><ColorInput value={design.containerBackground ?? "#ffffff"} onChange={(v) => onChange({ containerBackground: v })} /></Field>
      <Field label="Text color"><ColorInput value={design.textColor ?? "#1f2937"} onChange={(v) => onChange({ textColor: v })} /></Field>
      <Field label="Accent color"><ColorInput value={design.accentColor ?? "#6366f1"} onChange={(v) => onChange({ accentColor: v })} /></Field>
      <Field label="Font family"><Input value={design.fontFamily ?? ""} onChange={(e) => onChange({ fontFamily: e.target.value })} placeholder="system-ui, sans-serif" /></Field>
    </div>
  );
}

function BlockInspector({ block, onChange, onDuplicate, onDelete, onMoveUp, onMoveDown }: {
  block: Block;
  onChange: (p: Partial<Block>) => void;
  onDuplicate: () => void; onDelete: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold capitalize">{block.type} block</p>
        <div className="flex items-center gap-0.5">
          <button onClick={onMoveUp} className="p-1.5 rounded hover:bg-secondary/60" title="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
          <button onClick={onMoveDown} className="p-1.5 rounded hover:bg-secondary/60" title="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
          <button onClick={onDuplicate} className="p-1.5 rounded hover:bg-secondary/60" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Delete"><Trash className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {block.type === "heading" && (
        <>
          <Field label="Text"><Textarea value={block.text} onChange={(e) => onChange({ text: e.target.value } as any)} rows={2} /></Field>
          <Field label="Level">
            <div className="flex gap-1">
              {[1, 2, 3].map((lv) => (
                <button key={lv} onClick={() => onChange({ level: lv as 1 | 2 | 3 } as any)}
                  className={`flex-1 py-1 rounded text-xs ${block.level === lv ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>H{lv}</button>
              ))}
            </div>
          </Field>
          <Field label="Color"><ColorInput value={(block as any).color ?? "#0f172a"} onChange={(v) => onChange({ color: v } as any)} /></Field>
          <AlignField block={block} onChange={onChange} />
          <PaddingField block={block} onChange={onChange} />
        </>
      )}
      {block.type === "paragraph" && (
        <>
          <Field label="Text"><Textarea value={block.text} onChange={(e) => onChange({ text: e.target.value } as any)} rows={5} /></Field>
          <Field label="Size (px)"><Input type="number" min={10} max={28} value={(block as any).size ?? 15} onChange={(e) => onChange({ size: Number(e.target.value) } as any)} /></Field>
          <Field label="Color"><ColorInput value={(block as any).color ?? "#1f2937"} onChange={(v) => onChange({ color: v } as any)} /></Field>
          <AlignField block={block} onChange={onChange} />
          <PaddingField block={block} onChange={onChange} />
        </>
      )}
      {block.type === "image" && (
        <>
          <Field label="Image URL"><Input value={(block as any).src} onChange={(e) => onChange({ src: e.target.value } as any)} /></Field>
          <Field label="Alt text"><Input value={(block as any).alt ?? ""} onChange={(e) => onChange({ alt: e.target.value } as any)} /></Field>
          <Field label="Link URL (optional)"><Input value={(block as any).href ?? ""} onChange={(e) => onChange({ href: e.target.value } as any)} placeholder="https://…" /></Field>
          <Field label="Width (px)"><Input type="number" min={80} max={600} value={(block as any).width ?? 560} onChange={(e) => onChange({ width: Number(e.target.value) } as any)} /></Field>
          <Field label="Corner radius"><Input type="number" min={0} max={32} value={(block as any).radius ?? 0} onChange={(e) => onChange({ radius: Number(e.target.value) } as any)} /></Field>
          <AlignField block={block} onChange={onChange} />
        </>
      )}
      {block.type === "button" && (
        <>
          <Field label="Label"><Input value={(block as any).text} onChange={(e) => onChange({ text: e.target.value } as any)} /></Field>
          <Field label="Link URL"><Input value={(block as any).href} onChange={(e) => onChange({ href: e.target.value } as any)} placeholder="https://…" /></Field>
          <Field label="Background"><ColorInput value={(block as any).background ?? "#6366f1"} onChange={(v) => onChange({ background: v } as any)} /></Field>
          <Field label="Text color"><ColorInput value={(block as any).color ?? "#ffffff"} onChange={(v) => onChange({ color: v } as any)} /></Field>
          <Field label="Radius (px)"><Input type="number" min={0} max={32} value={(block as any).radius ?? 10} onChange={(e) => onChange({ radius: Number(e.target.value) } as any)} /></Field>
          <AlignField block={block} onChange={onChange} />
          <PaddingField block={block} onChange={onChange} />
        </>
      )}
      {block.type === "divider" && (
        <>
          <Field label="Color"><ColorInput value={(block as any).color ?? "#e5e7eb"} onChange={(v) => onChange({ color: v } as any)} /></Field>
          <PaddingField block={block} onChange={onChange} />
        </>
      )}
      {block.type === "spacer" && (
        <Field label="Height (px)"><Input type="number" min={4} max={120} value={(block as any).height ?? 24} onChange={(e) => onChange({ height: Number(e.target.value) } as any)} /></Field>
      )}
      {block.type === "columns" && (
        <p className="text-[11px] text-muted-foreground italic">Columns block — child block editing coming soon. Use other blocks for now.</p>
      )}
      {block.type === "html" && (
        <Field label="Raw HTML"><Textarea value={(block as any).html} onChange={(e) => onChange({ html: e.target.value } as any)} rows={10} className="font-mono text-xs" /></Field>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</Label>
      {children}
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 items-center">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 h-9 rounded border border-border bg-transparent cursor-pointer" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 text-xs font-mono" />
    </div>
  );
}

function AlignField({ block, onChange }: { block: Block; onChange: (p: Partial<Block>) => void }) {
  return (
    <Field label="Alignment">
      <div className="flex gap-1">
        {(["left", "center", "right"] as const).map((a) => (
          <button key={a} onClick={() => onChange({ align: a } as any)}
            className={`flex-1 py-1 rounded text-[11px] capitalize ${block.align === a ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{a}</button>
        ))}
      </div>
    </Field>
  );
}

function PaddingField({ block, onChange }: { block: Block; onChange: (p: Partial<Block>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Field label="Pad Y"><Input type="number" min={0} max={64} value={(block as any).paddingY ?? 8} onChange={(e) => onChange({ paddingY: Number(e.target.value) } as any)} /></Field>
      <Field label="Pad X"><Input type="number" min={0} max={64} value={(block as any).paddingX ?? 24} onChange={(e) => onChange({ paddingX: Number(e.target.value) } as any)} /></Field>
    </div>
  );
}
