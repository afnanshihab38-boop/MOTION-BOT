"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Monitor,
  Smartphone,
  Square,
  Tv,
  Maximize2,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input, NumberInput } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Panel, PanelHeader, PanelContent } from "@/components/ui/panel";
import { Divider } from "@/components/ui/divider";
import { cn } from "@/lib/utils";

interface AspectPreset {
  id: string;
  name: string;
  ratio: string;
  width: number;
  height: number;
  description: string;
  icon: React.ReactNode;
}

const PRESETS: AspectPreset[] = [
  {
    id: "16-9",
    name: "Landscape Video",
    ratio: "16:9",
    width: 1920,
    height: 1080,
    description: "YouTube, Desktop Ads, Presentation displays",
    icon: <Monitor className="h-5 w-5" />,
  },
  {
    id: "9-16",
    name: "Stories & Reels",
    ratio: "9:16",
    width: 1080,
    height: 1920,
    description: "TikTok, Instagram Reels, YouTube Shorts",
    icon: <Smartphone className="h-5 w-5" />,
  },
  {
    id: "1-1",
    name: "Square Post",
    ratio: "1:1",
    width: 1080,
    height: 1080,
    description: "Instagram Feed, E-Commerce banners",
    icon: <Square className="h-5 w-5" />,
  },
  {
    id: "4-5",
    name: "Social Feed",
    ratio: "4:5",
    width: 1080,
    height: 1350,
    description: "Vertical Feed posts, Sponsored ads",
    icon: <Tv className="h-5 w-5" />,
  },
];

const BACKGROUND_COLORS = [
  { id: "dark", label: "Studio Dark", value: "#0B0C10" },
  { id: "black", label: "Pure Black", value: "#000000" },
  { id: "neutral", label: "Charcoal", value: "#1A1D27" },
  { id: "transparent", label: "Transparent", value: "transparent" },
];

