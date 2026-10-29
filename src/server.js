const app = require("./app");

const PORT = process.env.PORT || 5000;
const ENV = process.env.NODE_ENV || "development";

const server = app.listen(PORT, () => {
  console.log(`\n🚀  Server is running`);
  console.log(`   → Environment : ${ENV}`);
  console.log(`   → Port        : ${PORT}`);
  console.log(`   → Health      : http://localhost:${PORT}/health`);
  console.log(`   → Payments    : http://localhost:${PORT}/api/payment\n`);
});

// ── Graceful Shutdown ────────────────────────────────────────
const shutdown = (signal) => {
  console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log("[Server] HTTP server closed.");
    process.exit(0);
  });

  // Force-kill if server hasn't closed within 10 seconds
  setTimeout(() => {
    console.error("[Server] Forcing shutdown after timeout.");
    process.exit(1);
  }, 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ── Unhandled Rejections & Exceptions ───────────────────────
process.on("unhandledRejection", (reason) => {
  console.error("[Server] Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[Server] Uncaught Exception:", err);
  process.exit(1);
});
