"use client";

/**
 * MOTION-BOT — Transform Properties Inspector Section
 * Handles X, Y, Width, Height, Rotation, Scale, and Layer Opacity.
 * Part of Phase 5.5: Properties / Inspector Panel.
 */

import * as React from "react";
import { Transform2D, ElementAppearance } from "@/types/element";
import { NumberInput } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Divider } from "@/components/ui/divider";

export interface TransformSectionProps {
  transform: Transform2D;
  appearance: ElementAppearance;
  locked?: boolean;
  onTransformChange: (updates: Partial<Transform2D>) => void;
  onOpacityChange: (opacity: number) => void;
}

export const TransformSection: React.FC<TransformSectionProps> = ({
  transform,
  appearance,
  locked = false,
  onTransformChange,
  onOpacityChange,
}) => {
  return (
    <div className="space-y-3.5" data-testid="transform-inspector-section">
      {/* Position X & Y */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-medium text-text-muted mb-1 block">
            Position X
          </label>
          <NumberInput
            value={Math.round(transform.x)}
            unit="px"
            disabled={locked}
            onValueChange={(val) => onTransformChange({ x: val })}
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-text-muted mb-1 block">
            Position Y
          </label>
          <NumberInput
            value={Math.round(transform.y)}
            unit="px"
            disabled={locked}
            onValueChange={(val) => onTransformChange({ y: val })}
          />
        </div>
      </div>

      {/* Dimensions Width & Height */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-medium text-text-muted mb-1 block">
            Width
          </label>
          <NumberInput
            value={Math.round(transform.width)}
            min={1}
            unit="px"
            disabled={locked}
            onValueChange={(val) => onTransformChange({ width: Math.max(1, val) })}
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-text-muted mb-1 block">
            Height
          </label>
          <NumberInput
            value={Math.round(transform.height)}
            min={1}
            unit="px"
            disabled={locked}
            onValueChange={(val) => onTransformChange({ height: Math.max(1, val) })}
          />
        </div>
      </div>

      {/* Rotation & Scale */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-medium text-text-muted mb-1 block">
            Rotation
          </label>
          <NumberInput
            value={Math.round(transform.rotation || 0)}
            unit="°"
            disabled={locked}
            onValueChange={(val) => onTransformChange({ rotation: val })}
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-text-muted mb-1 block">
            Scale
          </label>
          <NumberInput
            value={Math.round((transform.scaleX ?? 1) * 100)}
            unit="%"
            disabled={locked}
            onValueChange={(val) =>
              onTransformChange({
                scaleX: val / 100,
                scaleY: val / 100,
              })
            }
          />
        </div>
      </div>

      <Divider />

      {/* Layer Opacity */}
      <Slider
        label="Layer Opacity"
        value={Math.round((appearance.opacity ?? 1) * 100)}
        min={0}
        max={100}
        unit="%"
        showValue
        disabled={locked}
        onValueChange={(val) => onOpacityChange(val / 100)}
      />
    </div>
  );
};
