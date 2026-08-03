import { app } from "./app";
import { assertProductionEnv, env } from "./config/env";

assertProductionEnv();

app.listen(env.port, () => {
  // Keep startup log simple and easy to spot.
  console.log(`Backend listening on http://localhost:${env.port}`);
  console.log(`Boxmag backend started at ${new Date().toISOString()}`);
});
