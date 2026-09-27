"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Video,
  MoreVertical,
  Clock,
  Sparkles,
  LayoutGrid,
  List,
  FolderOpen,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

/**
 * DEVELOPMENT-ONLY MOCK DATA
 * Explicitly isolated for visual development. Real persistence is scheduled for Phase 4.
 */
interface DevSampleProject {
  id: string;
  title: string;
  aspectRatio: string;
  resolution: string;
  fps: number;
  duration: string;
  updatedAt: string;
  category: string;
}

const DEV_SAMPLE_PROJECTS: DevSampleProject[] = [
  {
    id: "dev-mock-1",
    title: "SaaS Product Launch Reel",
    aspectRatio: "16:9",
    resolution: "1920 × 1080",
    fps: 60,
    duration: "15s (900f)",
    updatedAt: "2 hours ago",
    category: "Product",
  },
  {
    id: "dev-mock-2",
    title: "Mobile App Kinetic Promo",
    aspectRatio: "9:16",
    resolution: "1080 × 1920",
    fps: 60,
    duration: "30s (1800f)",
    updatedAt: "Yesterday",
    category: "Social",
  },
  {
    id: "dev-mock-3",
    title: "Brand Logo Reveal 3D",
    aspectRatio: "1:1",
    resolution: "1080 × 1080",
    fps: 30,
    duration: "6s (180f)",
    updatedAt: "3 days ago",
    category: "Branding",
  },
];

export default function DashboardProjectsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("all");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = React.useState("recent");
  // Toggle to demonstrate both visual populated state and empty state
  const [showMockData, setShowMockData] = React.useState(true);

  const activeProjects = showMockData ? DEV_SAMPLE_PROJECTS : [];

  const filteredProjects = activeProjects.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "recent") return matchesSearch;
    if (activeTab === "starred") return false;
    return matchesSearch;
  });

  return (
    <AppShell>
      {/* Dashboard Welcome & Header */}
      <PageHeader
        title="Dashboard"
        description="Studio workspace overview, recent motion compositions, and quick templates."
        badge={
          <span className="rounded-xs border border-border bg-surface-elevated px-2 py-0.5 text-[11px] font-mono text-text-muted">
            Workspace: Personal Studio
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/projects/new">
              <Button variant="primary" size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                <span>New Project</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Templates Entry Banner */}
      <div className="mt-6 rounded-sm border border-border bg-surface-elevated/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xs bg-accent/15 border border-accent/30 text-accent shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-small font-semibold text-text-primary leading-tight">
              Start with an Advertising Template
            </div>
            <div className="text-caption text-text-secondary mt-0.5">
              Jumpstart your campaign with pre-animated kinetic typography, product showcases, or social stories.
            </div>
          </div>
        </div>
        <Link href="/templates" className="shrink-0">
          <Button variant="secondary" size="sm" className="gap-1.5 w-full sm:w-auto">
            <span>Explore Templates</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Search, Filter, Sort & View Bar */}
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">All Projects</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="starred">Starred</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-full sm:w-56">
            <SearchInput
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
            />
          </div>

          <div className="w-36">
            <Select
              value={sortBy}
              onValueChange={setSortBy}
              options={[
                { value: "recent", label: "Recently Edited" },
                { value: "name", label: "Project Name" },
                { value: "created", label: "Date Created" },
              ]}
            />
          </div>

          {/* Grid / List View Switcher */}
          <div className="flex items-center rounded-xs border border-border bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1 rounded-xs transition-colors",
                viewMode === "grid"
                  ? "bg-surface-elevated text-text-primary"
                  : "text-text-muted hover:text-text-primary"
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1 rounded-xs transition-colors",
                viewMode === "list"
                  ? "bg-surface-elevated text-text-primary"
                  : "text-text-muted hover:text-text-primary"
              )}
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Dev Mock Data Toggle */}
          <button
            type="button"
            onClick={() => setShowMockData(!showMockData)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-xs border border-border-subtle bg-surface text-[11px] font-mono text-text-muted hover:text-text-primary hover:border-border transition-colors"
            title="Toggle between development sample data and empty state"
          >
            <SlidersHorizontal className="h-3 w-3" />
            <span>{showMockData ? "Hide Mock Data" : "Show Mock Data"}</span>
          </button>
        </div>
      </div>

      {/* Projects Area: Grid / List / Empty State */}
      <div className="mt-6">
        {filteredProjects.length > 0 ? (
          viewMode === "grid" ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <Panel
                  key={project.id}
                  className="group hover:border-border-active transition-colors duration-fast"
                >
                  {/* Thumbnail Stage Preview Area */}
                  <div className="relative aspect-video w-full bg-surface-elevated/70 border-b border-border-subtle flex items-center justify-center p-4 overflow-hidden">
                    <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-surface border border-border text-text-muted group-hover:text-accent transition-colors">
                      <Video className="h-5 w-5" />
                    </div>
                    <div className="absolute top-2 left-2 flex items-center gap-1 rounded-xs bg-surface/90 border border-border px-1.5 py-0.2 text-[10px] font-medium text-text-secondary">
                      <span>{project.category}</span>
                    </div>
                    <span className="absolute bottom-2 right-2 rounded-xs bg-surface border border-border px-1.5 py-0.2 text-[10px] font-mono text-text-muted">
                      {project.aspectRatio} • {project.duration}
                    </span>
                  </div>

                  {/* Project Info & Open Action */}
                  <div className="p-3 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <h3 className="text-small font-semibold text-text-primary truncate">
                        {project.title}
                      </h3>
                      <div className="flex items-center gap-2 text-caption text-text-muted mt-0.5 font-mono text-[11px]">
                        <span>{project.resolution}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1 font-sans">
                          <Clock className="h-3 w-3" />
                          <span>{project.updatedAt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Link href="/editor">
                        <Button variant="secondary" size="sm">
                          Open
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon-sm" aria-label="Project actions">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="rounded-sm border border-border bg-surface divide-y divide-border-subtle overflow-hidden">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-surface-elevated/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-surface-elevated border border-border text-text-muted shrink-0">
                      <Video className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-small font-semibold text-text-primary truncate">
                        {project.title}
                      </div>
                      <div className="flex items-center gap-2 text-caption text-text-muted font-mono text-[11px] mt-0.5">
                        <span>{project.aspectRatio}</span>
                        <span>•</span>
                        <span>{project.resolution}</span>
                        <span>•</span>
                        <span>{project.fps} FPS</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-caption text-text-muted hidden sm:inline">
                      {project.updatedAt}
                    </span>
                    <Link href="/editor">
                      <Button variant="secondary" size="sm">
                        Open
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon-sm" aria-label="Project actions">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Empty State */
          <EmptyState
            icon={<FolderOpen className="h-5 w-5" />}
            title="No projects in this workspace"
            description={
              searchQuery
                ? `No compositions matched "${searchQuery}". Clear your search query or create a new project.`
                : "Describe an advertising concept or start with a custom blank composition to begin."
            }
            action={
              <Link href="/projects/new">
                <Button variant="primary" size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Project</span>
                </Button>
              </Link>
            }
          />
        )}
      </div>
    </AppShell>
  );
}