export default function CreateProjectPage() {
  const router = useRouter();

  // Form states (Visual representation only in Phase 2.5)
  const [title, setTitle] = React.useState("Untitled Motion Comp");
  const [selectedPresetId, setSelectedPresetId] = React.useState("16-9");
  const [width, setWidth] = React.useState(1920);
  const [height, setHeight] = React.useState(1080);
  const [framerate, setFramerate] = React.useState("60");
  const [duration, setDuration] = React.useState(10);
  const [bgColor, setBgColor] = React.useState("#0B0C10");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Synchronize preset selection with dimension inputs
  const handleSelectPreset = (preset: AspectPreset) => {
    setSelectedPresetId(preset.id);
    setWidth(preset.width);
    setHeight(preset.height);
  };

  const handleCustomWidth = (newWidth: number) => {
    setWidth(newWidth);
    const matched = PRESETS.find((p) => p.width === newWidth && p.height === height);
    setSelectedPresetId(matched ? matched.id : "custom");
  };

  const handleCustomHeight = (newHeight: number) => {
    setHeight(newHeight);
    const matched = PRESETS.find((p) => p.width === width && p.height === newHeight);
    setSelectedPresetId(matched ? matched.id : "custom");
  };

  const fpsNumber = parseInt(framerate, 10) || 60;
  const totalFrames = duration * fpsNumber;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // UI-only phase: Route directly into the studio editor shell
    router.push("/editor");
  };

  return (
    <AppShell maxWidth="default">
      {/* Back Navigation Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-caption text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Projects</span>
        </Link>
      </div>

      <PageHeader
        title="Create New Project"
        description="Configure your motion composition format, canvas dimensions, frame rate, and duration."
      />

      <form onSubmit={handleCreate} className="mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Composition Title */}
            <Panel>
              <PanelHeader title="Project Details" />
              <PanelContent className="space-y-4">
                <div>
                  <label className="text-small font-medium text-text-primary block mb-1.5">
                    Composition Name
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Summer Release Ad 01"
                    required
                  />
                </div>
              </PanelContent>
            </Panel>

            {/* Aspect Ratio Presets */}
            <Panel>
              <PanelHeader
                title="Aspect Ratio"
                actions={
                  <span className="text-[11px] font-mono text-text-muted">
                    {selectedPresetId === "custom"
                      ? "Custom Ratio"
                      : PRESETS.find((p) => p.id === selectedPresetId)?.ratio}
                  </span>
                }
              />
              <PanelContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset)}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-sm border cursor-pointer select-none transition-all duration-fast",
                          isSelected
                            ? "border-accent bg-accent/10 shadow-subtle"
                            : "border-border bg-surface-elevated/40 hover:border-border-active hover:bg-surface-elevated/70"
                        )}
                      >
                        <div
                          className={cn(
                            "p-2 rounded-xs border shrink-0 mt-0.5",
                            isSelected
                              ? "border-accent/40 bg-accent/20 text-accent"
                              : "border-border bg-surface text-text-secondary"
                          )}
                        >
                          {preset.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-small font-semibold text-text-primary">
                              {preset.name}
                            </span>
                            <span className="text-caption font-mono text-accent">
                              {preset.ratio}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-text-muted mt-0.5">
                            {preset.width} × {preset.height}
                          </div>
                          <p className="text-[11px] text-text-secondary mt-1 leading-tight line-clamp-1">
                            {preset.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Divider />

                {/* Explicit Width & Height Inputs */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-medium text-text-muted mb-1 block">
                      Width (Pixels)
                    </label>
                    <NumberInput
                      value={width}
                      min={320}
                      max={7680}
                      unit="px"
                      onChange={(e) => handleCustomWidth(Number(e.target.value))}
                      onValueChange={handleCustomWidth}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-text-muted mb-1 block">
                      Height (Pixels)
                    </label>
                    <NumberInput
                      value={height}
                      min={320}
                      max={7680}
                      unit="px"
                      onChange={(e) => handleCustomHeight(Number(e.target.value))}
                      onValueChange={handleCustomHeight}
                    />
                  </div>
                </div>
              </PanelContent>
            </Panel>

            {/* Timeline Timing & Playback Parameters */}
            <Panel>
              <PanelHeader title="Timeline & Playback" />
              <PanelContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-small font-medium text-text-primary block mb-1.5">
                    Frame Rate (FPS)
                  </label>
                  <Select
                    value={framerate}
                    onValueChange={setFramerate}
                    options={[
                      { value: "24", label: "24 FPS (Cinematic Film)" },
                      { value: "30", label: "30 FPS (Standard Social)" },
                      { value: "60", label: "60 FPS (Fluid Motion Graphics)" },
                    ]}
                  />
                </div>

                <div>
                  <label className="text-small font-medium text-text-primary block mb-1.5">
                    Duration (Seconds)
                  </label>
                  <NumberInput
                    value={duration}
                    min={1}
                    max={300}
                    unit="sec"
                    onChange={(e) => setDuration(Number(e.target.value))}
                    onValueChange={setDuration}
                  />
                  <span className="text-[11px] font-mono text-text-muted mt-1 block">
                    Total: {totalFrames} frames @ {framerate} FPS
                  </span>
                </div>
              </PanelContent>
            </Panel>

            {/* Stage Canvas Background Color */}
            <Panel>
              <PanelHeader title="Canvas Background" />
              <PanelContent>
                <div className="flex flex-wrap items-center gap-2">
                  {BACKGROUND_COLORS.map((bg) => {
                    const isSelected = bgColor === bg.value;
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => setBgColor(bg.value)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-sm border text-caption transition-colors",
                          isSelected
                            ? "border-accent bg-accent/15 text-text-primary shadow-subtle"
                            : "border-border bg-surface-elevated/40 text-text-secondary hover:text-text-primary hover:border-border-active"
                        )}
                      >
                        <span
                          className="h-3 w-3 rounded-full border border-border shrink-0"
                          style={{
                            backgroundColor:
                              bg.value === "transparent" ? "#222" : bg.value,
                          }}
                        />
                        <span>{bg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </PanelContent>
            </Panel>
          </div>

          {/* Right Column: Live Aspect Ratio Canvas Preview (5 cols) */}
          <div className="lg:col-span-5 sticky top-20 space-y-4">
            <Panel>
              <PanelHeader
                title="Canvas Viewport Preview"
                icon={<Maximize2 className="h-3.5 w-3.5 text-accent" />}
              />
              <PanelContent className="p-6 flex flex-col items-center justify-center bg-background min-h-[360px]">
                {/* Visual Aspect Ratio Representation Box */}
                <div
                  className="relative transition-all duration-fast ease-standard border border-border-active shadow-floating flex flex-col items-center justify-center text-center p-4 overflow-hidden"
                  style={{
                    aspectRatio: `${width} / ${height}`,
                    maxWidth: width >= height ? "100%" : "220px",
                    maxHeight: width <= height ? "320px" : "220px",
                    backgroundColor: bgColor === "transparent" ? "#0F1117" : bgColor,
                  }}
                >
                  {/* Subtle Grid crosshairs inside preview */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#212531_1px,transparent_1px),linear-gradient(to_bottom,#212531_1px,transparent_1px)] bg-[size:16px_16px] opacity-20 pointer-events-none" />

                  {/* Safe margin lines */}
                  <div className="absolute inset-2 border border-dashed border-border-subtle/70 rounded-xs pointer-events-none" />

                  {/* Aspect Ratio Text Indicator */}
                  <div className="relative z-10 space-y-1 select-none">
                    <div className="text-small font-bold text-text-primary">
                      {width} × {height}
                    </div>
                    <div className="text-[11px] font-mono text-accent">
                      {(width / height).toFixed(2)} : 1
                    </div>
                  </div>
                </div>

                {/* Preview Metadata Card */}
                <div className="w-full mt-6 pt-4 border-t border-border-subtle grid grid-cols-2 gap-2 text-[11px] font-mono select-none">
                  <div className="flex justify-between text-text-muted">
                    <span>Frame Rate:</span>
                    <span className="text-text-primary">{framerate} FPS</span>
                  </div>
                  <div className="flex justify-between text-text-muted">
                    <span>Duration:</span>
                    <span className="text-text-primary">{duration}s</span>
                  </div>
                  <div className="flex justify-between text-text-muted">
                    <span>Total Frames:</span>
                    <span className="text-text-primary">{totalFrames}</span>
                  </div>
                  <div className="flex justify-between text-text-muted">
                    <span>Timecode:</span>
                    <span className="text-text-primary">
                      00:00:{duration.toString().padStart(2, "0")}:00
                    </span>
                  </div>
                </div>
              </PanelContent>
            </Panel>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link href="/projects">
                <Button variant="ghost" type="button">
                  Cancel
                </Button>
              </Link>
              <Button variant="primary" type="submit" isLoading={isSubmitting} className="gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Create & Open Studio</span>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </AppShell>
  );
}
