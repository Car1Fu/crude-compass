# Local Architecture And Progress Handoff

## Purpose

This document is for any follow-up AI or engineer continuing this repository.
It should be read as a progress handoff, not just an architecture note.

Read it in this order:

1. what has already been completed
2. how the project currently runs
3. what still needs to be completed
4. what constraints must not be violated

This file supplements, not replaces:

- `AI_CODEBASE_HANDOFF.md` for codebase structure and risks
- `LLM_AND_DATA_INTEGRATION_PLAN.md` for the main implementation direction

## Project Positioning

This project is currently a competition-style prototype, not a fully deployed commercial product.
The goal is to make it behave like a real product as much as possible under local-only conditions.

The current architecture direction is therefore:

1. local Python backend
2. local SQLite database
3. local frontend page plus local proxy/backend linkage

These are the active constraints unless the user explicitly changes them.

## What Has Already Been Completed

### 1. Local LLM chat entry has been connected

The hedge assistant is no longer only a static UI shell.
The frontend can now send chat requests to a local Python proxy, and model replies can be rendered back into the existing chat area.

Current behavior already implemented:

- user messages are appended in the hedge assistant chat area
- AI replies are appended in the same chat area
- AI replies display `assets/AI.png` as the AI avatar
- user and AI messages use different styles without changing the page layout too much
- AI errors are shown in the chat area instead of failing silently

Main related file:

- `index.html`

### 2. A local Python proxy/backend has already been added

The project now has a local Python service that acts as the middle layer between the frontend and OpenRouter.

This service currently provides:

- `GET /health`
- `POST /api/hedge-chat`
- static file serving for local site access

Main related file:

- `hedge_chat_proxy.py`

### 3. The local AI-enabled run path has already been established

The current AI-enabled product entry is not direct file opening.
The intended local run mode is:

1. run the local Python proxy
2. open the site through the local proxy
3. let the frontend call the local backend API

Current local entry points:

- `start_hedge_ai.bat`
- `http://127.0.0.1:8008/`

Important:

- direct opening of `index.html` should not be treated as the main AI-enabled entry
- the AI-enabled flow should be tested from `http://127.0.0.1:8008/`

### 4. OpenRouter configuration has already been centralized

The OpenRouter configuration is now shared through a central config file rather than being scattered.

Current related files:

- `openrouter_config.py`
- `test_openrouter.py`

Current reality:

- the local proxy and the test script both depend on `openrouter_config.py`
- this reduces duplicated model configuration
- however, the API key still needs safer handling later

### 5. A lightweight local startup flow has already been added

To reduce friction during demo or judging, a local startup script already exists.

Current related file:

- `start_hedge_ai.bat`

Its role is:

- check whether port `8008` is already occupied by the hedge chat proxy
- start `python hedge_chat_proxy.py` if needed
- open `http://127.0.0.1:8008/`

### 6. Some frontend housekeeping and risk reduction have already been done

The following cleanup has already happened:

- the logo asset path case mismatch was corrected to `Logo.png`
- active `view-warning` entry points were removed because the actual warning view was not present

Important user constraint:

- `view-about`, `view-pricing`, and `view-contact` still exist and should not be modified unless the user explicitly asks

## Current Working State

As of this handoff, the current MVP state is:

- the hedge assistant can call the local Python proxy
- the local Python proxy can call OpenRouter
- the site can be opened locally from `http://127.0.0.1:8008/`
- the startup flow is already simplified through `start_hedge_ai.bat`

This means the project has already moved beyond a pure static demo for the hedge assistant path.

However, this is still only a local MVP, not a finished data platform.

## What Has Not Been Completed Yet

### 1. SQLite has not been added yet

This is the biggest architectural item still missing.
The agreed database direction is SQLite, but it has not yet been implemented.

Not yet completed:

- no local `.db` file
- no schema for hedge assistant data
- no backend read/write logic for SQLite
- no persistence of user input, AI replies, market snapshots, or forecast outputs

### 2. The hedge assistant is still only minimally integrated

