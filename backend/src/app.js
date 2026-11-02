const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");

// Load env variables first so all modules can access them
dotenv.config();

const paymentRoutes = require("./routes/payment.routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// ── Security Headers ─────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ── Raw Body for Razorpay Webhooks ───────────────────────────
// The webhook signature is verified against the RAW body.
// We capture it BEFORE express.json() parses it.
app.use((req, res, next) => {
  if (req.originalUrl === "/api/payment/webhook") {
    let rawData = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => (rawData += chunk));
    req.on("end", () => {
      req.rawBody = rawData;
      // Parse the body manually so the controller still gets req.body as an object
      try {
        req.body = JSON.parse(rawData);
      } catch {
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
});

// ── Body Parsers ─────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ── Health Check ─────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ───────────────────────────────────────────────
app.use("/api/payment", paymentRoutes);

// ── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ── Global Error Handler (must be last) ──────────────────────
app.use(errorHandler);

module.exports = app;
