# ⚖️ Analista de Contratos (IA Jurídica)

Aplicação web que analisa contratos (PDF, Word ou texto) com um **advogado corporativo sênior de IA** (OpenAI / GPT) e produz uma análise jurídica executiva completa: resumo, matriz de riscos, obrigações, prazos, análise financeira, penalidades, seguros, responsabilidades, pontos críticos, checklist operacional, cláusulas suspeitas, recomendações, dashboard executivo e comparação entre contratos.

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
#   edite .env e defina OPENAI_API_KEY=sk-...

# 3. Iniciar
npm start
```

Acesse **http://localhost:3000**, arraste os contratos e clique em **Analisar**.

> Alternativa: em vez do `.env`, você pode exportar `OPENAI_API_KEY` no ambiente. Para Azure OpenAI ou gateways compatíveis, defina `OPENAI_BASE_URL`.

## 🧱 Arquitetura

```
server.js              Servidor Express + rotas /api
src/parser.js          Extração de texto (pdf-parse, mammoth, txt)
src/prompt.js          Prompt mestre (persona de advogado sênior)
src/schema.js          Esquema JSON da análise (saída estruturada)
src/analyzer.js        Chamada à API OpenAI (Chat Completions + JSON Schema strict)
public/                Front-end (HTML + CSS + JS, sem build)
```

- **Modelo:** `gpt-4o` por padrão (configurável via `OPENAI_MODEL` — ex.: `gpt-4.1` para contratos longos, `gpt-5`/`o3`/`o4-mini` para raciocínio).
- **Saída estruturada** via `response_format: json_schema` com `strict: true`, garantindo JSON válido que nunca quebra a interface.
- Para modelos de raciocínio, defina `OPENAI_REASONING_EFFORT` (`low`/`medium`/`high`).

## ▲ Deploy na Vercel

A app já está adaptada para rodar como **função serverless** (`api/index.js` reaproveita o mesmo app Express; `vercel.json` roteia tudo para a função).

**Passos:**

1. Suba o repositório no GitHub e clique em **Add New… → Project** na Vercel (ou `vercel` via CLI).
2. Em **Settings → Environment Variables**, adicione:
   - `OPENAI_API_KEY` = sua chave
   - (opcional) `OPENAI_MODEL`, `OPENAI_REASONING_EFFORT`, `OPENAI_BASE_URL`
3. Deploy. Não há etapa de build — a Vercel apenas instala as dependências.

### ⚠️ Limitações da plataforma (importante)

A análise jurídica é uma operação **lenta** (a IA lê cláusula por cláusula), e o serverless da Vercel impõe limites:

| Limite | Hobby (grátis) | Pro |
|---|---|---|
| Tempo máximo por requisição (`maxDuration`) | **60 s** | até 300 s |
| Tamanho do corpo da requisição (upload) | **~4,5 MB** | ~4,5 MB |

- O `vercel.json` está com `maxDuration: 60` (teto do Hobby). **No Pro**, aumente para `300` para análises longas.
- **Múltiplos contratos + comparação** rodam em sequência e podem **estourar 60 s** no Hobby. Recomendações para caber no tempo:
  - Analise **um contrato por vez**.
  - Use um modelo mais rápido: `OPENAI_MODEL=gpt-4o-mini`.
- **Upload acima de ~4,5 MB é rejeitado pela Vercel** (limite de plataforma, antes de chegar na função). Para PDFs grandes, comprima/divida o arquivo ou cole o texto.
- Se precisar de análises realmente longas/pesadas sem esses tetos, um host de processo contínuo (Render, Railway, Fly.io) hospeda este mesmo código sem alterações (`npm start`).

## ⚠️ Aviso

Ferramenta de **apoio à decisão**. Não substitui parecer jurídico formal. Sempre valide com o jurídico antes de assinar.
