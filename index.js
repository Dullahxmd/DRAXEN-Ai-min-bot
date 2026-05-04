const express = require('express');
  const app = express();
  const path = require('path');
  const bodyParser = require("body-parser");
  const cors = require('cors');

  const __path = __dirname;
  const PORT = process.env.PORT || 8000;

  let core = require('./core');

  require('events').EventEmitter.defaultMaxListeners = 500;

  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // --- ROUTES ---
  app.use('/code', core);

  app.use('/', async (req, res) => {
      res.sendFile(path.join(__path, '/main.html'));
  });

  // --- START SERVER ---
  const server = app.listen(PORT, async () => {
      console.log(`
  ╭───(    \`Draxen-Ai Mini\`    )───
  > ───≫ 🚀 Sᴛᴀʀᴛᴜᴘ <<───
  > \`»\` 𝐒𝐭𝐚𝐭𝐮𝐬 : Started Successfully
  > \`»\` 𝐌𝐨𝐝𝐞 : Online & Ready
  > \`»\` 𝐏𝐨𝐫𝐭 : ${PORT}
  > \`»\` 𝐔𝐑𝐋 : http://localhost:${PORT}
  ╰──────────────────☉
  `);
  });

  // Graceful shutdown: let in-flight requests finish before exiting
  function gracefulShutdown(signal) {
      console.log(`[${signal}] Graceful shutdown — draining connections...`);
      server.close(() => {
          console.log('All connections closed. Exiting.');
          process.exit(0);
      });
      // Heroku gives 30s; force-exit after 28s if requests are still hanging
      setTimeout(() => {
          console.warn('Force-exit after timeout.');
          process.exit(0);
      }, 28000).unref();
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

  module.exports = app;
  