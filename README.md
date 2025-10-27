# Node Typing Game Demo

This repository demonstrates distributed tracing and error correlation between a Node.js frontend and backend using OpenTelemetry (OTel) and Sentry.

## Overview

- **Frontend:**

  - Node.js CLI typing game.
  - Fetches words from the backend, prompts the user to type them, and checks spelling via API calls.
  - All API calls and game logic are instrumented with OTel spans and logs.
  - Errors are reported to Sentry with OTel trace context for perfect correlation.

- **Backend:**
  - Express + Socket.IO server.
  - Serves word lists, checks spelling, and emits random words in real-time.
  - All HTTP requests, spelling checks, and Socket.IO events are instrumented with OTel spans and logs.
  - Errors are reported to Sentry with OTel trace context for root cause analysis.

## Distributed Tracing & Error Correlation

- The trace always begins on the frontend and is propagated to the backend for every request using OpenTelemetry (OTel) context propagation.
- The trace ID is generated and managed by OTel, and is explicitly attached to all Sentry exceptions and error events on both frontend and backend.
- This allows Sentry to correlate errors and traces across the entire stack, so Sentry events on both frontend and backend share the same OTel trace ID, enabling full-stack root cause analysis.
- All traces and errors are visible in Sentry, with full correlation between frontend and backend events.

## How to Run

See the individual `README.md` files in `node-typing-game-frontend/` and `node-typing-game-backend/` for setup and usage instructions.

---

This project is for demonstration and learning purposes.
