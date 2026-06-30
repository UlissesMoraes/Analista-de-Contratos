'use strict';

require('dotenv').config();
const path = require('path');
const express = require('express');
const multer = require('multer');

const { extractText } = require('./src/parser');
const { analyzeContract, compareContracts, MODEL } = require('./src/analyzer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Limite de upload. Em produção na Vercel há um teto de plataforma de ~4,5 MB
// por requisição (independente deste valor). Localmente o padrão é 25 MB.
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 25);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
});

// Saúde / configuração
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    model: MODEL,
    apiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
  });
});

/**
 * Analisa um ou mais contratos enviados como arquivos ou texto colado.
 * Aceita: multipart com campo "contratos" (vários arquivos) e/ou
 *         campo de texto "texto" + "nome".
 */
app.post('/api/analisar', upload.array('contratos', 10), async (req, res) => {
  try {
    const documentos = [];

    // Arquivos enviados
    for (const file of req.files || []) {
      const texto = await extractText(file.buffer, file.originalname);
      documentos.push({ nome: file.originalname, texto });
    }

    // Texto colado (opcional)
    if (req.body && req.body.texto && req.body.texto.trim()) {
      documentos.push({
        nome: (req.body.nome && req.body.nome.trim()) || 'Contrato colado',
        texto: req.body.texto,
      });
    }

    if (documentos.length === 0) {
      return res.status(400).json({ erro: 'Nenhum contrato enviado. Anexe arquivos ou cole o texto.' });
    }

    // Analisa cada contrato sequencialmente (evita estourar limites de taxa)
    const resultados = [];
    for (const doc of documentos) {
      const analise = await analyzeContract(doc.texto, doc.nome);
      resultados.push({ nome: doc.nome, analise });
    }

    // Comparação automática quando houver dois ou mais
    let comparacao = null;
    if (resultados.length >= 2) {
      comparacao = await compareContracts(resultados);
    }

    res.json({ resultados, comparacao, model: MODEL });
  } catch (err) {
    console.error('Erro na análise:', err);
    res.status(500).json({ erro: err.message || 'Erro interno ao analisar o contrato.' });
  }
});

// Fallback para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicia o servidor apenas quando executado diretamente (dev/produção própria).
// Em ambiente serverless (Vercel), o app é importado como handler — não dá listen.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  Analista de Contratos rodando em http://localhost:${PORT}`);
    console.log(`  Modelo: ${MODEL}`);
    if (!process.env.OPENAI_API_KEY) {
      console.warn('  ⚠  OPENAI_API_KEY não configurada — defina antes de analisar.\n');
    } else {
      console.log('');
    }
  });
}

module.exports = app;
