"use client";

/**
 * MOTION-BOT — Project Asset Management Panel
 * Project-scoped media asset browser, uploader, and canvas layer generator.
 * Supports Images, SVGs, Logos, and Video assets adhering strictly to Phase 3 contracts.
 * Part of Phase 8.4: Scenes + Asset Management.
 */

import * as React from "react";
import {
  Image as ImageIcon,
  Film,
  Sparkles,
  Plus,
  Search,
  Upload,
  Layers,
  Trash2,
  X,
} from "lucide-react";
import { Project } from "@/types/project";
import { Asset, AssetType } from "@/types/asset";
import { createAsset } from "@/services/asset/asset-model";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AssetPanelProps {
  project: Project;
  onAddAssetToProject: (asset: Asset) => void;
  onAddAssetToCanvas: (assetId: string) => void;
  onRemoveAssetFromProject?: (assetId: string) => void;
  onClose?: () => void;
  className?: string;
}

const PRESET_SAMPLE_ASSETS: Array<{
  name: string;
  type: AssetType;
  url: string;
  width: number;
  height: number;
}> = [
  {
    name: "motionbot-cyan-logo.svg",
    type: "logo",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><polygon points='50,10 90,90 10,90' fill='%2300F2FE'/><circle cx='50' cy='60' r='18' fill='%230B0C10'/></svg>",
    width: 200,
    height: 200,
  },
  {
    name: "abstract-cyber-grid.png",
    type: "image",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    width: 800,
    height: 600,
  },
  {
    name: "neon-geometric-rings.svg",
    type: "svg",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><circle cx='60' cy='60' r='50' fill='none' stroke='%234FACFE' stroke-width='6'/><circle cx='60' cy='60' r='35' fill='none' stroke='%2300F2FE' stroke-width='4'/><circle cx='60' cy='60' r='20' fill='%236366F1'/></svg>",
    width: 240,
    height: 240,
  },
  {
    name: "cinematic-countdown.mp4",
    type: "video",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    width: 640,
    height: 360,
  },
];

