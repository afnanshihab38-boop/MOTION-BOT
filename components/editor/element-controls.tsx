"use client";

/**
 * MOTION-BOT — Element Transformation & Hierarchy Controls
 * Contextual floating action toolbar for manipulating active element selection.
 * Part of Phase 5.1: Editor Architecture & Canvas Foundation.
 */

import * as React from "react";
import { Lock, Unlock, Copy, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { MotionElement } from "@/types/element";

export interface ElementControlsProps {
  selectedElements: MotionElement[];
  onLockToggle?: (elementId: string, locked: boolean) => void;
  onDuplicate?: (elementId: string) => void;
  onDelete?: (elementId: string) => void;
  onBringForward?: (elementId: string) => void;
  onSendBackward?: (elementId: string) => void;
}

export const ElementControls: React.FC<ElementControlsProps> = ({
  selectedElements,
  onLockToggle,
  onDuplicate,
  onDelete,
  onBringForward,
  onSendBackward,
}) => {
  if (selectedElements.length === 0) return null;

  const primaryElement = selectedElements[0];
  const isLocked = primaryElement.locked;

  return (
    <div className="flex items-center gap-1 p-1 bg-surface/95 border border-border rounded-xs shadow-floating backdrop-blur-sm z-30">
      <span className="text-[10px] font-mono text-text-muted px-1.5 truncate max-w-[120px]">
        {primaryElement.name}
      </span>

      <div className="h-3 w-[1px] bg-border mx-0.5" />

      {/* Lock / Unlock */}
      <Tooltip content={isLocked ? "Unlock Element" : "Lock Element"}>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-text-secondary hover:text-text-primary"
          onClick={() => onLockToggle?.(primaryElement.id, !isLocked)}
        >
          {isLocked ? <Lock className="h-3 w-3 text-warning" /> : <Unlock className="h-3 w-3" />}
        </Button>
      </Tooltip>

      {/* Duplicate */}
      <Tooltip content="Duplicate (Ctrl+D)">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-text-secondary hover:text-text-primary"
          onClick={() => onDuplicate?.(primaryElement.id)}
          disabled={isLocked}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </Tooltip>

      {/* Bring Forward */}
      <Tooltip content="Bring Forward">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-text-secondary hover:text-text-primary"
          onClick={() => onBringForward?.(primaryElement.id)}
          disabled={isLocked}
        >
          <ArrowUp className="h-3 w-3" />
        </Button>
      </Tooltip>

      {/* Send Backward */}
      <Tooltip content="Send Backward">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-text-secondary hover:text-text-primary"
          onClick={() => onSendBackward?.(primaryElement.id)}
          disabled={isLocked}
        >
          <ArrowDown className="h-3 w-3" />
        </Button>
      </Tooltip>

      <div className="h-3 w-[1px] bg-border mx-0.5" />

      {/* Delete */}
      <Tooltip content="Delete (Delete / Backspace)">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
          onClick={() => onDelete?.(primaryElement.id)}
          disabled={isLocked}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </Tooltip>
    </div>
  );
};
