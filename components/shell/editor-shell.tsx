"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  MousePointer,
  Hand,
  Type,
  Square,
  Image as ImageIcon,
  Sparkles,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Repeat,
  Download,
  Share2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Sliders,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader, PanelContent } from "@/components/ui/panel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { Divider } from "@/components/ui/divider";
import { NumberInput, Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

export interface EditorShellProps {
  projectTitle?: string;
}

interface TimelineTrack {
  id: string;
  name: string;
  type: "text" | "shape" | "media" | "mockup";
  color: string;
  startSec: number;
  durationSec: number;
  keyframes: number[];
  visible: boolean;
  locked: boolean;
}

const SAMPLE_TRACKS: TimelineTrack[] = [
  {
    id: "track-1",
    name: "Hero Headline Text",
    type: "text",
    color: "#6366F1",
    startSec: 0.5,
    durationSec: 4.5,
    keyframes: [0.5, 1.2, 4.5],
    visible: true,
    locked: false,
  },
  {
    id: "track-2",
    name: "Callout Badge Shape",
    type: "shape",
    color: "#10B981",
    startSec: 1.0,
    durationSec: 3.5,
    keyframes: [1.0, 1.8, 4.0],
    visible: true,
    locked: false,
  },
  {
    id: "track-3",
    name: "Device Frame Mockup",
    type: "mockup",
    color: "#F59E0B",
    startSec: 0.0,
    durationSec: 5.0,
    keyframes: [0.0, 0.8, 3.2, 5.0],
    visible: true,
    locked: false,
  },
  {
    id: "track-4",
    name: "Background Backdrop",
    type: "media",
    color: "#64748B",
    startSec: 0.0,
    durationSec: 5.0,
    keyframes: [0.0, 5.0],
    visible: true,
    locked: true,
  },
];

export function EditorShell({
  projectTitle = "SaaS Product Launch Reel",
}: EditorShellProps) {
  // Visual states only for Phase 2.6
  const [activeTool, setActiveTool] = React.useState<string>("select");
  const [zoomLevel, setZoomLevel] = React.useState<string>("fit");
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [selectedLayerId, setSelectedLayerId] = React.useState<string>("track-1");
  const [activeInspectorTab, setActiveInspectorTab] = React.useState("transform");
  const [tracks, setTracks] = React.useState<TimelineTrack[]>(SAMPLE_TRACKS);
  const [currentTime, setCurrentTime] = React.useState(1.4); // Current visual playhead time in seconds

  const totalDurationSec = 5.0;
  const playheadPercent = (currentTime / totalDurationSec) * 100;

  const toggleTrackVisibility = (id: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, visible: !t.visible } : t))
    );
  };

  const toggleTrackLock = (id: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, locked: !t.locked } : t))
    );
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-background text-text-primary select-none font-sans">
      {/* 1. TOP TOOLBAR */}
      <header className="h-11 w-full border-b border-border bg-surface px-3 flex items-center justify-between shrink-0 z-30">
        {/* Left: Navigation, Title & Save Status */}
        <div className="flex items-center gap-3">
          <Link href="/projects">
            <Button variant="ghost" size="icon-sm" aria-label="Return to projects">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="flex items-center gap-2.5">
            <span className="text-small font-semibold text-text-primary tracking-tight">
              {projectTitle}
            </span>
            <span className="rounded-xs bg-surface-elevated border border-border px-1.5 py-0.2 text-[10px] font-mono text-text-muted">
              1920 × 1080 • 60 FPS
            </span>
          </div>

          <Divider orientation="vertical" className="h-4 hidden sm:inline-block" />

          {/* Visual Save Status Placeholder */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Saved</span>
          </div>
        </div>

        {/* Center: Stage Viewport & History Controls */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center">
            <Tooltip content="Undo" shortcut="⌘Z">
              <Button variant="ghost" size="icon-sm" disabled aria-label="Undo">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </Tooltip>
            <Tooltip content="Redo" shortcut="⇧⌘Z">
              <Button variant="ghost" size="icon-sm" disabled aria-label="Redo">
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
            </Tooltip>
          </div>

          <Divider orientation="vertical" className="h-4" />

          {/* Viewport Zoom Selector */}
          <SegmentedControl
            size="sm"
            value={zoomLevel}
            onValueChange={setZoomLevel}
            options={[
              { value: "50%", label: "50%" },
              { value: "fit", label: "Fit" },
              { value: "100%", label: "100%" },
            ]}
          />
        </div>

        {/* Right: Preview & Export Placeholders */}
        <div className="flex items-center gap-2">
          <Tooltip content="Preview resolution">
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xs border border-border bg-surface-elevated text-[11px] font-mono text-text-secondary">
              <span>Full (1080p)</span>
            </div>
          </Tooltip>

          <Button variant="ghost" size="sm" className="gap-1.5 text-text-secondary hidden sm:inline-flex">
            <Share2 className="h-3.5 w-3.5" />
            <span>Share</span>
          </Button>

          <Button variant="primary" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </Button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE (Tool Panel + Canvas Area + Properties Panel) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT TOOL PANEL */}
        <aside
          aria-label="Tool Panel"
          className="w-11 border-r border-border bg-surface flex flex-col items-center py-2.5 gap-1.5 shrink-0 z-20"
        >
          <Tooltip content="Select Tool" shortcut="V" side="right">
            <Button
              variant={activeTool === "select" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setActiveTool("select")}
              aria-label="Select Tool"
              className={cn(activeTool === "select" && "border-accent text-accent")}
            >
              <MousePointer className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Tooltip content="Text Tool" shortcut="T" side="right">
            <Button
              variant={activeTool === "text" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setActiveTool("text")}
              aria-label="Text Tool"
              className={cn(activeTool === "text" && "border-accent text-accent")}
            >
              <Type className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Tooltip content="Shape Tool" shortcut="R" side="right">
            <Button
              variant={activeTool === "shape" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setActiveTool("shape")}
              aria-label="Shape Tool"
              className={cn(activeTool === "shape" && "border-accent text-accent")}
            >
              <Square className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Tooltip content="Image / Asset Tool" shortcut="I" side="right">
            <Button
              variant={activeTool === "image" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setActiveTool("image")}
              aria-label="Image Tool"
              className={cn(activeTool === "image" && "border-accent text-accent")}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Tooltip content="Logo & Brand Tool" shortcut="L" side="right">
            <Button
              variant={activeTool === "logo" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setActiveTool("logo")}
              aria-label="Logo Tool"
              className={cn(activeTool === "logo" && "border-accent text-accent")}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Divider className="w-6 my-1" />

          <Tooltip content="Hand / Canvas Pan" shortcut="H" side="right">
            <Button
              variant={activeTool === "hand" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setActiveTool("hand")}
              aria-label="Hand Tool"
              className={cn(activeTool === "hand" && "border-accent text-accent")}
            >
              <Hand className="h-4 w-4" />
            </Button>
          </Tooltip>
        </aside>

        {/* CANVAS AREA */}
        <main
          aria-label="Canvas Workspace"
          className="flex-1 bg-[#08090C] relative flex items-center justify-center p-6 overflow-hidden select-none"
        >
          {/* Subtle Grid pattern in workspace background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#171A23_1px,transparent_1px),linear-gradient(to_bottom,#171A23_1px,transparent_1px)] bg-[size:28px_28px] opacity-40 pointer-events-none" />

          {/* Canvas Stage Viewport Frame (16:9 1920 × 1080 representation) */}
          <div
            className="relative aspect-video w-full max-w-4xl rounded-xs border border-border-active bg-surface shadow-floating flex flex-col items-center justify-center overflow-hidden transition-all duration-normal"
            style={{
              transform: zoomLevel === "50%" ? "scale(0.85)" : zoomLevel === "100%" ? "scale(1.15)" : "scale(1)",
            }}
          >
            {/* Viewport Header Bar */}
            <div className="absolute top-2 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-text-muted pointer-events-none z-10">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span>CANVAS STAGE • 1920 × 1080 (16:9)</span>
              </div>
              <span>X: 0.0 | Y: 0.0</span>
            </div>

            {/* Title Safe Margins Guide Line */}
            <div className="absolute inset-8 border border-dashed border-border-subtle/50 rounded-xs pointer-events-none" />

            {/* Visual Stage Content Elements (Visual representation only) */}
            <div className="relative z-10 text-center space-y-3 p-6 max-w-md">
              <div className="inline-block rounded-xs bg-accent/20 border border-accent/40 text-accent px-2 py-0.5 text-[11px] font-mono tracking-wide uppercase">
                Scene 01 • Stagger Text Reveal
              </div>
              <h2 className="text-h1 font-bold tracking-tight text-text-primary">
                Next-Gen Analytics Engine
              </h2>
              <p className="text-caption text-text-secondary leading-relaxed">
                Transform natural language descriptions into frame-accurate motion design.
              </p>
            </div>

            {/* Selected Layer Bounding Box Indicator */}
            <div className="absolute inset-12 border border-selection-border border-dashed rounded-xs pointer-events-none">
              <span className="absolute -top-1.5 -left-1.5 h-3 w-3 rounded-xs border border-selection-border bg-surface" />
              <span className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-xs border border-selection-border bg-surface" />
              <span className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-xs border border-selection-border bg-surface" />
              <span className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-xs border border-selection-border bg-surface" />
            </div>

            {/* Bottom Status Tag */}
            <div className="absolute bottom-2 left-3 text-[10px] font-mono text-text-muted">
              Active Layer: {tracks.find((t) => t.id === selectedLayerId)?.name}
            </div>
          </div>

          {/* Floating Canvas Zoom Overlay in Bottom Right */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-xs border border-border bg-surface/90 px-2 py-1 text-[11px] font-mono text-text-secondary shadow-subtle backdrop-blur-sm">
            <ZoomIn className="h-3 w-3 text-text-muted" />
            <span>{zoomLevel === "fit" ? "Fit (100%)" : zoomLevel}</span>
          </div>
        </main>

        {/* RIGHT PROPERTIES PANEL */}
        <aside
          aria-label="Properties Panel"
          className="w-72 border-l border-border bg-surface flex flex-col shrink-0 z-20"
        >
          <Panel bordered={false} className="h-full">
            <PanelHeader
              title="Properties"
              icon={<Sliders className="h-3.5 w-3.5 text-accent" />}
              actions={
                <span className="text-[10px] font-mono text-text-muted">
                  Layer #1
                </span>
              }
            />

            <PanelContent className="p-0 overflow-y-auto">
              <Tabs
                value={activeInspectorTab}
                onValueChange={setActiveInspectorTab}
                className="w-full"
              >
                <TabsList className="w-full px-2 border-b border-border bg-surface-elevated/20">
                  <TabsTrigger value="transform" className="flex-1 text-[11px]">
                    Transform
                  </TabsTrigger>
                  <TabsTrigger value="appearance" className="flex-1 text-[11px]">
                    Appearance
                  </TabsTrigger>
                  <TabsTrigger value="typography" className="flex-1 text-[11px]">
                    Type
                  </TabsTrigger>
                  <TabsTrigger value="animation" className="flex-1 text-[11px]">
                    Motion
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Transform Properties */}
                <TabsContent value="transform" className="p-3 space-y-3.5 m-0">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-text-muted mb-1 block">
                        Position X
                      </label>
                      <NumberInput value={960} unit="px" readOnly />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-text-muted mb-1 block">
                        Position Y
                      </label>
                      <NumberInput value={540} unit="px" readOnly />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-text-muted mb-1 block">
                        Width
                      </label>
                      <NumberInput value={640} unit="px" readOnly />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-text-muted mb-1 block">
                        Height
                      </label>
                      <NumberInput value={220} unit="px" readOnly />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-text-muted mb-1 block">
                        Rotation
                      </label>
                      <NumberInput value={0} unit="°" readOnly />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-text-muted mb-1 block">
                        Scale
                      </label>
                      <NumberInput value={100} unit="%" readOnly />
                    </div>
                  </div>

                  <Divider />

                  <Slider
                    label="Layer Opacity"
                    defaultValue={100}
                    unit="%"
                    showValue
                  />
                </TabsContent>

                {/* Tab 2: Appearance Properties */}
                <TabsContent value="appearance" className="p-3 space-y-3.5 m-0">
                  <div>
                    <label className="text-[11px] font-medium text-text-muted mb-1 block">
                      Fill Color
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-xs border border-border bg-[#F8FAFC]" />
                      <Input value="#F8FAFC" readOnly className="font-mono text-xs" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-text-muted mb-1 block">
                      Blend Mode
                    </label>
                    <Select
                      defaultValue="normal"
                      options={[
                        { value: "normal", label: "Normal" },
                        { value: "multiply", label: "Multiply" },
                        { value: "screen", label: "Screen" },
                        { value: "overlay", label: "Overlay" },
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-text-muted mb-1 block">
                        Border Radius
                      </label>
                      <NumberInput value={4} unit="px" readOnly />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-text-muted mb-1 block">
                        Stroke Width
                      </label>
                      <NumberInput value={1} unit="px" readOnly />
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 3: Typography Properties */}
                <TabsContent value="typography" className="p-3 space-y-3.5 m-0">
                  <div>
                    <label className="text-[11px] font-medium text-text-muted mb-1 block">
                      Font Family
                    </label>
                    <Select
                      defaultValue="inter"
                      options={[
                        { value: "inter", label: "Inter (System Sans)" },
                        { value: "mono", label: "JetBrains Mono" },
                        { value: "serif", label: "Editorial Serif" },
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-text-muted mb-1 block">
                        Font Size
                      </label>
                      <NumberInput value={32} unit="px" readOnly />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-text-muted mb-1 block">
                        Line Height
                      </label>
                      <NumberInput value={36} unit="px" readOnly />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-text-muted mb-1 block">
                      Font Weight
                    </label>
                    <Select
                      defaultValue="700"
                      options={[
                        { value: "400", label: "Regular (400)" },
                        { value: "600", label: "SemiBold (600)" },
                        { value: "700", label: "Bold (700)" },
                      ]}
                    />
                  </div>
                </TabsContent>

                {/* Tab 4: Animation Properties */}
                <TabsContent value="animation" className="p-3 space-y-3.5 m-0">
                  <div>
                    <label className="text-[11px] font-medium text-text-muted mb-1 block">
                      Easing Curve
                    </label>
                    <Select
                      defaultValue="cubic"
                      options={[
                        { value: "cubic", label: "Cubic Bezier (0.2, 0, 0, 1)" },
                        { value: "spring", label: "Physics Spring (Mass 1, Damp 15)" },
                        { value: "ease-out", label: "Ease Out (Deceleration)" },
                        { value: "linear", label: "Linear (Mechanical)" },
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-text-muted mb-1 block">
                        Entrance Preset
                      </label>
                      <Select
                        defaultValue="fade-up"
                        options={[
                          { value: "fade-up", label: "Fade Up" },
                          { value: "scale", label: "Scale Zoom" },
                          { value: "blur", label: "Blur Reveal" },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-text-muted mb-1 block">
                        Stagger Delay
                      </label>
                      <NumberInput value={80} unit="ms" readOnly />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </PanelContent>
          </Panel>
        </aside>
      </div>

      {/* 3. BOTTOM TIMELINE DOCK */}
      <footer
        aria-label="Timeline Dock"
        className="h-56 border-t border-border bg-surface flex flex-col shrink-0 z-30 select-none"
      >
        {/* Timeline Transport Header */}
        <div className="h-9 border-b border-border bg-surface-elevated/40 px-3 flex items-center justify-between shrink-0">
          {/* Transport playback controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCurrentTime(0)}
              aria-label="Jump to start"
            >
              <SkipBack className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="text-accent"
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCurrentTime(totalDurationSec)}
              aria-label="Jump to end"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </Button>

            <Divider orientation="vertical" className="h-4 mx-1" />

            {/* Timecode & Framerate Readout */}
            <div className="flex items-center gap-1 font-mono text-xs">
              <span className="text-text-primary font-semibold">
                00:00:0{currentTime.toFixed(1).replace(".", ":")}
              </span>
              <span className="text-text-muted">/ 00:00:05:00</span>
              <span className="rounded-xs bg-surface border border-border px-1 text-[10px] text-text-muted ml-1">
                60 FPS
              </span>
            </div>
          </div>

          {/* Timeline Zoom & Snapping controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-caption text-text-muted">
              <span className="text-[11px] font-mono">Zoom</span>
              <div className="w-20">
                <Slider defaultValue={60} min={10} max={100} />
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Toggle loop playback"
              className="text-text-muted hover:text-text-primary"
            >
              <Repeat className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Timeline Body (Layer Headers on Left, Track Grid on Right) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Layer Headers Column (w-60) */}
          <div className="w-60 border-r border-border bg-surface flex flex-col shrink-0 overflow-y-auto">
            {/* Layers Column Header */}
            <div className="h-6 border-b border-border-subtle px-3 flex items-center justify-between text-[10px] font-mono text-text-muted uppercase">
              <span>Layers ({tracks.length})</span>
              <span>Controls</span>
            </div>

            {/* Layer Rows */}
            <div className="flex-1 divide-y divide-border-subtle">
              {tracks.map((track) => {
                const isSelected = track.id === selectedLayerId;
                return (
                  <div
                    key={track.id}
                    onClick={() => setSelectedLayerId(track.id)}
                    className={cn(
                      "h-8 px-2 flex items-center justify-between text-xs cursor-pointer transition-colors duration-fast",
                      isSelected
                        ? "bg-surface-elevated text-text-primary"
                        : "hover:bg-surface-elevated/40 text-text-secondary"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: track.color }}
                      />
                      <span className="truncate text-[11px] font-medium">
                        {track.name}
                      </span>
                    </div>

                    <div
                      className="flex items-center gap-1 text-text-muted shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => toggleTrackVisibility(track.id)}
                        className="p-1 hover:text-text-primary transition-colors"
                        aria-label="Toggle visibility"
                      >
                        {track.visible ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3 text-text-muted/40" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleTrackLock(track.id)}
                        className="p-1 hover:text-text-primary transition-colors"
                        aria-label="Toggle lock"
                      >
                        {track.locked ? (
                          <Lock className="h-3 w-3 text-warning" />
                        ) : (
                          <Unlock className="h-3 w-3 text-text-muted/40" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Track Area & Time Ruler */}
          <div className="flex-1 flex flex-col overflow-x-auto relative bg-[#090A0F]">
            {/* Time Ruler (Seconds markers: 0s, 1s, 2s, 3s, 4s, 5s) */}
            <div className="h-6 border-b border-border bg-surface-elevated/60 flex items-center relative text-[10px] font-mono text-text-muted select-none">
              {[0, 1, 2, 3, 4, 5].map((sec) => (
                <div
                  key={sec}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${(sec / totalDurationSec) * 100}%` }}
                >
                  <span className="-translate-x-1/2">{sec}s</span>
                  <span className="h-1.5 w-px bg-border" />
                </div>
              ))}
            </div>

            {/* Track Rows Canvas */}
            <div className="flex-1 relative divide-y divide-border-subtle/50">
              {tracks.map((track) => {
                const trackStartPct = (track.startSec / totalDurationSec) * 100;
                const trackWidthPct = (track.durationSec / totalDurationSec) * 100;
                const isSelected = track.id === selectedLayerId;

                return (
                  <div
                    key={track.id}
                    className={cn(
                      "h-8 relative flex items-center",
                      isSelected && "bg-surface-elevated/20"
                    )}
                  >
                    {/* Track Span Bar */}
                    <div
                      className="absolute h-5 rounded-xs border transition-all duration-instant flex items-center px-1"
                      style={{
                        left: `${trackStartPct}%`,
                        width: `${trackWidthPct}%`,
                        backgroundColor: `${track.color}22`,
                        borderColor: track.color,
                      }}
                    >
                      {/* Keyframe Visual Markers (◆ diamonds) */}
                      {track.keyframes.map((kf, i) => {
                        const kfOffsetPct =
                          ((kf - track.startSec) / track.durationSec) * 100;
                        return (
                          <span
                            key={i}
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-[10px] leading-none"
                            style={{
                              left: `${kfOffsetPct}%`,
                              color: track.color,
                            }}
                            title={`Keyframe at ${kf}s`}
                          >
                            ◆
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Vertical Playhead Scrubber Visual */}
              <div
                className="absolute top-0 bottom-0 z-30 pointer-events-none transition-all duration-instant flex flex-col items-center"
                style={{ left: `${playheadPercent}%` }}
              >
                {/* Playhead Flag / Head */}
                <div className="h-3 w-3 rounded-xs bg-accent text-accent-foreground flex items-center justify-center -translate-y-2 shadow-subtle">
                  <span className="h-1 w-1 rounded-full bg-white" />
                </div>
                {/* Playhead Scrubber Line */}
                <div className="w-px flex-1 bg-accent" />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
