module.exports = {
  apps: [
    {
      name: "wedhub-test-api",
      cwd: "/opt/wedhub-test/wedhub-backend",
      script: "dist/server.js",
      node_args: ["--env-file=.env"],
      env: { NODE_ENV: "production", PORT: "4001" },
    },
    {
      name: "wedhub-test-worker",
      cwd: "/opt/wedhub-test/wedhub-backend",
      script: "dist/worker.js",
      node_args: ["--env-file=.env"],
      env: { NODE_ENV: "production" },
      kill_timeout: 30000,
    },
    {
      name: "wedhub-test-web",
      cwd: "/opt/wedhub-test/wedhub-frontend-app",
      script: "npm",
      args: "run start",
      env: { NODE_ENV: "production", PORT: "3001" },
    },
  ],
};
