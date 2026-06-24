import { env } from "./config/env.js";
import { IngestEventService } from "./domain/service/ingest-event.service.js";
import { HttpServer } from "./adapters/in/http/core/http-server.js";

const ingestEventService = new IngestEventService();
const server = new HttpServer(env.port, ingestEventService);

server.start();
