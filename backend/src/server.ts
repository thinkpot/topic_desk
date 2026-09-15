import { createServer } from "http";
import { Server } from "socket.io";
import { app } from "./app";
import { env } from "./lib/env";
import { attachSocketHandlers } from "./services/socket";

const httpServer = createServer(app);

const io = new Server(httpServer, {
  // The widget is embedded on arbitrary customer domains we can't know in advance,
  // so origins are validated per-chatbot (allowedDomains) inside the "join" handler instead.
  cors: {
    origin: true,
    methods: ["GET", "POST"],
  },
});
app.locals.io = io;

attachSocketHandlers(io);

httpServer.listen(env.port, () => {
  console.log(`Backend listening on port ${env.port}`);
});
