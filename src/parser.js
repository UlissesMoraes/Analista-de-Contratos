'use strict';

const path = require('path');
const mammoth = require('mammoth');

/**
 * Extrai texto de um arquivo de contrato (PDF, Word .docx, .doc ou texto).
 * @param {Buffer} buffer conteúdo do arquivo
 * @param {string} originalName nome original (usado para detectar a extensão)
 * @returns {Promise<string>} texto extraído
 */
async function extractText(buffer, originalName) {
  const ext = path.extname(originalName || '').toLowerCase();

  if (ext === '.pdf') {
    // require tardio: pdf-parse executa código no import que pode falhar em alguns ambientes
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.text || '';
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  if (ext === '.doc') {
    // .doc (binário antigo) não é suportado pelo mammoth de forma confiável.
    throw new Error('Formato .doc não suportado. Converta para .docx, PDF ou texto.');
  }

  if (ext === '.txt' || ext === '.md' || ext === '') {
    return buffer.toString('utf8');
  }

  // Tentativa final: tratar como texto puro
  return buffer.toString('utf8');
}

module.exports = { extractText };
