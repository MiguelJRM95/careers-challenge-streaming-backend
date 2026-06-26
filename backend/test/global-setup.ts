import { execSync } from "node:child_process";
import path from "node:path";

const composeFile = path.resolve(__dirname, "..", "..", "docker-compose.yml");

export default function setup() {
  execSync(`docker compose -f "${composeFile}" up -d postgres`, {
    stdio: "inherit",
  });
  execSync(`docker compose -f "${composeFile}" up flyway`, {
    stdio: "inherit",
  });
}
