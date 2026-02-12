# FaceNet Partial Integration Bundle

This folder contains a minimal, copy-paste friendly inference bundle built from:

- run: `facenet_cv_partial/facenet-valdisjoint-cv1-p8-k8-bs64-lr1e-3-20260209-165510`
- model: `FaceNetPartial` (`embedding_dim=128`, `image_size=224`)

## Files

- `model_def.py`: minimal model definition + eval transforms.
- `inference_pipeline.py`: lightweight load/embed/match utilities + CLI.
- `facenet_partial_state_dict.pth`: compact model weights (`state_dict` only).
- `model_meta.json`: deployment metadata (thresholds, config, source paths).

## Quick CLI Usage

Run from this folder:

```bash
python inference_pipeline.py \
  --weights facenet_partial_state_dict.pth \
  --query /path/to/query.jpg \
  --gallery-dir /path/to/gallery_root
```

Expected gallery layout:

```text
gallery_root/
  ID_0001/
    img1.jpg
    img2.jpg
  ID_0002/
    img1.jpg
```

## Programmatic Usage

```python
from inference_pipeline import load_model, embed_image, embed_images, nearest_neighbor_match

model, device = load_model("facenet_partial_state_dict.pth", embedding_dim=128)
gallery_emb = embed_images(model, gallery_paths, image_size=224, device=device)
query_emb = embed_image(model, query_path, image_size=224, device=device)
result = nearest_neighbor_match(query_emb, gallery_emb, gallery_ids, threshold=0.6177526116371155)
print(result.assigned_id, result.distance)
```

## Notes

- Matching uses L2 distance on normalized embeddings.
- Recommended starting threshold from calibration: `0.6177526116371155`.
- FAR-target threshold stored in calibration output: `0.6395864486694336`.
