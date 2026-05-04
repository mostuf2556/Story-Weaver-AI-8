import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/hooks/use-theme";
import {
  useListOpenrouterConversations,
  useCreateOpenrouterConversation,
  useDeleteOpenrouterConversation,
  getListOpenrouterConversationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bug, Trash2 } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { useDocumentDir } from "@/hooks/use-document-dir";
import { OpenrouterSettingsDialog } from "@/components/openrouter-settings-dialog";
import { SttSettingsDialog } from "@/components/stt-settings-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { getT } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n-context";
import { useHealthCheck } from "@/hooks/use-health-check";
import { cn } from "@/lib/utils";
import { DebugPanel } from "@/components/debug-panel";

const CARD_COLORS = [
  { border: "#82C3DF", ribbon: "#82C3DF", shadow: "#82C3DF30" },
  { border: "#FF9E80", ribbon: "#FF9E80", shadow: "#FF9E8030" },
  { border: "#FFB84D", ribbon: "#FFB84D", shadow: "#FFB84D30" },
  { border: "#B5D8A0", ribbon: "#B5D8A0", shadow: "#B5D8A030" },
  { border: "#C9A8E0", ribbon: "#C9A8E0", shadow: "#C9A8E030" },
];

const CARD_EMOJIS = ["📖", "✨", "🌙", "🐉", "🌻", "🏰", "🦋", "🌊", "⭐", "🎪"];

