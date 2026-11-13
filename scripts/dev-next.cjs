#!/usr/bin/env node
// Launcher for the host (non-Docker) dev instance: loads the whole root .env into
// process.env (as Docker's env_file does) and then runs `next dev` with the given args.
// Used by the boxmag-dev-frontend systemd unit; run from boxmag4/.
const path = require("path");
process.loadEnvFile(path.resolve(__dirname, "../.env"));
// The shared .env may say NODE_ENV=production (for the backend); `next dev` requires development.
process.env.NODE_ENV = "development";
const nextBin = path.resolve(process.cwd(), "node_modules/next/dist/bin/next");
process.argv = [process.argv[0], nextBin, "dev", ...process.argv.slice(2)];
require(nextBin);
