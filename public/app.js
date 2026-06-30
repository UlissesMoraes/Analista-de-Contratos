'use strict';

/* ====================== Estado ====================== */
const state = { files: [], lastResponse: null };

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const has = (a) => Array.isArray(a) && a.length > 0;

/* ====================== Saúde / modelo ====================== */
fetch('/api/health')
  .then((r) => r.json())
  .then((d) => {
    $('#modelMeta').textContent = `modelo: ${d.model}${d.apiKeyConfigured ? '' : ' · ⚠ chave não configurada'}`;
  })
  .catch(() => {});

/* ====================== Upload UI ====================== */
const dropzone = $('#dropzone');
const fileInput = $('#fileInput');

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag');
  addFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', () => addFiles(fileInput.files));

function addFiles(list) {
  for (const f of list) state.files.push(f);
  renderFileList();
}
function renderFileList() {
  const ul = $('#fileList');
  ul.innerHTML = '';
  state.files.forEach((f, i) => {
    const li = el('li', null, `<span>📄 ${esc(f.name)} <span class="muted">(${(f.size / 1024).toFixed(0)} KB)</span></span>`);
    const rm = el('button', 'rm', '✕');
    rm.onclick = () => { state.files.splice(i, 1); renderFileList(); };
    li.appendChild(rm);
    ul.appendChild(li);
  });
}

$('#clearBtn').onclick = () => {
  state.files = [];
  $('#pasteText').value = '';
  $('#pasteName').value = '';
  renderFileList();
  $('#results').hidden = true;
  $('#errorMsg').hidden = true;
};

