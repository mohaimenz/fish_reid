**Current Status**

- Detection is wired end-to-end (upload -> YOLO -> annotations in DB): `api/routes/detector.py:19`, `api/data_access/annotation.py:8`.
- Frontend calls identification/tracking APIs, but backend does not expose them yet:
  - Frontend calls `/identify`: `frontend/src/services/workflowService.js:23`, `frontend/.env:19`
  - Frontend calls `/tracking/{fishId}`: `frontend/src/services/workflowService.js:30`, `frontend/.env:20`
  - Backend only mounts `user`, `detector`, `photo` routers: `api/main.py:26`.
- Facenet inference utilities are present and usable, but not integrated into routes/services yet: `api/ai_models/facenet_partial_integration/inference_pipeline.py:37`.
- Identification UI is still placeholder-level:
  - Uses one global `selectedFishId` (not per detected fish): `frontend/src/store/workflowStore.js:19`
  - Sends raw `detections` to `/identify`: `frontend/src/pages/Identification.jsx:42`
  - “Detected fish image” is placeholder text: `frontend/src/pages/Identification.jsx:136`.

**Model Definition Updates Needed**
Yes, model updates are needed for clean re-id integration.

- `FishEmbedding.embeddings` is `str` now; should be numeric vector (`list[float]`): `api/data_access/models.py:17`.
- `FishEmbedding` should include at least: `user_id`, `annotation_id`, `user_upload_id`, `embedding_dim`, `model_version`, `date_created`.
- `IdentificationLogs` currently stores `fish_pair_id`; for re-id it should store direct `fish_id` plus `distance`, `threshold`, `model_name`, `is_new_identity`: `api/data_access/models.py:72`.
- Keep only latest 5 embeddings per `fish_id` (and ideally per model version) via insert+prune logic.

**Integration Plan**

1. Define API contract:

- `POST /detector/identify` with `annotation_ids` (recommended) or detection objects.
- Response per annotation: `query_crop`, `assigned_fish_id`, `distance`, `matches[]` (top-k).
- `GET /tracking/{fish_id}` response shape for timeline/gallery.

2. Build backend re-id service:

- Resolve annotation -> upload image path -> crop bbox.
- Generate query embedding via Facenet.
- Load gallery from DB as “latest 5 embeddings per fish identity”.
- Run full gallery NN search and threshold logic.

3. Persist identification:

- On confirmed/accepted identity, write `identification_logs`.
- Insert embedding; prune old ones so each fish keeps 5 latest.

4. Frontend updates:

- Call new identify endpoint with annotation IDs.
- Track selection per annotation (not one global fish ID).
- Render actual query crops and match thumbnails from API payload.
- Keep “go to tracking” for selected fish after identification.

5. Validation:

- Test empty gallery, known fish match, unknown/new fish, and multi-fish batch.

No code changes made yet.  
Next step options:

1. I implement the schema + backend `/detector/identify` first.
2. I implement frontend state/UI contract changes first.
3. I implement both in one pass behind a stable API contract.
