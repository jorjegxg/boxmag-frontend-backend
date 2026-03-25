import { app } from "./app";
import { env } from "./config/env";

app.listen(env.port, () => {
  // Keep startup log simple and easy to spot.
  console.log(`Backend listening on http://localhost:${env.port}`);
});

