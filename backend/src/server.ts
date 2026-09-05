import "./common/db.js";
import { createApp } from "./api/app.js";
import { logger } from "./common/logger.js";

const PORT = Number(process.env.PORT ?? 4000);

const app = createApp();

app.listen(PORT, "0.0.0.0", () => {
  logger.info("server_started", { port: PORT });
});