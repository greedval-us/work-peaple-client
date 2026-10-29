# Work People development environment

- This Windows computer is for desktop-client development. Do not deploy or start the backend, PostgreSQL, or Redis here.
- Backend runtime and container/integration testing belong on the user's SSH server `greed@192.168.0.102` (port 22).
- Prefer an existing user-owned key accepted by that server. The known candidate is `~/.ssh/id_ed25519_hostkey`; the user may supply another path. When the user authorizes password authentication, use an interactive SSH prompt and never persist credentials or copy private key contents into either repository or logs.
- Keep backend Compose ports bound to server loopback by default. For local client access use an SSH tunnel to remote `127.0.0.1:50051`.
- The verified remote deployment is `/home/greed/apps/work-people-server` (Compose project `workpeople`). Keep client `GRPC_TARGET=127.0.0.1:50051` when the SSH tunnel is active.
- Local static checks/builds are allowed; tests requiring a real backend run on the SSH server.
- Client and server are separate Git repositories. Server proto is canonical; sync tracked client contracts with `npm run contracts:sync`.
