import express, { type Express } from "express";
import router from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import { swaggerUi, swaggerDocument } from "./config/swagger";

const app: Express = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "working" });
});

app.use("/api", router);

// Interactive Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(errorMiddleware);

export default app;