export const AssetPanel: React.FC<AssetPanelProps> = ({
  project,
  onAddAssetToProject,
  onAddAssetToCanvas,
  onRemoveAssetFromProject,
  onClose,
  className,
}) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedType, setSelectedType] = React.useState<"all" | AssetType>("all");
  const [isAddingAsset, setIsAddingAsset] = React.useState(false);
  const [newAssetName, setNewAssetName] = React.useState("");
  const [newAssetUrl, setNewAssetUrl] = React.useState("");
  const [newAssetType, setNewAssetType] = React.useState<AssetType>("image");
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const assets = React.useMemo(() => project.assets || [], [project.assets]);

  // Filter assets by search query and type
  const filteredAssets = React.useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        selectedType === "all" || asset.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [assets, searchQuery, selectedType]);

  // Handle local file upload via FileReader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const isSvg = file.type.includes("svg");
      const isVideo = file.type.includes("video");
      const assetType: AssetType = isSvg ? "svg" : isVideo ? "video" : "image";

      const created = createAsset({
        name: file.name,
        type: assetType,
        source: "upload",
        url: dataUrl,
        sizeBytes: file.size,
        mimeType: file.type,
      });

      onAddAssetToProject(created);
      setIsAddingAsset(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Handle URL creation
  const handleCreateFromUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetUrl.trim() || !newAssetName.trim()) return;

    const created = createAsset({
      name: newAssetName.trim(),
      type: newAssetType,
      source: "url",
      url: newAssetUrl.trim(),
    });

    onAddAssetToProject(created);
    setNewAssetName("");
    setNewAssetUrl("");
    setIsAddingAsset(false);
  };

  // Add preset asset
  const handleAddPreset = (preset: (typeof PRESET_SAMPLE_ASSETS)[0]) => {
    const created = createAsset({
      name: preset.name,
      type: preset.type,
      source: "library",
      url: preset.url,
      width: preset.width,
      height: preset.height,
    });
    onAddAssetToProject(created);
    setIsAddingAsset(false);
  };

  return (
    <div
      aria-label="Asset Management Panel"
      className={cn(
        "h-full flex flex-col bg-surface text-text-primary select-none overflow-hidden",
        className
      )}
    >
      {/* 1. Header with Title and Add Asset Action */}
      <div className="p-3 border-b border-border bg-surface-elevated/30 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
            <Layers className="h-3.5 w-3.5 text-accent" />
            <span>Project Assets</span>
            <span className="rounded-xs bg-surface border border-border px-1.5 py-0.2 text-[10px] font-mono text-text-muted">
              {assets.length}
            </span>
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">
            Project-scoped media, logos, and graphic assets
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAddingAsset(!isAddingAsset)}
            className="h-7 px-2 text-xs gap-1 border-accent/30 text-accent hover:bg-accent/10"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Asset</span>
          </Button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
              aria-label="Close assets panel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Add Asset Drawer / Modal */}
      {isAddingAsset && (
        <div className="p-3 border-b border-border bg-[#0B0D13] space-y-3 shrink-0 animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary">Add Asset to Project</span>
            <button
              type="button"
              onClick={() => setIsAddingAsset(false)}
              className="text-text-muted hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Upload Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.svg"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="w-full gap-1.5 text-xs justify-center border-dashed border-accent/40 text-accent hover:bg-accent/10"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Choose File from Computer (Image / SVG / Video)</span>
            </Button>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block">
              Or pick sample asset:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_SAMPLE_ASSETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleAddPreset(preset)}
                  className="p-1.5 rounded-xs bg-surface-elevated/40 border border-border/80 hover:border-accent/40 text-left transition-colors flex items-center gap-1.5"
                >
                  {preset.type === "logo" && <Sparkles className="h-3 w-3 text-pink-400 shrink-0" />}
                  {preset.type === "video" && <Film className="h-3 w-3 text-blue-400 shrink-0" />}
                  {(preset.type === "image" || preset.type === "svg") && (
                    <ImageIcon className="h-3 w-3 text-amber-400 shrink-0" />
                  )}
                  <span className="text-[11px] text-text-secondary truncate">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* URL Form */}
          <form onSubmit={handleCreateFromUrl} className="space-y-2 pt-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block">
              Or add via URL:
            </span>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Asset name (e.g. Logo.svg)"
                value={newAssetName}
                onChange={(e) => setNewAssetName(e.target.value)}
                className="flex-1 h-7 px-2 text-xs bg-surface border border-border rounded-xs text-text-primary focus:outline-none focus:border-accent"
              />
              <select
                value={newAssetType}
                onChange={(e) => setNewAssetType(e.target.value as AssetType)}
                className="h-7 px-1.5 text-xs bg-surface border border-border rounded-xs text-text-primary focus:outline-none"
              >
                <option value="image">Image</option>
                <option value="logo">Logo</option>
                <option value="svg">SVG</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div className="flex gap-1.5">
              <input
                type="url"
                placeholder="https://... or data:image/..."
                value={newAssetUrl}
                onChange={(e) => setNewAssetUrl(e.target.value)}
                className="flex-1 h-7 px-2 text-xs bg-surface border border-border rounded-xs text-text-primary focus:outline-none focus:border-accent font-mono text-[11px]"
              />
              <Button type="submit" variant="primary" size="sm" className="h-7 px-2 text-xs">
                Save
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Search & Filter Bar */}
      <div className="p-2.5 border-b border-border bg-surface/50 space-y-2 shrink-0">
        {/* Search */}
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-text-muted absolute left-2 top-2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-7 pl-7 pr-2 text-xs bg-surface-elevated/40 border border-border rounded-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {(["all", "image", "logo", "svg", "video"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={cn(
                "px-2 py-0.5 rounded-xs text-[10px] font-medium uppercase tracking-wider transition-colors shrink-0",
                selectedType === type
                  ? "bg-accent/20 text-accent border border-accent/40 font-semibold"
                  : "bg-surface-elevated/30 border border-border text-text-muted hover:text-text-primary"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Asset Cards Grid */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredAssets.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center p-4 border border-dashed border-border rounded-xs text-text-muted">
            <ImageIcon className="h-7 w-7 text-text-muted/40 mb-1.5" />
            <p className="text-xs font-medium">No assets found</p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Click &quot;Add Asset&quot; to upload media or pick a preset.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filteredAssets.map((asset) => {
              const isSvg = asset.type === "svg" || asset.name.endsWith(".svg");
              const isVideo = asset.type === "video";
              const isLogo = asset.type === "logo";

              return (
                <div
                  key={asset.id}
                  className="group relative rounded-xs border border-border bg-surface-elevated/20 hover:border-accent/50 hover:bg-surface-elevated/40 transition-all overflow-hidden flex flex-col"
                >
                  {/* Thumbnail / Visual Preview */}
                  <div
                    onClick={() => onAddAssetToCanvas(asset.id)}
                    className="h-24 w-full bg-[#08090C] relative flex items-center justify-center overflow-hidden cursor-pointer"
                  >
                    <AssetThumbnail asset={asset} />

                    {/* Hover Overlay with Add Button */}
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddAssetToCanvas(asset.id);
                        }}
                        className="h-6 px-2 text-[10px] gap-1 w-full justify-center"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Layer</span>
                      </Button>
                      <span className="text-[9px] text-text-muted text-center font-mono">
                        Creates canvas layer
                      </span>
                    </div>

                    {/* Type Badge */}
                    <span
                      className={cn(
                        "absolute top-1.5 left-1.5 px-1 py-0.2 rounded-xs text-[9px] font-mono uppercase font-bold",
                        isLogo && "bg-pink-500/20 text-pink-400 border border-pink-500/30",
                        isVideo && "bg-blue-500/20 text-blue-400 border border-blue-500/30",
                        isSvg && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
                        !isLogo && !isVideo && !isSvg && "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      )}
                    >
                      {asset.type}
                    </span>
                  </div>

                  {/* Asset Info Footer */}
                  <div className="p-2 border-t border-border flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <p
                        className="text-[11px] font-medium text-text-primary truncate"
                        title={asset.name}
                      >
                        {asset.name}
                      </p>
                      <p className="text-[10px] font-mono text-text-muted">
                        {asset.width && asset.height
                          ? `${asset.width} × ${asset.height}`
                          : asset.source}
                      </p>
                    </div>

                    {/* Delete Action if handler provided */}
                    {onRemoveAssetFromProject && (
                      <button
                        type="button"
                        onClick={() => onRemoveAssetFromProject(asset.id)}
                        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-rose-400 p-1 transition-opacity"
                        title="Delete asset from project"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function AssetThumbnail({ asset }: { asset: Asset }) {
  const [hasError, setHasError] = React.useState(false);
  const isVideo = asset.type === "video";

  if (isVideo) {
    return (
      <div className="flex flex-col items-center gap-1 text-blue-400">
        <Film className="h-6 w-6" />
        <span className="text-[9px] font-mono uppercase tracking-wider">Video</span>
      </div>
    );
  }

  if (hasError || !asset.url) {
    return (
      <div className="flex flex-col items-center gap-1 text-text-muted p-2 text-center select-none">
        <ImageIcon className="h-6 w-6 text-text-muted/60" />
        <span className="text-[9px] font-mono text-text-muted truncate max-w-[90px]">
          {asset.name}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset.url}
      alt={asset.name}
      className="max-h-full max-w-full object-contain p-2"
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}
