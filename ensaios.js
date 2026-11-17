(function () {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  // ---------- utilidades ----------
  function num(v) {
    const s = String(v ?? "").trim().replace(/\s/g, "").replace(/,/g, ".").replace(/°/g, "");
    if (!s) return NaN;
    const m = s.match(/^(-?[\d.]+)\/(-?[\d.]+)$/);
    if (m) return Number(m[1]) / Number(m[2]);
    const x = Number(s);
    return Number.isFinite(x) ? x : NaN;
  }
  const fmt = (x, d = 2) => Number.isFinite(x) ? x.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";
  const fmtg = (x, d = 3) => Number.isFinite(x) ? x.toLocaleString("pt-BR", { maximumFractionDigits: d }) : "—";
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const deg = (r) => r * 180 / Math.PI;
  const T = (x, d = 2) => fmt(x, d).replace(/\./g, "{.}").replace(",", "{,}");
  const Tg = (x, d = 3) => fmtg(x, d).replace(/\./g, "{.}").replace(",", "{,}");
  function tex(s, display) {
    if (window.katex) { try { return window.katex.renderToString(s, { throwOnError: false, displayMode: !!display }); } catch (e) { /* texto */ } }
    return "<code>" + esc(s) + "</code>";
  }
  function toast(msg) {
    const t = $("#toast"); if (!t) return;
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }
  function b64(str) {
    const bytes = new TextEncoder().encode(str); let bin = "";
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function unb64(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
    return new TextDecoder().decode(Uint8Array.from(atob(s), c => c.charCodeAt(0)));
  }

  // ---------- conteúdo (convenções da aula) ----------
  const TIPOS = {
    UU: { nome: "Triaxial UU", desc: "Ensaio não adensado, não drenado", param: "C", nivel: "total", eq: "cu", eixo: "σ" },
    CU: { nome: "Triaxial CU", desc: "Ensaio adensado, não drenado", param: "Cphi", nivel: "total", eq: "c_sig", eixo: "σ" },
    CD: { nome: "Triaxial CD", desc: "Ensaio adensado, drenado", param: "Clphil", nivel: "efetiva", eq: "cl_sigl", eixo: "σ'" },
    DIRETO: { nome: "Cisalhamento direto", desc: "Ensaio de cisalhamento direto", param: "tau", nivel: "indefinida", eq: "c_sig", eixo: "σ" }
  };
  const OPT = {
    tipo: [["UU", "Triaxial UU"], ["CU", "Triaxial CU"], ["CD", "Triaxial CD"], ["DIRETO", "Cisalhamento direto"]],
    nome: [["UU", "Ensaio não adensado, não drenado"], ["CU", "Ensaio adensado, não drenado"], ["CD", "Ensaio adensado, drenado"], ["DIRETO", "Ensaio de cisalhamento direto"], ["DU", "Ensaio drenado, não adensado"]],
    param: [["C", "C (coesão não drenada Cu)"], ["Cphi", "C e φ"], ["Clphil", "c' e φ'"], ["tau", "τ, δH e δV (força e deslocamentos)"]],
    nivel: [["total", "Total"], ["efetiva", "Efetiva"], ["indefinida", "Indefinida (não tem controle de drenagem)"]],
    eq: [["cu", "τ = Cu  (φ = 0)"], ["c_sig", "τ = c + σ·tgφ"], ["cl_sigl", "τ = c' + σ'·tgφ'"], ["sig", "τ = σ·tgφ  (c = 0)"]]
  };
  const label = (k, v) => (OPT[k].find(o => o[0] === v) || ["", v])[1];

  function eqOk(ex, v) {
    if (ex.tipo === "UU") return v === "cu";
    if (ex.tipo === "CD") return v === "cl_sigl";
    return v === "c_sig" || (ex.c === 0 && v === "sig");
  }
  function eqTex(ex) {
    const c = Tg(ex.c, 2), t = Tg(ex.tg, 4);
    if (ex.tipo === "UU") return `\\tau = C_u = ${c}\\ \\text{kPa}`;
    if (ex.tipo === "CD") return `\\tau = c' + \\sigma'\\,\\text{tg}\\,\\varphi' = ${c} + ${t}\\,\\sigma'`;
    return `\\tau = c + \\sigma\\,\\text{tg}\\,\\varphi = ${c} + ${t}\\,\\sigma`;
  }

  // ---------- geometria ----------
  const phiDeg = (ex) => deg(Math.atan(ex.tg));
  function circulos(ex) {
    if (ex.tipo === "DIRETO") return [];
    const phi = Math.atan(ex.tg);
    const rN = Math.tan(Math.PI / 4 + phi / 2), N = rN * rN;
    let s3 = ex.s3;
    if (!s3 || !s3.length) {
      let a = (10 - 2 * ex.c * rN) / (2 * N);
      a = Math.max(0.5, Math.round(a * 2) / 2);
      s3 = [0, a, 2 * a];
    }
    return s3.map(x => {
      const s1 = x * N + 2 * ex.c * rN;
      const cen = (x + s1) / 2, r = (s1 - x) / 2;
      return { s3: x, s1, cen, r, tsig: cen - r * Math.sin(phi), ttau: r * Math.cos(phi) };
    });
  }
  function pontos(ex) {
    if (ex.tipo !== "DIRETO") return [];
    return (ex.sig && ex.sig.length ? ex.sig : [2, 4, 6, 8]).map(s => ({ s, t: ex.c + s * ex.tg }));
  }
  // ponto "bom de ler" na envoltória (σ inteiro com τ quase inteiro)
  function pontoLeitura(ex) {
    for (let s = 1; s <= 12; s++) { const t = ex.c + s * ex.tg; if (Math.abs(t - Math.round(t)) < 0.02) return { s, t: Math.round(t) }; }
    return { s: 10, t: ex.c + 10 * ex.tg };
  }

  // ---------- desenho ----------
  function draw(svg, ex, opt) {
    opt = opt || {};
    const css = getComputedStyle(document.documentElement), col = (n) => css.getPropertyValue(n).trim();
    const cs = circulos(ex), ps = pontos(ex);
    let smax = 10;
    cs.forEach(c => smax = Math.max(smax, c.s1 + 0.5));
    ps.forEach(p => smax = Math.max(smax, p.s + 1));
    smax = Math.ceil(smax / 2) * 2;
    let tneed = 4;
    cs.forEach(c => tneed = Math.max(tneed, c.r + 0.5));
    ps.forEach(p => tneed = Math.max(tneed, p.t + 0.5));
    if (opt.env !== false) tneed = Math.max(tneed, Math.min(ex.c + smax * ex.tg, smax * 0.9) + 0.5);
    const tmax = Math.ceil(Math.max(tneed, smax * 0.4) / 2) * 2;
    const L = 46, R = 18, Tp = 16, Bt = 40, W = 520;
    const k = (W - L - R) / smax;
    const H = Tp + tmax * k + Bt;
    const X = (s) => L + s * k, Y = (t) => Tp + (tmax - t) * k;
    const passo = smax > 14 ? 2 : 1;
    let s = "";
    for (let i = 0; i <= smax; i += passo) s += `<line x1="${X(i)}" x2="${X(i)}" y1="${Y(0)}" y2="${Y(tmax)}" stroke="${col("--border")}" stroke-width="${i % 2 ? .5 : 1}"/>`;
    for (let j = 0; j <= tmax; j += passo) s += `<line x1="${X(0)}" x2="${X(smax)}" y1="${Y(j)}" y2="${Y(j)}" stroke="${col("--border")}" stroke-width="${j % 2 ? .5 : 1}"/>`;
    for (let i = 2; i <= smax; i += 2) s += `<text x="${X(i)}" y="${Y(0) + 16}" font-size="12" text-anchor="middle" fill="${col("--muted")}">${i}</text>`;
    for (let j = 2; j <= tmax; j += 2) s += `<text x="${X(0) - 7}" y="${Y(j) + 4}" font-size="12" text-anchor="end" fill="${col("--muted")}">${j}</text>`;
    s += `<text x="${X(0) - 7}" y="${Y(0) + 4}" font-size="12" text-anchor="end" fill="${col("--muted")}">0</text>`;
    s += `<line x1="${X(0)}" x2="${X(smax) + 8}" y1="${Y(0)}" y2="${Y(0)}" stroke="${col("--text")}" stroke-width="1.8"/>`;
    s += `<line x1="${X(0)}" x2="${X(0)}" y1="${Y(0)}" y2="${Y(tmax) - 8}" stroke="${col("--text")}" stroke-width="1.8"/>`;
    s += `<text x="${X(smax) + 6}" y="${Y(0) - 8}" font-size="15" font-style="italic" fill="${col("--text")}">${TIPOS[ex.tipo].eixo}</text>`;
    s += `<text x="${X(0) + 8}" y="${Y(tmax) + 4}" font-size="15" font-style="italic" fill="${col("--text")}">τ</text>`;
    s += `<text x="${X(smax)}" y="${H - 6}" font-size="11" text-anchor="end" fill="${col("--muted")}">kPa</text>`;
    s += `<defs><clipPath id="${svg.id}clip"><rect x="${X(0)}" y="${Y(tmax)}" width="${smax * k}" height="${tmax * k}"/></clipPath></defs>`;
    let g = "";
    if (opt.itens !== false) {
      cs.forEach(c => { g += `<path d="M ${X(c.s3)} ${Y(0)} A ${c.r * k} ${c.r * k} 0 0 1 ${X(c.s1)} ${Y(0)}" fill="none" stroke="${col("--primary")}" stroke-width="2"/>`; });
      ps.forEach(p => { const x = X(p.s), y = Y(p.t), d = 5; g += `<path d="M ${x - d} ${y - d} L ${x + d} ${y + d} M ${x - d} ${y + d} L ${x + d} ${y - d}" stroke="${col("--primary")}" stroke-width="2.5"/>`; });
    }
    if (opt.env !== false) {
      g += `<line x1="${X(0)}" y1="${Y(ex.c)}" x2="${X(smax)}" y2="${Y(ex.c + smax * ex.tg)}" stroke="${col("--text")}" stroke-width="2.4"/>`;
      if (opt.itens !== false) cs.forEach(c => { if (ex.tg > 0) g += `<circle cx="${X(c.tsig)}" cy="${Y(c.ttau)}" r="3.5" fill="${col("--accent")}"/>`; });
      if (opt.leitura) {
        const p = pontoLeitura(ex);
        g += `<line x1="${X(p.s)}" x2="${X(p.s)}" y1="${Y(0)}" y2="${Y(p.t)}" stroke="${col("--accent")}" stroke-dasharray="4 3"/><line x1="${X(0)}" x2="${X(p.s)}" y1="${Y(p.t)}" y2="${Y(p.t)}" stroke="${col("--accent")}" stroke-dasharray="4 3"/>`;
        g += `<circle cx="${X(0)}" cy="${Y(ex.c)}" r="4.5" fill="${col("--accent")}"/><circle cx="${X(p.s)}" cy="${Y(p.t)}" r="4.5" fill="${col("--accent")}"/>`;
      }
    }
    s += `<g clip-path="url(#${svg.id}clip)">${g}</g>`;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = s;
  }

  // ---------- perguntas ----------
  const PISTA_TIPO = "Olhe três coisas no gráfico: (1) Tem círculos ou só pontos (x)? Pontos = cisalhamento direto. (2) A envoltória é horizontal? Horizontal (φ = 0) = UU. (3) O eixo é σ ou σ'? σ' (tensão efetiva) = CD; σ (tensão total) com envoltória inclinada = CU.";
  const PISTA_PARAM = "UU mede só a coesão não drenada (Cu). CU mede c e φ. CD mede c' e φ' (efetivos). O cisalhamento direto mede a tensão cisalhante τ e os deslocamentos horizontal (δH) e vertical (δV).";
  const PISTA_NIVEL = "UU e CU: tensões TOTAIS (não drena na ruptura; a pressão neutra está dentro). CD: tensões EFETIVAS (drenado, u ≈ 0). Cisalhamento direto: INDEFINIDA, porque o ensaio não tem controle de drenagem.";
  const PISTA_EQ = "Critério de Mohr-Coulomb: τ = c + σ·tgφ. No UU, φ = 0 e fica τ = Cu. No CD, em termos efetivos: τ = c' + σ'·tgφ'.";

  // ---------- círculo de Mohr ----------
  const mohrGeo = (ex) => {
    const c = (ex.s1 + ex.s3) / 2, r = (ex.s1 - ex.s3) / 2, a2 = 2 * ex.alpha * Math.PI / 180;
    return { c, r, sE: c + r * Math.cos(a2), tE: r * Math.sin(a2) };
  };
  function drawMohr(svg, ex, revelar) {
    const css = getComputedStyle(document.documentElement), col = (n) => css.getPropertyValue(n).trim();
    const { c, r, sE, tE } = mohrGeo(ex);
    const smax = Math.ceil((ex.s1 + 1) / 2) * 2, tmax = Math.max(4, Math.ceil((r + 1) / 2) * 2);
    const L = 46, R = 18, Tp = 16, Bt = 40, W = 520, k = (W - L - R) / smax, H = Tp + tmax * k + Bt;
    const X = (s) => L + s * k, Y = (t) => Tp + (tmax - t) * k;
    let s = "";
    for (let i = 0; i <= smax; i++) s += `<line x1="${X(i)}" x2="${X(i)}" y1="${Y(0)}" y2="${Y(tmax)}" stroke="${col("--border")}" stroke-width="${i % 2 ? .5 : 1}"/>`;
    for (let j = 0; j <= tmax; j++) s += `<line x1="${X(0)}" x2="${X(smax)}" y1="${Y(j)}" y2="${Y(j)}" stroke="${col("--border")}" stroke-width="${j % 2 ? .5 : 1}"/>`;
    for (let i = 2; i <= smax; i += 2) s += `<text x="${X(i)}" y="${Y(0) + 16}" font-size="12" text-anchor="middle" fill="${col("--muted")}">${i}</text>`;
    for (let j = 2; j <= tmax; j += 2) s += `<text x="${X(0) - 7}" y="${Y(j) + 4}" font-size="12" text-anchor="end" fill="${col("--muted")}">${j}</text>`;
    s += `<line x1="${X(0)}" x2="${X(smax) + 8}" y1="${Y(0)}" y2="${Y(0)}" stroke="${col("--text")}" stroke-width="1.8"/><line x1="${X(0)}" x2="${X(0)}" y1="${Y(0)}" y2="${Y(tmax) - 8}" stroke="${col("--text")}" stroke-width="1.8"/>`;
    s += `<text x="${X(smax) + 6}" y="${Y(0) - 8}" font-size="15" font-style="italic" fill="${col("--text")}">σ</text><text x="${X(0) + 8}" y="${Y(tmax) + 4}" font-size="15" font-style="italic" fill="${col("--text")}">τ</text>`;
    s += `<path d="M ${X(ex.s3)} ${Y(0)} A ${r * k} ${r * k} 0 0 1 ${X(ex.s1)} ${Y(0)}" fill="none" stroke="${col("--primary")}" stroke-width="2.4"/>`;
    if (revelar) {
      const pt = (x, y, txt, dx, dy) => `<circle cx="${X(x)}" cy="${Y(y)}" r="5" fill="${col("--accent")}"/><text x="${X(x) + dx}" y="${Y(y) + dy}" font-size="14" font-weight="700" fill="${col("--accent")}">${txt}</text>`;
      s += `<line x1="${X(c)}" y1="${Y(0)}" x2="${X(c)}" y2="${Y(r)}" stroke="${col("--accent")}" stroke-dasharray="4 3"/>`;
      s += `<line x1="${X(c)}" y1="${Y(0)}" x2="${X(sE)}" y2="${Y(tE)}" stroke="${col("--accent")}" stroke-dasharray="4 3"/>`;
      s += `<text x="${X(c) + 8}" y="${Y(0) - 8}" font-size="11" fill="${col("--accent")}">2α = ${2 * ex.alpha}°</text>`;
      s += pt(ex.s1, 0, "A", 4, -8) + pt(ex.s3, 0, "B (= σ2)", -4, -10) + pt(c, r, "D", 6, -6) + pt(sE, tE, "E", 6, -6);
    }
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = s;
  }
  function mohrAleatorio() {
    const s3 = pick(faixa(1, 6, 1)), d = pick(faixa(4, 12, 2));
    return { kind: "mohr", id: "rnd-mohr", origem: "Exercício aleatório", titulo: "Círculo de Mohr", s3, s1: s3 + d, alpha: pick([30, 60]) };
  }
  const LOCAIS = [
    ["dir", "No eixo σ, no extremo DIREITO do círculo (σ1, τ = 0)"],
    ["esq", "No eixo σ, no extremo ESQUERDO do círculo (σ3, τ = 0)"],
    ["topo", "No TOPO do círculo (bem acima do centro)"],
    ["giro", "Num ponto do círculo obtido girando 2α a partir do ponto do σ1"],
    ["centro", "No centro do círculo"],
    ["nao", "Não é possível indicar"]
  ];
  function perguntasLetras(ex) {
    const L = (k, letra, oque, certo, resp, dica, erros) => ({
      k, t: `Letra ${letra}: ${oque}`, sel: "loc", opts: LOCAIS, ok: (v) => v === certo, resp, dica,
      diag: (v) => erros[v] || dica
    });
    return [
      L("A", "A", "ponto que representa o Plano Principal Maior", "dir", "No eixo σ, extremo direito: é o σ1 (maior tensão normal, τ = 0).",
        "Planos principais são os que NÃO têm tensão cisalhante (τ = 0): ficam sobre o eixo σ. O MAIOR é o da maior tensão normal.",
        { esq: "Esse é o plano principal MENOR (σ3). O maior fica na direita (σ1).", topo: "No topo τ é máximo; plano principal tem τ = 0." }),
      L("B", "B", "ponto que representa o Plano Principal Menor", "esq", "No eixo σ, extremo esquerdo: é o σ3 (menor tensão normal, τ = 0).",
        "Também sobre o eixo σ (τ = 0), mas do lado da MENOR tensão normal.",
        { dir: "Esse é o plano principal MAIOR (σ1). O menor fica na esquerda (σ3)." }),
      L("C", "C", "ponto que representa o Plano Principal Intermediário", "nao", "Não é possível: o círculo de Mohr só mostra σ1 e σ3. No triaxial σ2 = σ3, então o intermediário coincide com o ponto B.",
        "O círculo tem só dois pontos sobre o eixo σ. E no triaxial, quanto vale σ2?",
        { centro: "O centro não pertence ao círculo e não é plano principal. No triaxial σ2 = σ3: coincide com B, por isso não dá para indicar separado.", esq: "Quase: como σ2 = σ3 ele coincide com B, então não é possível indicar como um ponto diferente. A resposta esperada é 'não é possível' com essa explicação." }),
      L("D", "D", "ponto do Plano que contém a Tensão de Cisalhamento Máxima", "topo", "No topo do círculo: τ = τmáx = raio, com σ = (σ1 + σ3)/2. Esse plano faz 45° com o plano principal maior.",
        "Onde o círculo fica mais alto (maior τ)?",
        { centro: "O centro está no eixo (τ = 0). O τmáx fica no TOPO, logo acima dele." }),
      L("E", "E", `ponto de um plano que faz um ângulo α com o Plano Principal Maior`, "giro", "É possível: parta do ponto A (σ1) e gire 2α em torno do centro. O ponto fica no círculo com σ = c + r·cos2α e τ = r·sen2α.",
        "No círculo de Mohr os ângulos aparecem DOBRADOS e são contados a partir do plano de referência (o principal maior, ponto A).",
        { nao: "É possível sim: qualquer plano tem seu ponto no círculo. Gire 2α a partir de A." })
    ];
  }
  function perguntasMohr(ex) {
    if (ex.letras) return perguntasLetras(ex);
    const { c, r, sE, tE } = mohrGeo(ex), d = ex.s1 - ex.s3;
    const n = (v) => fmtg(v, 2);
    const near = (a, b) => Math.abs(a - b) < 0.15;
    return [
      { k: "s1", t: "Valor numérico da tensão principal maior σ1 (kPa)", num: true, v: ex.s1, tol: 0.25, resp: `σ1 = ${n(ex.s1)} kPa`,
        dica: "σ1 é onde o círculo toca o eixo σ do lado DIREITO (a maior tensão normal, com τ = 0). É o ponto do plano principal maior.",
        diag: (v) => near(v, ex.s3) ? "Você trocou: o ponto da esquerda é o σ3 (menor). σ1 é o da direita." : near(v, c) ? "Esse é o centro do círculo. σ1 é o ponto mais à direita." : "Leia onde o círculo encosta no eixo σ, do lado direito." },
      { k: "s3", t: "Valor numérico da tensão principal menor σ3 (kPa)", num: true, v: ex.s3, tol: 0.25, resp: `σ3 = ${n(ex.s3)} kPa`,
        dica: "σ3 é onde o círculo toca o eixo σ do lado ESQUERDO (a menor tensão normal). No triaxial, é a pressão confinante.",
        diag: (v) => near(v, ex.s1) ? "Você trocou: o ponto da direita é o σ1. σ3 é o da esquerda." : "Leia onde o círculo começa no eixo σ (lado esquerdo)." },
      { k: "tmax", t: "Valor numérico da tensão de cisalhamento máxima τmáx (kPa)", num: true, v: r, tol: 0.25, resp: `τmáx = (σ1 − σ3)/2 = (${n(ex.s1)} − ${n(ex.s3)})/2 = ${n(r)} kPa`,
        dica: "É a altura do topo do círculo, ou seja, o RAIO: τmáx = (σ1 − σ3)/2.",
        diag: (v) => near(v, d) ? "Esse é o diâmetro (a tensão desviadora). τmáx é a metade: o raio." : near(v, c) ? "Esse é o σ do topo (o centro). τmáx é a ALTURA do topo." : "τmáx = raio = (σ1 − σ3)/2." },
      { k: "s2", t: "Valor numérico da tensão principal intermediária σ2 (kPa)", num: true, v: ex.s3, tol: 0.25, resp: `σ2 = σ3 = ${n(ex.s3)} kPa`,
        dica: "No ensaio triaxial a pressão confinante age igual em todas as direções laterais. Por isso σ2 = σ3.",
        diag: (v) => near(v, c) ? "O centro não é o σ2. No triaxial, σ2 = σ3 (as duas tensões laterais são a pressão confinante)." : "No triaxial, σ2 = σ3." },
      { k: "desv", t: "Valor numérico da tensão desviadora Δσ (kPa)", num: true, v: d, tol: 0.25, resp: `Δσ = σ1 − σ3 = ${n(ex.s1)} − ${n(ex.s3)} = ${n(d)} kPa`,
        dica: "Tensão desviadora é o acréscimo de tensão axial do ensaio: Δσ = σ1 − σ3. É o DIÂMETRO do círculo.",
        diag: (v) => near(v, r) ? "Esse é o raio (τmáx). A tensão desviadora é o diâmetro: σ1 − σ3." : near(v, ex.s1 + ex.s3) ? "É uma subtração: Δσ = σ1 − σ3." : "Δσ = σ1 − σ3." },
      { k: "sD", t: "Ponto D (plano da tensão de cisalhamento máxima): valor de σ nesse plano (kPa)", num: true, v: c, tol: 0.25, resp: `σ = (σ1 + σ3)/2 = ${n(c)} kPa  (e τ = τmáx = ${n(r)} kPa)`,
        dica: "O ponto de τmáx é o TOPO do círculo, logo acima do centro: σ = (σ1 + σ3)/2. Esse plano faz 45° com o plano principal maior.",
        diag: (v) => near(v, r) ? "Esse é o τ do ponto. O σ do topo é o centro: (σ1 + σ3)/2." : "O topo fica bem em cima do centro: σ = (σ1 + σ3)/2." },
      { k: "sE", t: `Ponto E (plano que faz α = ${ex.alpha}° com o plano principal maior): valor de σ (kPa)`, num: true, v: sE, tol: 0.3,
        resp: `σ = centro + raio·cos 2α = ${n(c)} + ${n(r)}·cos ${2 * ex.alpha}° = ${n(sE)} kPa`,
        dica: "No círculo, o ângulo é DOBRADO: a partir do ponto A (σ1), gire 2α em torno do centro. σ = centro + raio·cos(2α).",
        diag: (v) => near(v, c + r * Math.cos(ex.alpha * Math.PI / 180)) ? "Você usou α. No círculo de Mohr o ângulo é dobrado: use 2α." : near(v, c - r * Math.cos(2 * ex.alpha * Math.PI / 180)) ? "Você mediu a partir do σ3. O ângulo α é contado a partir do plano principal MAIOR (ponto σ1)." : "σ = (σ1+σ3)/2 + (σ1−σ3)/2 · cos 2α." },
      { k: "tE", t: `Ponto E (α = ${ex.alpha}°): valor de τ (kPa)`, num: true, v: tE, tol: 0.3,
        resp: `τ = raio·sen 2α = ${n(r)}·sen ${2 * ex.alpha}° = ${n(tE)} kPa`,
        dica: "τ = raio · sen(2α).",
        diag: (v) => near(v, r * Math.sin(ex.alpha * Math.PI / 180)) ? "Você usou α. No círculo de Mohr o ângulo é dobrado: sen 2α." : "τ = (σ1 − σ3)/2 · sen 2α." },
      { k: "inter", t: "É possível indicar no círculo o ponto do plano principal intermediário?", sel: "inter",
        opts: [["nao", "Não: no triaxial σ2 = σ3, então ele coincide com o ponto do plano principal menor"], ["centro", "Sim, é o centro do círculo"], ["topo", "Sim, é o topo do círculo"]],
        ok: (v) => v === "nao", resp: "Não é possível indicá-lo separadamente: no triaxial σ2 = σ3, e o ponto coincide com o do plano principal menor (σ3).",
        dica: "Os pontos sobre o eixo σ (τ = 0) são os planos principais. Quantos pontos o círculo tem sobre o eixo? E quanto vale σ2 no triaxial?",
        diag: () => "O centro e o topo têm τ ≠ 0 (ou nem são pontos do círculo), então não são planos principais. No triaxial σ2 = σ3: o intermediário coincide com o menor." },
      { k: "neg", t: "Por que não trabalhamos com tensões cisalhantes negativas?", sel: "neg",
        opts: [["sim", "O círculo é simétrico em relação ao eixo σ: a metade de baixo mostra os mesmos planos e tensões, só com o sinal convencionado de τ trocado — basta a metade de cima"], ["tracao", "Porque o solo não resiste à tração"], ["naoexiste", "Porque tensão cisalhante negativa não existe"]],
        ok: (v) => v === "sim", resp: "Por simetria: a metade de baixo do círculo repete os mesmos planos e tensões, só muda o sinal (sentido) convencionado de τ. Então basta desenhar e usar a metade de cima.",
        dica: "Compare a metade de cima com a de baixo do círculo completo. O que muda entre elas?",
        diag: () => "τ negativo existe (é só o sentido oposto), e a resistência à tração é outra história. O motivo é a SIMETRIA do círculo." }
    ];
  }

  function perguntas(ex) {
    if (ex.kind === "mohr") return perguntasMohr(ex);
    const tp = TIPOS[ex.tipo], phi = phiDeg(ex), p = pontoLeitura(ex);
    const q = [];
    if (ex.modo === "identificar") {
      q.push({
        k: "tipo", t: "Tipo de ensaio", sel: "tipo", ok: (v) => v === ex.tipo, resp: `${tp.nome} — ${tp.desc}`, dica: PISTA_TIPO,
        diag: () => ({
          UU: "A envoltória é horizontal (φ = 0): a resistência não aumenta com σ. Isso é o UU.",
          DIRETO: "O gráfico tem pontos (x), não círculos de Mohr: no cisalhamento direto mede-se direto o par (σ, τ) da ruptura.",
          CD: "Repare no eixo horizontal: é σ' (tensão efetiva). Só o CD é interpretado em tensões efetivas.",
          CU: "Há círculos, a envoltória é inclinada e o eixo é σ (tensão total): é o CU."
        })[ex.tipo]
      });
    }
    q.push({
      k: "nome", t: "Nome do ensaio", sel: "nome", ok: (v) => v === ex.tipo, resp: label("nome", ex.tipo),
      dica: "Leia a sigla: a 1ª letra diz se o corpo de prova foi ADENSADO antes do carregamento (C = consolidated = adensado; U = unconsolidated = não adensado). A 2ª letra diz se há DRENAGEM durante a ruptura (D = drained = drenado; U = undrained = não drenado). O cisalhamento direto não é triaxial: o nome é o próprio ensaio de cisalhamento direto.",
      diag: (v) => v === "DU" ? "Essa combinação não existe nos ensaios convencionais: se drena, ele adensa. Os três triaxiais são UU, CU e CD."
        : ({
          UU: "UU = Unconsolidated Undrained: NÃO adensado e NÃO drenado (também chamado de ensaio rápido, Q).",
          CU: "CU = Consolidated Undrained: ADENSADO e NÃO drenado (também chamado de rápido pré-adensado, R).",
          CD: "CD = Consolidated Drained: ADENSADO e DRENADO (também chamado de ensaio lento, S).",
          DIRETO: "Não é triaxial: o corpo de prova é cortado numa caixa bipartida. O nome é ensaio de cisalhamento direto."
        })[ex.tipo]
    });
    q.push({ k: "param", t: "Parâmetros medidos", sel: "param", ok: (v) => v === tp.param, resp: label("param", tp.param), dica: PISTA_PARAM, diag: () => PISTA_PARAM });
    q.push({ k: "nivel", t: "Nível de tensão na ruptura", sel: "nivel", ok: (v) => v === tp.nivel, resp: label("nivel", tp.nivel), dica: PISTA_NIVEL, diag: () => PISTA_NIVEL });
    q.push({ k: "eq", t: "Equação da envoltória", sel: "eq", ok: (v) => eqOk(ex, v), resp: label("eq", tp.eq) + (ex.tipo !== "UU" && ex.c === 0 ? "  (aqui c = 0, então também vale τ = σ·tgφ)" : ""), dica: PISTA_EQ, diag: () => PISTA_EQ });

    const cNome = ex.tipo === "UU" ? "Cu" : ex.tipo === "CD" ? "c'" : "c";
    const fNome = ex.tipo === "CD" ? "φ'" : "φ";
    if (ex.modo === "identificar") {
      q.push({
        k: "c", t: `${cNome} (kPa)`, num: true, v: ex.c, tol: 0.15,
        resp: `${cNome} = ${fmtg(ex.c, 2)} kPa`,
        dica: ex.tipo === "UU" ? "No UU a envoltória é horizontal: Cu é a altura dela (igual ao raio dos círculos)." : "c é onde a envoltória corta o eixo τ, ou seja, o valor de τ quando σ = 0.",
        sol: ex.tipo === "UU" ? `A envoltória horizontal está em τ = ${fmtg(ex.c, 2)} → Cu = ${fmtg(ex.c, 2)} kPa (e φ = 0).` : `A reta corta o eixo τ em ${fmtg(ex.c, 2)} → ${cNome} = ${fmtg(ex.c, 2)} kPa.`,
        diag: (v) => ex.tipo === "UU" && Math.abs(v - 2 * ex.c) < 0.2 ? "Você pegou o diâmetro do círculo. Cu é o RAIO (a altura da envoltória horizontal)." : "Leia onde a envoltória corta o eixo vertical τ (no σ = 0)."
      });
    }
    if (ex.modo === "identificar" || ex.tipo !== "UU") {
      const solPhi = ex.tipo === "UU"
        ? "Envoltória horizontal → tgφ = 0 → φ = 0°."
        : `Pegue um ponto da envoltória, por exemplo (${fmtg(p.s, 2)}; ${fmtg(p.t, 3)}). Então ${fmtg(p.t, 3)} = ${fmtg(ex.c, 2)} + ${fmtg(p.s, 2)}·tg${fNome} → tg${fNome} = (${fmtg(p.t, 3)} − ${fmtg(ex.c, 2)}) / ${fmtg(p.s, 2)} = ${fmtg(ex.tg, 4)} → ${fNome} = arctg(${fmtg(ex.tg, 4)}) = ${fmt(phi, 2)}°.`;
      q.push({
        k: "phi", t: `${fNome} (graus)`, num: true, v: phi, tol: 0.6, abs: true,
        resp: `${fNome} = ${fmt(phi, 2)}°`,
        dica: ex.modo === "desenhar" ? `O enunciado dá tg${fNome}. Então ${fNome} = arctg(valor). Use a calculadora em graus (DEG).` : "Pegue dois pontos da reta: tgφ = (τ₂ − τ₁)/(σ₂ − σ₁), ou com o intercepto: tgφ = (τ − c)/σ. Depois φ = arctg(tgφ).",
        sol: ex.modo === "desenhar" ? `${fNome} = arctg(${fmtg(ex.tg, 4)}) = ${fmt(phi, 2)}°` : solPhi,
        diag: (v) => {
          if (ex.tg > 0 && Math.abs(v - Math.atan(ex.tg)) < 0.004) return "Sua calculadora está em RADIANOS. Coloque em graus (DEG) e calcule de novo.";
          if (ex.tg > 0 && Math.abs(v - ex.tg) < 0.006) return `Você deu o valor da tg${fNome}. O ângulo é ${fNome} = arctg(${fmtg(ex.tg, 4)}).`;
          if (ex.tg > 0 && Math.abs(v - (90 - phi)) < 0.6) return "Você achou o complemento (90° − φ). A tgφ é cateto oposto (Δτ) sobre adjacente (Δσ).";
          if (ex.c > 0 && Math.abs(v - deg(Math.atan(p.t / p.s))) < 0.6) return "Você esqueceu de descontar o c: tgφ = (τ − c) / σ, não τ / σ.";
          if (ex.tipo === "UU") return "No UU a envoltória é horizontal, então φ = 0.";
          return "Confira os dois pontos que você leu na reta e use tgφ = Δτ / Δσ.";
        }
      });
    }
    if (ex.modo === "desenhar") {
      q.push({
        k: "t0", t: "Para desenhar: τ no ponto σ = 0 (kPa)", num: true, v: ex.c, tol: 0.05,
        resp: `τ = ${fmtg(ex.c, 2)} kPa`,
        dica: "No σ = 0 a equação vira τ = c. É onde a reta começa no eixo τ.",
        sol: `τ(0) = ${fmtg(ex.c, 2)} + 0·tgφ = ${fmtg(ex.c, 2)} kPa`,
        diag: () => "Com σ = 0, o termo σ·tgφ some: sobra τ = c."
      });
      q.push({
        k: "t10", t: "Para desenhar: τ no ponto σ = 10 (kPa)", num: true, v: ex.c + 10 * ex.tg, tol: 0.05,
        resp: `τ = ${fmtg(ex.c + 10 * ex.tg, 3)} kPa`,
        dica: "Substitua σ = 10 na equação: τ = c + 10·tgφ. Use a tgφ do enunciado, não o ângulo.",
        sol: `τ(10) = ${fmtg(ex.c, 2)} + 10 × ${fmtg(ex.tg, 4)} = ${fmtg(ex.c + 10 * ex.tg, 3)} kPa. Ligue (0; ${fmtg(ex.c, 2)}) a (10; ${fmtg(ex.c + 10 * ex.tg, 3)}).`,
        diag: (v) => Math.abs(v - 10 * ex.tg) < 0.05 && ex.c ? "Faltou somar o c: τ = c + σ·tgφ." : Math.abs(v - (ex.c + 10 * phi)) < 0.5 ? "Você multiplicou pelo ângulo. Use a tgφ (o número dentro do arctg)." : "τ = c + 10·tgφ."
      });
    }
    return q;
  }

  // ---------- treino ----------
  let atual = null, qs = [];
  function enunciado(ex) {
    if (ex.kind === "mohr" && ex.letras) return "Para o círculo de Mohr abaixo, indique onde fica cada ponto (se possível) e explique aqueles que não forem possíveis.";
    if (ex.kind === "mohr") return "Para o círculo de Mohr abaixo (ensaio triaxial na ruptura; σ e τ em kPa), responda os itens. Leia os valores direto na grade.";
    const tp = TIPOS[ex.tipo];
    if (ex.modo === "identificar") return "Para a envoltória abaixo, determine: tipo de ensaio, parâmetros medidos, nível de tensão na ruptura, equação da envoltória e os valores de c e φ (σ e τ em kPa).";
    const par = ex.tipo === "UU" ? `Cu = ${fmtg(ex.c, 2)}` : `${ex.c ? (ex.tipo === "CD" ? "c' = " : "C = ") + fmtg(ex.c, 2) + " e " : ""}${ex.tipo === "CD" ? "φ'" : "φ"} = arctg ${fmtg(ex.tg, 4)}`;
    return `Desenhe a envoltória de resistência ao cisalhamento do ensaio <strong>${tp.nome}</strong> com <strong>${par}</strong> (kPa), e complete os dados pedidos.`;
  }

  function start(ex, noScroll) {
    atual = JSON.parse(JSON.stringify(ex));
    qs = perguntas(atual);
    const box = $("#ensTreinoBox");
    const rows = qs.map((q, i) => {
      const campo = q.sel
        ? `<select data-i="${i}"><option value="">— escolha —</option>${(q.opts || OPT[q.sel]).map(o =>`<option value="${o[0]}">${esc(o[1])}</option>`).join("")}</select>`
        : `<input type="text" inputmode="decimal" data-i="${i}" autocomplete="off">`;
      return `<div class="tq" id="eq${i}">
        <div class="t">${i + 1}. ${esc(q.t)}</div>
        <div class="tq-inputs"><label class="tq-in ens-in">${campo}<span class="tq-mark" data-mark="${i}"></span></label></div>
        <div class="tq-fb" data-fb="${i}"></div>
        <div class="btnrow">
          <button type="button" class="btn small" data-dica="${i}">Dica</button>
          <button type="button" class="btn small" data-resp="${i}">Ver resposta</button>
        </div>
        <div class="tq-hint hidden" data-dicabox="${i}"></div>
        <div class="tq-sol hidden" data-respbox="${i}"></div>
      </div>`;
    }).join("");
    box.innerHTML = `
      <div class="card">
        <span class="pill">${esc(atual.origem || "Exercício")}</span>
        <h3 style="margin:.4em 0">${esc(atual.titulo || TIPOS[atual.tipo].nome)}</h3>
        <p>${enunciado(atual)}</p>
        <div class="figure"><svg id="ensTreinoSvg" role="img" aria-label="Gráfico τ × σ do exercício"></svg>
        <figcaption id="ensLegenda">${atual.modo === "desenhar" ? "Grade em branco: trace a envoltória no papel e confira depois." : ""}</figcaption></div>
      </div>
      <div class="callout tip"><strong>Como funciona</strong>Responda tudo e clique em <strong>Corrigir</strong>. Travou? <strong>Dica</strong> mostra o caminho; <strong>Ver resposta</strong> mostra a resposta daquele item.${atual.kind === "mohr" ? " Leia os valores na grade (cada quadradinho = 1 kPa)." : " Para ângulos aceito diferença de até ~0,5°."}</div>
      ${rows}
      <div class="btnrow treino-acoes">
        <button type="button" class="btn primary" id="ensCorrigir">Corrigir</button>
        <button type="button" class="btn" id="ensTudo">${atual.modo === "desenhar" ? "Mostrar o desenho e as respostas" : "Mostrar todas as respostas"}</button>
        <button type="button" class="btn" id="ensOutros">Mesmo tipo, outros valores</button>
        <button type="button" class="btn" id="ensNovo">Exercício aleatório</button>
        <button type="button" class="btn" id="ensLink">Copiar link deste exercício</button>
      </div>
      <div id="ensPlacar"></div>`;
    desenharAtual(false);
    $$("[data-dica]", box).forEach(b => b.onclick = () => { const i = +b.dataset.dica; const d = $(`[data-dicabox="${i}"]`); d.textContent = qs[i].dica; d.classList.remove("hidden"); });
    $$("[data-resp]", box).forEach(b => b.onclick = () => mostrar(+b.dataset.resp));
    $("#ensCorrigir").onclick = corrigir;
    $("#ensTudo").onclick = () => { qs.forEach((_, i) => mostrar(i)); revelarDesenho(); };
    $("#ensNovo").onclick = () => start(atual.kind === "mohr" ? mohrAleatorio() : aleatorio(atual.modo), true);
    $("#ensOutros").onclick = () => start(outrosValores(atual), true);
    $("#ensLink").onclick = async () => {
      const link = location.origin + location.pathname + "#ens=" + b64(JSON.stringify(atual));
      let ok = false; try { await navigator.clipboard.writeText(link); ok = true; } catch (e) { ok = false; }
      toast(ok ? "Link copiado! Quem abrir cai direto neste exercício." : "Não consegui copiar o link");
    };
    if (!noScroll) $("#treino").scrollIntoView();
  }

  function mostrar(i) {
    const q = qs[i], box = $(`[data-respbox="${i}"]`);
    box.innerHTML = `<div class="res">→ ${esc(q.resp)}</div>` + (q.sol ? `<p style="margin:.4em 0 0">${esc(q.sol)}</p>` : "");
    box.classList.remove("hidden");
    $("#eq" + i).classList.add("revelado");
  }
  function outrosValores(ex) {
    if (ex.kind === "mohr") return { ...mohrAleatorio(), letras: !!ex.letras, origem: (ex.origem || "") + " — outros valores", titulo: ex.titulo };
    return { ...aleatorio(ex.modo, ex.tipo), origem: (ex.origem || "") + " — outros valores", titulo: ex.titulo.replace(/:.*$/, "") };
  }
  function desenharAtual(revelar) {
    const svg = $("#ensTreinoSvg");
    if (atual.kind === "mohr") return drawMohr(svg, atual, revelar);
    if (revelar) return draw(svg, atual, { leitura: true });
    draw(svg, atual, atual.modo === "desenhar" ? { env: false, itens: false } : {});
  }
  function revelarDesenho() {
    if (atual.kind === "mohr") {
      drawMohr($("#ensTreinoSvg"), atual, true);
      $("#ensLegenda").textContent = "A = plano principal maior (σ1) · B = plano principal menor (σ3), que coincide com o intermediário (σ2 = σ3) · D = plano de τmáx · E = plano a α do principal maior.";
      return;
    }
    draw($("#ensTreinoSvg"), atual, { leitura: true });
    $("#ensLegenda").innerHTML = `Envoltória: ${tex(eqTex(atual))}` + (atual.tipo !== "UU" ? ` &nbsp;·&nbsp; pontos em destaque: o intercepto e um ponto fácil de ler.` : "");
  }

  function corrigir() {
    let certas = 0, vazias = 0, primeiro = -1;
    qs.forEach((q, i) => {
      const el = $(`[data-i="${i}"]`), mark = $(`[data-mark="${i}"]`), fb = $(`[data-fb="${i}"]`);
      el.classList.remove("ok", "bad"); fb.innerHTML = "";
      const raw = el.value;
      if (raw === "" || raw == null) { vazias++; mark.textContent = ""; return; }
      let ok, v;
      if (q.sel) ok = q.ok(raw);
      else { v = num(raw); ok = Number.isFinite(v) && Math.abs(v - q.v) <= q.tol; }
      if (ok) { certas++; el.classList.add("ok"); mark.textContent = "✓"; }
      else {
        el.classList.add("bad"); mark.textContent = "✗"; if (primeiro < 0) primeiro = i;
        const msg = q.sel ? q.diag(raw) : (Number.isFinite(v) ? q.diag(v) : "Não entendi o número. Use vírgula ou ponto (ex.: 18,43).");
        fb.innerHTML = `<div class="callout bad">${esc(msg)}</div>`;
      }
    });
    const total = qs.length;
    let txt = `<div class="callout ${certas === total ? "tip" : "key"}"><strong>${certas} de ${total} certas</strong>`;
    if (certas === total) { txt += "Mandou bem!"; revelarDesenho(); }
    else txt += (vazias ? `${vazias} sem resposta. ` : "") + (primeiro >= 0 ? `<a href="#eq${primeiro}">Ir para o primeiro erro</a>.` : "");
    $("#ensPlacar").innerHTML = txt + "</div>";
  }

  // ---------- aleatório ----------
  // tgφ "de prova": dão pontos legíveis na grade
  const TGS = [0.2, 0.25, 0.3, 1 / 3, 0.4, 0.5, 0.6, 2 / 3, 0.75, 0.8, 1, 1.2];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const faixa = (a, b, passo) => { const v = []; for (let x = a; x <= b + 1e-9; x += passo) v.push(Math.round(x * 10) / 10); return v; };
  function valores(tipo) {
    if (tipo === "UU") return { c: pick(faixa(1, 5, 0.5)), tg: 0 };
    if (tipo === "CU") return { c: pick(faixa(1, 4, 0.5)), tg: pick(TGS.filter(t => t <= 0.6)) };
    if (tipo === "CD") return { c: pick(faixa(0, 2, 0.5)), tg: pick(TGS.filter(t => t >= 0.4)) };
    return { c: pick(faixa(0, 3, 0.5)), tg: pick(TGS) };
  }
  function sorteiaCirculos(tipo, c, tg) {
    if (tipo === "DIRETO") return { sig: [2, 4, 6, 8].map(s => s + pick([0, 0, 1])) };
    const N = Math.tan(Math.PI / 4 + Math.atan(tg) / 2) ** 2;
    const s1de = (s3) => s3 * N + 2 * c * Math.sqrt(N);
    let maxS3 = 0; while (maxS3 < 12 && s1de(maxS3 + 0.5) <= 14) maxS3 += 0.5;
    const a = Math.max(0.5, Math.floor(maxS3 / 2 * 2) / 2);
    const ini = maxS3 - 2 * a >= 0.5 && Math.random() < 0.5 ? 0.5 : 0;
    return { s3: [ini, ini + a, ini + 2 * a] };
  }
  function aleatorio(modo, tipoFixo) {
    const tipo = tipoFixo || pick(["UU", "CU", "CD", "DIRETO"]);
    modo = modo || pick(["identificar", "desenhar"]);
    const { c, tg } = valores(tipo);
    return { id: "rnd", origem: "Exercício aleatório", titulo: modo === "identificar" ? "Identifique a envoltória" : `Desenhe — ${TIPOS[tipo].nome}`, modo, tipo, c, tg, ...sorteiaCirculos(tipo, c, tg) };
  }

  // ---------- lista de exercícios ----------
  function cards() {
    const box = $("#ensLista");
    box.innerHTML = "";
    (window.EXEMPLOS_ENSAIOS || []).forEach(ex => {
      const d = document.createElement("div");
      d.className = "ex-card";
      d.innerHTML = `<span class="pill">${esc(ex.origem)}</span><h4>${esc(ex.titulo)}</h4>
        <p>${ex.kind === "mohr" && ex.letras ? "Círculo de Mohr: indique os pontos A a E (planos principais, intermediário, τmáx e plano a α) e explique os impossíveis." : ex.kind === "mohr" ? "Círculo de Mohr: σ1, σ3, τmáx, σ2, tensão desviadora, planos principais, plano de τmáx e plano a um ângulo α." : ex.modo === "identificar" ? "Identificar: tipo, nome, parâmetros, nível de tensão, equação, c e φ a partir do gráfico." : "Desenhar a envoltória a partir do tipo de ensaio e dos parâmetros."}</p>
        <div class="btnrow"><button type="button" class="btn small primary" data-a="t">Treinar</button><button type="button" class="btn small" data-a="o">Outros valores</button></div>`;
      d.querySelector("[data-a=t]").onclick = () => start(ex);
      d.querySelector("[data-a=o]").onclick = () => start(outrosValores(ex));
      box.appendChild(d);
    });
  }

  // ---------- calculadora rápida ----------
  function lerCalc() {
    const F = $("#ensForm");
    const tipo = F.elements.tipo.value;
    const c = num(F.elements.c.value) || 0;
    const fv = num(F.elements.phi.value);
    let tg = F.elements.phiModo.value === "tg" ? fv : Math.tan(fv * Math.PI / 180);
    if (tipo === "UU" || !Number.isFinite(tg)) tg = 0;
    const lst = String(F.elements.lista.value || "").split(/[;\s]+/).map(num).filter(Number.isFinite);
    const ex = { id: "calc", origem: "Minha envoltória", titulo: "Minha envoltória — " + TIPOS[tipo].nome, modo: "identificar", tipo, c, tg };
    if (lst.length) { if (tipo === "DIRETO") ex.sig = lst; else ex.s3 = lst; }
    return ex;
  }
  function calc() {
    const ex = lerCalc(), F = $("#ensForm");
    F.elements.phi.closest("label").classList.toggle("hidden", ex.tipo === "UU");
    F.elements.phiModo.closest("label").classList.toggle("hidden", ex.tipo === "UU");
    $("#ensListaLbl").textContent = ex.tipo === "DIRETO" ? "σ dos pontos de ruptura (separe com ;)" : "σ3 dos círculos — pressões confinantes (separe com ;)";
    draw($("#ensCalcSvg"), ex, { leitura: true });
    const tp = TIPOS[ex.tipo], phi = phiDeg(ex);
    let html = `<div class="summary">
      <div class="stat"><div class="k">Tipo</div><div class="v" style="font-size:1rem">${esc(tp.nome)}</div></div>
      <div class="stat"><div class="k">${ex.tipo === "CD" ? "c'" : ex.tipo === "UU" ? "Cu" : "c"}</div><div class="v">${fmtg(ex.c, 2)} kPa</div></div>
      <div class="stat"><div class="k">${ex.tipo === "CD" ? "φ'" : "φ"}</div><div class="v">${fmt(phi, 2)}°</div></div>
    </div>
    <div class="table-wrap"><table>
      <tr><th>Tipo de ensaio</th><td>${esc(tp.nome)} — ${esc(tp.desc)}</td></tr>
      <tr><th>Parâmetros medidos</th><td>${esc(label("param", tp.param))}</td></tr>
      <tr><th>Nível de tensão na ruptura</th><td>${esc(label("nivel", tp.nivel))}</td></tr>
      <tr><th>Equação da envoltória</th><td>${tex(eqTex(ex))}</td></tr>
    </table></div>`;
    const cs = circulos(ex);
    if (cs.length) {
      html += `<h4>Círculos de Mohr na ruptura</h4><div class="table-wrap"><table><tr><th class="num">σ3</th><th class="num">σ1</th><th class="num">Centro</th><th class="num">Raio</th><th class="num">σ1 − σ3</th></tr>` +
        cs.map(c => `<tr><td class="num">${fmt(c.s3)}</td><td class="num">${fmt(c.s1)}</td><td class="num">${fmt(c.cen)}</td><td class="num">${fmt(c.r)}</td><td class="num">${fmt(c.s1 - c.s3)}</td></tr>`).join("") + `</table></div>`;
      html += `<p class="hint">${tex("\\sigma_1 = \\sigma_3\\,\\text{tg}^2(45^\\circ + \\varphi/2) + 2c\\,\\text{tg}(45^\\circ + \\varphi/2)")} — cada círculo tangencia a envoltória.</p>`;
    }
    const ps = pontos(ex);
    if (ps.length) html += `<h4>Pontos de ruptura</h4><div class="table-wrap"><table><tr><th class="num">σ</th><th class="num">τ</th></tr>` + ps.map(p => `<tr><td class="num">${fmt(p.s)}</td><td class="num">${fmt(p.t)}</td></tr>`).join("") + `</table></div>`;
    $("#ensCalcOut").innerHTML = html;
  }

  // ---------- resumo interativo ----------
  const RESUMO_DATA = [
    { tipo: "UU", titulo: "Triaxial UU", sub: "Não adensado, não drenado", c: 3, tg: 0, s3: [0, 2, 4],
      info: [
        ["Nome", "Ensaio não adensado, não drenado"],
        ["Parâmetros medidos", "C (coesão não drenada Cu)"],
        ["Nível de tensão na ruptura", "Total"],
        ["Equação da envoltória", "τ = Cu (φ = 0)"],
        ["Como reconhecer", "Círculos iguais, envoltória horizontal"]
      ]},
    { tipo: "CU", titulo: "Triaxial CU", sub: "Adensado, não drenado", c: 3, tg: 1/3, s3: [0, 1, 2],
      info: [
        ["Nome", "Ensaio adensado, não drenado"],
        ["Parâmetros medidos", "C e φ"],
        ["Nível de tensão na ruptura", "Total"],
        ["Equação da envoltória", "τ = c + σ·tgφ"],
        ["Como reconhecer", "Círculos, envoltória inclinada, eixo σ"]
      ]},
    { tipo: "CD", titulo: "Triaxial CD", sub: "Adensado, drenado", c: 1, tg: 2/3, s3: [0, 0.8, 1.6],
      info: [
        ["Nome", "Ensaio adensado, drenado"],
        ["Parâmetros medidos", "c' e φ'"],
        ["Nível de tensão na ruptura", "Efetiva"],
        ["Equação da envoltória", "τ = c' + σ'·tgφ'"],
        ["Como reconhecer", "Círculos, envoltória inclinada, eixo σ'"]
      ]},
    { tipo: "DIRETO", titulo: "Cisalhamento direto", sub: "—", c: 0, tg: 1, sig: [2, 4, 6, 8],
      info: [
        ["Nome", "Ensaio de cisalhamento direto"],
        ["Parâmetros medidos", "τ, δH e δV (deslocamentos)"],
        ["Nível de tensão na ruptura", "Indefinida (sem controle de drenagem)"],
        ["Equação da envoltória", "τ = c + σ·tgφ (se c = 0: τ = σ·tgφ)"],
        ["Como reconhecer", "Pontos (x), não círculos"]
      ]}
  ];

  let resumoAtivo = null, marcaAtiva = null;

  function initResumo() {
    const box = $("#resumoCards");
    if (!box) return;
    RESUMO_DATA.forEach((r, i) => {
      const d = document.createElement("div");
      d.className = "resumo-card";
      d.innerHTML = `<h4>${esc(r.titulo)}</h4><p class="resumo-sub">${esc(r.sub)}</p>`;
      d.onclick = () => abrirResumo(i);
      box.appendChild(d);
    });
    $("#resumoFechar").onclick = fecharResumo;
    $$("[data-marca]").forEach(b => b.onclick = () => marcar(b.dataset.marca));
  }

  function abrirResumo(i) {
    resumoAtivo = i;
    const r = RESUMO_DATA[i];
    const ex = { id: "resumo", tipo: r.tipo, c: r.c, tg: r.tg, s3: r.s3, sig: r.sig, modo: "identificar" };
    $$(".resumo-card").forEach((c, j) => c.classList.toggle("active", j === i));
    $("#resumoDetalhe").classList.remove("hidden");
    $("#resumoTitulo").textContent = r.titulo;
    draw($("#resumoSvg"), ex, { leitura: true });
    marcaAtiva = null;
    $$("[data-marca]").forEach(b => b.classList.remove("on"));

    const phi = deg(Math.atan(r.tg));
    let html = `<div class="table-wrap"><table>`;
    r.info.forEach(([k, v]) => html += `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`);
    html += `</table></div>`;
    html += `<div class="summary" style="margin-top:12px">`;
    html += `<div class="stat"><div class="k">${r.tipo === "CD" ? "c'" : r.tipo === "UU" ? "Cu" : "c"}</div><div class="v">${fmtg(r.c, 2)} kPa</div></div>`;
    html += `<div class="stat"><div class="k">${r.tipo === "CD" ? "φ'" : "φ"}</div><div class="v">${fmt(phi, 2)}°</div></div>`;
    html += `</div>`;
    $("#resumoInfo").innerHTML = html;
    $("#resumo").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function fecharResumo() {
    resumoAtivo = null;
    $$(".resumo-card").forEach(c => c.classList.remove("active"));
    $("#resumoDetalhe").classList.add("hidden");
  }

  function marcar(tipo) {
    if (resumoAtivo === null) return;
    const r = RESUMO_DATA[resumoAtivo];
    const ex = { id: "resumo", tipo: r.tipo, c: r.c, tg: r.tg, s3: r.s3, sig: r.sig, modo: "identificar" };

    if (marcaAtiva === tipo) {
      marcaAtiva = null;
      draw($("#resumoSvg"), ex, { leitura: true });
      $$("[data-marca]").forEach(b => b.classList.remove("on"));
      return;
    }
    marcaAtiva = tipo;
    $$("[data-marca]").forEach(b => b.classList.toggle("on", b.dataset.marca === tipo || b.dataset.marca === "todos"));

    draw($("#resumoSvg"), ex, { leitura: true });
    const svg = $("#resumoSvg");
    const css = getComputedStyle(document.documentElement), col = (n) => css.getPropertyValue(n).trim();
    const vb = svg.getAttribute("viewBox").split(" ").map(Number);
    const W = vb[2], H = vb[3];
    const cs = circulos(ex), ps = pontos(ex);
    let smax = 10;
    cs.forEach(c => smax = Math.max(smax, c.s1 + 0.5));
    ps.forEach(p => smax = Math.max(smax, p.s + 1));
    smax = Math.ceil(smax / 2) * 2;
    let tmax = 4;
    cs.forEach(c => tmax = Math.max(tmax, c.r + 0.5));
    ps.forEach(p => tmax = Math.max(tmax, p.t + 0.5));
    tmax = Math.max(tmax, Math.min(ex.c + smax * ex.tg, smax * 0.9) + 0.5);
    tmax = Math.ceil(Math.max(tmax, smax * 0.4) / 2) * 2;
    const L = 46, R = 18, Tp = 16;
    const k = (520 - L - R) / smax;
    const X = (s) => L + s * k, Y = (t) => Tp + (tmax - t) * k;

    let overlay = "";
    const showEnv = tipo === "env" || tipo === "todos";
    const showC = tipo === "coesao" || tipo === "todos";
    const showPhi = tipo === "phi" || tipo === "todos";
    const showTmax = tipo === "tmax" || tipo === "todos";

    if (showEnv) {
      overlay += `<line x1="${X(0)}" y1="${Y(ex.c)}" x2="${X(smax)}" y2="${Y(ex.c + smax * ex.tg)}" stroke="${col("--accent")}" stroke-width="4" opacity=".6"/>`;
      overlay += `<text x="${X(smax) - 4}" y="${Y(ex.c + smax * ex.tg) - 8}" font-size="13" font-weight="700" fill="${col("--accent")}" text-anchor="end">envoltória</text>`;
    }
    if (showC) {
      overlay += `<circle cx="${X(0)}" cy="${Y(ex.c)}" r="7" fill="none" stroke="${col("--bad")}" stroke-width="3"/>`;
      overlay += `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(ex.c)}" stroke="${col("--bad")}" stroke-width="2.5" stroke-dasharray="5 3"/>`;
      const cName = r.tipo === "UU" ? "Cu" : r.tipo === "CD" ? "c'" : "c";
      overlay += `<text x="${X(0) + 10}" y="${Y(ex.c) - 4}" font-size="13" font-weight="700" fill="${col("--bad")}">${cName} = ${fmtg(ex.c, 2)}</text>`;
    }
    if (showPhi && ex.tg > 0) {
      const phi = deg(Math.atan(ex.tg));
      const arcR = 40;
      const endX = arcR * Math.cos(Math.atan(ex.tg));
      const endY = arcR * Math.sin(Math.atan(ex.tg));
      overlay += `<line x1="${X(0)}" y1="${Y(ex.c)}" x2="${X(4)}" y2="${Y(ex.c)}" stroke="${col("--water")}" stroke-width="2" stroke-dasharray="4 3"/>`;
      overlay += `<path d="M ${X(0) + arcR} ${Y(ex.c)} A ${arcR} ${arcR} 0 0 0 ${X(0) + endX} ${Y(ex.c) - endY}" fill="none" stroke="${col("--water")}" stroke-width="2.5"/>`;
      const fName = r.tipo === "CD" ? "φ'" : "φ";
      overlay += `<text x="${X(0) + arcR + 4}" y="${Y(ex.c) - 8}" font-size="13" font-weight="700" fill="${col("--water")}">${fName} = ${fmt(phi, 2)}°</text>`;
    }
    if (showTmax && cs.length > 0) {
      const c0 = cs[cs.length - 1];
      overlay += `<line x1="${X(c0.cen)}" y1="${Y(0)}" x2="${X(c0.cen)}" y2="${Y(c0.r)}" stroke="${col("--ok")}" stroke-width="2.5" stroke-dasharray="5 3"/>`;
      overlay += `<circle cx="${X(c0.cen)}" cy="${Y(c0.r)}" r="6" fill="${col("--ok")}" opacity=".7"/>`;
      overlay += `<text x="${X(c0.cen) + 8}" y="${Y(c0.r) - 6}" font-size="12" font-weight="700" fill="${col("--ok")}">τmáx = ${fmtg(c0.r, 2)}</text>`;
    }
    if (showTmax && ps.length > 0) {
      const pMax = ps.reduce((a, b) => b.t > a.t ? b : a);
      overlay += `<circle cx="${X(pMax.s)}" cy="${Y(pMax.t)}" r="6" fill="${col("--ok")}" opacity=".7"/>`;
      overlay += `<text x="${X(pMax.s) + 8}" y="${Y(pMax.t) - 6}" font-size="12" font-weight="700" fill="${col("--ok")}">τmáx = ${fmtg(pMax.t, 2)}</text>`;
    }

    if (overlay) svg.innerHTML += `<g class="env-anim-pt">${overlay}</g>`;
  }

  // ---------- animação da envoltória ----------
  let animaTipo = null, animaPasso = 0, animaTimer = null;

  const ANIMA_EXEMPLOS = {
    UU:     { c: 3, tg: 0, s3: [0, 2, 4] },
    CU:     { c: 2, tg: 0.5, s3: [0, 1, 2] },
    CD:     { c: 1, tg: 0.75, s3: [0, 0.6, 1.4] },
    DIRETO: { c: 1, tg: 0.6, sig: [2, 4, 6, 8] }
  };

  function animaPassos(tipo) {
    const d = ANIMA_EXEMPLOS[tipo], ex = { id: "anima", tipo, c: d.c, tg: d.tg, s3: d.s3, sig: d.sig, modo: "identificar" };
    const tp = TIPOS[tipo], phi = deg(Math.atan(ex.tg));
    const cNome = tipo === "UU" ? "Cu" : tipo === "CD" ? "c'" : "c";
    const fNome = tipo === "CD" ? "φ'" : "φ";
    const eixo = tp.eixo;

    const steps = [
      { keys: ["grid"], title: "Os eixos", text: `Montamos o gráfico τ × ${eixo} (kPa). No eixo horizontal fica a tensão normal e no vertical a tensão cisalhante.` }
    ];

    if (tipo !== "DIRETO") {
      steps.push({ keys: ["grid", "circ"], title: "Os círculos de Mohr", text: `Cada ensaio (uma pressão confinante σ3 diferente) produz um círculo de Mohr. Os círculos vão de σ3 até σ1 sobre o eixo ${eixo}.` });
      if (tipo === "UU") {
        steps.push({ keys: ["grid", "circ", "env"], title: "A envoltória horizontal", text: `No UU todos os círculos têm o mesmo raio (= Cu = ${fmtg(ex.c, 2)} kPa), porque a resistência não muda com a pressão confinante. A envoltória é uma <strong>reta horizontal</strong> tangente aos círculos.` });
        steps.push({ keys: ["grid", "circ", "env", "c"], title: "Coesão Cu", text: `A coesão não drenada Cu = ${fmtg(ex.c, 2)} kPa é a altura da envoltória: o valor de τ onde ela fica. No UU, φ = 0°.` });
      } else {
        steps.push({ keys: ["grid", "circ", "tan"], title: "Tangente aos círculos", text: `A envoltória é a reta que <strong>tangencia</strong> todos os círculos. Cada ponto de tangência é onde aquele ensaio rompe.` });
        steps.push({ keys: ["grid", "circ", "tan", "c"], title: `Coesão ${cNome}`, text: `${cNome} = ${fmtg(ex.c, 2)} kPa: onde a reta cruza o eixo τ (σ = 0). É o intercepto da envoltória.` });
        steps.push({ keys: ["grid", "circ", "tan", "c", "phi"], title: `Ângulo ${fNome}`, text: `${fNome} = ${fmt(phi, 2)}° (tg${fNome} = ${fmtg(ex.tg, 4)}): a inclinação da reta. Quanto maior φ, mais a resistência cresce com σ.` });
      }
    } else {
      steps.push({ keys: ["grid", "pts"], title: "Pontos de ruptura", text: `No cisalhamento direto medimos diretamente os pares (σ, τ) da ruptura. Cada ponto (×) é uma amostra ensaiada com uma tensão normal diferente.` });
      steps.push({ keys: ["grid", "pts", "env"], title: "A reta de ajuste", text: `A envoltória é a reta que melhor se ajusta aos pontos de ruptura: τ = c + σ·tgφ.` });
      if (ex.c > 0) {
        steps.push({ keys: ["grid", "pts", "env", "c"], title: "Coesão c", text: `c = ${fmtg(ex.c, 2)} kPa: onde a reta cruza o eixo τ.` });
      }
      steps.push({ keys: ["grid", "pts", "env", "c", "phi"], title: "Ângulo φ", text: `φ = ${fmt(phi, 2)}° (tgφ = ${fmtg(ex.tg, 4)}): a inclinação da reta.` });
    }

    steps.push({ keys: ["grid", tipo !== "DIRETO" ? "circ" : "pts", "tan", "c", "phi", "eq"], title: "Equação final", text: `A equação da envoltória é: <strong>${label("eq", tp.eq)}</strong>` + (tipo !== "UU" ? ` = ${fmtg(ex.c, 2)} + ${fmtg(ex.tg, 4)}·${eixo}` : ` = ${fmtg(ex.c, 2)} kPa`) + `.` });

    return { ex, steps };
  }

  function drawAnima(svg, ex, visKeys) {
    const css = getComputedStyle(document.documentElement), col = (n) => css.getPropertyValue(n).trim();
    const cs = circulos(ex), ps = pontos(ex);
    let smax = 10;
    cs.forEach(c => smax = Math.max(smax, c.s1 + 0.5));
    ps.forEach(p => smax = Math.max(smax, p.s + 1));
    smax = Math.ceil(smax / 2) * 2;
    let tmax = 4;
    cs.forEach(c => tmax = Math.max(tmax, c.r + 0.5));
    ps.forEach(p => tmax = Math.max(tmax, p.t + 0.5));
    tmax = Math.max(tmax, Math.min(ex.c + smax * ex.tg, smax * 0.9) + 0.5);
    tmax = Math.ceil(Math.max(tmax, smax * 0.4) / 2) * 2;
    const L = 46, R = 18, Tp = 16, Bt = 40, W = 520;
    const k = (W - L - R) / smax;
    const H = Tp + tmax * k + Bt;
    const X = (s) => L + s * k, Y = (t) => Tp + (tmax - t) * k;

    let s = "";
    // grid
    const showGrid = visKeys.includes("grid");
    if (showGrid) {
      for (let i = 0; i <= smax; i++) s += `<line x1="${X(i)}" x2="${X(i)}" y1="${Y(0)}" y2="${Y(tmax)}" stroke="${col("--border")}" stroke-width="${i % 2 ? .5 : 1}"/>`;
      for (let j = 0; j <= tmax; j++) s += `<line x1="${X(0)}" x2="${X(smax)}" y1="${Y(j)}" y2="${Y(j)}" stroke="${col("--border")}" stroke-width="${j % 2 ? .5 : 1}"/>`;
      for (let i = 2; i <= smax; i += 2) s += `<text x="${X(i)}" y="${Y(0) + 16}" font-size="12" text-anchor="middle" fill="${col("--muted")}">${i}</text>`;
      for (let j = 2; j <= tmax; j += 2) s += `<text x="${X(0) - 7}" y="${Y(j) + 4}" font-size="12" text-anchor="end" fill="${col("--muted")}">${j}</text>`;
      s += `<line x1="${X(0)}" x2="${X(smax) + 8}" y1="${Y(0)}" y2="${Y(0)}" stroke="${col("--text")}" stroke-width="1.8"/>`;
      s += `<line x1="${X(0)}" x2="${X(0)}" y1="${Y(0)}" y2="${Y(tmax) - 8}" stroke="${col("--text")}" stroke-width="1.8"/>`;
      s += `<text x="${X(smax) + 6}" y="${Y(0) - 8}" font-size="15" font-style="italic" fill="${col("--text")}">${TIPOS[ex.tipo].eixo}</text>`;
      s += `<text x="${X(0) + 8}" y="${Y(tmax) + 4}" font-size="15" font-style="italic" fill="${col("--text")}">τ</text>`;
    }

    // circles
    if (visKeys.includes("circ")) {
      cs.forEach(c => {
        s += `<path d="M ${X(c.s3)} ${Y(0)} A ${c.r * k} ${c.r * k} 0 0 1 ${X(c.s1)} ${Y(0)}" fill="none" stroke="${col("--primary")}" stroke-width="2" class="env-anim-pt"/>`;
      });
    }
    // points
    if (visKeys.includes("pts")) {
      ps.forEach(p => {
        const x = X(p.s), y = Y(p.t), d = 5;
        s += `<path d="M ${x - d} ${y - d} L ${x + d} ${y + d} M ${x - d} ${y + d} L ${x + d} ${y - d}" stroke="${col("--primary")}" stroke-width="2.5" class="env-anim-pt"/>`;
      });
    }
    // envelope / tangent
    if (visKeys.includes("env") || visKeys.includes("tan")) {
      const len = Math.sqrt((smax * k) ** 2 + (smax * ex.tg * k) ** 2);
      s += `<line x1="${X(0)}" y1="${Y(ex.c)}" x2="${X(smax)}" y2="${Y(ex.c + smax * ex.tg)}" stroke="${col("--text")}" stroke-width="2.8" class="env-anim-line" style="--env-len:${len};stroke-dasharray:${len}"/>`;
      if (visKeys.includes("tan") && ex.tg > 0) {
        cs.forEach(c => {
          s += `<circle cx="${X(c.tsig)}" cy="${Y(c.ttau)}" r="4" fill="${col("--accent")}" class="env-anim-pt"/>`;
        });
      }
    }
    // c mark
    if (visKeys.includes("c")) {
      s += `<circle cx="${X(0)}" cy="${Y(ex.c)}" r="7" fill="none" stroke="${col("--bad")}" stroke-width="3" class="env-anim-pt"/>`;
      s += `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(ex.c)}" stroke="${col("--bad")}" stroke-width="2" stroke-dasharray="5 3"/>`;
      const cName = ex.tipo === "UU" ? "Cu" : ex.tipo === "CD" ? "c'" : "c";
      s += `<text x="${X(0) + 10}" y="${Y(ex.c) - 4}" font-size="13" font-weight="700" fill="${col("--bad")}" class="env-anim-label">${cName} = ${fmtg(ex.c, 2)}</text>`;
    }
    // phi mark
    if (visKeys.includes("phi") && ex.tg > 0) {
      const phi = deg(Math.atan(ex.tg));
      const arcR = 40;
      const endX = arcR * Math.cos(Math.atan(ex.tg));
      const endY = arcR * Math.sin(Math.atan(ex.tg));
      s += `<line x1="${X(0)}" y1="${Y(ex.c)}" x2="${X(4)}" y2="${Y(ex.c)}" stroke="${col("--water")}" stroke-width="2" stroke-dasharray="4 3"/>`;
      s += `<path d="M ${X(0) + arcR} ${Y(ex.c)} A ${arcR} ${arcR} 0 0 0 ${X(0) + endX} ${Y(ex.c) - endY}" fill="none" stroke="${col("--water")}" stroke-width="2.5" class="env-anim-pt"/>`;
      const fName = ex.tipo === "CD" ? "φ'" : "φ";
      s += `<text x="${X(0) + arcR + 4}" y="${Y(ex.c) - 8}" font-size="13" font-weight="700" fill="${col("--water")}" class="env-anim-label">${fName} = ${fmt(phi, 2)}°</text>`;
    }
    // equation label
    if (visKeys.includes("eq")) {
      const eqStr = ex.tipo === "UU" ? `τ = Cu = ${fmtg(ex.c, 2)}` : `τ = ${fmtg(ex.c, 2)} + ${fmtg(ex.tg, 4)}·${TIPOS[ex.tipo].eixo}`;
      s += `<rect x="${X(smax / 2) - 90}" y="${Y(tmax) + 2}" width="180" height="22" rx="6" fill="${col("--primary-soft")}" class="env-anim-label"/>`;
      s += `<text x="${X(smax / 2)}" y="${Y(tmax) + 17}" font-size="13" font-weight="700" text-anchor="middle" fill="${col("--primary")}" class="env-anim-label">${eqStr}</text>`;
    }

    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = s;
  }

  function initAnima() {
    $$("[data-anima]").forEach(b => b.onclick = () => {
      const tipo = b.dataset.anima;
      animaTipo = tipo;
      animaPasso = 0;
      if (animaTimer) clearInterval(animaTimer);
      animaTimer = null;
      $("#animaBox").classList.remove("hidden");
      irAnimaPara(0);
      $("#animaBox").scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    const ant = $("#animaAnt"), prox = $("#animaProx"), auto = $("#animaAuto");
    if (ant) ant.onclick = () => { pararAnima(); irAnimaPara(animaPasso - 1); };
    if (prox) prox.onclick = () => { pararAnima(); irAnimaPara(animaPasso + 1); };
    if (auto) auto.onclick = () => {
      if (animaTimer) return pararAnima();
      const { steps } = animaPassos(animaTipo);
      if (animaPasso >= steps.length - 1) irAnimaPara(0);
      auto.textContent = "❚❚ Pausar";
      animaTimer = setInterval(() => {
        const { steps } = animaPassos(animaTipo);
        if (animaPasso >= steps.length - 1) return pararAnima();
        irAnimaPara(animaPasso + 1);
      }, 3200);
    };
  }

  function pararAnima() {
    if (animaTimer) clearInterval(animaTimer);
    animaTimer = null;
    const b = $("#animaAuto");
    if (b) b.textContent = "▶ Reproduzir";
  }

  function irAnimaPara(i) {
    if (!animaTipo) return;
    const { ex, steps } = animaPassos(animaTipo);
    animaPasso = Math.max(0, Math.min(steps.length - 1, i));
    const step = steps[animaPasso];
    drawAnima($("#animaSvg"), ex, step.keys);
    $("#animaNum").textContent = `Passo ${animaPasso + 1} de ${steps.length}`;
    $("#animaTit").textContent = step.title;
    $("#animaTxt").innerHTML = step.text;
    const box = $(".mz-step", $("#animaBox"));
    if (box) { box.classList.remove("mz-in"); void box.offsetWidth; box.classList.add("mz-in"); }
    $("#animaDots").innerHTML = steps.map((_, j) => `<button type="button" class="${j === animaPasso ? "on" : ""}" data-ap="${j}"></button>`).join("");
    $$("#animaDots button").forEach(b => b.onclick = () => { pararAnima(); irAnimaPara(+b.dataset.ap); });
    $("#animaAnt").disabled = animaPasso === 0;
    $("#animaProx").disabled = animaPasso === steps.length - 1;
  }

  function init() {
    if (!$("#ensTreinoBox")) return;
    cards();
    const F = $("#ensForm");
    F.addEventListener("input", calc);
    F.addEventListener("change", calc);
    calc();
    $("#ensTreinarCalc").onclick = () => start(lerCalc());
    $("#ensTreinarCalcD").onclick = () => start({ ...lerCalc(), modo: "desenhar", titulo: "Desenhe — " + TIPOS[lerCalc().tipo].nome });
    $("#ensRndId").onclick = () => start(aleatorio("identificar"));
    $("#ensRndDes").onclick = () => start(aleatorio("desenhar"));
    $("#ensRndMohr").onclick = () => start(mohrAleatorio());
    const m = location.hash.match(/#ens=([\w-]+)/);
    if (m) { try { start(JSON.parse(unb64(m[1]))); } catch (e) { toast("Link de exercício inválido"); } }
    else start(window.EXEMPLOS_ENSAIOS[0], true);
    const preset = (pred) => (window.EXEMPLOS_ENSAIOS || []).find(pred);
    const bv = $("#mzTreinoValores"), bl = $("#mzTreinoLetras");
    if (bv) bv.onclick = () => start(preset(e => e.kind === "mohr" && !e.letras) || mohrAleatorio());
    if (bl) bl.onclick = () => start(preset(e => e.kind === "mohr" && e.letras) || { ...mohrAleatorio(), letras: true });
    $("#themeBtn").onclick = () => {
      const root = document.documentElement;
      const escuro = root.dataset.theme === "dark" || (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
      root.dataset.theme = escuro ? "light" : "dark";
      try { localStorage.setItem("solos2ee.theme", root.dataset.theme); } catch (e) { /* sem storage */ }
      calc();
      if (atual) desenharAtual(false);
      if (resumoAtivo !== null) abrirResumo(resumoAtivo);
      if (animaTipo) irAnimaPara(animaPasso);
    };
    initResumo();
    initAnima();
  }
  window.addEventListener("DOMContentLoaded", init);
})();
