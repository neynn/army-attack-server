import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import { ServerContext } from './serverContext.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://127.0.0.1:5500",
        methods: ["GET", "POST"],
        credentials: true
    }
});
const serverContext = new ServerContext(io);
const __dirname = dirname(fileURLToPath(import.meta.url));

app.get('/', (request, response) => {
    response.sendFile(join(__dirname, 'index.html'));
});

server.listen(3000, () => {
    serverContext.start();
    console.log('server running at http://localhost:3000');
}); 