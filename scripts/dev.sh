#!/bin/bash
# Start API server (port 3001) and frontend (port 8080) together

# Build and start API server in background
(cd artifacts/api-server && PORT=3001 pnpm run dev) &
API_PID=$!

# Give API a few seconds to start
sleep 3

# Start frontend Vite dev server on port 8080
(cd artifacts/tallys && PORT=8080 pnpm run dev) &
VITE_PID=$!

# Wait for either process to exit
wait $API_PID $VITE_PID
