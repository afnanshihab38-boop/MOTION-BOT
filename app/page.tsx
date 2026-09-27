"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Sliders,
  Layers,
  Film,
  Download,
  CheckCircle2,
  MousePointer,
  Play,
  Type,
  Square,
  Smartphone,
  Monitor,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader, PanelContent } from "@/components/ui/panel";

export default function LandingPage() {
  return (
    <AppShell maxWidth="default">
      {/* 1. HERO SECTION */}
      <section className="pt-8 pb-16 md:pt-16 md:pb-24 flex flex-col items-center text-center">
        {/* Release / Phase Status Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-secondary mb-6 shadow-subtle">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="font-semibold text-text-primary">MOTION-BOT</span>
          <span className="text-text-muted">• AI Motion Design Studio</span>
        </div>

        {/* Primary Core Positioning Headline */}
        <h1 className="text-display font-bold tracking-tight text-text-primary max-w-4xl sm:text-5xl md:text-6xl leading-[1.1]">
          Describe an ad.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-text-primary via-indigo-200 to-indigo-400">
            Get an editable motion design.
          </span>
        </h1>

        {/* Secondary Subtitle */}
        <p className="mt-6 text-body text-text-secondary max-w-2xl text-base sm:text-lg leading-relaxed">
          MOTION-BOT turns natural language advertising briefs into fully keyframed, production-grade motion graphics. Keep total creative control over every layer, easing curve, and second of animation.
        </p>

        {/* Primary & Secondary Call to Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/projects/new">
            <Button variant="primary" size="lg" className="gap-2">
              <span>Start Creating</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/editor">
            <Button variant="secondary" size="lg" className="gap-2">
              <Film className="h-4 w-4" />
              <span>Open Studio Editor</span>
            </Button>
          </Link>
          <Link href="/templates">
            <Button variant="ghost" size="lg">
              <span>Browse Templates</span>
            </Button>
          </Link>
        </div>

        {/* Value Proposition Micro-Bullets */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-caption text-text-muted">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
            <span>100% Editable Keyframes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
            <span>No Locked Video Blackboxes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
            <span>Deterministic 60 FPS Export</span>
          </div>
        </div>
      </section>

      {/* 2. VISUAL PRODUCT PREVIEW (Studio Interface Concept) */}
      <section className="pb-20">
        <div className="relative rounded-md border border-border bg-surface shadow-floating overflow-hidden">
          {/* Concept Header Notice */}
          <div className="h-8 border-b border-border bg-surface-elevated/80 px-3 flex items-center justify-between text-[11px] font-mono select-none">
            <div className="flex items-center gap-2">
              <span className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-border" />
                <span className="h-2.5 w-2.5 rounded-full bg-border" />
                <span className="h-2.5 w-2.5 rounded-full bg-border" />
              </span>
              <span className="text-text-muted">MOTION-BOT Studio Concept Preview</span>
            </div>
            <div className="flex items-center gap-2 text-text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Interactive Interface Architecture</span>
            </div>
          </div>

          {/* Studio Chrome Mockup */}
          <div className="flex flex-col bg-background">
            {/* Toolbar */}
            <div className="h-9 border-b border-border bg-surface px-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-text-primary">
                  SaaS_Product_Reveal_16x9.motionbot
                </span>
                <span className="rounded-xs bg-surface-elevated border border-border px-1.5 py-0.2 text-[10px] font-mono text-text-muted">
                  1920 × 1080 • 60 FPS
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-xs bg-accent/15 border border-accent/30 text-accent px-2 py-0.5 text-[11px] font-medium">
                  AI Planned • 4 Scenes
                </span>
                <Link href="/editor">
                  <Button variant="primary" size="sm" className="h-6 text-xs px-2.5">
                    Launch Studio
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stage + Docks Area */}
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[360px] bg-background">
              {/* Left Tool Dock Mockup */}
              <div className="hidden md:flex md:col-span-1 border-r border-border bg-surface flex-col items-center py-3 gap-2">
                <div className="p-1.5 rounded-xs bg-surface-elevated border border-border text-accent">
                  <MousePointer className="h-3.5 w-3.5" />
                </div>
                <div className="p-1.5 rounded-xs text-text-muted hover:text-text-primary">
                  <Type className="h-3.5 w-3.5" />
                </div>
                <div className="p-1.5 rounded-xs text-text-muted hover:text-text-primary">
                  <Square className="h-3.5 w-3.5" />
                </div>
                <div className="p-1.5 rounded-xs text-text-muted hover:text-text-primary">
                  <Film className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Stage Viewport */}
              <div className="col-span-12 md:col-span-8 p-6 flex items-center justify-center bg-background relative overflow-hidden">
                <div className="relative aspect-video w-full max-w-xl rounded-xs border border-border-active bg-surface shadow-elevated flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                  {/* Subtle Grid Pattern Overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#212531_1px,transparent_1px),linear-gradient(to_bottom,#212531_1px,transparent_1px)] bg-[size:24px_24px] opacity-20 pointer-events-none" />

                  {/* Mock Composition Layer Elements */}
                  <div className="relative z-10 space-y-3">
                    <span className="inline-block rounded-xs bg-accent text-accent-foreground px-2 py-0.5 text-[10px] font-mono tracking-wider uppercase">
                      Scene 01 • Stagger Text Reveal
                    </span>
                    <h2 className="text-h2 font-bold tracking-tight text-text-primary">
                      Next-Gen Analytics Engine
                    </h2>
                    <p className="text-caption text-text-secondary max-w-sm mx-auto">
                      Animated Kinetic Reveal • Spring Easing (0.2, 0, 0, 1)
                    </p>
                  </div>

                  {/* Bounding Box Indicator */}
                  <div className="absolute inset-4 border border-selection-border border-dashed rounded-xs pointer-events-none" />
                </div>
              </div>

              {/* Right Inspector Mockup */}
              <div className="hidden md:flex md:col-span-3 border-l border-border bg-surface p-3 flex-col text-caption space-y-3">
                <div className="font-semibold text-text-primary pb-2 border-b border-border-subtle">
                  Layer Inspector
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-text-secondary">
                    <span>Position</span>
                    <span className="font-mono text-text-primary">X: 960 | Y: 540</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Scale</span>
                    <span className="font-mono text-text-primary">100%</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Opacity</span>
                    <span className="font-mono text-text-primary">100%</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Easing</span>
                    <span className="font-mono text-accent">cubic-bezier</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Timeline Strip Mockup */}
            <div className="h-28 border-t border-border bg-surface p-2 flex flex-col justify-between">
              {/* Timeline Header */}
              <div className="flex items-center justify-between text-caption px-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-xs bg-surface-elevated border border-border flex items-center justify-center text-accent">
                    <Play className="h-2.5 w-2.5 fill-current" />
                  </div>
                  <span className="font-mono text-xs text-text-primary">00:01:14:00</span>
                  <span className="font-mono text-xs text-text-muted">/ 00:05:00:00</span>
                </div>
                <span className="text-[11px] font-mono text-text-muted">Timeline Ruler (4 Tracks)</span>
              </div>

              {/* Track Rows */}
              <div className="space-y-1 px-2 pt-1 font-mono text-[10px]">
                <div className="h-4 bg-surface-elevated rounded-xs border border-border-subtle flex items-center px-2 justify-between">
                  <span className="text-text-secondary">Track 1: Headline Text</span>
                  <span className="text-accent">◆──────◆───────◆</span>
                </div>
                <div className="h-4 bg-surface-elevated rounded-xs border border-border-subtle flex items-center px-2 justify-between">
                  <span className="text-text-secondary">Track 2: Shape Container</span>
                  <span className="text-accent">───◆──────────◆</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PRODUCT EXPLANATION WORKFLOW */}
      <section className="py-16 border-t border-border-subtle">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-label text-accent">How It Works</span>
          <h2 className="text-h1 font-semibold tracking-tight text-text-primary mt-2">
            From Natural Language to Production Motion
          </h2>
          <p className="mt-2 text-body text-text-secondary">
            Describe what you need, let the motion planner generate a structured scene graph, and customize every parameter with precision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Step 1: Describe */}
          <Panel className="relative">
            <PanelHeader
              title="1. Describe"
              icon={<span className="font-mono text-accent">01</span>}
            />
            <PanelContent className="space-y-2">
              <h3 className="text-small font-semibold text-text-primary">
                Campaign Brief
              </h3>
              <p className="text-caption text-text-secondary leading-normal">
                Type your message, call-to-action, product highlight, and target audience in plain language.
              </p>
            </PanelContent>
          </Panel>

          {/* Step 2: AI Designs */}
          <Panel className="relative">
            <PanelHeader
              title="2. AI Designs"
              icon={<Sparkles className="h-3.5 w-3.5 text-accent" />}
            />
            <PanelContent className="space-y-2">
              <h3 className="text-small font-semibold text-text-primary">
                Scene Graph Planning
              </h3>
              <p className="text-caption text-text-secondary leading-normal">
                The multimodal planner structures visual scenes, typography pacing, transitions, and color themes.
              </p>
            </PanelContent>
          </Panel>

          {/* Step 3: Edit */}
          <Panel className="relative">
            <PanelHeader
              title="3. Edit"
              icon={<Sliders className="h-3.5 w-3.5 text-accent" />}
            />
            <PanelContent className="space-y-2">
              <h3 className="text-small font-semibold text-text-primary">
                Visual Studio Control
              </h3>
              <p className="text-caption text-text-secondary leading-normal">
                Adjust positions, tweak timing curves, swap out fonts, and manipulate keyframes in the timeline.
              </p>
            </PanelContent>
          </Panel>

          {/* Step 4: Export */}
          <Panel className="relative">
            <PanelHeader
              title="4. Export"
              icon={<Download className="h-3.5 w-3.5 text-accent" />}
            />
            <PanelContent className="space-y-2">
              <h3 className="text-small font-semibold text-text-primary">
                Render & Share
              </h3>
              <p className="text-caption text-text-secondary leading-normal">
                Export crisp MP4, WebM with alpha channels, or animated GIFs optimized for ads and social feeds.
              </p>
            </PanelContent>
          </Panel>
        </div>
      </section>

      {/* 4. CORE FEATURES ARCHITECTURE */}
      <section className="py-16 border-t border-border-subtle">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-label text-accent">Studio Capabilities</span>
          <h2 className="text-h1 font-semibold tracking-tight text-text-primary mt-2">
            Engineered for Creative Professionals
          </h2>
          <p className="mt-2 text-body text-text-secondary">
            Built as a genuine motion design workstation rather than a restricted video generator.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Panel>
            <PanelHeader
              title="Creative Scene Graph"
              icon={<Sparkles className="h-4 w-4 text-accent" />}
            />
            <PanelContent className="space-y-1.5">
              <h3 className="text-small font-semibold text-text-primary">
                Structured AI Direction
              </h3>
              <p className="text-caption text-text-secondary leading-normal">
                Direct Gemini and multimodal LLMs to output valid, versioned JSON scene graphs that bind seamlessly into the timeline.
              </p>
            </PanelContent>
          </Panel>

          <Panel>
            <PanelHeader
              title="Deterministic Motion Engine"
              icon={<Zap className="h-4 w-4 text-accent" />}
            />
            <PanelContent className="space-y-1.5">
              <h3 className="text-small font-semibold text-text-primary">
                Mathematical Animation Core
              </h3>
              <p className="text-caption text-text-secondary leading-normal">
                Pure mathematical interpolation core with cubic-bezier, spring physics, and frame-rate independent timing.
              </p>
            </PanelContent>
          </Panel>

          <Panel>
            <PanelHeader
              title="Multi-Aspect Ratio Canvas"
              icon={<Monitor className="h-4 w-4 text-accent" />}
            />
            <PanelContent className="space-y-1.5">
              <h3 className="text-small font-semibold text-text-primary">
                Ad Format Versatility
              </h3>
              <p className="text-caption text-text-secondary leading-normal">
                Easily adapt compositions between 16:9 Landscape, 9:16 Vertical Stories, 1:1 Feeds, and 4:5 Portrait posts.
              </p>
            </PanelContent>
          </Panel>

          <Panel>
            <PanelHeader
              title="Device Mockup Frames"
              icon={<Smartphone className="h-4 w-4 text-accent" />}
            />
            <PanelContent className="space-y-1.5">
              <h3 className="text-small font-semibold text-text-primary">
                App & UI Showcases
              </h3>
              <p className="text-caption text-text-secondary leading-normal">
                Embed your product screenshots and video recordings into high-fidelity animated smartphone and browser shells.
              </p>
            </PanelContent>
          </Panel>

          <Panel>
            <PanelHeader
              title="Kinetic Typography"
              icon={<Type className="h-4 w-4 text-accent" />}
            />
            <PanelContent className="space-y-1.5">
              <h3 className="text-small font-semibold text-text-primary">
                Advertising Text Staggers
              </h3>
              <p className="text-caption text-text-secondary leading-normal">
                Granular character, word, and line stagger effects with customizable blur reveals and kinetic transforms.
              </p>
            </PanelContent>
          </Panel>

          <Panel>
            <PanelHeader
              title="Client-Side & Cloud Render"
              icon={<Download className="h-4 w-4 text-accent" />}
            />
            <PanelContent className="space-y-1.5">
              <h3 className="text-small font-semibold text-text-primary">
                High-Fidelity Codec Output
              </h3>
              <p className="text-caption text-text-secondary leading-normal">
                Frame-accurate rendering via WebCodecs with support for MP4, WebM transparent layers, and high-FPS sequences.
              </p>
            </PanelContent>
          </Panel>
        </div>
      </section>

      {/* 5. BOTTOM CTA SECTION */}
      <section className="py-16 border-t border-border-subtle">
        <div className="rounded-md border border-border bg-surface p-8 sm:p-12 text-center max-w-3xl mx-auto shadow-elevated">
          <span className="text-label text-accent">Ready to Create?</span>
          <h2 className="text-h1 font-bold tracking-tight text-text-primary mt-2">
            Build Your First Motion Design
          </h2>
          <p className="mt-3 text-body text-text-secondary max-w-xl mx-auto">
            Experience the foundation of MOTION-BOT. Start with a blank canvas or browse pre-built advertising templates.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/projects/new">
              <Button variant="primary" size="lg" className="gap-2">
                <span>Create New Project</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/editor">
              <Button variant="secondary" size="lg" className="gap-2">
                <Layers className="h-4 w-4" />
                <span>Open Studio</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
