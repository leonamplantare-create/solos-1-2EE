(function () {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const f = (x, d = 2) => Number.isFinite(x) ? x.toLocaleString("pt-BR", { maximumFractionDigits: d }) : "—";
  const col = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const RAD = Math.PI / 180;

  // escala fixa: assim o círculo muda sem a grade "pular"
  const SMAX = 24, TMAX = 12, L = 46, R = 18, T = 18, B = 40, W = 520;
  const K = (W - L - R) / SMAX, H = T + TMAX * K + B;
  const X = (s) => L + s * K, Y = (t) => T + (TMAX - t) * K;

  let st = { s3: 4, s1: 16, alpha: 30 };
  let modo = "explorar", letra = "A", marcas = {}, passo = 0, auto = null, corrigido = false;

  const geo = () => {
    const c = (st.s1 + st.s3) / 2, r = (st.s1 - st.s3) / 2, a = 2 * st.alpha * RAD;
    return { c, r, sE: c + r * Math.cos(a), tE: r * Math.sin(a), d: st.s1 - st.s3 };
  };
  const alvos = () => { const g = geo(); return { A: [st.s1, 0], B: [st.s3, 0], D: [g.c, g.r], E: [g.sE, g.tE] }; };

  // ---------- SVG ----------
  function svgBase(svg) {
    const g = geo();
    const cor = { txt: col("--text"), mut: col("--muted"), bor: col("--border"), pri: col("--primary"), ac: col("--accent"), wat: col("--water"), bad: col("--bad") };
    let s = `<g data-k="eixos">`;
    for (let i = 0; i <= SMAX; i++) s += `<line x1="${X(i)}" x2="${X(i)}" y1="${Y(0)}" y2="${Y(TMAX)}" stroke="${cor.bor}" stroke-width="${i % 2 ? .5 : 1}"/>`;
    for (let j = 0; j <= TMAX; j++) s += `<line x1="${X(0)}" x2="${X(SMAX)}" y1="${Y(j)}" y2="${Y(j)}" stroke="${cor.bor}" stroke-width="${j % 2 ? .5 : 1}"/>`;
    for (let i = 2; i <= SMAX; i += 2) s += `<text x="${X(i)}" y="${Y(0) + 16}" font-size="11" text-anchor="middle" fill="${cor.mut}">${i}</text>`;
    for (let j = 2; j <= TMAX; j += 2) s += `<text x="${X(0) - 7}" y="${Y(j) + 4}" font-size="11" text-anchor="end" fill="${cor.mut}">${j}</text>`;
    s += `<line x1="${X(0)}" x2="${X(SMAX) + 6}" y1="${Y(0)}" y2="${Y(0)}" stroke="${cor.txt}" stroke-width="1.8"/><line x1="${X(0)}" x2="${X(0)}" y1="${Y(0)}" y2="${Y(TMAX) - 8}" stroke="${cor.txt}" stroke-width="1.8"/>`;
    s += `<text x="${X(SMAX) - 4}" y="${Y(0) - 8}" font-size="15" font-style="italic" fill="${cor.txt}">σ</text><text x="${X(0) + 8}" y="${Y(TMAX) + 6}" font-size="15" font-style="italic" fill="${cor.txt}">τ</text></g>`;

    // metade de baixo (simetria) — só no passo do τ negativo
    s += `<g data-k="baixo"><path d="M ${X(st.s3)} ${Y(0)} A ${g.r * K} ${g.r * K} 0 0 0 ${X(st.s1)} ${Y(0)}" fill="none" stroke="${cor.pri}" stroke-width="2" stroke-dasharray="6 5" opacity=".55" transform="translate(0 0)"/>
      <text x="${X(g.c)}" y="${Y(0) + g.r * K * 0.55}" font-size="12" text-anchor="middle" fill="${cor.mut}">τ negativo: espelho da metade de cima</text></g>`;

    const len = Math.PI * g.r * K;
    s += `<path data-k="circ" class="mz-circ" style="--len:${len}" d="M ${X(st.s3)} ${Y(0)} A ${g.r * K} ${g.r * K} 0 0 1 ${X(st.s1)} ${Y(0)}" fill="none" stroke="${cor.pri}" stroke-width="2.6" stroke-dasharray="${len}"/>`;
    s += `<g data-k="centro"><circle cx="${X(g.c)}" cy="${Y(0)}" r="4" fill="${cor.txt}"/><text x="${X(g.c)}" y="${Y(0) + 30}" font-size="11" text-anchor="middle" fill="${cor.txt}">centro = ${f(g.c)}</text></g>`;
    s += `<g data-k="raio"><line x1="${X(g.c)}" y1="${Y(0)}" x2="${X(g.c)}" y2="${Y(g.r)}" stroke="${cor.ac}" stroke-width="2" stroke-dasharray="5 4"/><text x="${X(g.c) + 6}" y="${Y(g.r / 2)}" font-size="12" fill="${cor.ac}">raio = τmáx = ${f(g.r)}</text></g>`;
    s += `<g data-k="desv"><line x1="${X(st.s3)}" y1="${Y(0) + 22}" x2="${X(st.s1)}" y2="${Y(0) + 22}" stroke="${cor.wat}" stroke-width="2"/><line x1="${X(st.s3)}" y1="${Y(0) + 17}" x2="${X(st.s3)}" y2="${Y(0) + 27}" stroke="${cor.wat}" stroke-width="2"/><line x1="${X(st.s1)}" y1="${Y(0) + 17}" x2="${X(st.s1)}" y2="${Y(0) + 27}" stroke="${cor.wat}" stroke-width="2"/><rect x="${X(g.c) - 62}" y="${Y(0) + 24}" width="124" height="15" fill="${col("--surface")}"/><text x="${X(g.c)}" y="${Y(0) + 36}" font-size="12" font-weight="700" text-anchor="middle" fill="${cor.wat}">Δσ = σ1 − σ3 = ${f(g.d)}</text></g>`;
    const ponto = (k, x, y, txt, dx, dy, cor1) => `<g data-k="${k}"><circle class="mz-pt" cx="${X(x)}" cy="${Y(y)}" r="6" fill="${cor1}"/><text x="${X(x) + dx}" y="${Y(y) + dy}" font-size="14" font-weight="800" fill="${cor1}">${txt}</text></g>`;
    s += ponto("B", st.s3, 0, "B (σ3)", -6, -12, cor.ac);
    s += ponto("A", st.s1, 0, "A (σ1)", -10, -12, cor.ac);
    s += ponto("D", g.c, g.r, "D (τmáx)", 8, -8, cor.ac);
    s += `<g data-k="C"><text x="${X(st.s3)}" y="${Y(0) - 28}" font-size="12" font-weight="700" text-anchor="middle" fill="${cor.bad}">C = B? (σ2 = σ3)</text></g>`;
    s += `<g data-k="E"><line id="mzEpolo" x1="${X(st.s3)}" y1="${Y(0)}" x2="${X(g.sE)}" y2="${Y(g.tE)}" stroke="${cor.wat}" stroke-width="1.6" stroke-dasharray="2 4"/>
      <text id="mzEpoloTxt" x="${X(st.s3) + 34}" y="${Y(0) - 6}" font-size="11" fill="${cor.wat}">α = ${st.alpha}°</text>
      <line id="mzEline" x1="${X(g.c)}" y1="${Y(0)}" x2="${X(g.sE)}" y2="${Y(g.tE)}" stroke="${cor.ac}" stroke-width="2" stroke-dasharray="5 4"/>
      <path id="mzEarc" d="" fill="none" stroke="${cor.ac}" stroke-width="1.5"/>
      <text id="mzEang" x="${X(g.c) + 20}" y="${Y(0) - 6}" font-size="12" fill="${cor.ac}">2α = ${2 * st.alpha}°</text>
      <circle id="mzEpt" class="mz-pt" cx="${X(g.sE)}" cy="${Y(g.tE)}" r="6" fill="${cor.ac}"/>
      <text id="mzElab" x="${X(g.sE) + 8}" y="${Y(g.tE) - 8}" font-size="14" font-weight="800" fill="${cor.ac}">E</text></g>`;
    s += `<g id="mzUser"></g>`;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = s;
    posE(2 * st.alpha);
  }
  // reposiciona o ponto E para um ângulo (animação do giro)
  function posE(ang2) {
    const g = geo(), a = ang2 * RAD;
    const sx = g.c + g.r * Math.cos(a), ty = g.r * Math.sin(a);
    const set = (id, attrs) => { const el = document.getElementById(id); if (el) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); };
    set("mzEline", { x2: X(sx), y2: Y(ty) });
    set("mzEpolo", { x2: X(sx), y2: Y(ty) });
    const pt = document.getElementById("mzEpoloTxt"); if (pt) pt.textContent = `α = ${Math.round(ang2 / 2)}°`;
    set("mzEpt", { cx: X(sx), cy: Y(ty) });
    set("mzElab", { x: X(sx) + 8, y: Y(ty) - 8 });
    const rr = Math.min(28, g.r * K * 0.45);
    set("mzEarc", { d: `M ${X(g.c) + rr} ${Y(0)} A ${rr} ${rr} 0 0 0 ${X(g.c) + rr * Math.cos(a)} ${Y(0) - rr * Math.sin(a)}` });
    const t = document.getElementById("mzEang"); if (t) t.textContent = `2α = ${Math.round(ang2)}°`;
  }
  function animarE(ms) {
    const fim = 2 * st.alpha, t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      posE(fim * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function mostrarSo(keys) {
    $$("#mzSvg [data-k]").forEach(el => el.classList.toggle("off", !keys.includes(el.dataset.k)));
    const extra = keys.includes("baixo") ? Math.max(0, geo().r * K + 24 - B) : 0;
    $("#mzSvg").setAttribute("viewBox", `0 0 ${W} ${H + extra}`);
  }

  // ---------- modo explorar ----------
  function painelExplorar() {
    const g = geo();
    $("#mzSide").innerHTML = `
      <div class="mz-sliders">
        <label>σ3 — tensão principal menor <b id="mzv3">${f(st.s3)}</b><input type="range" id="mzS3" min="0" max="12" step="0.5" value="${st.s3}"></label>
        <label>σ1 — tensão principal maior <b id="mzv1">${f(st.s1)}</b><input type="range" id="mzS1" min="2" max="24" step="0.5" value="${st.s1}"></label>
        <label>α — ângulo do plano E com o plano principal maior <b id="mzva">${st.alpha}°</b><input type="range" id="mzA" min="0" max="90" step="5" value="${st.alpha}"></label>
      </div>
      <div class="table-wrap"><table class="mz-tab" id="mzTab"></table></div>
      <p class="hint">Arraste os controles e veja o círculo mudar. Todos os pontos de interesse aparecem marcados.</p>`;
    const upd = () => {
      let s3 = +$("#mzS3").value, s1 = +$("#mzS1").value;
      if (s1 < s3 + 1) { s1 = s3 + 1; $("#mzS1").value = s1; }
      st = { s3, s1, alpha: +$("#mzA").value };
      $("#mzv3").textContent = f(st.s3); $("#mzv1").textContent = f(st.s1); $("#mzva").textContent = st.alpha + "°";
      svgBase($("#mzSvg"));
      mostrarSo(["eixos", "circ", "centro", "raio", "desv", "A", "B", "D", "E"]);
      tabela();
    };
    ["#mzS3", "#mzS1", "#mzA"].forEach(id => $(id).addEventListener("input", upd));
    upd();
    void g;
  }
  function tabela() {
    const g = geo();
    $("#mzTab").innerHTML = [
      ["σ1 (ponto A — plano principal maior)", f(st.s1)],
      ["σ3 (ponto B — plano principal menor)", f(st.s3)],
      ["σ2 (intermediário) = σ3 no triaxial", f(st.s3)],
      ["Centro = (σ1 + σ3)/2", f(g.c)],
      ["τmáx = raio = (σ1 − σ3)/2 (ponto D)", f(g.r)],
      ["Δσ = σ1 − σ3 (diâmetro)", f(g.d)],
      [`Ponto E (α = ${st.alpha}°): σ = c + r·cos2α`, f(g.sE)],
      [`Ponto E: τ = r·sen2α`, f(g.tE)]
    ].map(([a, b]) => `<tr><td>${a}</td><td class="num"><b>${b}</b></td></tr>`).join("");
  }

  // ---------- modo marcar ----------
  const NOMES = { A: "Plano principal maior", B: "Plano principal menor", C: "Plano principal intermediário", D: "Plano da tensão de cisalhamento máxima", E: "Plano a um ângulo α do principal maior" };
  function painelMarcar() {
    marcas = {}; corrigido = false; letra = "A";
    svgBase($("#mzSvg"));
    mostrarSo(["eixos", "circ"]);
    $("#mzSide").innerHTML = `
      <p><b>Indique no círculo</b> cada ponto: escolha a letra e clique no círculo. α = <b>${st.alpha}°</b>. Se algum não for possível, use o botão de "não é possível".</p>
      <div class="mz-letras">${["A", "B", "C", "D", "E"].map(l => `<button type="button" class="btn small" data-l="${l}"><b>${l}</b> — ${NOMES[l]}${l === "E" ? ` (α = ${st.alpha}°)` : ""}</button>`).join("")}</div>
      <div class="btnrow"><button type="button" class="btn small" id="mzNao">✕ A letra selecionada não é possível de indicar</button></div>
      <p class="hint">Dica para o E: do ponto do σ3, trace uma reta inclinada α; onde ela cortar o círculo é o E. (Ou gire 2α a partir do σ1, pelo centro.)</p>
      <div class="btnrow">
        <button type="button" class="btn primary" id="mzCorr">Corrigir</button>
        <button type="button" class="btn" id="mzResp">Mostrar resposta</button>
        <button type="button" class="btn" id="mzNovo">Outro círculo</button>
      </div>
      <div id="mzFb"></div>`;
    $$("[data-l]").forEach(b => b.onclick = () => { letra = b.dataset.l; destacar(); });
    $("#mzNao").onclick = () => { marcas[letra] = "nao"; $("#mzFb").innerHTML = ""; desenharMarcas(); destacar(); };
    $("#mzCorr").onclick = corrigir;
    $("#mzResp").onclick = () => { mostrarSo(["eixos", "circ", "centro", "raio", "A", "B", "D", "E", "C"]); animarE(900); $("#mzFb").innerHTML = `<div class="callout tip"><strong>Resposta</strong>A = σ1 (direita, τ = 0) · B = σ3 (esquerda, τ = 0) · C: não é possível — no triaxial σ2 = σ3, então coincide com B · D = topo do círculo (τmáx) · E = gire 2α = ${2 * st.alpha}° a partir de A.</div>`; };
    $("#mzNovo").onclick = () => { novoCirculo(); painelMarcar(); };
    destacar();
  }
  function destacar() {
    $$("[data-l]").forEach(b => {
      b.classList.toggle("primary", b.dataset.l === letra);
      const m = marcas[b.dataset.l];
      b.querySelector("b").textContent = b.dataset.l + (m ? (m === "nao" ? " ✕" : " ●") : "");
    });
  }
  function noCirculo(sx, ty) {
    const g = geo();
    let ang = Math.atan2(Math.max(ty, 0), sx - g.c);
    if (ang < 0) ang = 0;
    return [g.c + g.r * Math.cos(ang), g.r * Math.sin(ang)];
  }
  function clique(ev) {
    if (modo !== "marcar") return;
    const svg = $("#mzSvg"), pt = svg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const s = (p.x - L) / K, t = TMAX - (p.y - T) / K;
    marcas[letra] = noCirculo(s, t);
    corrigido = false;
    $("#mzFb").innerHTML = "";
    desenharMarcas();
    const prox = ["A", "B", "C", "D", "E"].find(l => !marcas[l]);
    if (prox) letra = prox;
    destacar();
  }
  function desenharMarcas(resultado) {
    const g = $("#mzUser"); let s = "";
    Object.entries(marcas).forEach(([l, m]) => {
      if (m === "nao") return;
      const cor = resultado ? (resultado[l] ? col("--ok") : col("--bad")) : col("--primary");
      s += `<g class="mz-mark"><circle cx="${X(m[0])}" cy="${Y(m[1])}" r="8" fill="${cor}" stroke="${col("--surface")}" stroke-width="2"/><text x="${X(m[0])}" y="${Y(m[1]) + 4}" font-size="11" font-weight="800" text-anchor="middle" fill="#fff">${l}</text></g>`;
    });
    g.innerHTML = s;
  }
  function corrigir() {
    const al = alvos(), g = geo(), res = {}, msgs = [];
    const perto = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= Math.max(0.7, g.r * 0.12);
    const angDe = (p) => Math.atan2(p[1], p[0] - g.c) / RAD;
    ["A", "B", "C", "D", "E"].forEach(l => {
      const m = marcas[l];
      if (!m) { res[l] = false; msgs.push(`<b>${l}</b>: não marcado.`); return; }
      if (l === "C") {
        res.C = m === "nao";
        if (!res.C) msgs.push(`<b>C</b>: não é possível indicá-lo. O círculo só tem dois pontos sobre o eixo σ (σ1 e σ3). No triaxial σ2 = σ3, então o plano intermediário coincide com B.`);
        return;
      }
      if (m === "nao") { res[l] = false; msgs.push(`<b>${l}</b>: é possível sim. ${l === "E" ? "Qualquer plano tem seu ponto no círculo: gire 2α a partir de A." : "Esse ponto existe no círculo."}`); return; }
      res[l] = perto(m, al[l]);
      if (res[l]) return;
      let dica = "";
      if (l === "A" && perto(m, al.B)) dica = "Você marcou o σ3. O plano principal MAIOR fica no extremo DIREITO (σ1).";
      else if (l === "B" && perto(m, al.A)) dica = "Você marcou o σ1. O plano principal MENOR fica no extremo ESQUERDO (σ3).";
      else if (l === "A" || l === "B") dica = "Planos principais têm τ = 0: ficam sobre o eixo σ, nos extremos do círculo.";
      else if (l === "D") dica = "τmáx é o ponto mais ALTO do círculo, bem acima do centro.";
      else if (l === "E") {
        const a = angDe(m);
        if (Math.abs(a - st.alpha) < 6) dica = `Você girou só α = ${st.alpha}°. No círculo de Mohr o ângulo é DOBRADO: gire 2α = ${2 * st.alpha}° a partir de A.`;
        else if (Math.abs(a - (180 - 2 * st.alpha)) < 6) dica = "Você contou o ângulo a partir do σ3. O ângulo α é medido a partir do plano principal MAIOR (ponto A, à direita).";
        else dica = `Parta de A (direita) e gire 2α = ${2 * st.alpha}° em torno do centro (σ = c + r·cos2α; τ = r·sen2α). Truque sem conta: do ponto B (σ3), trace uma reta inclinada α = ${st.alpha}° — onde ela corta o círculo é o E.`;
      }
      msgs.push(`<b>${l}</b>: ${dica}`);
    });
    corrigido = true;
    desenharMarcas(res);
    const certas = Object.values(res).filter(Boolean).length;
    $("#mzFb").innerHTML = `<div class="callout ${certas === 5 ? "tip" : "key"}"><strong>${certas} de 5 certas</strong>${certas === 5 ? "Perfeito!" : msgs.join("<br>")}</div>`;
    if (certas === 5) { mostrarSo(["eixos", "circ", "centro", "raio", "A", "B", "D", "E"]); animarE(900); desenharMarcas(res); }
  }

  // ---------- modo explicar ----------
  function passos() {
    const g = geo();
    return [
      { k: ["eixos"], t: "Os eixos", x: `No eixo horizontal fica a <b>tensão normal σ</b> e no vertical a <b>tensão cisalhante τ</b> (em kPa). Cada ponto do círculo representa um plano do corpo de prova.` },
      { k: ["eixos", "B"], t: "σ3 — plano principal menor (B)", x: `No triaxial, σ3 = <b>${f(st.s3)} kPa</b> é a pressão confinante, a menor tensão principal. Plano principal tem <b>τ = 0</b>, por isso B fica <b>sobre o eixo σ</b>, à esquerda.` },
      { k: ["eixos", "B", "A"], t: "σ1 — plano principal maior (A)", x: `σ1 = <b>${f(st.s1)} kPa</b> é a maior tensão principal (confinante + carga axial). Também tem τ = 0, então A fica sobre o eixo σ, à direita.` },
      { k: ["eixos", "B", "A", "circ"], t: "O círculo", x: `O círculo de Mohr liga σ3 a σ1. Ele reúne as tensões (σ, τ) de <b>todos os planos</b> que passam pelo ponto.`, anim: "circ" },
      { k: ["eixos", "B", "A", "circ", "centro", "raio"], t: "Centro e raio", x: `Centro = (σ1 + σ3)/2 = <b>${f(g.c)}</b>. Raio = (σ1 − σ3)/2 = <b>${f(g.r)}</b>.` },
      { k: ["eixos", "B", "A", "circ", "centro", "raio", "D"], t: "τmáx — ponto D", x: `O ponto mais alto do círculo é a <b>tensão de cisalhamento máxima</b>: τmáx = raio = <b>${f(g.r)} kPa</b>, com σ = ${f(g.c)}. Esse plano faz 45° com o plano principal maior.` },
      { k: ["eixos", "B", "A", "circ", "centro", "D", "desv"], t: "Tensão desviadora", x: `Δσ = σ1 − σ3 = <b>${f(g.d)} kPa</b>: é o acréscimo de tensão axial aplicado no ensaio, igual ao <b>diâmetro</b> do círculo (o dobro de τmáx).` },
      { k: ["eixos", "B", "A", "circ", "D", "C"], t: "E o intermediário (C)?", x: `No triaxial a pressão confinante age igual nas duas direções laterais: <b>σ2 = σ3 = ${f(st.s3)}</b>. O ponto do intermediário coincidiria com B, por isso <b>não é possível</b> indicá-lo separado.` },
      { k: ["eixos", "B", "A", "circ", "centro", "D", "E"], t: "Plano a um ângulo α — ponto E", x: `Para um plano que faz α = ${st.alpha}° com o plano principal maior, parta de A e gire <b>2α = ${2 * st.alpha}°</b> em torno do centro. E = (σ; τ) = (<b>${f(g.sE)}</b>; <b>${f(g.tE)}</b>).<br><br><b>Truque sem conta:</b> do ponto B (σ3), trace uma reta inclinada <b>α = ${st.alpha}°</b> (sem dobrar). Onde ela corta o círculo é o E — veja a linha tracejada.`, anim: "E" },
      { k: ["eixos", "B", "A", "circ", "D", "baixo"], t: "Por que não usamos τ negativo?", x: `A metade de baixo é o <b>espelho</b> da de cima: mostra os mesmos planos, só com o sentido convencionado de τ trocado. Por <b>simetria</b>, basta trabalhar com a metade de cima.` }
    ];
  }
  function painelExplicar() {
    passo = 0; pararAuto();
    svgBase($("#mzSvg"));
    $("#mzSide").innerHTML = `
      <div class="mz-step"><div class="mz-num" id="mzNum"></div><h4 id="mzTit"></h4><p id="mzTxt"></p></div>
      <div class="mz-dots" id="mzDots"></div>
      <div class="btnrow">
        <button type="button" class="btn" id="mzAnt">◀ Anterior</button>
        <button type="button" class="btn primary" id="mzProx">Próximo ▶</button>
        <button type="button" class="btn" id="mzAuto">▶ Reproduzir</button>
        <button type="button" class="btn" id="mzNovo2">Outro círculo</button>
      </div>`;
    $("#mzAnt").onclick = () => { pararAuto(); irPara(passo - 1); };
    $("#mzProx").onclick = () => { pararAuto(); irPara(passo + 1); };
    $("#mzAuto").onclick = () => {
      if (auto) return pararAuto();
      if (passo >= passos().length - 1) irPara(0);
      $("#mzAuto").textContent = "❚❚ Pausar";
      auto = setInterval(() => { if (passo >= passos().length - 1) return pararAuto(); irPara(passo + 1); }, 3200);
    };
    $("#mzNovo2").onclick = () => { novoCirculo(); painelExplicar(); };
    irPara(0, true);
  }
  function pararAuto() { if (auto) clearInterval(auto); auto = null; const b = $("#mzAuto"); if (b) b.textContent = "▶ Reproduzir"; }
  function irPara(i, primeiro) {
    const ps = passos();
    passo = Math.max(0, Math.min(ps.length - 1, i));
    const p = ps[passo];
    if (p.anim === "circ") { const c = $("#mzSvg [data-k=circ]"); c.classList.add("off"); void c.getBoundingClientRect(); }
    mostrarSo(p.k);
    if (p.anim === "E") { posE(0); animarE(1300); }
    const box = $(".mz-step");
    box.classList.remove("mz-in"); void box.offsetWidth; box.classList.add("mz-in");
    $("#mzNum").textContent = `Passo ${passo + 1} de ${ps.length}`;
    $("#mzTit").textContent = p.t;
    $("#mzTxt").innerHTML = p.x;
    $("#mzDots").innerHTML = ps.map((_, j) => `<button type="button" class="${j === passo ? "on" : ""}" data-p="${j}" aria-label="Passo ${j + 1}"></button>`).join("");
    $$("#mzDots button").forEach(b => b.onclick = () => { pararAuto(); irPara(+b.dataset.p); });
    $("#mzAnt").disabled = passo === 0;
    $("#mzProx").disabled = passo === ps.length - 1;
    void primeiro;
  }

  // ---------- geral ----------
  function novoCirculo() {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const s3 = pick([1, 2, 3, 4, 5, 6, 7, 8]);
    const d = pick([6, 8, 10, 12, 14].filter(x => s3 + x <= 22));
    st = { s3, s1: s3 + d, alpha: pick([15, 30, 60, 75]) };
  }
  function trocarModo(m) {
    modo = m; pararAuto();
    $$(".mz-tabs button").forEach(b => b.classList.toggle("on", b.dataset.m === m));
    $("#mzSvg").classList.toggle("mz-clicavel", m === "marcar");
    if (m === "explorar") painelExplorar();
    else if (m === "marcar") painelMarcar();
    else painelExplicar();
  }

  function init() {
    if (!$("#mzSvg")) return;
    $$(".mz-tabs button").forEach(b => b.onclick = () => trocarModo(b.dataset.m));
    $("#mzSvg").addEventListener("click", clique);
    trocarModo("explicar");
    const tb = $("#themeBtn");
    if (tb) tb.addEventListener("click", () => setTimeout(() => trocarModo(modo), 0));
  }
  window.addEventListener("DOMContentLoaded", init);
})();
