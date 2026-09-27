"use client";

/**
 * MOTION-BOT — Typography & Text Properties Inspector Section
 * Handles content, font family, font size, weight, alignment, line height, letter spacing, and color.
 * Part of Phase 5.5: Properties / Inspector Panel.
 */

import * as React from "react";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";
import { TextElement, ElementAppearance } from "@/types/element";
import { NumberInput, Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SUPPORTED_FONT_FAMILIES } from "@/services/editor/element-editing";

export interface TextSectionProps {
  element: TextElement;
  appearance: ElementAppearance;
  locked?: boolean;
  onUpdate: (updates: Partial<TextElement>) => void;
}

export const TextSection: React.FC<TextSectionProps> = ({
  element,
  appearance,
  locked = false,
  onUpdate,
}) => {
  const fontOptions = SUPPORTED_FONT_FAMILIES.map((font) => ({
    value: font,
    label: font.split(",")[0],
  }));

  const weightOptions = [
    { value: "300", label: "300 • Light" },
    { value: "400", label: "400 • Regular" },
    { value: "500", label: "500 • Medium" },
    { value: "600", label: "600 • Semi Bold" },
    { value: "700", label: "700 • Bold" },
    { value: "800", label: "800 • Extra Bold" },
    { value: "900", label: "900 • Black" },
  ];

  const currentColor =
    element.color ||
    (typeof appearance.fill === "string" ? appearance.fill : appearance.fill?.color || "#FFFFFF");

  return (
    <div className="space-y-3.5" data-testid="text-inspector-section">
      {/* Content */}
      <div>
        <label className="text-[11px] font-medium text-text-muted mb-1 block">
          Content
        </label>
        <Textarea
          value={element.text || ""}
          disabled={locked}
          rows={2}
          onChange={(e) => onUpdate({ text: e.target.value, content: e.target.value })}
          placeholder="Enter text..."
          className="font-sans text-[12px]"
        />
      </div>

      {/* Font Family */}
      <div>
        <label className="text-[11px] font-medium text-text-muted mb-1 block">
          Font
        </label>
        <Select
          options={fontOptions}
          value={element.fontFamily || "Inter, sans-serif"}
          disabled={locked}
          onValueChange={(val) => onUpdate({ fontFamily: val })}
        />
      </div>

      {/* Size & Weight */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-medium text-text-muted mb-1 block">
            Size
          </label>
          <NumberInput
            value={Math.round(element.fontSize || 32)}
            min={1}
            unit="px"
            disabled={locked}
            onValueChange={(val) => onUpdate({ fontSize: Math.max(1, val) })}
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-text-muted mb-1 block">
            Weight
          </label>
          <Select
            options={weightOptions}
            value={String(element.fontWeight || 600)}
            disabled={locked}
            onValueChange={(val) => onUpdate({ fontWeight: Number(val) })}
          />
        </div>
      </div>

      {/* Text Alignment */}
      <div>
        <label className="text-[11px] font-medium text-text-muted mb-1 block">
          Alignment
        </label>
        <SegmentedControl
          options={[
            { value: "left", icon: <AlignLeft className="h-3.5 w-3.5" /> },
            { value: "center", icon: <AlignCenter className="h-3.5 w-3.5" /> },
            { value: "right", icon: <AlignRight className="h-3.5 w-3.5" /> },
            { value: "justify", icon: <AlignJustify className="h-3.5 w-3.5" /> },
          ]}
          value={element.textAlign || "left"}
          disabled={locked}
          onValueChange={(val) =>
            onUpdate({
              textAlign: val as TextElement["textAlign"],
              alignment: val as TextElement["textAlign"],
            })
          }
        />
      </div>

      {/* Line Height & Letter Spacing */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-medium text-text-muted mb-1 block">
            Line Height
          </label>
          <NumberInput
            value={Math.round((element.lineHeight || 1.2) * 10) / 10}
            step={0.1}
            min={0.5}
            disabled={locked}
            onValueChange={(val) => onUpdate({ lineHeight: Math.max(0.5, val) })}
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-text-muted mb-1 block">
            Letter Spacing
          </label>
          <NumberInput
            value={element.letterSpacing || 0}
            step={0.5}
            unit="px"
            disabled={locked}
            onValueChange={(val) => onUpdate({ letterSpacing: val })}
          />
        </div>
      </div>

      {/* Text Color */}
      <div>
        <label className="text-[11px] font-medium text-text-muted mb-1 block">
          Color
        </label>
        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-xs border border-border shadow-xs shrink-0"
            style={{ backgroundColor: currentColor }}
          />
          <Input
            value={currentColor}
            disabled={locked}
            onChange={(e) => {
              const val = e.target.value;
              onUpdate({
                color: val,
                appearance: {
                  ...appearance,
                  fill: { type: "solid", color: val },
                },
              });
            }}
            className="font-mono text-[11px]"
          />
        </div>
      </div>
    </div>
  );
};
