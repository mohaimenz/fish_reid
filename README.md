# RabbitFish Tracking Platform

This repository contains a development-stage platform for turning underwater survey photos into trackable rabbitfish histories.

## What It Does

The system helps a team move from raw field imagery to a usable identity record for individual fish:

1. Photos are uploaded as part of a survey session.
2. The backend detects rabbitfish in each image.
3. A human reviewer confirms or corrects the detections.
4. The identification model suggests whether a fish matches a known individual or should become a new identity.
5. Confirmed identities can then be reviewed across time, place, and pairing history.

## Why This Exists

Reviewing reef survey imagery by hand is slow, repetitive, and difficult to scale over many survey periods. This project reduces that effort by combining machine assistance with a human-in-the-loop workflow. The goal is not to remove expert judgment; it is to focus expert time on decisions that matter.

## Main Parts

### Frontend

The frontend is a React web application used by researchers and operators. It handles sign-in, session creation, photo upload, annotation review, identification review, tracking history, and pair-matching screens.

Developer guide: [frontend/README.md](/Users/aasa0007/Python/RabbitFish/fish_reid/frontend/README.md)

### API and ML Backend

The API is a FastAPI service backed by MongoDB. It stores users, survey sessions, sites, uploaded images, annotations, identity logs, embeddings, and pair histories. It also runs the object detection and re-identification pipeline.

Developer guide: [api/README.md](/Users/aasa0007/Python/RabbitFish/fish_reid/api/README.md)

## How To Explain It To Stakeholders

If you need a simple description for non-technical readers, use this:

> RabbitFish Tracking Platform helps a marine monitoring team upload reef survey photos, find rabbitfish in those images, decide whether each fish has been seen before, and build a visual history of sightings over time.

## Typical Users

- Field or lab staff uploading new survey images
- Analysts reviewing model suggestions
- Project leads checking whether an individual fish has been seen before, where it was seen, and when

## What Success Looks Like

- Less time spent manually sorting large image batches
- Better continuity between survey sessions
- A growing identity catalogue that improves long-term monitoring
- A traceable review process instead of ad hoc spreadsheet-based matching

## Important Context

- This is still a working codebase, not a polished packaged product.
- The workflow is intentionally operator-assisted. Model output is meant to support review, not replace it.
- Local development currently assumes a React frontend, a FastAPI backend, local file storage for uploads, and a MongoDB instance running on the same machine.

## For Technical Readers

Use the two component guides for setup and day-to-day development:

- Frontend setup: [frontend/README.md](/Users/aasa0007/Python/RabbitFish/fish_reid/frontend/README.md)
- API setup: [api/README.md](/Users/aasa0007/Python/RabbitFish/fish_reid/api/README.md)
