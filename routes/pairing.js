'use strict';

  const express = require('express');

  module.exports = function createPairingRouter(ToxicPair) {
      const router = express.Router();

      router.get('/', async function (req, res) {
          const number = req.query.number;
          if (!number) return res.status(400).json({ error: 'Number required.' });
          ToxicPair(number, res).catch(function () {
              if (!res.headersSent) res.status(500).json({ error: 'Internal error' });
          });
      });

      return router;
  };
  
