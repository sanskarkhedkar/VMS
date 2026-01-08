# VMS Desktop Notification Agent (Tauri)

Use the Tauri agent in `../vms-notification-agent-tauri` instead of the legacy Electron agent. The agent authenticates against this backend and listens for Socket.IO events to trigger OS notifications.

## Quick Start
1) Ensure the backend is running (default `http://localhost:5000`).
2) In another shell:
   ```
   cd ../vms-notification-agent-tauri
   npm install
   npm run tauri dev
   ```
3) In the agent UI, enter your backend URL (e.g., `http://localhost:5000`) and log in with a valid user.

## Backend Expectations
- Auth: `POST /api/auth/login` returns `{ user, token }` (already implemented).
- Socket.IO: the agent connects to the same host, sending the JWT in `auth.token`.
- Events the agent handles:
  - `notification` (title, body, url?, type?)
  - `visitor:arrived`, `visitor:approved`, `visitor:rejected`, `visitor:checkout`, `approval:required`
  - It also tolerates the sample hyphenated events (`visitor-checkin`, `visitor-approved`, `visitor-rejected`).
- Rooms: the agent emits `register` with `userId` after connect; backend should join `user-${userId}` (already in `src/utils/socket.util.js`).

## CORS / Origins
- Socket CORS is derived from `SOCKET_ORIGINS` or `FRONTEND_URL`; `file://` is auto-added so the agent works out of the box. Set `SOCKET_ORIGINS` to a comma list if you need to lock it down (e.g., `SOCKET_ORIGINS=http://localhost:3000,file://`).

## Build / Distribution
- Build installers from the agent: `npm run build` (outputs under `vms-notification-agent-tauri/src-tauri/target/release/bundle/`).
- Deploy the generated installer to desktops; no backend changes are required beyond the existing Socket.IO and auth endpoints.

## Legacy Electron Agent
- The Electron agent at `../vms-notification-agent` is deprecated; use the Tauri agent going forward.
