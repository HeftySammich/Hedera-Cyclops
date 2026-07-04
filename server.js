// Custom Next.js server with a co-located Socket.IO instance.
// Railway runs this as a normal long-lived Node process, which lets us hold
// persistent websocket connections (Town Hall live updates) and DB pools.
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: '/api/socket',
    cors: { origin: process.env.NEXT_PUBLIC_APP_URL || true },
  });

  io.on('connection', (socket) => {
    // Rooms let clients scope to the Town Hall feed (and a per-thread room).
    socket.on('join', (room) => {
      if (typeof room === 'string' && room.length < 128) socket.join(room);
    });
    socket.on('leave', (room) => {
      if (typeof room === 'string') socket.leave(room);
    });
  });

  // Expose the io instance to API route handlers running in this same process.
  globalThis.__townHallIO = io;

  httpServer
    .once('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('server error', err);
      process.exit(1);
    })
    .listen(port, hostname, () => {
      // eslint-disable-next-line no-console
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
