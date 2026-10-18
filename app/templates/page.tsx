"use client";

/**
 * MOTION-BOT — Commercial Motion Templates Gallery
 * Browse, preview, and instantiate real motion design templates into editable studio projects.
 * Part of Phase 8.5: Templates → Editable Projects.
 */

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Layers,
  ArrowRight,
  Clock,
  Film,
  Eye,
  X,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Panel } from "@/components/ui/panel";
import { BUILTIN_TEMPLATES } from "@/services/template";
import { deserializeProject } from "@/services/project/project-serializer";
import { Template } from "@/types/template";

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState("all");
  const [previewTemplate, setPreviewTemplate] = React.useState<Template | null>(null);

  const filtered = BUILTIN_TEMPLATES.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat =
      activeCategory === "all" ||
      t.category.toLowerCase().replace(/\s+/g, "-") === activeCategory;

    return matchesSearch && matchesCat;
  });

  // Extract parsed project info for preview modal
  const previewProject = React.useMemo(() => {
    if (!previewTemplate) return null;
    const res = deserializeProject(previewTemplate.projectSnapshot);
    return res.success ? res.project : null;
  }, [previewTemplate]);

  return (
    <AppShell>
      <PageHeader
        title="Motion Templates"
        description="Production-ready kinetic typography, product showcases, social ads, and logo reveals ready to edit."
      />

      {/* Filter and Search Bar */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs
          value={activeCategory}
          onValueChange={setActiveCategory}
          className="w-auto"
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="product-showcase">Product Ads</TabsTrigger>
            <TabsTrigger value="kinetic-typography">Typography</TabsTrigger>
            <TabsTrigger value="logo-reveal">Logo Reveals</TabsTrigger>
            <TabsTrigger value="social-ad">Social Stories</TabsTrigger>
            <TabsTrigger value="testimonial">Testimonials</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="w-full sm:w-64">
          <SearchInput
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
          />
        </div>
      </div>

      {/* Templates Grid */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-lg bg-surface/30">
            <Film className="h-8 w-8 text-text-muted mb-2" />
            <h3 className="text-sm font-semibold text-text-primary">No templates found</h3>
            <p className="text-xs text-text-muted mt-1 max-w-sm">
              No motion templates match &quot;{searchQuery}&quot; in category &quot;{activeCategory}&quot;. Try resetting your search or filters.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          filtered.map((template) => {
          const durationSeconds = (template.durationFrames / template.fps).toFixed(1);

          return (
            <Panel
              key={template.id}
              className="group hover:border-border-active transition-all duration-200 flex flex-col justify-between overflow-hidden bg-surface shadow-subtle hover:shadow-floating"
            >
              <div>
                {/* Visual Thumbnail & Aspect Preview Box */}
                <div
                  onClick={() => setPreviewTemplate(template)}
                  className="relative aspect-video w-full bg-[#08090C] border-b border-border-subtle flex items-center justify-center overflow-hidden cursor-pointer group-hover:brightness-105 transition-all"
                >
                  {/* Thumbnail Image */}
                  {template.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={template.thumbnailUrl}
                      alt={template.title}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-surface border border-border text-text-muted group-hover:text-accent transition-colors">
                      <Layers className="h-6 w-6" />
                    </div>
                  )}

                  {/* Gradient Vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

                  {/* Category Badge */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-xs bg-surface/90 backdrop-blur-xs border border-border px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                    <Sparkles className="h-2.5 w-2.5 text-accent" />
                    <span className="capitalize">{template.category.replace(/-/g, " ")}</span>
                  </div>

                  {/* Duration & Aspect Ratio Badges */}
                  <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="rounded-xs bg-surface/90 backdrop-blur-xs border border-border px-1.5 py-0.5 text-[10px] font-mono text-text-secondary flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5 text-text-muted" />
                      <span>{durationSeconds}s</span>
                    </span>
                    <span className="rounded-xs bg-surface/90 backdrop-blur-xs border border-border px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
                      {template.aspectRatio}
                    </span>
                  </div>

                  {/* Quick Preview Hover Trigger */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/40 backdrop-blur-2xs">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewTemplate(template);
                      }}
                      className="gap-1.5 text-xs shadow-floating"
                    >
                      <Eye className="h-3.5 w-3.5 text-accent" />
                      <span>Quick Preview</span>
                    </Button>
                  </div>
                </div>

                {/* Text Info */}
                <div className="p-4 space-y-1.5">
                  <h3 className="text-small font-semibold text-text-primary leading-tight">
                    {template.title}
                  </h3>
                  <p className="text-caption text-text-secondary leading-snug line-clamp-2">
                    {template.description}
                  </p>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-4 pt-0 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewTemplate(template)}
                  className="px-2.5 text-xs text-text-secondary hover:text-text-primary"
                >
                  Details
                </Button>
                <Link
                  href={`/editor?templateId=${template.id}`}
                  className="flex-1 block"
                >
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-between gap-2"
                  >
                    <span>Use Template</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </Panel>
          );
        })
      )}
      </div>

      {/* Quick Preview Modal */}
      {previewTemplate && previewProject && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="w-full max-w-2xl bg-surface border border-border rounded-xs shadow-floating overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 border-b border-border bg-surface-elevated/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-xs bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
                  <Film className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-small font-semibold text-text-primary">
                    {previewTemplate.title}
                  </h3>
                  <span className="text-[11px] text-text-muted capitalize">
                    {previewTemplate.category.replace(/-/g, " ")} • {previewTemplate.aspectRatio} ({previewTemplate.width} × {previewTemplate.height})
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="text-text-muted hover:text-text-primary p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <p className="text-body text-text-secondary text-xs leading-relaxed">
                {previewTemplate.description}
              </p>

              {/* Template Specs */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-xs bg-surface-elevated/40 border border-border">
                  <span className="text-[10px] text-text-muted uppercase block">Duration</span>
                  <span className="text-xs font-mono font-semibold text-text-primary">
                    {(previewTemplate.durationFrames / previewTemplate.fps).toFixed(1)}s
                  </span>
                </div>
                <div className="p-2 rounded-xs bg-surface-elevated/40 border border-border">
                  <span className="text-[10px] text-text-muted uppercase block">Scenes</span>
                  <span className="text-xs font-mono font-semibold text-text-primary">
                    {previewProject.scenes.length}
                  </span>
                </div>
                <div className="p-2 rounded-xs bg-surface-elevated/40 border border-border">
                  <span className="text-[10px] text-text-muted uppercase block">Frame Rate</span>
                  <span className="text-xs font-mono font-semibold text-text-primary">
                    {previewTemplate.fps} fps
                  </span>
                </div>
                <div className="p-2 rounded-xs bg-surface-elevated/40 border border-border">
                  <span className="text-[10px] text-text-muted uppercase block">Aspect Ratio</span>
                  <span className="text-xs font-mono font-semibold text-text-primary">
                    {previewTemplate.aspectRatio}
                  </span>
                </div>
              </div>

              {/* Scenes Breakdown */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Scenes & Elements Breakdown
                </span>
                <div className="space-y-1.5">
                  {previewProject.scenes.map((scene, idx) => (
                    <div
                      key={scene.id}
                      className="p-2.5 rounded-xs bg-surface-elevated/20 border border-border flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded-xs bg-surface border border-border text-[10px] font-mono font-semibold text-accent">
                          Scene {idx + 1}
                        </span>
                        <span className="text-xs font-medium text-text-primary">
                          {scene.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-text-muted font-mono">
                        <span>{scene.elements.length} layers</span>
                        <span>•</span>
                        <span>{scene.duration.toFixed(1)}s</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Placeholders */}
              {previewTemplate.placeholders.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Customizable Variables
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {previewTemplate.placeholders.map((ph) => (
                      <div
                        key={ph.id}
                        className="p-2 rounded-xs bg-surface-elevated/30 border border-border text-xs flex items-center justify-between"
                      >
                        <span className="text-text-secondary truncate">{ph.name}</span>
                        <span className="text-[10px] font-mono text-accent uppercase">
                          {ph.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-surface-elevated/20 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewTemplate(null)}
              >
                Close
              </Button>

              <Link href={`/editor?templateId=${previewTemplate.id}`}>
                <Button variant="primary" size="sm" className="gap-2">
                  <span>Open in Studio Editor</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
