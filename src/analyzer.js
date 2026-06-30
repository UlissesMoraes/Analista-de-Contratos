'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const {
  SYSTEM_PROMPT,
  buildUserPrompt,
  COMPARISON_SYSTEM_PROMPT,
  buildComparisonPrompt,
} = require('./prompt');
const { ANALYSIS_SCHEMA, COMPARISON_SCHEMA } = require('./schema');

const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-8';

let client = null;
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY não configurada. Defina a variável de ambiente (veja .env.example).');
    }
    client = new Anthropic();
  }
  return client;
}

/** Extrai o JSON da resposta estruturada (primeiro bloco de texto). */
function parseStructured(message) {
  const block = message.content.find((b) => b.type === 'text');
  if (!block) throw new Error('Resposta da IA sem conteúdo de texto.');
  try {
    return JSON.parse(block.text);
  } catch (e) {
    throw new Error('Não foi possível interpretar a resposta da IA como JSON: ' + e.message);
  }
}

/**
 * Analisa um único contrato e retorna a análise estruturada.
 * Usa streaming para acomodar respostas longas sem timeout.
 */
async function analyzeContract(contractText, contractName) {
  if (!contractText || !contractText.trim()) {
    throw new Error('O documento está vazio ou não foi possível extrair texto.');
  }

  const anthropic = getClient();
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'high',
      format: { type: 'json_schema', schema: ANALYSIS_SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(contractText, contractName) }],
  });

  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') {
    throw new Error('A IA recusou a análise deste documento por questões de segurança.');
  }
  return parseStructured(message);
}

/**
 * Compara duas ou mais análises e retorna o resultado estruturado.
 * @param {Array<{nome:string, analise:object}>} analyses
 */
async function compareContracts(analyses) {
  if (!analyses || analyses.length < 2) {
    throw new Error('A comparação exige pelo menos dois contratos.');
  }

  const anthropic = getClient();
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'high',
      format: { type: 'json_schema', schema: COMPARISON_SCHEMA },
    },
    system: COMPARISON_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildComparisonPrompt(analyses) }],
  });

  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') {
    throw new Error('A IA recusou a comparação por questões de segurança.');
  }
  return parseStructured(message);
}

module.exports = { analyzeContract, compareContracts, MODEL };
