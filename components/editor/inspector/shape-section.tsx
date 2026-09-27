"use client";

/**
 * MOTION-BOT — Shape Geometry & Fill/Stroke Inspector Section
 * Handles shape type, fill color, stroke width, stroke color, corner radius, points count.
 * Part of Phase 5.5: Properties / Inspector Panel.
 */

import * as React from "react";
import { ShapeElement, ElementAppearance, ShapeKind } from "@/types/element";
import { NumberInput, Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select } from "@/components/ui/select";
import { Divider } from "@/components/ui/divider";
import { SUPPORTED_SHAPE_KINDS } from "@/services/editor/element-editing";

export interface ShapeSectionProps {
  element: ShapeElement;
  appearance: ElementAppearance;
  locked?: boolean;
  onUpdate: (updates: Partial<ShapeElement>) => void;
}

export const ShapeSection: React.FC<ShapeSectionProps> = ({
  element,
  appearance,
  locked = false,
  onUpdate,
}) => {
  const shapeOptions = SUPPORTED_SHAPE_KINDS.map((kind) => ({
    value: kind,
    label: kind.charAt(0).toUpperCase() + kind.slice(1),
  }));

  const currentFillColor =
    typeof appearance.fill === "string"
      ? appearance.fill
      : appearance.fill?.color || "#4F46E5";

  return (
    <div className="space-y-3.5" data-testid="shape-inspector-section">
      {/* Shape Kind */}
      <div>
        <label className="text-[11px] font-medium text-text-muted mb-1 block">
          Shape Type
        </label>
        <Select
          options={shapeOptions}
          value={element.shapeKind || "rectangle"}
          disabled={locked}
          onValueChange={(val) => onUpdate({ shapeKind: val as ShapeKind })}
        />
      </div>

      {/* Fill Color */}
      <div>
        <label className="text-[11px] font-medium text-text-muted mb-1 block">
          Fill Color
        </label>
        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-xs border border-border shadow-xs shrink-0"
            style={{ backgroundColor: currentFillColor }}
          />
          <Input
            value={currentFillColor}
            disabled={locked}
            onChange={(e) =>
              onUpdate({
                appearance: {
                  ...appearance,
                  fill: { type: "solid", color: e.target.value },
                },
              })
            }
            className="font-mono text-[11px]"
          />
        </div>
      </div>

      {/* Rectangle Corner Radius */}
      {element.shapeKind === "rectangle" && (
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
      )}

      {/* Polygon / Star Points */}
      {(element.shapeKind === "polygon" || element.shapeKind === "star") && (
        <div>
          <label className="text-[11px] font-medium text-text-muted mb-1 block">
            Points / Sides
          </label>
          <NumberInput
            value={element.pointsCount || 5}
            min={3}
            max={32}
            disabled={locked}
            onValueChange={(val) =>
              onUpdate({ pointsCount: Math.max(3, Math.round(val)) })
            }
          />
        </div>
      )}

      {/* Star Inner Radius Ratio */}
      {element.shapeKind === "star" && (
        <Slider
          label="Inner Radius Ratio"
          value={Math.round((element.innerRadiusRatio ?? 0.5) * 100)}
          min={10}
          max={90}
          unit="%"
          showValue
          disabled={locked}
          onValueChange={(val) => onUpdate({ innerRadiusRatio: val / 100 })}
        />
      )}

      <Divider />

      {/* Stroke / Outline */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-text-muted">
            Stroke / Outline
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-text-muted mb-0.5 block">
              Stroke Width
            </label>
            <NumberInput
              value={appearance.stroke?.width || 0}
              min={0}
              unit="px"
              disabled={locked}
              onValueChange={(val) => {
                const currentStroke = appearance.stroke || { color: "#FFFFFF", width: 0 };
                onUpdate({
                  appearance: {
                    ...appearance,
                    stroke: {
                      ...currentStroke,
                      width: Math.max(0, val),
                    },
                  },
                });
              }}
            />
          </div>
          <div>
            <label className="text-[10px] text-text-muted mb-0.5 block">
              Stroke Color
            </label>
            <Input
              value={appearance.stroke?.color || "#FFFFFF"}
              disabled={locked}
              onChange={(e) => {
                const currentStroke = appearance.stroke || { color: "#FFFFFF", width: 1 };
                onUpdate({
                  appearance: {
                    ...appearance,
                    stroke: {
                      ...currentStroke,
                      color: e.target.value,
                    },
                  },
                });
              }}
              className="font-mono text-[11px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