/* ====================== Analisar ====================== */
$('#analyzeBtn').onclick = async () => {
  const err = $('#errorMsg');
  err.hidden = true;
  const pasteText = $('#pasteText').value.trim();
  if (state.files.length === 0 && !pasteText) {
    err.textContent = 'Anexe ao menos um arquivo ou cole o texto de um contrato.';
    err.hidden = false;
    return;
  }

  const fd = new FormData();
  state.files.forEach((f) => fd.append('contratos', f));
  if (pasteText) {
    fd.append('texto', pasteText);
    fd.append('nome', $('#pasteName').value.trim() || 'Contrato colado');
  }

  const total = state.files.length + (pasteText ? 1 : 0);
  $('#loadingTitle').textContent = total > 1 ? `Analisando ${total} contratos...` : 'Analisando contrato...';
  $('#loadingCard').hidden = false;
  $('#results').hidden = true;
  $('#analyzeBtn').disabled = true;

  try {
    const res = await fetch('/api/analisar', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Erro na análise.');
    state.lastResponse = data;
    renderResults(data);
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  } finally {
    $('#loadingCard').hidden = true;
    $('#analyzeBtn').disabled = false;
  }
};

/* ====================== Render ====================== */
function renderResults(data) {
  const root = $('#results');
  root.innerHTML = '';
  root.hidden = false;

  data.resultados.forEach((r, idx) => root.appendChild(renderContract(r, idx)));
  if (data.comparacao) root.appendChild(renderComparison(data.comparacao, data.resultados));

  root.scrollIntoView({ behavior: 'smooth' });
}

function section(title, count, bodyNode, open) {
  const d = el('details', 'section');
  if (open) d.open = true;
  const sum = el('summary', null,
    `<span class="chev">▸</span><span>${esc(title)}</span>${count != null ? `<span class="count">${count}</span>` : ''}`);
  d.appendChild(sum);
  const body = el('div', 'section-body');
  body.appendChild(bodyNode);
  d.appendChild(body);
  return d;
}

function emptyNode(msg) { return el('p', 'empty', esc(msg || 'Não consta no documento.')); }

function trechoNode(t) {
  if (!t || /não localizado/i.test(t)) return '';
  return `<span class="trecho">“${esc(t)}”</span>`;
}

function renderContract(r, idx) {
  const a = r.analise || {};
  const wrap = el('div', 'result-block');
  wrap.id = `contrato-${idx}`;

  // Cabeçalho + exportações
  const head = el('div', 'contract-head');
  head.appendChild(el('h2', null, `📑 ${esc(r.nome)}`));
  const bar = el('div', 'export-bar');
  [
    ['PDF', () => exportPDF()],
    ['Word', () => exportWord(r)],
    ['Excel', () => exportExcel(r)],
    ['Markdown', () => exportMarkdown(r)],
    ['JSON', () => exportJSON(r)],
    ['Checklist', () => exportChecklist(r)],
  ].forEach(([lbl, fn]) => {
    const b = el('button', 'btn ghost small', lbl);
    b.onclick = fn;
    bar.appendChild(b);
  });
  head.appendChild(bar);
  wrap.appendChild(head);

  // 15. Dashboard executivo (sempre aberto, no topo)
  wrap.appendChild(renderDashboard(a.dashboard || {}));

  // 1. Resumo executivo
  wrap.appendChild(section('1 · Resumo Executivo', null, renderResumo(a.resumoExecutivo || {}), true));
  // 2. Matriz de riscos
  wrap.appendChild(section('2 · Matriz de Riscos', countOf(a.matrizRiscos), renderMatriz(a.matrizRiscos)));
  // 3. Obrigações da empresa
  wrap.appendChild(section('3 · Obrigações da Contratada', countOf(a.obrigacoesEmpresa), renderObrigacoesEmpresa(a.obrigacoesEmpresa)));
  // 4. Obrigações do cliente
  wrap.appendChild(section('4 · Obrigações do Cliente', countOf(a.obrigacoesCliente), renderObrigacoesCliente(a.obrigacoesCliente)));
  // 5. Prazos (linha do tempo)
  wrap.appendChild(section('5 · Prazos Importantes', countOf(a.prazos), renderPrazos(a.prazos)));
  // 6. Análise financeira
  wrap.appendChild(section('6 · Análise Financeira', null, renderFinanceira(a.analiseFinanceira || {})));
  // 7. Penalidades
  wrap.appendChild(section('7 · Penalidades', countOf(a.penalidades), renderPenalidades(a.penalidades)));
  // 8. Seguros
  wrap.appendChild(section('8 · Seguros', countOf(a.seguros), renderSeguros(a.seguros)));
  // 9. Responsabilidades
  wrap.appendChild(section('9 · Responsabilidades', null, renderResponsabilidades(a.responsabilidades || {})));
  // 10. Pontos críticos
  wrap.appendChild(section('10 · Pontos Críticos', countOf(a.pontosCriticos), renderPontosCriticos(a.pontosCriticos)));
  // 11. Resumo para operação
  wrap.appendChild(section('11 · Resumo para Operação', null, renderResumoOperacao(a.resumoOperacao || {})));
  // 12. Checklist operacional
  wrap.appendChild(section('12 · Checklist Operacional', countOf(a.checklistOperacional), renderChecklist(a.checklistOperacional)));
  // 13. Cláusulas suspeitas
  wrap.appendChild(section('13 · Cláusulas Suspeitas', countOf(a.clausulasSuspeitas), renderSuspeitas(a.clausulasSuspeitas)));
  // 14. Recomendações
  wrap.appendChild(section('14 · Recomendações', countOf(a.recomendacoes), renderRecomendacoes(a.recomendacoes)));
  // Extra: ausências e perguntas ao jurídico
  wrap.appendChild(section('⚠ Informações Ausentes / Ambíguas', countOf(a.informacoesAusentes), renderListaSimples(a.informacoesAusentes, 'Nenhuma informação ausente apontada.')));
  wrap.appendChild(section('❓ Perguntas para o Jurídico', countOf(a.perguntasJuridico), renderListaSimples(a.perguntasJuridico, 'Nenhuma pergunta sugerida.')));

  return wrap;
}

function countOf(arr) { return Array.isArray(arr) ? `${arr.length}` : '0'; }

/* ---- 15. Dashboard ---- */
function renderDashboard(d) {
  const card = el('div', 'card');
  card.appendChild(el('h3', 'section-title', 'Dashboard Executivo'));
  const grid = el('div', 'dashboard');
  const kpis = [
    ['baixo', d.riscosBaixos, '🟢 Riscos Baixos'],
    ['medio', d.riscosMedios, '🟡 Riscos Médios'],
    ['alto', d.riscosAltos, '🟠 Riscos Altos'],
    ['critico', d.riscosCriticos, '🔴 Riscos Críticos'],
    ['', d.quantidadeMultas, 'Multas'],
    ['', d.quantidadeObrigacoes, 'Obrigações'],
    ['', d.quantidadeSeguros, 'Seguros'],
    ['', d.quantidadeDocumentos, 'Documentos'],
    ['', d.quantidadePrazos, 'Prazos'],
  ];
  kpis.forEach(([cls, num, lbl]) => {
    grid.appendChild(el('div', `kpi ${cls}`, `<div class="num">${num != null ? num : '—'}</div><div class="lbl">${lbl}</div>`));
  });

  // Índice geral de risco
  const v = Number(d.indiceGeralRisco);
  if (!Number.isNaN(v)) {
    const color = v >= 75 ? 'var(--critico)' : v >= 50 ? 'var(--alto)' : v >= 25 ? 'var(--medio)' : 'var(--baixo)';
    const gauge = el('div', 'kpi risk-gauge');
    gauge.innerHTML = `
      <div class="lbl" style="text-align:left">Índice geral de risco</div>
      <div class="gtrack"><div class="gfill" style="width:${Math.min(100, Math.max(0, v))}%;background:${color}"></div></div>
      <div class="gval" style="color:${color}">${v}/100</div>`;
    grid.appendChild(gauge);
  }
  card.appendChild(grid);
  return card;
}

/* ---- 1. Resumo ---- */
function renderResumo(r) {
  const dl = el('dl', 'kv');
  const rows = [
    ['Objetivo', r.objetivo],
    ['Partes envolvidas', has(r.partesEnvolvidas) ? r.partesEnvolvidas.join(' · ') : ''],
    ['Tipo de contrato', r.tipoContrato],
    ['Vigência', r.vigencia],
    ['Data de início', r.dataInicio],
    ['Data de término', r.dataTermino],
    ['Renovação', r.renovacao],
    ['Prazo para rescisão', r.prazoRescisao],
    ['Escopo dos serviços', r.escopoServicos],
  ];
  rows.forEach(([k, v]) => {
    dl.appendChild(el('dt', null, esc(k)));
    dl.appendChild(el('dd', null, v ? esc(v) : '<span class="empty">—</span>'));
  });
  const wrap = el('div');
  wrap.appendChild(dl);
  if (has(r.obrigacoesPrincipais)) {
    wrap.appendChild(el('h4', null, 'Obrigações principais'));
    const ul = el('ul', 'bullets');
    r.obrigacoesPrincipais.forEach((o) => ul.appendChild(el('li', null, esc(o))));
    wrap.appendChild(ul);
  }
  return wrap;
}

/* ---- 2. Matriz de riscos ---- */
function renderMatriz(arr) {
  if (!has(arr)) return emptyNode('Nenhum risco mapeado.');
  return tableNode(['Cláusula', 'Risco', 'Impacto', 'Observação'], arr.map((x) => [
    `${esc(x.clausula)}${trechoNode(x.trecho)}`,
    badge(x.risco),
    esc(x.impacto),
    esc(x.observacao),
  ]));
}

/* ---- 3. Obrigações empresa (por categoria) ---- */
function renderObrigacoesEmpresa(arr) {
  if (!has(arr)) return emptyNode('Nenhuma obrigação da contratada extraída.');
  const groups = {};
  arr.forEach((o) => { (groups[o.categoria || 'Outras'] ||= []).push(o); });
  const wrap = el('div');
  Object.keys(groups).sort().forEach((cat) => {
    wrap.appendChild(el('h4', null, `<span class="badge cat">${esc(cat)}</span>`));
    const ul = el('ul', 'bullets');
    groups[cat].forEach((o) => ul.appendChild(el('li', null, `${esc(o.descricao)}${trechoNode(o.trecho)}`)));
    wrap.appendChild(ul);
  });
  return wrap;
}

/* ---- 4. Obrigações cliente ---- */
function renderObrigacoesCliente(arr) {
  if (!has(arr)) return emptyNode('Nenhuma obrigação do cliente extraída.');
  const ul = el('ul', 'bullets');
  arr.forEach((o) => ul.appendChild(el('li', null, `${esc(o.descricao)}${trechoNode(o.trecho)}`)));
  return ul;
}

/* ---- 5. Prazos (linha do tempo) ---- */
function renderPrazos(arr) {
  if (!has(arr)) return emptyNode('Nenhum prazo identificado.');
  const ul = el('ul', 'timeline');
  arr.forEach((p) => {
    const li = el('li');
    li.innerHTML = `<div class="tp">${esc(p.tipo || '')}</div>
      <span class="ev">${esc(p.evento)}</span> — <span class="pz">${esc(p.prazo)}</span>${trechoNode(p.trecho)}`;
    ul.appendChild(li);
  });
  return ul;
}

/* ---- 6. Financeira ---- */
function renderFinanceira(f) {
  const map = [
    ['Prazo de pagamento', f.prazoPagamento], ['Forma de pagamento', f.formaPagamento],
    ['Índice de reajuste', f.indiceReajuste], ['Periodicidade', f.periodicidade],
    ['Retenção', f.retencao], ['Tributos', f.tributos], ['Glosas', f.glosas],
    ['Descontos', f.descontos], ['Bonificações', f.bonificacoes], ['Ônus', f.onus],
    ['Custos obrigatórios', f.custosObrigatorios], ['Responsabilidade por impostos', f.responsabilidadeImpostos],
    ['Garantias financeiras', f.garantiasFinanceiras], ['Cauções', f.caucoes],
  ];
  const dl = el('dl', 'kv');
  map.forEach(([k, v]) => {
    dl.appendChild(el('dt', null, esc(k)));
    dl.appendChild(el('dd', null, v ? esc(v) : '<span class="empty">—</span>'));
  });
  const wrap = el('div');
  wrap.appendChild(dl);
  if (f.observacoes) wrap.appendChild(el('p', 'muted', esc(f.observacoes)));
  return wrap;
}

/* ---- 7. Penalidades ---- */
function renderPenalidades(arr) {
  if (!has(arr)) return emptyNode('Nenhuma penalidade/multa identificada.');
  const grid = el('div', 'cards-grid');
  arr.forEach((p) => {
    const m = el('div', 'mini');
    m.innerHTML = `
      <h4>${esc(p.tipo || 'Multa')} ${badge(p.impacto)}</h4>
      <p class="field"><b>Valor/%:</b> ${esc(p.valorPercentual) || '—'}</p>
      <p class="field"><b>Quando:</b> ${esc(p.quandoOcorre) || '—'}</p>
      <p class="field"><b>Quem paga:</b> ${esc(p.quemPaga) || '—'}</p>
      <p class="field"><b>Limites:</b> ${esc(p.limites) || '—'}</p>
      <p class="field"><b>Juros/correção:</b> ${esc(p.jurosCorrecao) || '—'}</p>
      ${trechoNode(p.trecho)}`;
    grid.appendChild(m);
  });
  return grid;
}

/* ---- 8. Seguros ---- */
function renderSeguros(arr) {
  if (!has(arr)) return emptyNode('Nenhum seguro exigido identificado.');
  const grid = el('div', 'cards-grid');
  arr.forEach((s) => {
    const m = el('div', 'mini');
    const fields = [
      ['Coberturas', s.coberturas], ['Franquias', s.franquias], ['Limites', s.limites],
      ['Seguradora exigida', s.seguradoraExigida], ['Valor mínimo', s.valorMinimo],
      ['Prazo p/ contratar', s.prazoContratacao], ['Renovação', s.renovacao],
      ['Comprovação', s.comprovacao], ['Endossos', s.endossos], ['Pagamento', s.responsavelPagamento],
    ];
    m.innerHTML = `<h4>🛡 ${esc(s.tipo || 'Seguro')}</h4>` +
      fields.filter(([, v]) => v).map(([k, v]) => `<p class="field"><b>${esc(k)}:</b> ${esc(v)}</p>`).join('') +
      (s.riscoSeNaoExistir ? `<p class="field" style="color:var(--critico)"><b>Risco se não existir:</b> ${esc(s.riscoSeNaoExistir)}</p>` : '') +
      trechoNode(s.trecho);
    grid.appendChild(m);
  });
  return grid;
}

/* ---- 9. Responsabilidades ---- */
function renderResponsabilidades(r) {
  const map = [
    ['Contratada', r.contratada], ['Cliente', r.cliente],
    ['Solidária', r.solidaria], ['Subsidiária', r.subsidiaria],
    ['Terceiros / Subcontratados', r.terceirosSubcontratados],
    ['Funcionários', r.funcionarios],
    ['Danos / Perdas / Furtos / Roubo', r.danosPerdasFurtosRoubo],
    ['Mercadorias / Veículos', r.mercadoriasVeiculos],
  ].filter(([, v]) => has(v));
  if (map.length === 0) return emptyNode('Responsabilidades não detalhadas.');
  const wrap = el('div');
  map.forEach(([k, v]) => {
    wrap.appendChild(el('h4', null, esc(k)));
    const ul = el('ul', 'bullets');
    v.forEach((i) => ul.appendChild(el('li', null, esc(i))));
    wrap.appendChild(ul);
  });
  return wrap;
}

/* ---- 10. Pontos críticos ---- */
function renderPontosCriticos(arr) {
  if (!has(arr)) return emptyNode('Nenhum ponto crítico encontrado.');
  const grid = el('div', 'cards-grid');
  arr.forEach((p) => {
    const m = el('div', 'mini');
    m.innerHTML = `<h4>${esc(p.titulo)} ${badge(p.risco)}</h4><p>${esc(p.descricao)}</p>${trechoNode(p.trecho)}`;
    grid.appendChild(m);
  });
  return grid;
}

/* ---- 11. Resumo operação ---- */
function renderResumoOperacao(o) {
  const blocks = [
    ['O que precisa fazer', o.oQuePrecisaFazer], ['Documentos obrigatórios', o.documentosObrigatorios],
    ['Prazos-chave', o.prazosChave], ['Seguros', o.seguros], ['Treinamentos', o.treinamentos],
    ['SLAs', o.slas], ['Itens críticos', o.itensCriticos],
  ].filter(([, v]) => has(v));
  if (blocks.length === 0) return emptyNode('Sem resumo operacional.');
  const wrap = el('div', 'cards-grid');
  blocks.forEach(([k, v]) => {
    const m = el('div', 'mini');
    m.appendChild(el('h4', null, esc(k)));
    const ul = el('ul', 'bullets');
    v.forEach((i) => ul.appendChild(el('li', null, esc(i))));
    m.appendChild(ul);
    wrap.appendChild(m);
  });
  return wrap;
}

/* ---- 12. Checklist ---- */
function renderChecklist(arr) {
  if (!has(arr)) return emptyNode('Sem itens de checklist.');
  const ul = el('ul', 'checklist');
  arr.forEach((c) => {
    const li = el('li');
    li.innerHTML = `<input type="checkbox"><span>${esc(c.item)} ${c.obrigatorio ? '<span class="req">obrigatório</span>' : ''}</span>`;
    ul.appendChild(li);
  });
  return ul;
}

/* ---- 13. Cláusulas suspeitas ---- */
function renderSuspeitas(arr) {
  if (!has(arr)) return emptyNode('Nenhuma cláusula suspeita detectada.');
  return tableNode(['Expressão', 'Risco', 'Motivo'], arr.map((x) => [
    `<b>${esc(x.expressao)}</b>${trechoNode(x.trecho)}`,
    badge(x.risco),
    esc(x.motivo),
  ]));
}

/* ---- 14. Recomendações ---- */
function renderRecomendacoes(arr) {
  if (!has(arr)) return emptyNode('Nenhuma recomendação.');
  const grid = el('div', 'cards-grid');
  arr.forEach((r) => {
    const m = el('div', 'mini');
    m.innerHTML = `
      <h4>${esc(r.risco)} ${badge(r.prioridade)}</h4>
      <p class="field"><b>Motivo:</b> ${esc(r.motivo)}</p>
      <p class="field"><b>Impacto:</b> ${esc(r.impacto)} · <b>Probabilidade:</b> ${esc(r.probabilidade)}</p>
      <p class="field"><b>Como negociar:</b> ${esc(r.comoNegociar)}</p>
      <p class="field"><b>Sugestão de alteração:</b> ${esc(r.sugestaoAlteracao)}</p>
      <p class="field"><b>Sugestão jurídica:</b> ${esc(r.sugestaoJuridica)}</p>`;
    grid.appendChild(m);
  });
  return grid;
}

function renderListaSimples(arr, msg) {
  if (!has(arr)) return emptyNode(msg);
  const ul = el('ul', 'bullets');
  arr.forEach((i) => ul.appendChild(el('li', null, esc(i))));
  return ul;
}

/* ---- 16. Comparação ---- */
function renderComparison(c, resultados) {
  const card = el('div', 'card');
  card.appendChild(el('h2', null, '🔍 Comparação entre Contratos'));
  card.appendChild(el('p', 'muted', `Comparando: ${resultados.map((r) => esc(r.nome)).join(' × ')}`));
  if (c.resumo) card.appendChild(el('p', null, esc(c.resumo)));
  const blocks = [
    ['Mudanças', c.mudancas], ['Novas multas', c.novasMultas], ['Novas responsabilidades', c.novasResponsabilidades],
    ['Alterações financeiras', c.alteracoesFinanceiras], ['Alterações de seguro', c.alteracoesSeguro],
    ['Alterações de SLA', c.alteracoesSLA], ['Alterações de prazo', c.alteracoesPrazo],
    ['Alterações de reajuste', c.alteracoesReajuste], ['Novos riscos', c.novosRiscos],
  ].filter(([, v]) => has(v));
  const grid = el('div', 'cards-grid');
  blocks.forEach(([k, v]) => {
    const m = el('div', 'mini');
    m.appendChild(el('h4', null, esc(k)));
    const ul = el('ul', 'bullets');
    v.forEach((i) => ul.appendChild(el('li', null, esc(i))));
    m.appendChild(ul);
    grid.appendChild(m);
  });
  card.appendChild(grid);
  return card;
}

/* ====================== Helpers de render ====================== */
function badge(level) {
  if (!level) return '';
  return `<span class="badge ${esc(level)}">${esc(level)}</span>`;
}
function tableNode(headers, rows) {
  const t = el('table');
  const thead = el('thead');
  thead.innerHTML = `<tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`;
  t.appendChild(thead);
  const tb = el('tbody');
  rows.forEach((r) => {
    const tr = el('tr');
    r.forEach((cell) => { const td = el('td'); td.innerHTML = cell; tr.appendChild(td); });
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  return t;
}

/* ====================== Exportações ====================== */
function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const slug = (s) => String(s || 'contrato').replace(/[^\w\-]+/g, '_').slice(0, 60);

function exportPDF() {
  // Abre todas as seções para a impressão e dispara o diálogo (salvar como PDF).
  document.querySelectorAll('details.section').forEach((d) => (d.open = true));
  window.print();
}

function exportJSON(r) {
  download(`${slug(r.nome)}.json`, JSON.stringify(r.analise, null, 2), 'application/json');
}

function exportMarkdown(r) {
  download(`${slug(r.nome)}.md`, toMarkdown(r), 'text/markdown');
}

function exportChecklist(r) {
  const items = (r.analise.checklistOperacional || []).map((c) => `☐ ${c.item}${c.obrigatorio ? ' (obrigatório)' : ''}`);
  download(`checklist_${slug(r.nome)}.txt`, `CHECKLIST OPERACIONAL — ${r.nome}\n\n${items.join('\n')}\n`, 'text/plain');
}

function exportWord(r) {
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head><meta charset='utf-8'><title>${esc(r.nome)}</title></head>
  <body style="font-family:Calibri,Arial,sans-serif">${markdownToBasicHtml(toMarkdown(r))}</body></html>`;
  download(`${slug(r.nome)}.doc`, html, 'application/msword');
}

function exportExcel(r) {
  // Gera um .xls (HTML table) com matriz de riscos, penalidades, seguros e prazos.
  const a = r.analise;
  const tbl = (title, headers, rows) =>
    `<tr><td colspan="${headers.length}" style="background:#1a2238;color:#fff;font-weight:bold">${esc(title)}</td></tr>` +
    `<tr>${headers.map((h) => `<th style="background:#eee">${esc(h)}</th>`).join('')}</tr>` +
    rows.map((r2) => `<tr>${r2.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('') +
    `<tr><td colspan="${headers.length}"></td></tr>`;

  let body = '';
  if (has(a.matrizRiscos)) body += tbl('Matriz de Riscos', ['Cláusula', 'Risco', 'Impacto', 'Observação'],
    a.matrizRiscos.map((x) => [x.clausula, x.risco, x.impacto, x.observacao]));
  if (has(a.penalidades)) body += tbl('Penalidades', ['Tipo', 'Valor/%', 'Quando', 'Quem paga', 'Limites', 'Impacto'],
    a.penalidades.map((x) => [x.tipo, x.valorPercentual, x.quandoOcorre, x.quemPaga, x.limites, x.impacto]));
  if (has(a.seguros)) body += tbl('Seguros', ['Tipo', 'Cobertura', 'Valor mínimo', 'Prazo', 'Responsável'],
    a.seguros.map((x) => [x.tipo, x.coberturas, x.valorMinimo, x.prazoContratacao, x.responsavelPagamento]));
  if (has(a.prazos)) body += tbl('Prazos', ['Evento', 'Prazo', 'Tipo'],
    a.prazos.map((x) => [x.evento, x.prazo, x.tipo]));

  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns='http://www.w3.org/TR/REC-html40'>
  <head><meta charset='utf-8'></head><body><table border="1">${body}</table></body></html>`;
  download(`${slug(r.nome)}.xls`, html, 'application/vnd.ms-excel');
}

function toMarkdown(r) {
  const a = r.analise;
  const d = a.dashboard || {};
  const list = (arr, fn) => (has(arr) ? arr.map(fn).join('\n') : '_Não consta._');
  const re = a.resumoExecutivo || {};
  let md = `# Análise de Contrato — ${r.nome}\n\n`;
  md += `## Dashboard Executivo\n`;
  md += `- 🟢 Baixos: ${d.riscosBaixos ?? '—'} · 🟡 Médios: ${d.riscosMedios ?? '—'} · 🟠 Altos: ${d.riscosAltos ?? '—'} · 🔴 Críticos: ${d.riscosCriticos ?? '—'}\n`;
  md += `- Multas: ${d.quantidadeMultas ?? '—'} · Obrigações: ${d.quantidadeObrigacoes ?? '—'} · Seguros: ${d.quantidadeSeguros ?? '—'} · Prazos: ${d.quantidadePrazos ?? '—'}\n`;
  md += `- **Índice geral de risco: ${d.indiceGeralRisco ?? '—'}/100**\n\n`;

  md += `## 1. Resumo Executivo\n`;
  md += `- **Objetivo:** ${re.objetivo || '—'}\n- **Partes:** ${(re.partesEnvolvidas || []).join(', ') || '—'}\n`;
  md += `- **Tipo:** ${re.tipoContrato || '—'}\n- **Vigência:** ${re.vigencia || '—'}\n- **Início:** ${re.dataInicio || '—'} · **Término:** ${re.dataTermino || '—'}\n`;
  md += `- **Renovação:** ${re.renovacao || '—'}\n- **Prazo rescisão:** ${re.prazoRescisao || '—'}\n- **Escopo:** ${re.escopoServicos || '—'}\n\n`;

  md += `## 2. Matriz de Riscos\n`;
  md += `| Cláusula | Risco | Impacto | Observação |\n|---|---|---|---|\n`;
  md += has(a.matrizRiscos) ? a.matrizRiscos.map((x) => `| ${x.clausula || ''} | ${x.risco || ''} | ${x.impacto || ''} | ${x.observacao || ''} |`).join('\n') + '\n\n' : '_Não consta._\n\n';

  md += `## 3. Obrigações da Contratada\n${list(a.obrigacoesEmpresa, (o) => `- _(${o.categoria})_ ${o.descricao}`)}\n\n`;
  md += `## 4. Obrigações do Cliente\n${list(a.obrigacoesCliente, (o) => `- ${o.descricao}`)}\n\n`;
  md += `## 5. Prazos Importantes\n${list(a.prazos, (p) => `- **${p.evento}** — ${p.prazo} _(${p.tipo || ''})_`)}\n\n`;

  const f = a.analiseFinanceira || {};
  md += `## 6. Análise Financeira\n`;
  md += `- **Pagamento:** ${f.prazoPagamento || '—'} (${f.formaPagamento || '—'})\n- **Reajuste:** ${f.indiceReajuste || '—'} (${f.periodicidade || '—'})\n- **Tributos:** ${f.tributos || '—'}\n- **Garantias:** ${f.garantiasFinanceiras || '—'}\n\n`;

  md += `## 7. Penalidades\n${list(a.penalidades, (p) => `- **${p.tipo}** (${p.impacto}): ${p.valorPercentual} — ${p.quandoOcorre}`)}\n\n`;
  md += `## 8. Seguros\n${list(a.seguros, (s) => `- **${s.tipo}** — ${s.coberturas || ''} (mín: ${s.valorMinimo || '—'})`)}\n\n`;
  md += `## 10. Pontos Críticos\n${list(a.pontosCriticos, (p) => `- **${p.titulo}** (${p.risco}): ${p.descricao}`)}\n\n`;
  md += `## 12. Checklist Operacional\n${list(a.checklistOperacional, (c) => `- [ ] ${c.item}${c.obrigatorio ? ' (obrigatório)' : ''}`)}\n\n`;
  md += `## 13. Cláusulas Suspeitas\n${list(a.clausulasSuspeitas, (c) => `- **${c.expressao}** (${c.risco}): ${c.motivo}`)}\n\n`;
  md += `## 14. Recomendações\n${list(a.recomendacoes, (r2) => `- **${r2.risco}** [${r2.prioridade}]: ${r2.comoNegociar} — _${r2.sugestaoJuridica}_`)}\n\n`;
  md += `## ⚠ Informações Ausentes / Ambíguas\n${list(a.informacoesAusentes, (i) => `- ${i}`)}\n\n`;
  md += `## ❓ Perguntas para o Jurídico\n${list(a.perguntasJuridico, (i) => `- ${i}`)}\n`;
  return md;
}

function markdownToBasicHtml(md) {
  return md
    .split('\n')
    .map((line) => {
      if (/^# /.test(line)) return `<h1>${esc(line.slice(2))}</h1>`;
      if (/^## /.test(line)) return `<h2>${esc(line.slice(3))}</h2>`;
      if (/^\|/.test(line)) return null; // tabelas tratadas abaixo de forma simples
      if (/^- /.test(line)) return `<li>${inlineMd(line.slice(2))}</li>`;
      if (line.trim() === '') return '<br>';
      return `<p>${inlineMd(line)}</p>`;
    })
    .filter((x) => x !== null)
    .join('\n');
}
function inlineMd(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/_(.+?)_/g, '<i>$1</i>');
}
