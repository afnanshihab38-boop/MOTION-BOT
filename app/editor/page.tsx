"use client";

/**
 * MOTION-BOT — Studio Editor Page
 * Supports loading saved projects via ?projectId={id}, templates via ?templateId={id},
 * or initializing a persistent default project.
 * Part of Phase 8.6: Project Persistence + Autosave.
 */

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { EditorShell } from "@/components/shell/editor-shell";
import { Button } from "@/components/ui/button";
import { getTemplateById, createProjectFromTemplate } from "@/services/template";
import { createSampleProject } from "@/services/project/sample-project";
import { getProjectRepository } from "@/services/storage/project-repository";
import { sanitizeUserError } from "@/lib/error-sanitizer";
import { Project } from "@/types/project";

function EditorContent() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("templateId");
  const projectId = searchParams.get("projectId") || searchParams.get("id");

  const [project, setProject] = React.useState<Project | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isCancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const repo = getProjectRepository();

        // 1. If explicit projectId provided in URL, attempt to load it from storage
        if (projectId) {
          const loadRes = await repo.getProject(projectId);
          if (loadRes.success && loadRes.data && !isCancelled) {
            setProject(loadRes.data);
            setIsLoading(false);
            return;
          } else if (!loadRes.success && loadRes.error) {
            // If explicit project requested was not found or corrupted
            console.warn(`[Editor] Project ${projectId} could not be loaded:`, loadRes.error);
          }
        }

        // 2. If templateId provided, instantiate from template and persist initial copy
        if (templateId) {
          const template = getTemplateById(templateId);
          if (template) {
            const templatedProject = createProjectFromTemplate(template);
            if (repo.saveProject) {
              await repo.saveProject(templatedProject);
            } else {
              await repo.createProject(templatedProject);
            }
            if (!isCancelled) {
              setProject(templatedProject);
              if (typeof window !== "undefined") {
                const url = new URL(window.location.href);
                url.searchParams.delete("templateId");
                url.searchParams.set("projectId", templatedProject.id);
                window.history.replaceState(null, "", url.toString());
              }
              setIsLoading(false);
              return;
            }
          }
        }

        // 3. Fallback: create fresh sample project and persist initial copy
        const sample = createSampleProject();
        if (repo.saveProject) {
          await repo.saveProject(sample);
        } else {
          await repo.createProject(sample);
        }
        if (!isCancelled) {
          setProject(sample);
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.set("projectId", sample.id);
            window.history.replaceState(null, "", url.toString());
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setLoadError(sanitizeUserError(err, "Failed to load or initialize project"));
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isCancelled = true;
    };
  }, [projectId, templateId]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#08090C] flex flex-col items-center justify-center gap-3 text-text-muted text-xs font-mono">
        <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <span>Loading studio project...</span>
      </div>
    );
  }

  if (loadError && !project) {
    return (
      <div className="h-screen w-screen bg-[#08090C] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-6 rounded-2xl bg-surface border border-rose-500/30 flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-text-main">Project Load Failed</h2>
            <p className="text-xs text-text-muted">{loadError}</p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.reload();
                }
              }}
              className="text-xs"
            >
              Retry
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/editor";
                }
              }}
              className="text-xs"
            >
              Create New Project
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen w-screen bg-[#08090C] flex flex-col items-center justify-center gap-3 text-text-muted text-xs font-mono">
        <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <span>Initializing workspace...</span>
      </div>
    );
  }

  return (
    <EditorShell
      key={project.id}
      projectTitle={project.name}
      initialProject={project}
    />
  );
}

export default function EditorPage() {
  return (
    <React.Suspense
      fallback={
        <div className="h-screen w-screen bg-[#08090C] flex items-center justify-center text-text-muted text-xs font-mono">
          Loading studio...
        </div>
      }
    >
      <EditorContent />
    </React.Suspense>
  );
}
