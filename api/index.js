'use strict';

// Ponto de entrada serverless da Vercel.
// Reutiliza o mesmo app Express definido em server.js (que exporta o app
// e só chama listen() quando executado localmente).
module.exports = require('../server.js');