The current hedge assistant is an MVP chat connection, not a full business assistant yet.

Not yet completed:

- no persistent conversation history
- no database-backed context
- no structured strategy storage
- no business-grade answer template enforcement
- no grounding with local market or forecast data

### 3. Real data integration is still not completed

The current repository still contains large amounts of frontend-generated or mock data.

Still not completed:

- WTI and Brent real data replacement across key views
- backend-driven market snapshot
- backend-driven price board
- backend-driven `0316.html` database page
- backend-driven forecast center data

### 4. The Python prediction model service has not been connected yet

The long-term target includes using the existing team Python forecasting model as a service layer.
That service integration has not been completed in this repository.

Still not completed:

- forecast model service wrapper
- unified API between frontend and prediction service
- persistence of prediction outputs
- forecast explanation based on real model outputs

### 5. Security and configuration are still in MVP state

Current local MVP choices should not be mistaken for final architecture.

Still not completed:

- moving model secrets fully out of source code
- production-grade auth
- cloud deployment
- multi-user backend
- formal session management

## What Future AI Should Build Next

The next work should continue in this order unless the user changes priorities.

### Phase 1. Add SQLite as the local data layer

Minimum recommended first entities:

- hedge assistant user input records
- hedge assistant AI reply records
- market snapshot records
- prediction result records

This phase should produce:

- one local SQLite database file
- a minimal schema
- Python backend read/write support

### Phase 2. Make the hedge assistant use database-backed context

The assistant should gradually stop relying on only hardcoded prompt context.

This phase should move toward:

- saving each question and reply
- saving the user parameter snapshot
- retrieving relevant local context before LLM calls
- improving answer consistency and traceability

### Phase 3. Standardize answer quality

Future LLM answers should become more stable and structured.

Desired direction:

- stable answer structure
- explicit assumptions
- explicit statement when data is missing
- clearer business recommendation format
- separation between computed values and generated explanation

Core principle:

- code computes key values
- database stores key values and context
- LLM explains and organizes recommendations

### Phase 4. Replace more mock data with real local data flow

Priority should remain aligned with the earlier implementation plan:

1. hedge assistant
2. forecast center
3. price board
4. database page
5. other display areas

The immediate real-data focus should stay centered on:

- WTI
- Brent

## Required Architecture Rules For Follow-Up AI

Follow-up AI should keep these rules in mind:

### Rule 1. Keep the architecture local-first

Do not assume rented servers, cloud deployment, or heavy DevOps work.
The current product constraint is local demo plus competition presentation.

### Rule 2. Use Python as the orchestration layer

The Python backend should be the middle layer for:

- frontend requests
- LLM calls
- database reads and writes
- business logic orchestration

The frontend should not directly own sensitive keys.
The frontend should not directly connect to SQLite.

### Rule 3. Use SQLite as the database direction

Do not jump straight to MySQL or cloud-hosted databases unless the user explicitly changes direction.
SQLite is the agreed practical next step for this competition-stage product.

### Rule 4. Treat `http://127.0.0.1:8008/` as the AI-enabled app entry

If AI behavior is being tested, prefer the local proxied entry rather than direct file opening.

### Rule 5. Do not modify protected placeholder views without request

Unless the user explicitly asks, do not change:

- `view-about`
- `view-pricing`
- `view-contact`

## Suggested Immediate Next Tasks

If a future AI needs a short actionable checklist, use this:

1. add SQLite and define the minimal schema
2. let `hedge_chat_proxy.py` read/write hedge assistant records
3. make the hedge assistant use database-backed context
4. standardize the LLM answer template
5. begin replacing WTI and Brent mock data with local real-data flow

## Short Summary For Follow-Up AI

Do not start from scratch.
The local hedge assistant MVP has already been connected.
The local Python proxy exists.
The local startup path exists.

The main unfinished work is no longer "connect the first AI reply".
The main unfinished work is:

- SQLite data layer
- structured context persistence
- real data integration
- prediction service integration
- better answer standardization
