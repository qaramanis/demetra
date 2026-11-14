import { config } from "dotenv";

// drizzle-kit does not read the environment file of the web application, and that file has
// the connection string. The path is relative to this package: the `db:*` scripts run here.
//
// In the Drizzle Studio container, docker-compose sets DATABASE_URL to the `db` service and
// STUDIO_IN_DOCKER. The file must not replace that value, so it is not loaded there.
if (!process.env.STUDIO_IN_DOCKER) {
  config({ path: "../../apps/web/.env.local", override: true });
}
