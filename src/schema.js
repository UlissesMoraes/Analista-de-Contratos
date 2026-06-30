'use strict';

/**
 * Esquema JSON para saída estruturada da análise de um contrato.
 * Compatível com output_config.format (json_schema) da API da Anthropic.
 * Mantém objetos com additionalProperties:false e campos required.
 */

const NIVEL_RISCO = { type: 'string', enum: ['Baixo', 'Médio', 'Alto', 'Crítico'] };

function obj(properties, required) {
  return {
    type: 'object',
    properties,
    required: required || Object.keys(properties),
    additionalProperties: false,
  };
}

const ANALYSIS_SCHEMA = obj({
  resumoExecutivo: obj({
    objetivo: { type: 'string' },
    partesEnvolvidas: { type: 'array', items: { type: 'string' } },
    tipoContrato: { type: 'string' },
    vigencia: { type: 'string' },
    dataInicio: { type: 'string' },
    dataTermino: { type: 'string' },
    renovacao: { type: 'string' },
    prazoRescisao: { type: 'string' },
    escopoServicos: { type: 'string' },
    obrigacoesPrincipais: { type: 'array', items: { type: 'string' } },
  }),

  matrizRiscos: {
    type: 'array',
    items: obj({
      clausula: { type: 'string' },
      risco: NIVEL_RISCO,
      impacto: { type: 'string', description: 'Ex.: Financeiro, Operacional, Jurídico, Fluxo de caixa' },
      observacao: { type: 'string' },
      trecho: { type: 'string' },
    }),
  },

  obrigacoesEmpresa: {
    type: 'array',
    items: obj({
      categoria: {
        type: 'string',
        description: 'Operacional, Financeira, Fiscal, Trabalhista, Ambiental, Segurança, LGPD, Compliance, Documentação, Qualidade, Treinamentos, Auditorias',
      },
      descricao: { type: 'string' },
      trecho: { type: 'string' },
    }),
  },

  obrigacoesCliente: {
    type: 'array',
    items: obj({
      descricao: { type: 'string' },
      trecho: { type: 'string' },
    }),
  },

  prazos: {
    type: 'array',
    items: obj({
      evento: { type: 'string' },
      prazo: { type: 'string' },
      tipo: { type: 'string', description: 'Ex.: Vigência, Renovação, Aviso prévio, Pagamento, Nota fiscal, Contestação, Multa, Reajuste, SLA, Operacional' },
      trecho: { type: 'string' },
    }),
  },

  analiseFinanceira: obj({
    prazoPagamento: { type: 'string' },
    formaPagamento: { type: 'string' },
    indiceReajuste: { type: 'string' },
    periodicidade: { type: 'string' },
    retencao: { type: 'string' },
    tributos: { type: 'string' },
    glosas: { type: 'string' },
    descontos: { type: 'string' },
    bonificacoes: { type: 'string' },
    onus: { type: 'string' },
    custosObrigatorios: { type: 'string' },
    responsabilidadeImpostos: { type: 'string' },
    garantiasFinanceiras: { type: 'string' },
    caucoes: { type: 'string' },
    observacoes: { type: 'string' },
  }),

  penalidades: {
    type: 'array',
    items: obj({
      tipo: { type: 'string', description: 'Ex.: Rescisória, Operacional, Administrativa, SLA, Atraso' },
      valorPercentual: { type: 'string' },
      quandoOcorre: { type: 'string' },
      quemPaga: { type: 'string' },
      limites: { type: 'string' },
      jurosCorrecao: { type: 'string' },
      impacto: NIVEL_RISCO,
      trecho: { type: 'string' },
    }),
  },

  seguros: {
    type: 'array',
    items: obj({
      tipo: { type: 'string', description: 'Ex.: RCF, RCTR-C, RCTRC, Ambiental, Patrimonial, Vida, Responsabilidade Civil' },
      coberturas: { type: 'string' },
      franquias: { type: 'string' },
      limites: { type: 'string' },
      seguradoraExigida: { type: 'string' },
      valorMinimo: { type: 'string' },
      prazoContratacao: { type: 'string' },
      renovacao: { type: 'string' },
      comprovacao: { type: 'string' },
      endossos: { type: 'string' },
      responsavelPagamento: { type: 'string' },
      riscoSeNaoExistir: { type: 'string' },
      trecho: { type: 'string' },
    }),
  },

  responsabilidades: obj({
    contratada: { type: 'array', items: { type: 'string' } },
    cliente: { type: 'array', items: { type: 'string' } },
    solidaria: { type: 'array', items: { type: 'string' } },
    subsidiaria: { type: 'array', items: { type: 'string' } },
    terceirosSubcontratados: { type: 'array', items: { type: 'string' } },
    funcionarios: { type: 'array', items: { type: 'string' } },
    danosPerdasFurtosRoubo: { type: 'array', items: { type: 'string' } },
    mercadoriasVeiculos: { type: 'array', items: { type: 'string' } },
  }),

  pontosCriticos: {
    type: 'array',
    items: obj({
      titulo: { type: 'string' },
      descricao: { type: 'string' },
      risco: NIVEL_RISCO,
      trecho: { type: 'string' },
    }),
  },

  resumoOperacao: obj({
    oQuePrecisaFazer: { type: 'array', items: { type: 'string' } },
    documentosObrigatorios: { type: 'array', items: { type: 'string' } },
    prazosChave: { type: 'array', items: { type: 'string' } },
    seguros: { type: 'array', items: { type: 'string' } },
    treinamentos: { type: 'array', items: { type: 'string' } },
    slas: { type: 'array', items: { type: 'string' } },
    itensCriticos: { type: 'array', items: { type: 'string' } },
  }),

  checklistOperacional: {
    type: 'array',
    items: obj({
      item: { type: 'string' },
      obrigatorio: { type: 'boolean' },
    }),
  },

  clausulasSuspeitas: {
    type: 'array',
    items: obj({
      expressao: { type: 'string', description: 'Ex.: "melhores esforços", "a exclusivo critério", "sem limitação", "independentemente de culpa"' },
      motivo: { type: 'string' },
      risco: NIVEL_RISCO,
      trecho: { type: 'string' },
    }),
  },

  recomendacoes: {
    type: 'array',
    items: obj({
      risco: { type: 'string' },
      motivo: { type: 'string' },
      impacto: { type: 'string' },
      probabilidade: { type: 'string', enum: ['Baixa', 'Média', 'Alta'] },
      comoNegociar: { type: 'string' },
      sugestaoAlteracao: { type: 'string' },
      sugestaoJuridica: { type: 'string' },
      prioridade: { type: 'string', enum: ['Baixa', 'Média', 'Alta', 'Crítica'] },
    }),
  },

  dashboard: obj({
    riscosBaixos: { type: 'integer' },
    riscosMedios: { type: 'integer' },
    riscosAltos: { type: 'integer' },
    riscosCriticos: { type: 'integer' },
    quantidadeMultas: { type: 'integer' },
    quantidadeObrigacoes: { type: 'integer' },
    quantidadeSeguros: { type: 'integer' },
    quantidadeDocumentos: { type: 'integer' },
    quantidadePrazos: { type: 'integer' },
    indiceGeralRisco: { type: 'integer', description: 'Índice de risco geral de 0 a 100' },
  }),

  informacoesAusentes: { type: 'array', items: { type: 'string' } },
  perguntasJuridico: { type: 'array', items: { type: 'string' } },
});

const COMPARISON_SCHEMA = obj({
  resumo: { type: 'string' },
  mudancas: { type: 'array', items: { type: 'string' } },
  novasMultas: { type: 'array', items: { type: 'string' } },
  novasResponsabilidades: { type: 'array', items: { type: 'string' } },
  alteracoesFinanceiras: { type: 'array', items: { type: 'string' } },
  alteracoesSeguro: { type: 'array', items: { type: 'string' } },
  alteracoesSLA: { type: 'array', items: { type: 'string' } },
  alteracoesPrazo: { type: 'array', items: { type: 'string' } },
  alteracoesReajuste: { type: 'array', items: { type: 'string' } },
  novosRiscos: { type: 'array', items: { type: 'string' } },
});

module.exports = { ANALYSIS_SCHEMA, COMPARISON_SCHEMA };
