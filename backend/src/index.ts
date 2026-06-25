import { buildApp } from "./config/bootstrap.js";

const { httpServer } = buildApp();

httpServer.start();
