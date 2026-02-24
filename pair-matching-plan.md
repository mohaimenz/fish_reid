# Pair Matching Plan (Deferred)

## Goal
Track long-term bonded fish pairs by learning which identities are consistently observed together across sessions/sites.

## Phase 1: Data Model and Event Semantics
- Add a durable pair observation model keyed by canonical undirected pair `(min(fish_id_a, fish_id_b), max(...))`.
- Store event context per co-sighting: `user_id`, `session_id`, `upload_id`, `site_id`, `observed_at`.
- Keep pair observations separate from pair aggregate stats.
- Ensure timestamps use an explicit observation time (fallback to upload time if unavailable).

## Phase 2: Pair Statistics Pipeline
- Build pair-level aggregates:
- `co_sightings`
- `fish_a_total_sightings`, `fish_b_total_sightings`
- `p_b_given_a`, `p_a_given_b`
- `jaccard_index`
- `last_seen_together`
- `recent_co_sightings`
- Compute a `bond_score` combining conditional support, overlap, recency, and minimum support.
- Derive a bond state (`none`, `weak`, `strong`) from configurable thresholds.

## Phase 3: Backend API
- Add endpoints:
- `GET /pairing/fish/{fish_id}` for ranked partners.
- `GET /pairing/fish/{fish_id}/events` for raw co-sighting timeline/map events.
- `POST /pairing/recalculate` for maintenance/rebuild.
- Optionally include top pair summary in tracking response payload.

## Phase 4: Frontend UX
- Add a `Pair History` section in fish tracking:
- partner ranking cards/table with bond score and co-sighting stats.
- event timeline and map view of joint sightings.
- action to open partner tracking directly.
- Keep pair info explicitly separate from identity matching confidence.

## Phase 5: Integrity and Recalculation Rules
- Recompute pair stats when identities are reassigned, created, removed, or sessions are deleted.
- Ignore unassigned embeddings/detections in pair statistics.
- Add idempotent rebuild logic to avoid double counting.

## Open Decisions
- Exact bond score formula and thresholds.
- Time-window weighting (lifetime vs rolling windows).
- Whether to support per-site pair affinity alongside global affinity.
