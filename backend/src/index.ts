import express from "express";

class ApiServer {
  private app = express();

  constructor() {
    this.healthCheck();
  }
  
  healthCheck() {
    this.app.get("/health", (_req, res) => {
      res.status(200).send("OK");
    });
  }

  public start() {
    this.app.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
  }
}

const server = new ApiServer();
server.start();