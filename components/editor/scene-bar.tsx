"use client";

/**
 * MOTION-BOT — Scene Management Bar
 * Comprehensive horizontal scene tabs for creating, selecting, renaming,
 * duplicating, reordering, and deleting scenes.
 * Part of Phase 8.4: Scenes + Asset Management.
 */

import * as React from "react";
import {
  Film,
  Plus,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Check,
} from "lucide-react";
import { Project } from "@/types/project";
import { Scene } from "@/types/scene";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SceneBarProps {
  project: Project;
  activeSceneId: string;
  onSelectScene: (sceneId: string) => void;
  onCreateScene: () => void;
  onRenameScene: (sceneId: string, newName: string) => void;
  onDuplicateScene: (sceneId: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onReorderScenes?: (fromIndex: number, toIndex: number) => void;
  className?: string;
}

export const SceneBar: React.FC<SceneBarProps> = ({
  project,
  activeSceneId,
  onSelectScene,
  onCreateScene,
  onRenameScene,
  onDuplicateScene,
  onDeleteScene,
  onReorderScenes,
  className,
}) => {
  const [editingSceneId, setEditingSceneId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState<string>("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (editingSceneId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingSceneId]);

  const handleStartRename = (scene: Scene, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSceneId(scene.id);
    setEditingName(scene.name);
  };

  const handleCommitRename = (sceneId: string) => {
    if (editingName.trim()) {
      onRenameScene(sceneId, editingName.trim());
    }
    setEditingSceneId(null);
  };

  const handleKeyDown = (sceneId: string, e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCommitRename(sceneId);
    } else if (e.key === "Escape") {
      setEditingSceneId(null);
    }
  };

  return (
    <div
      aria-label="Scene Navigation Bar"
      className={cn(
        "h-8 w-full border-b border-border bg-[#0B0D13] px-2.5 flex items-center justify-between shrink-0 select-none overflow-x-auto scrollbar-none",
        className
      )}
    >
      {/* Left: Scenes Overview & Tab List */}
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold text-text-muted shrink-0 mr-1">
          <Film className="h-3 w-3 text-accent" />
          <span className="uppercase tracking-wider text-[10px]">Scenes</span>
          <span className="ml-0.5 px-1 py-0.2 rounded-xs bg-surface-elevated text-[9px] font-mono text-text-secondary">
            {project.scenes.length}
          </span>
        </div>

        {/* Scene Tabs List */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          {project.scenes.map((scene, index) => {
            const isActive = scene.id === activeSceneId;
            const isEditing = editingSceneId === scene.id;
            const canDelete = project.scenes.length > 1;

            return (
              <div
                key={scene.id}
                onClick={() => onSelectScene(scene.id)}
                className={cn(
                  "group relative h-6.5 px-2 rounded-xs flex items-center gap-1.5 text-xs transition-all cursor-pointer border",
                  isActive
                    ? "bg-surface-elevated border-accent/40 text-text-primary shadow-xs"
                    : "bg-surface/50 border-border/60 text-text-secondary hover:bg-surface hover:text-text-primary"
                )}
                title={`Scene: ${scene.name} (${scene.duration.toFixed(1)}s)`}
              >
                {/* Scene Index */}
                <span
                  className={cn(
                    "text-[10px] font-mono px-1 rounded-xs",
                    isActive
                      ? "bg-accent/20 text-accent font-semibold"
                      : "text-text-muted group-hover:text-text-secondary"
                  )}
                >
                  {index + 1}
                </span>

                {/* Scene Name / Inline Rename Input */}
                {isEditing ? (
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleCommitRename(scene.id)}
                      onKeyDown={(e) => handleKeyDown(scene.id, e)}
                      className="h-5 w-24 px-1 text-xs bg-background border border-accent rounded-xs text-text-primary font-medium focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCommitRename(scene.id)}
                      className="h-4 w-4 text-accent hover:text-accent-hover"
                      title="Save name"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <span
                    onDoubleClick={(e) => handleStartRename(scene, e)}
                    className="font-medium truncate max-w-[120px] text-[11px]"
                  >
                    {scene.name}
                  </span>
                )}

                {/* Duration Badge */}
                <span className="text-[10px] font-mono text-text-muted">
                  {scene.duration.toFixed(1)}s
                </span>

                {/* Hover / Active Actions */}
                <div
                  className={cn(
                    "items-center gap-0.5 ml-0.5",
                    isActive ? "flex" : "hidden group-hover:flex"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Reorder Left */}
                  {index > 0 && onReorderScenes && (
                    <button
                      type="button"
                      onClick={() => onReorderScenes(index, index - 1)}
                      className="h-4 w-4 flex items-center justify-center text-text-muted hover:text-text-primary"
                      title="Move Scene Left"
                    >
                      <ChevronLeft className="h-2.5 w-2.5" />
                    </button>
                  )}

                  {/* Reorder Right */}
                  {index < project.scenes.length - 1 && onReorderScenes && (
                    <button
                      type="button"
                      onClick={() => onReorderScenes(index, index + 1)}
                      className="h-4 w-4 flex items-center justify-center text-text-muted hover:text-text-primary"
                      title="Move Scene Right"
                    >
                      <ChevronRight className="h-2.5 w-2.5" />
                    </button>
                  )}

                  {/* Rename Button */}
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={(e) => handleStartRename(scene, e)}
                      className="h-4 w-4 flex items-center justify-center text-text-muted hover:text-text-primary"
                      title="Rename Scene"
                    >
                      <Edit2 className="h-2.5 w-2.5" />
                    </button>
                  )}

                  {/* Duplicate Button */}
                  <button
                    type="button"
                    onClick={() => onDuplicateScene(scene.id)}
                    className="h-4 w-4 flex items-center justify-center text-text-muted hover:text-accent"
                    title="Duplicate Scene"
                  >
                    <Copy className="h-2.5 w-2.5" />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    disabled={!canDelete}
                    onClick={() => canDelete && onDeleteScene(scene.id)}
                    className={cn(
                      "h-4 w-4 flex items-center justify-center transition-colors",
                      canDelete
                        ? "text-text-muted hover:text-rose-400"
                        : "text-text-muted/30 cursor-not-allowed"
                    )}
                    title={
                      canDelete
                        ? "Delete Scene"
                        : "Cannot delete the only scene in project"
                    }
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: + Add Scene Button */}
      <div className="flex items-center shrink-0 ml-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCreateScene}
          className="h-6 px-2 text-[11px] gap-1 text-accent hover:text-accent-hover hover:bg-accent/10 border border-dashed border-accent/30"
          title="Add New Scene"
        >
          <Plus className="h-3 w-3" />
          <span>New Scene</span>
        </Button>
      </div>
    </div>
  );
};
