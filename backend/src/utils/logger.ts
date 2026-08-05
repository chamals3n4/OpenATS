import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf((info) => {
      const { timestamp, level, message } = info;
      // Extra args (e.g. logger.error("msg:", err)) arrive as winston "splat"
      // metadata — without this they were silently dropped from the output.
      const splat = info[Symbol.for("splat") as unknown as string] as
        | unknown[]
        | undefined;
      const extra = splat?.length
        ? " " +
          splat
            .map((v) =>
              v instanceof Error
                ? (v.stack ?? v.message)
                : typeof v === "string"
                  ? v
                  : JSON.stringify(v),
            )
            .join(" ")
        : "";
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${extra}`;
    }),
  ),
  transports: [
    new winston.transports.Console(),

    // new winston.transports.File({ filename: "logs/app.log" }),
    // new winston.transports.File({ filename: "logs/error.log", level: "error" }),
  ],
});

export default logger;
