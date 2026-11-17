/* Rede de fluxo — treino de contagem (NF, ND e quedas até P), sem cálculos.
   As redes são geradas por coordenadas elípticas (rede "quadrada" de verdade):
   pranchada e barragem de concreto sobre areia, e permeâmetro (fluxo unidimensional). */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const num = (s) => parseFloat(String(s).trim().replace(",", "."));
  const fmt = (v) => String(Math.round(v * 100) / 100).replace(".", ",");
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const b64 = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unb64 = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));
  function toast(msg) {
    const t = $("#toast"); if (!t) return;
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // m: coordenada "de fluxo" (0 = contorno da estrutura, M = contorno impermeável)
  // n: coordenada "de potencial" (0 = montante, Nn = jusante)
  const GEO = {
    pranchada: {
      nome: "Pranchada (cortina)",
      du: (ex) => Math.PI / ex.nd,
      pt: (m, n) => { const v = -Math.PI / 2 + n; return { x: Math.sinh(m) * Math.sin(v), y: Math.cosh(m) * Math.cos(v) }; },
      estrutura: "a própria pranchada (a água contorna ela)",
      fundo: "o contorno da camada impermeável",
      entradaSaida: "o terreno sob a água a montante (onde a água entra) e a jusante (onde sai)"
    },
    barragem: {
      nome: "Barragem de concreto",
      du: (ex) => Math.PI / ex.nd,
      pt: (m, n) => { const v = Math.PI - n; return { x: Math.cosh(m) * Math.cos(v), y: Math.sinh(m) * Math.sin(v) }; },
      estrutura: "a base da barragem",
      fundo: "o contorno da camada impermeável",
      entradaSaida: "o terreno sob o reservatório (montante, onde a água entra) e o terreno depois da barragem (jusante, onde sai)"
    },
    permeametro: {
      nome: "Permeâmetro",
      du: () => 1,
      pt: (m, n) => ({ x: m, y: n }),
      estrutura: "a parede da esquerda do permeâmetro",
      fundo: "a parede da direita",
      entradaSaida: "a face de cima da amostra (entrada da água) e a face de baixo (saída)"
    }
  };

  let ex = null, qs = [], vista = "rede";

  // ---------- gerador ----------
  function aleatorio(tipo, frac) {
    if (!GEO[tipo]) tipo = pick(Object.keys(GEO));
    let nf, nd;
    if (tipo === "pranchada") { nf = rint(3, 5); nd = rint(Math.ceil(nf / 0.7), Math.min(13, Math.floor(nf / 0.38))); }
    else if (tipo === "barragem") { nf = rint(3, 5); nd = rint(Math.ceil(nf / 0.5), Math.min(15, Math.floor(nf / 0.3))); }
    else { nf = rint(2, 5); nd = rint(3, 8); }
    if (frac) nf += 0.5;
    const pk = rint(1, nd - 1);
    const pj = rint(1, Math.max(1, Math.floor(nf) - (Number.isInteger(nf) ? 1 : 0)));
    const h = Math.round(nd * pick([0.25, 0.5, 0.5, 0.75, 1]) * 100) / 100;
    const kperm = pick([1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-5, 5e-5]);
    return { tipo, nf, nd, pk, pj, h, k: kperm };
  }
  const dH = () => ex.h / ex.nd;

  // ---------- desenho ----------
  function draw() {
    const svg = $("#flSvg"), G = GEO[ex.tipo], P = G.pt;
    const D = G.du(ex), M = ex.nf * D, Nn = ex.nd * D;
    const perm = ex.tipo === "permeametro";
    const lineN = (m, k = 90) => Array.from({ length: k + 1 }, (_, i) => P(m, Nn * i / k));      // linha de fluxo
    const lineM = (n, k = 60) => Array.from({ length: k + 1 }, (_, i) => P(M * i / k, n));      // equipotencial

    // caixa do desenho (mundo)
    let xmin = Infinity, xmax = -Infinity, ymax = -Infinity;
    for (let i = 0; i <= 30; i++) for (let j = 0; j <= 30; j++) {
      const p = P(M * i / 30, Nn * j / 30);
      xmin = Math.min(xmin, p.x); xmax = Math.max(xmax, p.x); ymax = Math.max(ymax, p.y);
    }
    let ytop, nivelM, nivelJ, topoEstr;
    if (ex.tipo === "pranchada") { nivelM = -0.32 * ymax; nivelJ = -0.12 * ymax; topoEstr = nivelM - 0.1 * ymax; ytop = topoEstr; }
    else if (ex.tipo === "barragem") { topoEstr = -Math.max(0.8, 0.55 * ymax); nivelM = topoEstr * 0.78; nivelJ = 0; ytop = topoEstr; }
    else { nivelM = -1.7; topoEstr = -2.1; ytop = topoEstr; ymax = ex.nd + 1.1; }
    const padX = perm ? 2.2 : 0.18 * (xmax - xmin);
    xmin -= padX; xmax += padX;
    const ybot = perm ? ymax : ymax * 1.12;
    const W = 820;
    const s = Math.min((W - 40) / (xmax - xmin), 400 / (ybot - ytop));
    const H = Math.round((ybot - ytop) * s + 46);
    const ox = W / 2 - s * (xmin + xmax) / 2;
    const X = (x) => ox + s * x, Y = (y) => 28 + s * (y - ytop);
    const path = (pts) => "M" + pts.map((p) => X(p.x).toFixed(1) + "," + Y(p.y).toFixed(1)).join("L");
    const seg = (a, b) => `M${X(a.x).toFixed(1)},${Y(a.y).toFixed(1)}L${X(b.x).toFixed(1)},${Y(b.y).toFixed(1)}`;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

    const fsCel = (m, n) => { const a = P(m, n), b = P(Math.min(M, m + D), n), c = P(m, Math.min(Nn, n + D)); return Math.max(9, Math.min(16, 0.45 * s * Math.min(Math.hypot(a.x - b.x, a.y - b.y), Math.hypot(a.x - c.x, a.y - c.y)))); };
    const txt = (x, y, t, fs, cls = "") => `<text x="${x.toFixed(1)}" y="${(y + fs * 0.36).toFixed(1)}" font-size="${fs.toFixed(1)}" text-anchor="middle" class="fl-num ${cls}">${t}</text>`;
    const out = [];
    out.push(`<defs><pattern id="flHatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" class="fl-imp"/><line x1="0" y1="0" x2="0" y2="9" class="fl-imp-l"/></pattern></defs>`);

    const fluxoFim = Array.from({ length: Math.floor(ex.nf + 1e-9) + 1 }, (_, j) => j * D).filter((m) => m < M - 1e-9);
    const linhasFluxo = [...fluxoFim, M];                       // inclui contorno da estrutura (0) e impermeável (M)
    const equis = Array.from({ length: ex.nd + 1 }, (_, k) => k * D);

    // solo
    if (perm) {
      out.push(`<rect x="${X(-0.25)}" y="${Y(topoEstr)}" width="${s * (M + 0.5)}" height="${Y(ex.nd + 0.9) - Y(topoEstr)}" class="fl-wall"/>`);
      out.push(`<rect x="${X(0)}" y="${Y(nivelM)}" width="${s * M}" height="${Y(0) - Y(nivelM)}" class="fl-water"/>`);
      out.push(`<rect x="${X(0)}" y="${Y(0)}" width="${s * M}" height="${s * ex.nd}" class="fl-sand"/>`);
      out.push(`<rect x="${X(0)}" y="${Y(ex.nd)}" width="${s * M}" height="${s * 0.65}" class="fl-water"/>`);
    } else {
      out.push(`<rect x="0" y="${Y(0)}" width="${W}" height="${H - Y(0)}" fill="url(#flHatch)"/>`);
      out.push(`<path d="${path(lineN(M))}Z" class="fl-base"/><path d="${path(lineN(M))}Z" class="fl-sand"/>`);
      out.push(txt(X(xmax) - 70, Y(ybot) - 14, "camada impermeável", 12, "fl-lbl"));
    }

    // água acima do terreno
    if (ex.tipo === "pranchada") {
      out.push(`<rect x="0" y="${Y(nivelM)}" width="${X(0)}" height="${Y(0) - Y(nivelM)}" class="fl-water"/>`);
      out.push(`<rect x="${X(0)}" y="${Y(nivelJ)}" width="${W - X(0)}" height="${Y(0) - Y(nivelJ)}" class="fl-water"/>`);
    } else if (ex.tipo === "barragem") {
      out.push(`<rect x="0" y="${Y(nivelM)}" width="${X(-1)}" height="${Y(0) - Y(nivelM)}" class="fl-water"/>`);
    }

    // pinturas (canais / quedas)
    const pintaFaixa = (k, cls) => {
      const a = lineM(k * D), b = lineM((k + 1) * D).reverse();
      out.push(`<path d="${path(a.concat(b))}Z" class="${cls}"/>`);
    };
    if (vista === "canais") {
      linhasFluxo.slice(0, -1).forEach((m, j) => {
        const m2 = linhasFluxo[j + 1];
        const a = Array.from({ length: 91 }, (_, i) => P(m, Nn * i / 90)), b = Array.from({ length: 91 }, (_, i) => P(m2, Nn * (90 - i) / 90));
        out.push(`<path d="${path(a.concat(b))}Z" class="${j % 2 ? "fl-c2" : "fl-c1"}"/>`);
      });
    }
    if (vista === "quedas") equis.slice(0, -1).forEach((_, k) => pintaFaixa(k, k % 2 ? "fl-q2" : "fl-q1"));

    // linhas internas
    const forte = vista === "linhas";
    equis.slice(1, -1).forEach((n) => out.push(`<path d="${path(lineM(n))}" class="fl-eq"/>`));
    fluxoFim.slice(1).forEach((m) => out.push(`<path d="${path(lineN(m))}" class="fl-fl"/>`));
    // contornos
    out.push(`<path d="${path(lineN(M))}" class="fl-fl fl-borda"/>`);
    if (forte) {
      out.push(`<path d="${path(lineN(0))}" class="fl-fl fl-borda"/>`);
      out.push(`<path d="${path(lineM(0))}" class="fl-eq fl-borda-eq"/>`);
      out.push(`<path d="${path(lineM(Nn))}" class="fl-eq fl-borda-eq"/>`);
    }

    // estrutura
    if (ex.tipo === "pranchada") {
      const w = Math.max(5, 0.035 * s);
      out.push(`<rect x="${X(0) - w / 2}" y="${Y(topoEstr)}" width="${w}" height="${Y(1) - Y(topoEstr)}" class="fl-est"/>`);
    } else if (ex.tipo === "barragem") {
      const h = topoEstr;
      const pts = [[-1, 0], [-1, h * 0.25], [-0.6, h], [-0.2, h], [0.25, h * 0.55], [1, h * 0.45], [1, 0]].map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(" ");
      out.push(`<polygon points="${pts}" class="fl-est fl-conc"/>`);
    } else {
      out.push(`<path d="M${X(-0.25)},${Y(topoEstr)}V${Y(ex.nd + 0.9)}H${X(M + 0.25)}V${Y(topoEstr)}" class="fl-tubo"/>`);
      out.push(seg({ x: 0, y: 0 }, { x: M, y: 0 }).replace(/^/, `<path class="fl-tela" d="`) + `"/>`);
      out.push(seg({ x: 0, y: ex.nd }, { x: M, y: ex.nd }).replace(/^/, `<path class="fl-tela" d="`) + `"/>`);
    }

    // NA e rótulos
    const na = (x, y, t) => `<path d="M${x - 7},${y - 11}h14l-7,9z" class="fl-na"/><line x1="${x - 22}" y1="${y}" x2="${x + 22}" y2="${y}" class="fl-na-l"/><text x="${x + 12}" y="${y - 4}" font-size="11" class="fl-lbl">${t}</text>`;
    if (ex.tipo === "pranchada") {
      out.push(na(X(0) * 0.2, Y(nivelM), "N.A."), na(X(0) + (W - X(0)) * 0.55, Y(nivelJ), "N.A."));
      out.push(txt(X(0) * 0.1 + 20, Y(nivelM) - 18, "montante", 12, "fl-lbl"), txt(X(0) + (W - X(0)) * 0.75, Y(nivelJ) - 18, "jusante", 12, "fl-lbl"));
    } else if (ex.tipo === "barragem") {
      out.push(na(X(-1) * 0.45, Y(nivelM), "N.A."));
      out.push(txt(X(-1) * 0.3, Y(nivelM) - 18, "montante", 12, "fl-lbl"), txt(X(1) + (W - X(1)) * 0.55, Y(0) - 12, "jusante", 12, "fl-lbl"));
    } else {
      out.push(na(X(M / 2), Y(nivelM), "N.A."));
      out.push(`<text x="${X(M + 0.25) + 10}" y="${Y(0) + 4}" font-size="12" class="fl-lbl">entrada (montante)</text><text x="${X(M + 0.25) + 10}" y="${Y(ex.nd) + 4}" font-size="12" class="fl-lbl">saída (jusante)</text>`);
      out.push(`<path d="M${X(-0.9)},${Y(0.6)}V${Y(ex.nd - 0.6)}" class="fl-seta"/><path d="M${X(-0.9) - 6},${Y(ex.nd - 0.9)}l6,10l6,-10z" class="fl-seta-p"/>`);
      out.push(txt(X(-1.45), Y(ex.nd / 2), "fluxo", 12, "fl-lbl"));
    }

    // números
    if (vista === "canais") {
      linhasFluxo.slice(0, -1).forEach((m, j) => {
        const m2 = linhasFluxo[j + 1], parcial = m2 - m < D - 1e-9;
        const lbl = parcial ? fmt((m2 - m) / D) : j + 1;
        if (ex.tipo === "pranchada") {   // na saída (jusante), onde os canais ficam largos
          const a = P(m, Nn), b = P(m2, Nn);
          out.push(txt(X((a.x + b.x) / 2), Y(-0.06 * ymax), lbl, Math.max(10, Math.min(16, 0.5 * s * (b.x - a.x))), "fl-forte"));
        } else {
          const q = P((m + m2) / 2, Nn / 2);
          out.push(txt(X(q.x), Y(q.y), lbl, fsCel(m, Nn / 2 - D / 2), "fl-forte"));
        }
      });
    }
    const mLbl = Math.max(0, (Math.floor(ex.nf + 1e-9) - 0.5) * D);
    if (vista === "quedas") {
      for (let k = 0; k < ex.nd; k++) { const q = P(mLbl, (k + 0.5) * D); out.push(txt(X(q.x), Y(q.y), k + 1, fsCel(mLbl - D / 2, k * D), "fl-forte")); }
    }
    if (vista === "p") {
      for (let k = 0; k < ex.pk; k++) { const q = P(mLbl, (k + 0.5) * D); out.push(txt(X(q.x), Y(q.y), k + 1, fsCel(mLbl - D / 2, k * D), "fl-forte")); }
    }
    if (forte) {
      linhasFluxo.forEach((m, j) => { const q = ex.tipo === "pranchada" ? { x: P(m, Nn).x, y: -0.06 * ymax } : P(m, (Math.floor(ex.nd / 2) + 0.5) * D); out.push(`<g class="fl-tag fl-tag-f">${tag(X(q.x), Y(q.y), j + 1)}</g>`); });
      equis.forEach((n, k) => { const q = P(ex.tipo === "pranchada" ? M : mLbl, n); out.push(`<g class="fl-tag fl-tag-e">${tag(X(q.x), Y(q.y), k + 1)}</g>`); });
    }

    // h (diferença entre os níveis d'água) — fora de escala, só indicativo
    const yJ = ex.tipo === "pranchada" ? nivelJ : ex.tipo === "barragem" ? 0 : ex.nd + 0.45;
    const cota = (x, y1, y2, lbl, lado = 1) => {
      const a = Y(y1), b = Y(y2);
      const setas = Math.abs(b - a) > 18 ? `<path d="M${x - 4},${a + 7}l4,-7l4,7M${x - 4},${b - 7}l4,7l4,-7" class="fl-cota"/>` : `<path d="M${x - 5},${a}h10M${x - 5},${b}h10" class="fl-cota"/>`;
      return `<line x1="${x}" y1="${a}" x2="${x}" y2="${b}" class="fl-cota"/>${setas}` +
        `<text x="${x + 7 * lado}" y="${Math.max(a, b) + (Math.abs(b - a) > 18 ? -Math.abs(b - a) / 2 + 4 : 14)}" font-size="13" text-anchor="${lado > 0 ? "start" : "end"}" class="fl-h">${lbl}</text>`;
    };
    const hTxt = `h = ${fmt(ex.h)} m`;
    if (ex.tipo === "pranchada") {
      const xc = X(0) + 0.32 * (W - X(0));
      out.push(`<line x1="${X(0)}" y1="${Y(nivelM)}" x2="${xc + 14}" y2="${Y(nivelM)}" class="fl-cota-ext"/>`, cota(xc, nivelM, nivelJ, hTxt));
    } else if (ex.tipo === "barragem") {
      const xc = X(1) + 0.3 * (W - X(1));
      out.push(`<line x1="${X(-1)}" y1="${Y(nivelM)}" x2="${xc + 14}" y2="${Y(nivelM)}" class="fl-cota-ext"/>`, cota(xc, nivelM, 0, hTxt));
    } else {
      out.push(`<path d="M${X(M + 0.25)},${Y(ex.nd + 0.45)}H${X(M + 1.3)}" class="fl-tubo"/>`, na(X(M + 1.05), Y(yJ), ""));
      const xc = X(M + 1.7);
      out.push(`<line x1="${X(M)}" y1="${Y(nivelM)}" x2="${xc + 12}" y2="${Y(nivelM)}" class="fl-cota-ext"/>`, cota(xc, nivelM, yJ, hTxt));
    }


    // pinturas até P
    if (vista === "p") for (let k = 0; k < ex.pk; k++) pintaFaixa(k, k % 2 ? "fl-q2" : "fl-q1");

    // ponto P
    const pp = P(ex.pj * D, ex.pk * D);
    out.push(`<circle cx="${X(pp.x)}" cy="${Y(pp.y)}" r="5.5" class="fl-p"/><text x="${X(pp.x) + 8}" y="${Y(pp.y) - 7}" font-size="15" class="fl-p-t">P</text>`);

    svg.innerHTML = out.join("");
    legenda();
  }
  function tag(x, y, t) {
    return `<rect x="${(x - 10).toFixed(1)}" y="${(y - 9).toFixed(1)}" width="20" height="18" rx="9"/><text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" font-size="11" text-anchor="middle">${t}</text>`;
  }
  function legenda() {
    const nF = Math.floor(ex.nf + 1e-9) + (Number.isInteger(ex.nf) ? 1 : 2);
    const L = {
      rede: `<span class="k-fl"></span> linha de fluxo (contínua) &nbsp; <span class="k-eq"></span> equipotencial (tracejada) &nbsp; ● P = ponto da pergunta`,
      linhas: `Linhas numeradas: <b>${nF}</b> linhas de fluxo (azul, contando os 2 contornos) e <b>${ex.nd + 1}</b> equipotenciais (laranja, contando entrada e saída). Os canais e as quedas são os <b>espaços</b> entre elas → uma a menos.`,
      canais: `Cada cor é um canal de fluxo: <b>N<sub>F</sub> = ${fmt(ex.nf)}</b>.` + (Number.isInteger(ex.nf) ? "" : " O último canal tem metade da largura dos outros, por isso vale 0,5."),
      quedas: `Cada faixa é uma queda de potencial: <b>N<sub>D</sub> = ${ex.nd}</b>, contadas da montante para a jusante.`,
      p: `Da montante até a equipotencial que passa por P a água atravessou <b>${ex.pk}</b> quedas (faltam ${ex.nd - ex.pk} até a jusante).`
    };
    $("#flLeg").innerHTML = L[vista];
    $$(".fl-views [data-v]").forEach((b) => b.classList.toggle("on", b.dataset.v === vista));
  }
  function setVista(v) { vista = v; draw(); }

  // ---------- perguntas ----------
  function perguntas() {
    const G = GEO[ex.tipo], NF = ex.nf, ND = ex.nd, inteiro = Number.isInteger(NF);
    const linhasF = Math.floor(NF) + (inteiro ? 1 : 2);
    const kStr = ex.k.toExponential(0).replace("+", "").replace("e", " × 10^").replace("^", "⁻").replace("⁻-", "⁻");
    const kFmt = ex.k < 1e-3 ? (ex.k * 1e4).toString().replace(".", ",") + " × 10⁻⁴" : fmt(ex.k);
    const vazao = ex.k * ex.h * NF / ND;
    const vazaoFmt = vazao.toExponential(2).replace(".", ",");
    return [
      {
        t: "Quantos canais de fluxo (N<sub>F</sub>)?", v: NF, tol: inteiro ? 0 : 0.15, ver: "canais",
        dica: `Conte os espaços entre as linhas contínuas (azuis). As linhas da borda também contam: ${G.estrutura} e ${G.fundo}.`,
        sol: `Há ${linhasF} linhas de fluxo contando os contornos (${G.estrutura} e ${G.fundo}) → ${linhasF} − 1 = ${fmt(NF)} canais.` + (inteiro ? "" : " O último canal tem só metade da largura dos outros, então vale 0,5."),
        diag(v) {
          if (!inteiro && v === Math.floor(NF)) return `Quase! O último canal (junto ao contorno impermeável) existe, mas é incompleto: tem metade da largura dos outros. Ele conta como 0,5 → N_F = ${fmt(NF)}.`;
          if (!inteiro && v === Math.ceil(NF)) return `Você contou o último canal como inteiro. Compare a largura dele com a dos vizinhos: é só metade → vale 0,5.`;
          if (v === linhasF) return `Você contou as LINHAS de fluxo, não os canais. Canal é o ESPAÇO entre duas linhas → canais = linhas − 1.`;
          if (v === ND) return `Esse é o número de quedas de potencial (N_D). Canais ficam entre as linhas contínuas (azuis), que acompanham o caminho da água.`;
          if (v === linhasF - 2) return `Faltou um canal. Lembre que ${G.estrutura} e ${G.fundo} também são linhas de fluxo: o espaço colado neles é um canal.`;
          return `Conte os espaços entre as linhas contínuas, de ${G.estrutura} até ${G.fundo}.`;
        }
      },
      {
        t: "Quantas quedas de potencial (N<sub>D</sub>)?", v: ND, tol: 0, ver: "quedas",
        dica: `Conte os espaços entre as linhas tracejadas. A primeira e a última equipotencial são ${G.entradaSaida}.`,
        sol: `Há ${ND + 1} equipotenciais contando ${G.entradaSaida} → ${ND + 1} − 1 = ${ND} quedas.`,
        diag(v) {
          if (v === ND + 1) return `Você contou as LINHAS equipotenciais, não as quedas. Queda é o ESPAÇO entre duas equipotenciais → quedas = equipotenciais − 1.`;
          if (v === ND - 1) return `Faltou uma queda. A primeira e a última equipotencial são ${G.entradaSaida}: a faixa colada nelas também conta.`;
          if (Math.abs(v - NF) < 1e-9) return `Esse é o número de canais (N_F). As quedas ficam entre as linhas tracejadas, que cortam o fluxo em ângulo reto.`;
          if (v === ND - 2) return `Você contou só as tracejadas de dentro. Some os espaços das pontas: ${G.entradaSaida} também são equipotenciais.`;
          return `Conte as faixas entre as linhas tracejadas, da montante até a jusante.`;
        }
      },
      {
        t: `Perda de carga em cada queda: Δh = h / N<sub>D</sub> (m), com h = ${fmt(ex.h)} m`, v: dH(), tol: 0.011, ver: "quedas",
        dica: `h é a diferença entre o N.A. de montante e o de jusante (a cota "h" no desenho). Divida pelo número de quedas N_D (não pelo de canais).`,
        sol: `Δh = h / N_D = ${fmt(ex.h)} / ${ND} = ${fmt(dH())} m. Toda queda perde a mesma carga.`,
        diag(v) {
          const perto = (x) => Math.abs(v - x) < 0.011;
          if (perto(ex.h / NF)) return `Você dividiu por N_F (canais). A carga se perde ao atravessar as QUEDAS: divida por N_D = ${ND}.`;
          if (perto(ex.h / (ND + 1))) return `Você dividiu pelo número de linhas equipotenciais (${ND + 1}). Divida pelo número de quedas (espaços) N_D = ${ND}.`;
          if (perto(ND / ex.h)) return `Conta invertida: é h dividido por N_D, não N_D dividido por h.`;
          if (perto(ex.h)) return `Esse é o h total. Ele é dividido igualmente entre as ${ND} quedas: Δh = h / N_D.`;
          return `Δh = h / N_D: pegue h = ${fmt(ex.h)} m e divida pelas quedas que você contou.`;
        }
      },
      {
        t: `Vazão: q = k · h · N<sub>F</sub> / N<sub>D</sub> (m³/s por metro de largura), com k = ${kFmt} m/s e h = ${fmt(ex.h)} m`, v: vazao, tol: vazao * 0.05, ver: "canais",
        dica: `A fórmula da vazão por metro de largura é q = k · h · (N_F / N_D). Use o k = ${kFmt} m/s, h = ${fmt(ex.h)} m e os valores de N_F e N_D que você contou.`,
        sol: `q = k · h · N_F / N_D = ${kFmt} × ${fmt(ex.h)} × ${fmt(NF)} / ${ND} = ${vazaoFmt} m³/s por metro de largura.`,
        diag(v) {
          const perto = (x) => Math.abs(v - x) / Math.max(vazao, 1e-12) < 0.1;
          if (perto(ex.k * ex.h * ND / NF)) return `Você inverteu N_F e N_D na fórmula. É q = k · h · N_F / N_D (canais no numerador, quedas no denominador).`;
          if (perto(ex.h * NF / ND)) return `Faltou multiplicar pelo coeficiente de permeabilidade k.`;
          if (perto(ex.k * NF / ND)) return `Faltou multiplicar pela carga h.`;
          return `q = k · h · N_F / N_D. Substitua os valores e calcule.`;
        }
      },
      {
        t: "Quantas quedas de potencial da montante até o ponto P?", v: ex.pk, tol: 0, ver: "p",
        dica: `Conte as faixas entre equipotenciais da montante até a equipotencial que passa por P. Veja o ponto marcado na figura.`,
        sol: `Da montante até P a água atravessou ${ex.pk} quedas de potencial.`,
        diag(v) {
          if (v === ND) return `Esse é o total de quedas da rede inteira. Conte só as quedas da montante até P, não até a jusante.`;
          if (v === ND - ex.pk) return `Você contou da jusante para a montante. Conte da montante (onde a água entra) até P.`;
          return `Olhe o ponto P na figura e conte quantas faixas ele atravessou desde a montante.`;
        }
      },
      {
        t: `Carga hidráulica no ponto P (m), com h = ${fmt(ex.h)} m`, v: ex.h - ex.pk * dH(), tol: 0.011, ver: "p",
        dica: `A carga em P é a carga total menos a perda acumulada até P: h_P = h − (quedas até P) × Δh.`,
        sol: `h_P = h − quedas_até_P × Δh = ${fmt(ex.h)} − ${ex.pk} × ${fmt(dH())} = ${fmt(ex.h - ex.pk * dH())} m.`,
        diag(v) {
          const hP = ex.h - ex.pk * dH();
          const perto = (x) => Math.abs(v - x) < 0.011;
          if (perto(ex.pk * dH())) return `Esse é a perda de carga até P, não a carga restante. Subtraia de h: h_P = h − quedas_até_P × Δh.`;
          if (perto(ex.h - ex.pk)) return `Você subtraiu só o número de quedas, sem multiplicar por Δh. Use h_P = h − quedas_até_P × Δh.`;
          if (perto(ex.h + ex.pk * dH())) return `Você somou em vez de subtrair. A cada queda a água PERDE carga: h_P = h − quedas_até_P × Δh.`;
          return `h_P = h − (quedas até P) × Δh. Calcule Δh primeiro e depois subtraia a perda acumulada.`;
        }
      }
    ];
  }

  function render(noScroll) {
    qs = perguntas();
    vista = "rede";
    const G = GEO[ex.tipo];
    const box = $("#flBox");
    const kFmt2 = ex.k < 1e-3 ? (ex.k * 1e4).toString().replace(".", ",") + " × 10⁻⁴" : fmt(ex.k);
    box.innerHTML = `
      <div class="banner"><strong>${esc(G.nome)}</strong>${ex.tipo === "permeametro" ? " <span style=\"opacity:.7;font-size:.85em\">(equipamento de laboratório)</span>" : ""}${Number.isInteger(ex.nf) ? "" : " · desafio: canal incompleto"} · k = ${kFmt2} m/s · h = ${fmt(ex.h)} m</div>
      ${qs.map((q, i) => `
        <div class="tq" id="flq${i}">
          <div class="t">${i + 1}. ${q.t}</div>
          <div class="tq-inputs"><label class="tq-in"><input type="text" inputmode="decimal" data-i="${i}" autocomplete="off"><span class="tq-mark" data-mark="${i}"></span></label></div>
          <div class="tq-fb" data-fb="${i}"></div>
          <div class="btnrow">
            <button type="button" class="btn small" data-dica="${i}">Dica</button>
            <button type="button" class="btn small" data-resp="${i}">Ver resposta</button>
          </div>
          <div class="tq-hint hidden" data-dicabox="${i}"></div>
          <div class="tq-sol hidden" data-respbox="${i}"></div>
        </div>`).join("")}
      <div class="btnrow">
        <button type="button" class="btn primary" id="flCorrigir">Corrigir</button>
        <button type="button" class="btn" id="flTudo">Mostrar todas</button>
        <button type="button" class="btn" id="flLink">Copiar link desta rede</button>
      </div>
      <div id="flPlacar"></div>`;
    $$("[data-dica]", box).forEach((b) => b.onclick = () => { const i = +b.dataset.dica, d = $(`[data-dicabox="${i}"]`); d.textContent = qs[i].dica; d.classList.remove("hidden"); });
    $$("[data-resp]", box).forEach((b) => b.onclick = () => mostrar(+b.dataset.resp, true));
    $$("[data-i]", box).forEach((el) => el.addEventListener("keydown", (e) => { if (e.key === "Enter") corrigir(); }));
    $("#flCorrigir").onclick = corrigir;
    $("#flTudo").onclick = () => { qs.forEach((_, i) => mostrar(i, false)); setVista("linhas"); };
    $("#flLink").onclick = async () => {
      const link = location.origin + location.pathname + "#fl=" + b64(JSON.stringify(ex));
      let ok = false; try { await navigator.clipboard.writeText(link); ok = true; } catch (e) { ok = false; }
      toast(ok ? "Link copiado! Quem abrir vê esta mesma rede." : "Não consegui copiar o link");
    };
    draw();
    if (!noScroll) $("#treino").scrollIntoView({ behavior: "smooth" });
  }
  function mostrar(i, pinta) {
    const q = qs[i], box = $(`[data-respbox="${i}"]`);
    box.innerHTML = `<div class="res">→ ${fmt(q.v)}</div><p style="margin:.4em 0 0">${esc(q.sol)}</p>`;
    box.classList.remove("hidden");
    $("#flq" + i).classList.add("revelado");
    if (pinta) setVista(q.ver);
  }
  function corrigir() {
    let certas = 0, vazias = 0, primeiroErro = -1;
    qs.forEach((q, i) => {
      const el = $(`[data-i="${i}"]`), mark = $(`[data-mark="${i}"]`), fb = $(`[data-fb="${i}"]`);
      el.classList.remove("ok", "bad"); fb.innerHTML = ""; mark.textContent = "";
      if (el.value.trim() === "") { vazias++; return; }
      const v = num(el.value);
      if (Number.isFinite(v) && Math.abs(v - q.v) <= q.tol + 1e-9) { certas++; el.classList.add("ok"); mark.textContent = "✓"; return; }
      el.classList.add("bad"); mark.textContent = "✗";
      if (primeiroErro < 0) primeiroErro = i;
      fb.innerHTML = `<div class="callout bad">${esc(Number.isFinite(v) ? q.diag(v) : "Digite só o número (ex.: 4 ou 4,5).")}</div>`;
    });
    let html = `<div class="callout ${certas === qs.length ? "tip" : "key"}"><strong>${certas} de ${qs.length} certas</strong>`;
    if (certas === qs.length) { html += "Mandou bem! Veja a contagem pintada na figura ou gere uma nova rede."; setVista("linhas"); }
    else {
      html += vazias ? `${vazias} sem resposta. ` : "";
      if (primeiroErro >= 0) { html += "Olhe a figura pintada para ver onde a contagem escapou."; setVista(qs[primeiroErro].ver); }
    }
    $("#flPlacar").innerHTML = html + "</div>";
  }

  function init() {
    $("#flNovo").onclick = () => { ex = aleatorio($("#flTipo").value, $("#flFrac").checked); render(true); history.replaceState(null, "", location.pathname); };
    $$(".fl-views [data-v]").forEach((b) => b.onclick = () => setVista(b.dataset.v));
    $("#themeBtn").onclick = () => {
      const root = document.documentElement;
      const escuro = root.dataset.theme === "dark" || (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
      root.dataset.theme = escuro ? "light" : "dark";
      try { localStorage.setItem("solos2ee.theme", root.dataset.theme); } catch (e) { /* sem storage */ }
    };
    const m = location.hash.match(/#fl=([\w-]+)/);
    if (m) { try { const e = JSON.parse(unb64(m[1])); if (GEO[e.tipo] && e.nd > 1 && e.nf > 0) { if (!(e.h > 0)) e.h = e.nd * 0.5; if (!(e.k > 0)) e.k = 1e-4; ex = e; } } catch (e) { toast("Link de rede inválido"); } }
    if (!ex) ex = aleatorio("pranchada", false);
    render(true);
  }
  window.SolosFluxo = { aleatorio, GEO };
  window.addEventListener("DOMContentLoaded", init);
})();
