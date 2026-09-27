"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Menu, X, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", exact: true },
  { label: "Projects", href: "/projects" },
  { label: "Templates", href: "/templates" },
  { label: "Settings", href: "/settings" },
];

export function NavHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 select-none group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-xs"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-accent text-accent-foreground shadow-subtle transition-transform duration-fast group-hover:scale-105">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-small font-bold tracking-tight text-text-primary">
                MOTION-BOT
              </span>
              <span className="rounded-xs border border-border-subtle bg-surface-elevated px-1.5 py-0.2 text-[10px] font-mono text-text-muted">
                STUDIO
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-1.5 rounded-xs text-caption font-medium transition-colors duration-fast ease-standard",
                    active
                      ? "bg-surface-elevated text-text-primary border border-border-active shadow-subtle"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface/50 border border-transparent"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Link href="/projects/new">
            <Button variant="primary" size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Create</span>
            </Button>
          </Link>

          <Link href="/editor" className="hidden sm:inline-flex">
            <Button variant="ghost" size="sm" className="gap-1.5 text-text-secondary">
              <Layers className="h-3.5 w-3.5" />
              <span>Editor</span>
            </Button>
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-xs text-text-secondary hover:text-text-primary hover:bg-surface-elevated border border-border transition-colors"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-surface px-4 py-3 space-y-1 animate-in fade-in slide-in-from-top-2 duration-fast">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block px-3 py-2 rounded-xs text-small font-medium transition-colors",
                  active
                    ? "bg-surface-elevated text-text-primary font-semibold"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated/50"
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-border-subtle">
            <Link
              href="/editor"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-small text-text-secondary hover:text-text-primary"
            >
              <Layers className="h-4 w-4" />
              <span>Open Studio Editor</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
