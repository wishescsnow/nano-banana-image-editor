# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Nano Banana + Veo** is a React + TypeScript web application for AI-powered image and video generation. It uses Google's Gemini 3.0 Pro Image model for images and Veo 3.x models for video generation. Features include text-to-image/video generation, conversational image editing with region-aware masks, video interpolation and extension, and a batch API queue for cost savings.

## Development Commands

```bash
npm run dev:all      # Start both frontend (Vite) and backend (Express) together
npm run dev          # Start Vite frontend only (http://localhost:5173)
npm run dev:server   # Start Express API server only (http://localhost:3001)
npm run build        # Build frontend for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

## Architecture

### Frontend-Backend Split
- **Frontend** (Vite + React): `src/` - runs on port 5173, proxies `/api` to backend
- **Backend** (Express): `server/index.ts` - runs on port 3001, handles Gemini API calls

The backend keeps the `GEMINI_API_KEY` secure server-side. All AI operations go through Express endpoints.

### State Management
- **Zustand** (`src/store/useAppStore.ts`): Global app state - canvas, brush strokes, generation settings, UI panels
- **React Query**: Server state for API requests via `useImageGeneration` hook

### Key Data Flow
1. User inputs prompt in `PromptComposer.tsx`
2. `useImageGeneration.ts` hook calls `apiService.ts`
3. `apiService.ts` sends requests to Express backend (`/api/generate`, `/api/edit`, `/api/batch/*`)
4. Backend calls Gemini API and returns images
5. Results stored in Zustand and optionally cached to IndexedDB via `cacheService.ts`

### API Endpoints (server/index.ts)

**Image Generation:**
- `POST /api/generate` - Generate images from text prompt
- `POST /api/edit` - Edit existing image with instruction + optional mask
- `POST /api/segment` - AI segmentation mask generation
- `POST /api/batch/generate`, `/api/batch/edit` - Batch API variants (50% cost savings)
- `GET /api/batch/:name` - Check batch job status
- `GET /api/batch/:name/results` - Retrieve completed batch results

**Video Generation (Veo 3.x):**
- `POST /api/video/generate` - Start video generation, returns operation name for polling
- `GET /api/video/operation/status` - Poll operation status (PENDING, RUNNING, SUCCEEDED, FAILED)
- `GET /api/video/operation/result` - Retrieve completed video as base64

### Core Components
- `ImageCanvas.tsx` - Konva.js canvas with zoom/pan, displays images/videos and mask overlays
- `PromptComposer.tsx` - Prompt input, tool selection, generation controls
- `HistoryPanel.tsx` - Tabbed panel for history and queued requests
- `MaskOverlay.tsx` - Brush-painted mask layer for region-aware edits
- `VideoToolbar.tsx` - Video playback controls (play/pause, seek, mute, fullscreen, download)

### Custom Hooks
- `useImageGeneration.ts` - Image generation and editing logic with React Query
- `useVideoGeneration.ts` - Video generation with operation polling using `getState()` pattern

### Types
All TypeScript types are centralized in `src/types/index.ts` including:
- **Image types:** `Generation`, `Edit`, `Asset`, `BatchQueueRequest`
- **Video types:** `VideoGeneration`, `VideoAsset`, `VideoBatchQueueRequest`, `VideoModel`
- **Shared types:** `Project`, `SafetySetting`, `AspectRatio`, `ResolutionTier`, `QueueStatus`
- **Request/Response interfaces:** `GenerateRequest`, `EditRequest`, `SegmentRequest`, `VideoGenerateRequest`
- **Constants:** `DEFAULT_SAFETY_SETTINGS`

## Environment Setup

Requires `GEMINI_API_KEY` in `.env` file:
```bash
cp .env.example .env
# Add your Google AI Studio API key
```
