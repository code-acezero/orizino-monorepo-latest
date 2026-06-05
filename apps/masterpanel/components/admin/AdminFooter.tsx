"use client";
import React from "react";
import { Activity, BookOpen, LifeBuoy, Keyboard, GitBranch } from "lucide-react";
import LanguageMenu from "@/components/footer/LanguageMenu";
import { useAdminFooterSettings } from "@/hooks/use-admin-footer-settings";

interface Props {
  onOpenShortcuts?: () => void;
}

const AdminFooter: React.FC<Props> = ({ onOpenShortcuts }) => {
  const cfg = useAdminFooterSettings();
  const year = new Date().getFullYear();
  const isDev = typeof window !== "undefined" && /lovable\.dev|localhost|--dev\./.test(window.location.host);
  const copyright = cfg.copyright_text?.trim() || `© ${year} ${cfg.brand_label || "Orizino"}`;

  return (
    <footer className="h-12 px-5 flex items-center justify-between gap-4 border-t border-border/60 bg-background/70 backdrop-blur-xl text-[11px] text-muted-foreground">
      <div className="flex items-center gap-3 min-w-0">
        {cfg.show_status && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-foreground/80">All systems operational</span>
          </div>
        )}
        {cfg.show_brand && (
          <>
            <span className="text-border">·</span>
            <span className="hidden md:inline">{cfg.brand_label}</span>
          </>
        )}
        {cfg.show_version && (
          <>
            <span className="hidden md:inline text-border">·</span>
            <span className="hidden md:inline-flex items-center gap-1 px-2 h-5 rounded-full bg-muted/60 font-mono text-[10px]">
              <GitBranch className="w-2.5 h-2.5" />
              {cfg.version_label}
            </span>
          </>
        )}
        {cfg.show_env && (
          <span className={`hidden md:inline-flex items-center gap-1 px-2 h-5 rounded-full font-mono text-[10px] ${isDev ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
            <Activity className="w-2.5 h-2.5" />
            {isDev ? "Preview" : "Production"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {cfg.show_language && <LanguageMenu variant="footer" />}
        {cfg.show_docs && (
          <a href={cfg.docs_url} className="hidden sm:inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg hover:bg-muted/60 hover:text-foreground transition-colors">
            <BookOpen className="w-3 h-3" /> Docs
          </a>
        )}
        {cfg.show_support && (
          <a href={cfg.support_url} className="hidden sm:inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg hover:bg-muted/60 hover:text-foreground transition-colors">
            <LifeBuoy className="w-3 h-3" /> Support
          </a>
        )}
        {cfg.custom_links?.map((l) => (
          <a key={l.label + l.url} href={l.url} className="hidden sm:inline-flex items-center px-2.5 h-7 rounded-lg hover:bg-muted/60 hover:text-foreground transition-colors">
            {l.label}
          </a>
        ))}
        {cfg.show_shortcuts && onOpenShortcuts && (
          <button onClick={onOpenShortcuts} className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg hover:bg-muted/60 hover:text-foreground transition-colors">
            <Keyboard className="w-3 h-3" /> Shortcuts
          </button>
        )}
        {cfg.show_copyright && (
          <span className="ml-2 text-muted-foreground/70">{copyright}</span>
        )}
      </div>
    </footer>
  );
};

export default AdminFooter;
