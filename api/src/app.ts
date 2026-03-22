import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";
import publicRouter from "./routes/public.routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import { swaggerUi, swaggerDocument } from "./config/swagger";
import { authMiddleware } from "./middlewares/auth.middleware";
import { activeLogMiddleware } from "./middlewares/active-log.middleware";

const app: Express = express();
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(activeLogMiddleware);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "working" });
});

// Public routes — no authentication required (careers page, job application)
app.use("/public", publicRouter);

// Protected routes — require valid Asgardeo JWT
app.use("/api", authMiddleware, router);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(errorMiddleware);

export default app;
