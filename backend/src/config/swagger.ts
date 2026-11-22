import swaggerUi from "swagger-ui-express";
import fs from "fs";
import * as yaml from "js-yaml";
import path from "path";

// Read only when API_DOCS is on, so the file is not needed otherwise.
export function loadApiDocument(): Record<string, unknown> {
  return yaml.load(fs.readFileSync(path.join(process.cwd(), "openapi.yaml"), "utf8")) as Record<string, unknown>;
}

export { swaggerUi };
