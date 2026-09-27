"use client";

import * as React from "react";
import { Sliders, Cpu, DownloadCloud, Save } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Panel, PanelHeader, PanelContent } from "@/components/ui/panel";
import { Divider } from "@/components/ui/divider";

export default function SettingsPage() {
  const [autoSave, setAutoSave] = React.useState(true);
  const [gridSnapping, setGridSnapping] = React.useState(true);
  const [gpuAcceleration, setGpuAcceleration] = React.useState(true);
  const [targetFps, setTargetFps] = React.useState("60");
  const [defaultFormat, setDefaultFormat] = React.useState("mp4");
  const [saved, setSaved] = React.useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppShell maxWidth="narrow">
      <PageHeader
        title="Settings"
        description="Configure studio workspace preferences, rendering defaults, and keyboard shortcuts."
        actions={
          <Button variant="primary" size="sm" onClick={handleSave} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            <span>{saved ? "Saved!" : "Save Settings"}</span>
          </Button>
        }
      />

      <div className="mt-6 space-y-6">
        {/* Studio Workspace Preferences */}
        <Panel>
          <PanelHeader
            title="Studio Workspace"
            icon={<Sliders className="h-4 w-4 text-accent" />}
          />
          <PanelContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-small font-medium text-text-primary">
                  Autosave Compositions
                </div>
                <div className="text-caption text-text-muted">
                  Automatically persist scene edits locally every 30 seconds.
                </div>
              </div>
              <Switch checked={autoSave} onCheckedChange={setAutoSave} />
            </div>

            <Divider />

            <div className="flex items-center justify-between">
              <div>
                <div className="text-small font-medium text-text-primary">
                  Grid & Smart Snapping
                </div>
                <div className="text-caption text-text-muted">
                  Snap layers to canvas center lines and adjacent bounding boxes.
                </div>
              </div>
              <Switch checked={gridSnapping} onCheckedChange={setGridSnapping} />
            </div>
          </PanelContent>
        </Panel>

        {/* Playback & Rendering Performance */}
        <Panel>
          <PanelHeader
            title="Performance & Engine"
            icon={<Cpu className="h-4 w-4 text-accent" />}
          />
          <PanelContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-small font-medium text-text-primary">
                  Hardware Acceleration
                </div>
                <div className="text-caption text-text-muted">
                  Leverage GPU-accelerated canvas compositing and transforms.
                </div>
              </div>
              <Switch checked={gpuAcceleration} onCheckedChange={setGpuAcceleration} />
            </div>

            <Divider />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <div className="text-small font-medium text-text-primary">
                  Stage Preview Framerate
                </div>
                <div className="text-caption text-text-muted">
                  Target rendering tick rate during interactive canvas playback.
                </div>
              </div>
              <Select
                value={targetFps}
                onValueChange={setTargetFps}
                options={[
                  { value: "30", label: "30 FPS (Power Saver)" },
                  { value: "60", label: "60 FPS (Fluid Motion — Recommended)" },
                  { value: "120", label: "120 FPS (High Refresh Display)" },
                ]}
              />
            </div>
          </PanelContent>
        </Panel>

        {/* Export Defaults */}
        <Panel>
          <PanelHeader
            title="Export Defaults"
            icon={<DownloadCloud className="h-4 w-4 text-accent" />}
          />
          <PanelContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <div className="text-small font-medium text-text-primary">
                  Default Video Container
                </div>
                <div className="text-caption text-text-muted">
                  Format for rendered motion graphics exports.
                </div>
              </div>
              <Select
                value={defaultFormat}
                onValueChange={setDefaultFormat}
                options={[
                  { value: "mp4", label: "MP4 Video (H.264 / AAC)" },
                  { value: "webm", label: "WebM Video (VP9 with Alpha)" },
                  { value: "gif", label: "Animated GIF (Looping)" },
                ]}
              />
            </div>
          </PanelContent>
        </Panel>
      </div>
    </AppShell>
  );
}
