(function () {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const C = () => window.SolosCalc;

  let ex = null;      // exercício atual
  let sol = null;     // resolução (escondida até o aluno pedir)
  let qs = [];        // perguntas [{step, gi, si}]

  // ---------- leitura da resposta do aluno ----------
  function parseResp(s, label) {
    s = String(s || "").trim();
    if (!s) return NaN;
    const m = s.match(/^\s*([\d.,eE+-]+)\s*\/\s*([\d.,eE+-]+)\s*$/);
    let v;
    if (m) v = C().num(m[1]) / C().num(m[2]);
    else v = C().num(s.replace("%", ""));
    // Dα: aceita "1/142" ou "0,00704" e converte para o x de 1/x
    if (/^x em/.test(label) && Number.isFinite(v) && v > 0 && v < 1) v = 1 / v;
    return v;
  }
  const near = (a, b, tol) => Math.abs(a - b) <= Math.max(tol * Math.abs(b), 1e-9);

  // ---------- "professor": diagnóstico do erro ----------
  function diagnose(user, a) {
    for (const alt of a.alts || []) if (near(user, alt.v, 0.02)) return alt.m;
    if (Math.sign(user) !== Math.sign(a.v) && a.v !== 0) return "O sinal está trocado. Confira a ordem da subtração ou o log (log de um número menor que 1 é negativo).";
    const r = user / a.v;
    const fatores = [
      [10, "Diferença de exatamente 10 vezes: quase sempre é unidade. Lembre: 1 kgf/cm² = 10 tf/m², e 1 MPa = 1.000 kPa."],
      [100, "Diferença de exatamente 100 vezes: confira metros × centímetros (1 m = 100 cm)."],
      [1000, "Diferença de exatamente 1.000 vezes: confira tf × kgf, kPa × MPa ou m × mm."],
      [Math.LN10, "Diferença de 2,30 vezes: é a marca de ter usado ln em vez de log₁₀."],
      [2, "Diferença de exatamente 2 vezes: confira se usou a espessura inteira ou a metade (H0 × H0/2), ou o número de faces drenantes."],
      [4, "Diferença de exatamente 4 vezes: no tempo, isso vem do h ao quadrado — confira o número de faces drenantes."],
      [86400, "Diferença de 86.400 vezes: é a conversão segundos ↔ dias."],
      [365, "Diferença de 365 vezes: é a conversão dias ↔ anos."]
    ];
    for (const [f, msg] of fatores) {
      if (near(r, f, 0.02) || near(r, 1 / f, 0.02)) return msg;
    }
    const pct = Math.abs(r - 1) * 100;
    if (pct < 8) return `Está perto (diferença de ${C().fmt(pct, 1)}%). Pode ser arredondamento de um passo anterior — evite arredondar no meio da conta, use pelo menos 3 casas.`;
    return "Não reconheci o erro. Abra a Dica para ver qual fórmula usar e confira passo a passo. Se você errou uma etapa anterior, o erro pode estar vindo de lá.";
  }

  // ---------- dados do enunciado ----------
  const AGUA = { seco: "sem água", sat: "com água (desconta γw)" };
  function dadosHtml() {
    const e = C().escapeHtml, u = C().SYS[ex.unidades] || C().SYS.tf, n = C().num, g = C().fmtg;
    const li = [];
    const f = ex.fundacao || {}, im = ex.imediato || {}, ar = ex.argila || {}, tp = ex.tempo || {};
    li.push(`Unidades: ${e(u.nome)}`);
    if (f.forma && f.forma !== "nenhuma") {
      const dim = f.forma === "retangular" ? `${g(n(f.B))} m × ${g(n(f.L))} m` : f.forma === "circular" ? `diâmetro ${g(n(f.B))} m` : `lado ${g(n(f.B))} m`;
      li.push(`Sapata ${e(f.forma)} (${dim}), carga P = ${g(n(f.P))} ${u.P}${f.acresc10 ? " (+10% de peso próprio)" : ""}, base a ${g(n(f.Df) || 0)} m de profundidade`);
    } else li.push("Carregamento extenso (aterro), sem sapata");
    if (im.metodo === "sapata") {
      li.push(`Areia: E = ${g(n(im.E))} ${u.E}, μ = ${g(n(im.mu))}, ` + (im.Imodo === "manual" ? `I = ${g(n(im.I))}` : `I pela tabela (${im.rigidez === "rigido" ? "sapata rígida" : "flexível, " + im.ponto})`));
    } else if (im.metodo === "pontual") {
      li.push(`Recalque imediato por carga pontual: E = ${g(n(im.E))} ${u.E}, z = ${g(n(im.z))} m`);
    }
    if (ar.ativo) {
      const cc = ar.ccModo === "dado" ? `Cc = ${g(n(ar.Cc))}` : `LL = ${g(n(ar.LL))}% (Cc pela correlação ${{ na: "0,009(LL − 10)", amolgada: "0,007(LL − 10)", recife: "0,013(LL − 33)" }[ar.ccModo]})`;
      li.push(`Argila: e₀ = ${g(n(ar.e0))}, ${cc}`);
      if (ar.historico === "OA") {
        const sa = ar.oaModo === "rsa" ? `RSA = ${g(n(ar.sa))}` : ar.oaModo === "acr" ? `σ'a = σ'0 + ${g(n(ar.sa))} ${u.p}` : `σ'a = ${g(n(ar.sa))} ${u.p}`;
        li.push(`Argila sobreadensada: ${sa}, Cr = ${g(n(ar.Cr))}`);
      }
      li.push(ar.dpModo === "21" ? "Δp no meio da argila: estimar pelo método 2:1"
        : ar.dpModo === "aterro" ? `Aterro extenso: altura Hat = ${g(n(ar.hat))} m, γat = ${g(n(ar.gat))} ${u.g}`
        : `Δp no meio da argila = ${g(n(ar.dp))} ${u.p}`);
      if (Number(ar.nsub) > 1) li.push(`Dividir a argila em ${ar.nsub} subcamadas`);
    }
    if (tp.ativo) {
      const unid = { cm2s: "cm²/s", m2dia: "m²/dia", m2ano: "m²/ano" }[tp.cvUnidade || "cm2s"];
      li.push(`Cv = ${g(n(tp.Cv))} ${unid}`);
    }
    const gw = n(ex.gw);
    if ((ex.camadas || []).some(c => c.agua === "sat")) li.push(`γw = ${g(Number.isFinite(gw) ? gw : (ex.unidades === "tf" ? 1 : 10))} ${u.g}`);
    if (ex.secundario && ex.secundario.ativo) li.push(`Compressão secundária: Cα = ${g(n(ex.secundario.Ca))}, t₂/t₁ = ${g(n(ex.secundario.t2t1))}`);
    if (ex.diferencial && ex.diferencial.ativo) li.push(`Pilar vizinho: ΔHt = ${g(n(ex.diferencial.dHviz))} cm, distância entre eixos L = ${g(n(ex.diferencial.L))} m`);

    const rows = (ex.camadas || []).map((c, i) => `<tr><td>${i === Number(ar.idx) && ar.ativo ? "★ " : ""}${e(c.nome || "")}</td><td class="num">${g(n(c.h))}</td><td class="num">${Number.isFinite(n(c.g)) ? g(n(c.g)) : "—"}</td><td>${AGUA[c.agua] || ""}</td></tr>`).join("");
    return `<ul>${li.map(x => `<li>${x}</li>`).join("")}</ul>
      <div class="table-wrap"><table><tr><th>Camada (★ = argila compressível)</th><th class="num">h (m)</th><th class="num">γ (${u.g})</th><th>Água</th></tr>${rows}</table></div>`;
  }

  // ---------- montagem ----------
  function render() {
    const box = $("#treinoBox");
    const e = C().escapeHtml;
    qs = [];
    sol.groups.forEach((g, gi) => g.steps.forEach((s, si) => { if (s.ans && s.ans.length) qs.push({ s, gi, si, title: g.title }); }));

    let lastGroup = "";
    const cards = qs.map((q, k) => {
      const head = q.title !== lastGroup ? `<h4 class="tq-group">${e(q.title)}</h4>` : "";
      lastGroup = q.title;
      const inputs = q.s.ans.map((a, j) => `
        <label class="tq-in">
          <span>${e(a.label)}${a.unit ? ` <small>(${e(a.unit)})</small>` : ""}</span>
          <input type="text" inputmode="decimal" data-k="${k}" data-j="${j}" autocomplete="off">
          <span class="tq-mark" data-mark="${k}-${j}"></span>
        </label>`).join("");
      return `${head}<div class="tq" id="tq${k}">
        <div class="t">${k + 1}. ${e(q.s.t)}</div>
        <div class="tq-inputs">${inputs}</div>
        <div class="tq-fb" data-fb="${k}"></div>
        <div class="btnrow">
          <button type="button" class="btn small" data-hint="${k}">Dica</button>
          <button type="button" class="btn small" data-show="${k}">Ver resolução deste passo</button>
        </div>
        <div class="tq-hint hidden" data-hintbox="${k}"></div>
        <div class="tq-sol hidden" data-solbox="${k}"></div>
      </div>`;
    }).join("");

    const warn = sol.warns.length ? `<div class="callout warn"><strong>Este exercício está incompleto</strong>${sol.warns.map(e).join("<br>")}</div>` : "";

    box.innerHTML = `
      <div class="card">
        <span class="pill">${e(ex.origem || "Exercício")}</span>
        <h3 style="margin:.4em 0">${e(ex.titulo || "(sem título)")}</h3>
        ${ex.descricao ? `<p>${e(ex.descricao)}</p>` : ""}
        <div class="treino-dados">
          <div><h4>Dados</h4>${dadosHtml()}</div>
          <div class="figure"><svg id="treinoSvg" class="profile-svg" viewBox="0 0 520 400" role="img" aria-label="Perfil do subsolo do exercício"></svg></div>
        </div>
      </div>
      ${warn}
      <div class="callout tip"><strong>Como funciona</strong>Resolva no papel e escreva seus resultados nos campos (vírgula ou ponto). Clique em <strong>Corrigir</strong> quando quiser. Travou? Use <strong>Dica</strong> (a fórmula e o porquê) e, se precisar, <strong>Ver resolução deste passo</strong>. Aceito diferença de até ~2–3% por arredondamento.</div>
      ${cards || '<p class="muted">Este exercício não tem perguntas calculáveis — complete os dados na calculadora.</p>'}
      <div class="btnrow treino-acoes">
        <button type="button" class="btn primary" id="tCorrigir">Corrigir minhas respostas</button>
        <button type="button" class="btn" id="tTudo">Mostrar todas as respostas</button>
        <button type="button" class="btn" id="tLink">Copiar link deste treino</button>
        <button type="button" class="btn danger" id="tLimpar">Apagar minhas respostas</button>
      </div>
      <div id="tPlacar"></div>
      <div id="tNota"></div>`;

    C().drawProfile(ex, sol.R, $("#treinoSvg"));

    $$("[data-hint]", box).forEach(b => b.onclick = () => showHint(Number(b.dataset.hint)));
    $$("[data-show]", box).forEach(b => b.onclick = () => showSol(Number(b.dataset.show)));
    $$("input[data-k]", box).forEach(inp => inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); corrigir(Number(inp.dataset.k)); } }));
    $("#tCorrigir").onclick = () => corrigir();
    $("#tTudo").onclick = () => { qs.forEach((_, k) => showSol(k)); mostrarNota(); };
    $("#tLimpar").onclick = () => { if (confirm("Apagar todas as suas respostas deste exercício?")) render(); };
    $("#tLink").onclick = async () => {
      const link = location.origin + location.pathname + "#treino=" + b64(JSON.stringify(ex));
      let ok = false;
      try { await navigator.clipboard.writeText(link); ok = true; } catch (err) { ok = false; }
      C().toast(ok ? "Link copiado! Quem abrir cai direto neste treino." : "Não consegui copiar. Tente pelo botão de compartilhar da calculadora.");
    };
  }

  function showHint(k) {
    const q = qs[k], box = $(`[data-hintbox="${k}"]`);
    box.innerHTML = (q.s.f ? `<div class="eq">${C().tex(q.s.f, true)}</div>` : "") + (q.s.why ? `<p>${C().escapeHtml(q.s.why)}</p>` : "");
    box.classList.remove("hidden");
  }
  function showSol(k) {
    const q = qs[k], box = $(`[data-solbox="${k}"]`);
    box.innerHTML = (q.s.html || "") + (q.s.eq ? `<div class="eq">${C().tex(q.s.eq, true)}</div>` : "") +
      `<div class="res">→ ${q.s.ans.map(a => `${C().escapeHtml(a.label)} = ${C().fmtg(a.v, 4)}${a.unit ? " " + C().escapeHtml(a.unit) : ""}`).join(" · ")}</div>`;
    box.classList.remove("hidden");
    $(`[data-hint="${k}"]`).closest(".tq").classList.add("revelado");
  }
  function mostrarNota() {
    if (ex.nota) $("#tNota").innerHTML = `<div class="callout warn"><strong>Observações sobre este exercício</strong>${C().escapeHtml(ex.nota)}</div>`;
  }

  function corrigir(only) {
    let certas = 0, total = 0, vazias = 0, primeiroErro = -1;
    qs.forEach((q, k) => {
      if (only !== undefined && k !== only) return;
      const msgs = [];
      q.s.ans.forEach((a, j) => {
        const inp = $(`input[data-k="${k}"][data-j="${j}"]`);
        const mark = $(`[data-mark="${k}-${j}"]`);
        const v = parseResp(inp.value, a.label);
        total++;
        inp.classList.remove("ok", "bad");
        if (!Number.isFinite(v)) { vazias++; mark.textContent = ""; return; }
        if (near(v, a.v, a.tol)) {
          certas++; inp.classList.add("ok"); mark.textContent = "✓";
        } else {
          inp.classList.add("bad"); mark.textContent = "✗";
          if (primeiroErro < 0) primeiroErro = k;
          msgs.push(`<strong>${C().escapeHtml(a.label)}:</strong> ${C().escapeHtml(diagnose(v, a))}`);
        }
      });
      const fb = $(`[data-fb="${k}"]`);
      fb.innerHTML = msgs.length ? `<div class="callout bad">${msgs.join("<br>")}</div>` : "";
    });
    if (only !== undefined) return;
    const respondidas = total - vazias;
    let txt = `<div class="callout ${certas === total ? "tip" : "key"}"><strong>${certas} de ${total} certas</strong>`;
    if (certas === total) txt += "Mandou bem! Tudo certo.";
    else if (respondidas === 0) txt += "Você ainda não preencheu nenhum campo.";
    else {
      txt += (vazias ? `${vazias} sem resposta. ` : "") + "Comece corrigindo pelo primeiro ✗: os passos seguintes usam os resultados dos anteriores, então um erro lá em cima se espalha.";
      if (primeiroErro >= 0) txt += ` <a href="#tq${primeiroErro}">Ir para o primeiro erro</a>.`;
    }
    txt += "</div>";
    $("#tPlacar").innerHTML = txt;
    if (certas === total) mostrarNota();
  }

  // ---------- link ----------
  function b64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function unb64(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    return new TextDecoder().decode(Uint8Array.from(atob(s), c => c.charCodeAt(0)));
  }

  // ---------- seletor ----------
  function fillPicker() {
    const sel = $("#treinoPick");
    const pres = window.EXEMPLOS_RECALQUE || [];
    let mine = [];
    try { mine = JSON.parse(localStorage.getItem("solos2ee.recalque.meusExemplos") || "[]"); } catch (e) { mine = []; }
    sel.innerHTML = `<option value="">Escolha um exercício…</option>` +
      `<optgroup label="Exemplos prontos">${pres.map((x, i) => `<option value="p${i}">${C().escapeHtml(x.titulo)}</option>`).join("")}</optgroup>` +
      (mine.length ? `<optgroup label="Meus exemplos">${mine.map((x, i) => `<option value="m${i}">${C().escapeHtml(x.titulo || "(sem título)")}</option>`).join("")}</optgroup>` : "");
    sel.onchange = () => {
      const v = sel.value;
      if (!v) return;
      const src = v[0] === "p" ? pres[Number(v.slice(1))] : mine[Number(v.slice(1))];
      if (src) start(src, true);
    };
  }

  function start(src, noScroll) {
    ex = C().normalize(JSON.parse(JSON.stringify(src)));
    sol = C().solve(ex);
    render();
    if (!noScroll) $("#treino").scrollIntoView();
  }

  function init() {
    if (!$("#treinoBox")) return;
    fillPicker();
    document.addEventListener("click", (e) => { if (e.target.closest("#btnSalvar")) setTimeout(fillPicker, 50); });
    const m = location.hash.match(/#treino=([\w-]+)/);
    if (m) {
      try { start(JSON.parse(unb64(m[1]))); }
      catch (e) { C().toast("Link de treino inválido"); }
    }
  }

  window.SolosTreino = { start };
  window.addEventListener("DOMContentLoaded", () => setTimeout(init, 0));
})();
