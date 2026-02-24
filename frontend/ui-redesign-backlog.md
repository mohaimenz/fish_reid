# UI Redesign Backlog

Status legend:
- `[ ]` planned
- `[-]` in progress
- `[x]` complete

## Goals
- Build a professional, cohesive visual language across all pages.
- Improve clarity of hierarchy and interaction patterns.
- Keep existing workflow/business behavior intact while redesigning.
- Ensure responsive and accessible experiences for desktop + mobile.

## Phase 1: Foundations
- [x] Establish visual tokens and global styles.
  - Add brand color tokens, semantic surface colors, border/shadow tokens.
  - Define typography strategy (heading/body), with readable defaults.
  - Add subtle brand background treatment and reusable motion primitives.
  - Acceptance criteria:
    - Every page inherits the same baseline look-and-feel.
    - No page relies on ad-hoc raw gray backgrounds only.
- [x] Redesign core primitives.
  - `Button`: consistent states, focus ring, primary/secondary/outline/danger hierarchy.
  - `Card`: cleaner elevation and spacing rhythm.
  - `Input`: stronger labels, focus, error style.
  - `Alert`: clearer status patterns and dismiss affordance.
  - Acceptance criteria:
    - Buttons look consistent across pages.
    - Focus states are visible and keyboard-friendly.
- [x] Header and navigation polish.
  - Replace playful/temporary logo treatment with product-grade mark.
  - Add active nav state for current route.
  - Improve authenticated nav spacing and visual balance.
  - Acceptance criteria:
    - Current section is always obvious in top nav.
    - Header feels production-ready.

## Phase 2: Structure and Workflow Shell
- [x] Workflow stepper redesign.
  - Sharper hierarchy and spacing; improve current/completed/upcoming distinction.
  - Improve mobile fallback behavior.
- [-] Layout rhythm normalization.
  - Unify page containers, paddings, section spacing, title/subtitle pattern.
  - Ensure each page has consistent header/actions structure.

## Phase 3: Key Page Redesign (High Impact)
- [-] Identification page.
  - Reduce density and visual noise.
  - Improve match card readability and action grouping.
  - Improve detection list selection affordance and state chips.
  - Clarify "suggested vs assigned" panel.
- [-] Tracking History page.
  - Better map/timeline/gallery tab treatment.
  - Stronger map panel, section-level typography and empty states.
- [-] Fishes page.
  - Move from generic card wall toward professional data listing patterns.
  - Improve pagination affordance for large datasets.

## Phase 4: Remaining Screens
- [-] Photo Upload
  - Refine dropzone, session list readability, metadata grouping.
- [-] Detection
  - Improve tool controls and annotation action clarity.
- [-] Sessions
  - Standardize status badges, metrics, and action buttons.
- [-] Auth + Landing
  - Polish typography/spacing and improve trust signals.

## Phase 5: Accessibility + QA
- [ ] Accessibility pass.
  - Contrast checks, keyboard navigation, focus order, semantic roles.
- [ ] Responsive pass.
  - Validate all key flows at mobile/tablet/desktop breakpoints.
- [ ] Visual consistency audit.
  - Remove outlier styles and one-off utility clusters.

## Current Implementation Scope
- Completed in this pass: **Phase 1 foundations**.
- Currently implementing: **Phase 2 shell normalization + Phase 3 key pages + Phase 4 public/auth refinements**.
