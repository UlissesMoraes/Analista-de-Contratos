# ⚖️ Analista de Contratos (IA Jurídica)

Aplicação web que analisa contratos (PDF, Word ou texto) com um **advogado corporativo sênior de IA** (Claude / Anthropic) e produz uma análise jurídica executiva completa: resumo, matriz de riscos, obrigações, prazos, análise financeira, penalidades, seguros, responsabilidades, pontos críticos, checklist operacional, cláusulas suspeitas, recomendações, dashboard executivo e comparação entre contratos.

## ✨ Funcionalidades

A IA executa automaticamente as 17 etapas da análise:

1. **Resumo Executivo** — objetivo, partes, tipo, vigência, datas, renovação, rescisão, escopo, obrigações.
2. **Matriz de Riscos** — cada cláusula classificada em Baixo / Médio / Alto / Crítico.
3. **Obrigações da Contratada** — por categoria (Operacional, Financeira, Fiscal, Trabalhista, Ambiental, Segurança, LGPD, Compliance, Documentação, Qualidade, Treinamentos, Auditorias).
4. **Obrigações do Cliente**.
5. **Prazos Importantes** — em linha do tempo cronológica.
6. **Análise Financeira** — pagamento, reajuste, retenção, tributos, glosas, garantias, cauções…
7. **Penalidades** — todas as multas, valores, gatilhos, limites, juros, impacto.
8. **Seguros** — tipos (RCF, RCTR-C, ambiental, patrimonial…), coberturas, franquias, limites, prazos.
9. **Responsabilidades** — contratada, cliente, solidária, subsidiária, terceiros, danos, mercadorias.
10. **Pontos Críticos** — cláusulas perigosas (responsabilidade ilimitada, rescisão unilateral, etc.).
11. **Resumo para Operação** — o que executar na prática.
12. **Checklist Operacional** — itens com caixas de seleção.
13. **Cláusulas Suspeitas** — expressões ambíguas ("melhores esforços", "a exclusivo critério"…).
14. **Recomendações** — risco, motivo, impacto, probabilidade, como negociar, prioridade.
15. **Dashboard Executivo** — indicadores e índice geral de risco (0–100).
16. **Comparação entre Contratos** — automática quando há 2 ou mais.
17. **Exportação** — PDF, Word, Excel, Markdown, JSON, Checklist.

A IA **cita o trecho original** de cada cláusula, explica termos em linguagem simples, destaca riscos ocultos e aponta informações ausentes/ambíguas e perguntas para o jurídico.

## 🚀 Como rodar

```bash
# 1. Instalar dependências
npm install

# 2. Configurar a chave da API
cp .env.example .env
#   edite .env e defina ANTHROPIC_API_KEY=sk-ant-...

# 3. Iniciar
npm start
```

Acesse **http://localhost:3000**, arraste os contratos e clique em **Analisar**.

> Alternativa de autenticação: em vez do `.env`, você pode exportar `ANTHROPIC_API_KEY` no ambiente, ou usar um perfil do `ant auth login` — o SDK resolve as credenciais automaticamente.

## 🧱 Arquitetura

```
server.js              Servidor Express + rotas /api
src/parser.js          Extração de texto (pdf-parse, mammoth, txt)
src/prompt.js          Prompt mestre (persona de advogado sênior)
src/schema.js          Esquema JSON da análise (saída estruturada)
src/analyzer.js        Chamada à API Claude (Opus 4.8, structured outputs)
public/                Front-end (HTML + CSS + JS, sem build)
```

- **Modelo:** `claude-opus-4-8` (configurável via `CLAUDE_MODEL`), com *adaptive thinking*, *effort high* e **saída estruturada** (`output_config.format`) garantindo JSON válido.
- **Streaming** é usado para acomodar respostas longas sem timeout.

## ⚠️ Aviso

Ferramenta de **apoio à decisão**. Não substitui parecer jurídico formal. Sempre valide com o jurídico antes de assinar.