export default function Home() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { settings, updateSettings } = useSettings();
  useDocumentDir(settings.uiLanguage);
  const t = getT(settings.uiLanguage);
  const { data: conversations, isLoading } = useListOpenrouterConversations();
  const createConversation = useCreateOpenrouterConversation();
  const deleteConversation = useDeleteOpenrouterConversation();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { status: healthStatus, refetch: healthRefetch } = useHealthCheck(30_000);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [firstLine, setFirstLine] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) return;
    createConversation.mutate(
      { data: { title } },
      {
        onSuccess: async (newConv) => {
          setIsDialogOpen(false);
          setTitle("");
          if (firstLine.trim()) {
            try {
              await fetch(`/api/openrouter/conversations/${newConv.id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: firstLine, skipAiCompletion: true }),
              });
            } catch (e) {
              console.error("Failed to save opening line", e);
            }
          }
          queryClient.invalidateQueries({ queryKey: getListOpenrouterConversationsQueryKey() });
          setLocation(`/story/${newConv.id}`);
        },
      },
    );
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(t("home.confirmDelete"))) {
      deleteConversation.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListOpenrouterConversationsQueryKey() });
          },
        },
      );
    }
  };

  return (
    <I18nProvider locale={settings.uiLanguage}>
      <div className="min-h-screen relative overflow-hidden">
        {/* Decorative floating elements */}
        <div
          className="pointer-events-none absolute top-8 left-8 text-4xl animate-pulse select-none hidden sm:block"
          style={{ color: "#FFB84D" }}
        >
          ⭐
        </div>
        <div
          className="pointer-events-none absolute top-28 right-12 text-3xl animate-bounce select-none hidden sm:block"
          style={{ color: "#FF9E80" }}
        >
          ♥
        </div>
        <div
          className="pointer-events-none absolute bottom-24 right-20 text-4xl animate-pulse select-none hidden sm:block"
          style={{ color: "#FFB84D" }}
        >
          ⭐
        </div>
        <div
          className="pointer-events-none absolute bottom-40 left-16 text-2xl select-none hidden sm:block"
          style={{ color: "#82C3DF" }}
        >
          📚
        </div>

        {/* Top settings bar */}
        <div className="flex justify-end items-center gap-1.5 px-4 sm:px-8 pt-4 sm:pt-6">
          {/* Server health dot */}
          <button
            onClick={() => healthRefetch()}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={
              healthStatus === "ok"
                ? "Server online"
                : healthStatus === "error"
                ? "Server offline — click to retry"
                : "Checking server…"
            }
            aria-label="Server health"
          >
            <div
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-colors",
                healthStatus === "ok"
                  ? "bg-emerald-400"
                  : healthStatus === "error"
                  ? "bg-red-400 animate-pulse"
                  : "bg-muted-foreground/30",
              )}
            />
          </button>
          {/* Debug panel toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setDebugPanelOpen((v) => !v)}
            aria-label="Toggle debug panel"
            title="Debug panel"
          >
            <Bug className="w-4 h-4" />
          </Button>
          <ThemeToggle />
          <SttSettingsDialog settings={settings} onSave={updateSettings} />
          <OpenrouterSettingsDialog settings={settings} onSave={updateSettings} />
        </div>

        {/* Hero section */}
        <header className="text-center px-6 pt-6 pb-12 max-w-3xl mx-auto relative z-10">
          <div className="relative inline-block mb-4">
            <h1
              className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-wide relative z-10"
              style={{
                fontFamily: "'Caveat', cursive",
                color: "#E65C40",
                textShadow: isDark
                  ? "2px 2px 0px transparent, 4px 4px 0px #FFB84D80"
                  : "2px 2px 0px #FFF8E7, 4px 4px 0px #FFB84D",
              }}
            >
              {t("home.title")}
            </h1>
            <svg
              className="absolute -bottom-3 left-0 w-full h-5 -z-10 opacity-70"
              viewBox="0 0 100 20"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M0,10 Q50,20 100,10 L100,20 L0,20 Z" fill="#FFB84D" />
            </svg>
          </div>

          <p
            className="text-xl md:text-2xl font-semibold mb-10 opacity-90 mt-2 text-muted-foreground"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            {t("home.tagline")}
          </p>

          {/* 3D coral "Start a New Story" button */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <button
                className="group relative inline-flex items-center justify-center px-8 py-4 text-2xl font-bold text-white transition-transform duration-200 hover:-translate-y-1 hover:scale-105 active:translate-y-1 active:scale-100"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                <span
                  className="absolute inset-0 w-full h-full rounded-full border-4 border-white transition-all duration-200"
                  style={{
                    backgroundColor: "#E65C40",
                    boxShadow:
                      "0 8px 0 0 #C54A32, 0 12px 20px rgba(230, 92, 64, 0.3)",
                  }}
                />
                <span
                  className="absolute inset-0 w-full h-full rounded-full border-4 border-white opacity-0 group-active:opacity-100 transition-all duration-200"
                  style={{
                    backgroundColor: "#E65C40",
                    boxShadow: "0 3px 0 0 #C54A32, 0 5px 10px rgba(230, 92, 64, 0.2)",
                  }}
                />
                <span className="relative flex items-center gap-2 select-none">
                  {t("home.newStory")}
                </span>
              </button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[440px] font-sans bg-card border-card-border">
              <DialogHeader>
                <DialogTitle
                  className="text-2xl"
                  style={{ fontFamily: "'Caveat', cursive", color: "#E65C40", fontSize: "1.75rem" }}
                >
                  {t("home.dialogTitle")}
                </DialogTitle>
                <DialogDescription className="text-foreground/70">
                  {t("home.dialogDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-semibold font-sans">
                    {t("home.titleLabel")}
                  </label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("home.titlePlaceholder")}
                    className="bg-background border-border focus-visible:ring-primary"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="firstLine" className="text-sm font-semibold font-sans">
                    {t("home.openingLineLabel")}{" "}
                    <span className="text-muted-foreground font-normal">
                      {t("home.openingLineOptional")}
                    </span>
                  </label>
                  <Textarea
                    id="firstLine"
                    value={firstLine}
                    onChange={(e) => setFirstLine(e.target.value)}
                    placeholder={t("home.openingLinePlaceholder")}
                    className="min-h-[90px] bg-background border-border focus-visible:ring-primary font-serif resize-none"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreate}
                  disabled={!title.trim() || createConversation.isPending}
                  className="w-full rounded-full font-bold text-base"
                  style={{
                    fontFamily: "'Nunito', sans-serif",
                    backgroundColor: "#E65C40",
                    color: "white",
                    boxShadow: "0 5px 0 0 #C54A32",
                  }}
                >
                  {createConversation.isPending ? t("home.opening") : t("home.beginWriting")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {/* Library section */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 relative z-10">
          {/* Section heading */}
          <div
            className="flex items-center justify-center gap-4 mb-8"
            style={{ color: "#E65C40" }}
          >
            <span className="text-xl opacity-60">〰️</span>
            <h2
              className="text-3xl sm:text-4xl font-bold"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              {isLoading
                ? t("home.loading")
                : conversations && conversations.length > 0
                ? t("home.yourStories")
                : t("home.startFirst")}
            </h2>
            <span className="text-xl opacity-60">〰️</span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl border-4 border-dashed p-6"
                  style={{ borderColor: "#FFB84D50", backgroundColor: "hsl(var(--card))" }}
                >
                  <div className="h-10 bg-muted rounded w-3/4 mb-4 mx-auto" />
                  <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
                </div>
              ))}
            </div>
          ) : conversations?.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-7xl mb-4">📖</div>
              <p
                className="text-2xl font-bold mb-3"
                style={{ fontFamily: "'Caveat', cursive", color: "#E65C40" }}
              >
                {t("home.libraryEmpty")}
              </p>
              <p
                className="font-semibold opacity-80 max-w-xs mx-auto text-muted-foreground"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                {t("home.libraryEmptyHint")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
              {conversations?.map((conv, idx) => {
                const palette = CARD_COLORS[idx % CARD_COLORS.length];
                const emoji = CARD_EMOJIS[idx % CARD_EMOJIS.length];
                return (
                  <Link key={conv.id} href={`/story/${conv.id}`}>
                    <div
                      className="group relative flex flex-col p-5 rounded-xl border-4 border-dashed cursor-pointer transition-transform duration-200 hover:scale-[1.03] hover:z-10"
                      style={{
                        borderColor: palette.border,
                        backgroundColor: "hsl(var(--card))",
                        boxShadow: `5px 5px 0px ${palette.shadow}`,
                      }}
                    >
                      {/* Bookmark ribbon */}
                      <div
                        className="absolute -top-2 right-5 w-7 h-11 shadow-sm z-20"
                        style={{
                          backgroundColor: palette.ribbon,
                          clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)",
                        }}
                      />

                      {/* Delete button */}
                      <button
                        className="absolute top-2 left-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(conv.id, e)}
                        aria-label={t("home.deleteStory")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="text-4xl mb-3 mt-1 text-center">{emoji}</div>

                      <h3
                        className="text-2xl font-bold text-center mb-3 flex-grow leading-tight"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          color: "hsl(var(--card-foreground))",
                        }}
                      >
                        {conv.title}
                      </h3>

                      <div
                        className="mt-auto pt-3 border-t-2 border-dotted flex items-center justify-between text-sm font-semibold"
                        style={{
                          borderColor: `${palette.border}60`,
                          fontFamily: "'Nunito', sans-serif",
                        }}
                      >
                        <span className="text-muted-foreground text-xs">
                          {format(new Date(conv.createdAt), "MMM d, yyyy")}
                        </span>
                        <span
                          className="transition-transform group-hover:translate-x-1 duration-200"
                          style={{ color: palette.border }}
                        >
                          {t("home.continue")}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>
      <DebugPanel open={debugPanelOpen} onClose={() => setDebugPanelOpen(false)} />
    </I18nProvider>
  );
}
