import "dotenv/config";

import { loadConfig } from "./config/env.js";
import { validateRuntimeTarget } from "./guards/runtime-target.js";
import { createHermioneBot } from "./telegram/bot.js";

const config = loadConfig(process.env);

validateRuntimeTarget({
  cwd: process.cwd(),
  envPath: config.envFilePath,
  serviceName: config.serviceName
});

const bot = createHermioneBot(config);

process.once("SIGINT", () => {
  bot.stop();
});

process.once("SIGTERM", () => {
  bot.stop();
});

await bot.start({
  onStart: (botInfo) => {
    console.log(`HermioneResearchBot started as @${botInfo.username}`);
  }
});
