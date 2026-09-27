"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, Layers, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Panel } from "@/components/ui/panel";

interface TemplateItem {
  id: string;
  title: string;
  category: string;
  aspectRatio: string;
  description: string;
}

const TEMPLATES: TemplateItem[] = [
  {
    id: "temp-1",
    title: "Minimal Kinetic Typography",
    category: "Typography",
    aspectRatio: "16:9",
    description: "High-impact bold typography transitions with staggered word reveals.",
  },
  {
    id: "temp-2",
    title: "SaaS App Feature Showcase",
    category: "Product Ads",
    aspectRatio: "16:9",
    description: "Floating device mockups with smooth UI zoom and callout animations.",
  },
  {
    id: "temp-3",
    title: "E-Commerce Flash Sale Story",
    category: "Social",
    aspectRatio: "9:16",
    description: "Vertical product highlight with animated discount badges and swipe CTA.",
  },
  {
    id: "temp-4",
    title: "Clean Corporate Logo Ident",
    category: "Logo Reveals",
    aspectRatio: "16:9",
    description: "Sleek geometric line reveal with subtle lighting and soft spring settle.",
  },
  {
    id: "temp-5",
    title: "Instagram Reel Testimonial",
    category: "Social",
    aspectRatio: "9:16",
    description: "Dynamic quote card transition with avatar mask reveal and audio waveform.",
  },
  {
    id: "temp-6",
    title: "Tech Spec Comparison",
    category: "Product Ads",
    aspectRatio: "1:1",
    description: "Square grid layout with animated metric counters and feature checkmarks.",
  },
];

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState("all");

  const filtered = TEMPLATES.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat =
      activeCategory === "all" ||
      t.category.toLowerCase().replace(/\s+/g, "-") === activeCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <AppShell>
      <PageHeader
        title="Templates"
        description="Browse pre-designed motion compositions and advertisement layout structures."
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
            <TabsTrigger value="product-ads">Product Ads</TabsTrigger>
            <TabsTrigger value="typography">Typography</TabsTrigger>
            <TabsTrigger value="logo-reveals">Logo Reveals</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
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
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((template) => (
          <Panel
            key={template.id}
            className="group hover:border-border-active transition-colors duration-fast flex flex-col justify-between"
          >
            <div>
              {/* Preview Box Placeholder */}
              <div className="relative aspect-video w-full bg-surface-elevated/70 border-b border-border-subtle flex items-center justify-center p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-surface border border-border text-text-muted group-hover:text-accent transition-colors">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="absolute top-2 left-2 flex items-center gap-1 rounded-xs bg-surface/90 border border-border px-1.5 py-0.2 text-[10px] font-medium text-text-secondary">
                  <Sparkles className="h-2.5 w-2.5 text-accent" />
                  <span>{template.category}</span>
                </div>
                <span className="absolute bottom-2 right-2 rounded-xs bg-surface border border-border px-1.5 py-0.2 text-[10px] font-mono text-text-muted">
                  {template.aspectRatio}
                </span>
              </div>

              {/* Text Info */}
              <div className="p-3.5 space-y-1">
                <h3 className="text-small font-semibold text-text-primary leading-tight">
                  {template.title}
                </h3>
                <p className="text-caption text-text-secondary leading-snug line-clamp-2">
                  {template.description}
                </p>
              </div>
            </div>

            {/* Action Footer */}
            <div className="p-3.5 pt-0">
              <Link href="/editor" className="w-full block">
                <Button variant="secondary" size="sm" className="w-full justify-between">
                  <span>Use Template</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Panel>
        ))}
      </div>
    </AppShell>
  );
}
