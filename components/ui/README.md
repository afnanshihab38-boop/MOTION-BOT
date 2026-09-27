# MOTION-BOT — Core UI Component Library

This directory contains the foundational, reusable UI components for MOTION-BOT, implemented in **Phase 2.2 — Core UI Component Library**.

All components strictly consume Phase 2.1 visual design tokens and adhere to accessibility (WCAG AA/AAA, keyboard navigation, visible focus rings) and technical studio software aesthetics.

---

## Component Catalog

### 1. Buttons ([button.tsx](button.tsx))
* `Button`: Primary, secondary, ghost, destructive, outline, icon variants. Supports loading spinner, disabled state, and focus-visible rings.

### 2. Inputs ([input.tsx](input.tsx), [textarea.tsx](textarea.tsx))
* `Input`: Text, password, and custom inputs with prefix and suffix adornments.
* `SearchInput`: Search input with search icon and quick-clear action.
* `NumberInput`: Technical numeric input with unit tags (px, %, s, deg) and stepper controls.
* `Textarea`: Multi-line text input with custom scrollbars and validation state.

### 3. Selection Controls ([checkbox.tsx](checkbox.tsx), [switch.tsx](switch.tsx), [radio-group.tsx](radio-group.tsx), [select.tsx](select.tsx))
* `Checkbox`: Accessible custom checkbox with indeterminate state, label, and description.
* `Switch`: Compact toggle switch with `role="switch"` and keyboard navigation.
* `RadioGroup` / `RadioGroupItem`: Radio button group with arrow key selection.
* `Select`: Accessible dropdown selection with keyboard navigation, option highlights, and checkmark indicators.

### 4. Controls ([slider.tsx](slider.tsx), [segmented-control.tsx](segmented-control.tsx), [tabs.tsx](tabs.tsx))
* `Slider`: Range scrub slider with fill progress, thumb, and numerical readout.
* `SegmentedControl`: Segmented button switcher for modes, viewports, and tools.
* `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`: Tab container with animated active indicator and `role="tablist"`.

### 5. Feedback ([tooltip.tsx](tooltip.tsx), [toast.tsx](toast.tsx), [alert.tsx](alert.tsx), [loading.tsx](loading.tsx), [empty-state.tsx](empty-state.tsx))
* `Tooltip`: Hover/focus tooltip with delay and shortcut badge support.
* `ToastItem` / `ToastContainer`: Toast notification system for info, success, warning, error.
* `Alert`, `AlertTitle`, `AlertDescription`: Inline status banners.
* `Spinner` / `Skeleton`: Loading indicators and placeholder pulsing skeletons.
* `EmptyState`: Empty container placeholder with icon, description, and action button.

### 6. Containers ([panel.tsx](panel.tsx), [dialog.tsx](dialog.tsx), [popover.tsx](popover.tsx), [dropdown-menu.tsx](dropdown-menu.tsx), [divider.tsx](divider.tsx))
* `Panel`, `PanelHeader`, `PanelContent`, `PanelFooter`: Studio dockable panels.
* `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`: Modal dialogs with backdrop blur and Escape key handler.
* `Popover`: Floating context popover with outside-click detection.
* `DropdownMenu`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuLabel`: Context and action menus.
* `Divider`: Horizontal and vertical hairline dividers.
