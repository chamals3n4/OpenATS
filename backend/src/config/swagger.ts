import swaggerUi from "swagger-ui-express";
import fs from "fs";
import yaml from "js-yaml";
import path from "path";

const swaggerDocument = yaml.load(
  fs.readFileSync(path.join(process.cwd(), "openapi.yaml"), "utf8"),
) as Record<string, unknown>;

export { swaggerUi, swaggerDocument };
