"use client";

/**
 * MOTION-BOT — Image Asset Properties Inspector Section
 * Handles image source reference, object-fit scaling, and corner radius.
 * Part of Phase 5.5: Properties / Inspector Panel.
 */

import * as React from "react";
import { ImageElement } from "@/types/element";
import { NumberInput, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export interface ImageSectionProps {
  element: ImageElement;
  locked?: boolean;
  onUpdate: (updates: Partial<ImageElement>) => void;
}

export const ImageSection: React.FC<ImageSectionProps> = ({
  element,
  locked = false,
  onUpdate,
}) => {
  return (
    <div className="space-y-3.5" data-testid="image-inspector-section">
      {/* Source URL */}
      <div>
        <label className="text-[11px] font-medium text-text-muted mb-1 block">
          Source Reference / URL
        </label>
        <Input
          value={element.src || ""}
          disabled={locked}
          onChange={(e) => onUpdate({ src: e.target.value })}
          placeholder="https://... or /asset.png"
          className="font-mono text-[11px]"
        />
      </div>

      {/* Object Fit */}
      <div>
        <label className="text-[11px] font-medium text-text-muted mb-1 block">
          Object Fit
        </label>
        <Select
          options={[
            { value: "cover", label: "Cover (Fill frame)" },
            { value: "contain", label: "Contain (Fit inside)" },
            { value: "fill", label: "Stretch to fill" },
          ]}
          value={element.objectFit || "cover"}
          disabled={locked}
          onValueChange={(val) =>
            onUpdate({ objectFit: val as ImageElement["objectFit"] })
          }
        />
      </div>

      {/* Corner Radius */}
      <div>
        <label className="text-[11px] font-medium text-text-muted mb-1 block">
          Corner Radius
        </label>
        <NumberInput
          value={
            typeof element.cornerRadius === "number"
              ? element.cornerRadius
              : element.cornerRadius?.[0] || 0
          }
          min={0}
          unit="px"
          disabled={locked}
          onValueChange={(val) => onUpdate({ cornerRadius: Math.max(0, val) })}
        />
      </div>
    </div>
  );
};
