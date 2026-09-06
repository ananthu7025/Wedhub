// PM2 process definitions for the test/prod server (/opt/wedhub). Not
// previously tracked in the repo — the 3 processes were started once by
// hand and have run from PM2's dump/resurrect state ever since, so no
// deploy could ever adjust their startup options. Root-caused via
// server.md's runbook: wedhub-worker was found with 60+ restarts, each one
// a `pm2 restart` from deploy.sh's unconditional
// `pm2 restart wedhub-api wedhub-worker wedhub-web` combined with PM2's
// default kill_timeout of 1600ms — far shorter than the up-to-12s a single
// Sharp image-resize job (media-processing.processor.ts) can take, so
// PM2 SIGKILLed the worker mid-job on nearly every deploy instead of
// letting its SIGINT handler (worker.ts) drain in-flight BullMQ jobs,
// permanently orphaning their Media rows at status PENDING/PROCESSING.
module.exports = {
  apps: [
    {
      name: "wedhub-api",
      cwd: "/opt/wedhub/wedhub-backend",
      script: "dist/server.js",
      node_args: ["--env-file=.env"],
      env: { NODE_ENV: "production" },
    },
    {
      name: "wedhub-worker",
      cwd: "/opt/wedhub/wedhub-backend",
      script: "dist/worker.js",
      node_args: ["--env-file=.env"],
      env: { NODE_ENV: "production" },
      // Longest observed single media-processing job was ~12s; give the
      // worker's own SIGINT handler (worker.ts's Worker#close()) generous
      // room to finish any active job and cleanly release its BullMQ lock
      // before PM2 escalates to SIGKILL. This is the actual fix for jobs
      // getting orphaned mid-processing on every deploy.
      kill_timeout: 30000,
    },
    {
      name: "wedhub-web",
      cwd: "/opt/wedhub/wedhub-frontend-app",
      script: "npm",
      args: "run start",
      env: { NODE_ENV: "production", PORT: "3000" },
    },
  ],
};
