'use strict';

const OpenAI = require('openai');
const {
  SYSTEM_PROMPT,
  buildUserPrompt,
  COMPARISON_SYSTEM_PROMPT,
  buildComparisonPrompt,
} = require('./prompt');
const { ANALYSIS_SCHEMA, COMPARISON_SCHEMA } = require('./schema');

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const REASONING_EFFORT = process.env.OPENAI_REASONING_EFFORT || null;

let client = null;
function getClient() {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada. Defina a variável de ambiente (veja .env.example).');
    }
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
      timeout: 10 * 60 * 1000, // 10 min para contratos longos
    });
  }
  return client;
}

/**
 * Executa uma chamada com saída estruturada (JSON Schema strict) e devolve o objeto.
 */
async function structuredCall({ system, user, schema, schemaName, maxTokens }) {
  const openai = getClient();

  const params = {
    model: MODEL,
    max_completion_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: schemaName, strict: true, schema },
    },
  };
  // reasoning_effort só é aceito por modelos de raciocínio (o-series / gpt-5)
  if (REASONING_EFFORT) params.reasoning_effort = REASONING_EFFORT;

  const completion = await openai.chat.completions.create(params);
  const msg = completion.choices && completion.choices[0] && completion.choices[0].message;
  if (!msg) throw new Error('Resposta vazia da OpenAI.');
  if (msg.refusal) {
    throw new Error('A IA recusou a análise deste documento: ' + msg.refusal);
  }
  if (completion.choices[0].finish_reason === 'length') {
    throw new Error('A resposta foi truncada (limite de tokens). Tente um contrato menor ou um modelo com saída maior.');
  }
  try {
    return JSON.parse(msg.content);
  } catch (e) {
    throw new Error('Não foi possível interpretar a resposta da IA como JSON: ' + e.message);
  }
}

/** Analisa um único contrato e retorna a análise estruturada. */
async function analyzeContract(contractText, contractName) {
  if (!contractText || !contractText.trim()) {
    throw new Error('O documento está vazio ou não foi possível extrair texto.');
  }
  return structuredCall({
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(contractText, contractName),
    schema: ANALYSIS_SCHEMA,
    schemaName: 'analise_contrato',
    maxTokens: 16000,
  });
}

/**
 * Compara duas ou mais análises e retorna o resultado estruturado.
 * @param {Array<{nome:string, analise:object}>} analyses
 */
async function compareContracts(analyses) {
  if (!analyses || analyses.length < 2) {
    throw new Error('A comparação exige pelo menos dois contratos.');
  }
  return structuredCall({
    system: COMPARISON_SYSTEM_PROMPT,
    user: buildComparisonPrompt(analyses),
    schema: COMPARISON_SCHEMA,
    schemaName: 'comparacao_contratos',
    maxTokens: 8000,
  });
}

module.exports = { analyzeContract, compareContracts, MODEL };
