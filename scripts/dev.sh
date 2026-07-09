#!/bin/bash
# Start API server (port 8080) and frontend (port 22758) together.
# Ports must match artifacts/tallys/vite.config.ts's dev proxy target
# (localhost:8080) — otherwise /api calls from the frontend 404/500 even
# though both servers are running fine on their own.

# Build and start API server in background
(cd artifacts/api-server && PORT=8080 pnpm run dev) &
API_PID=$!

# Give API a few seconds to start
sleep 3

# Start frontend Vite dev server
(cd artifacts/tallys && PORT=22758 pnpm run dev) &
VITE_PID=$!

# Wait for either process to exit
wait $API_PID $VITE_PID
