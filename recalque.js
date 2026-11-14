(function () {
  "use strict";

  // ================= utilidades =================
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const LS_KEY = "solos2ee.recalque.meusExemplos";

  function num(v) {
    if (v === undefined || v === null) return NaN;
    const s = String(v).trim().replace(/\s/g, "").replace(",", ".");
    if (s === "") return NaN;
    const x = Number(s);
    return Number.isFinite(x) ? x : NaN;
  }
  function list(v) {
    return String(v || "").split(/[;\s]+/).map(num).filter(Number.isFinite);
  }
  function fmt(x, d = 2) {
    if (!Number.isFinite(x)) return "—";
    if (x !== 0 && (Math.abs(x) < 1e-3 || Math.abs(x) >= 1e7)) {
      const e = Math.floor(Math.log10(Math.abs(x)));
      const m = x / Math.pow(10, e);
      return m.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "×10^" + e;
    }
    return x.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function fmtg(x, maxd = 4) {
    if (!Number.isFinite(x)) return "—";
    if (x !== 0 && (Math.abs(x) < 1e-3 || Math.abs(x) >= 1e7)) return fmt(x);
    return x.toLocaleString("pt-BR", { maximumFractionDigits: maxd });
  }
  // número formatado para dentro do KaTeX
  function T(x, d = 2) {
    const s = fmt(x, d);
    const m = s.match(/^(-?[\d.,]+)×10\^(-?\d+)$/);
    if (m) return m[1].replace(/\./g, "{.}").replace(",", "{,}") + "\\times10^{" + m[2] + "}";
    return s.replace(/\./g, "{.}").replace(",", "{,}");
  }
  function Tg(x, maxd = 4) {
    const s = fmtg(x, maxd);
    const m = s.match(/^(-?[\d.,]+)×10\^(-?\d+)$/);
    if (m) return m[1].replace(/\./g, "{.}").replace(",", "{,}") + "\\times10^{" + m[2] + "}";
    return s.replace(/\./g, "{.}").replace(",", "{,}");
  }
  function tex(s, display = false) {
    if (window.katex) {
      try { return window.katex.renderToString(s, { throwOnError: false, displayMode: display }); } catch (e) { /* cai no texto */ }
    }
    return "<code>" + escapeHtml(s) + "</code>";
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }
  const log10 = Math.log10;

  function diasTexto(d) {
    if (!Number.isFinite(d)) return "—";
    if (d < 1) return fmt(d * 24, 1) + " horas";
    let r = Math.round(d);
    const a = Math.floor(r / 365); r -= a * 365;
    const m = Math.floor(r / 30); r -= m * 30;
    const p = [];
    if (a) p.push(a + (a === 1 ? " ano" : " anos"));
    if (m) p.push(m + (m === 1 ? " mês" : " meses"));
    if (r || !p.length) p.push(r + (r === 1 ? " dia" : " dias"));
    return p.length > 1 ? p.slice(0, -1).join(", ") + " e " + p[p.length - 1] : p[0];
  }

  // ================= teoria do adensamento =================
  // Fórmulas usadas pelo professor
  function TvProf(U) {
    if (U >= 100) return 2.0;
    if (U <= 60) return Math.PI / 4 * Math.pow(U / 100, 2);
    return 1.781 - 0.933 * log10(100 - U);
  }
  function UProf(Tv) {
    if (Tv <= Math.PI / 4 * 0.36) return 100 * Math.sqrt(4 * Tv / Math.PI);
    if (Tv >= 1.781) return 99.99;
    return 100 - Math.pow(10, (1.781 - Tv) / 0.933);
  }
  // Solução exata de Terzaghi (série)
  function UExato(Tv) {
    if (Tv <= 0) return 0;
    let s = 0;
    for (let m = 0; m < 200; m++) {
      const M = Math.PI / 2 * (2 * m + 1);
      const term = 2 / (M * M) * Math.exp(-M * M * Tv);
      s += term;
      if (term < 1e-12) break;
    }
    return 100 * (1 - s);
  }
  function TvExato(U) {
    if (U >= 100) return Infinity;
    if (U <= 0) return 0;
    let lo = 0, hi = 10;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (UExato(mid) < U) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  window.SolosTeoria = { TvProf, UProf, UExato, TvExato };

  // ================= fator de influência =================
  const IRHO_CIRC = { centro: 1.00, canto: 0.64, rigido: 0.79 };
  // [L/B, flexível centro, flexível canto, rígido]
  const IRHO_RET = [
    [1, 1.12, 0.56, 0.86],
    [1.5, 1.36, 0.68, 1.07],
    [2, 1.53, 0.77, 1.21],
    [3, 1.78, 0.89, 1.42],
    [5, 2.10, 1.05, 1.70],
    [10, 2.54, 1.27, 2.10],
    [20, 2.99, 1.49, 2.46],
    [50, 3.57, 1.80, 3.00],
    [100, 4.01, 2.00, 3.43]
  ];
  function lookupI(forma, m1, rigidez, ponto) {
    if (forma === "circular") return { I: rigidez === "rigido" ? IRHO_CIRC.rigido : IRHO_CIRC[ponto], interp: false };
    const col = rigidez === "rigido" ? 3 : (ponto === "canto" ? 2 : 1);
    if (m1 <= 1) return { I: IRHO_RET[0][col], interp: false };
    for (let i = 0; i < IRHO_RET.length - 1; i++) {
      const a = IRHO_RET[i], b = IRHO_RET[i + 1];
      if (m1 === a[0]) return { I: a[col], interp: false };
      if (m1 > a[0] && m1 < b[0]) {
        const I = a[col] + (b[col] - a[col]) * (m1 - a[0]) / (b[0] - a[0]);
        return { I, interp: true, a, b };
      }
    }
    return { I: IRHO_RET[IRHO_RET.length - 1][col], interp: false };
  }

  // ================= sistemas de unidades =================
  const SYS = {
    tf: { g: "tf/m³", p: "tf/m²", E: "kgf/cm²", P: "tf", gTex: "\\text{tf/m}^3", pTex: "\\text{tf/m}^2", ETex: "\\text{kgf/cm}^2", PTex: "\\text{tf}", nome: "tf · kgf/cm² (padrão do professor)" },
    kN: { g: "kN/m³", p: "kPa", E: "MPa", P: "kN", gTex: "\\text{kN/m}^3", pTex: "\\text{kPa}", ETex: "\\text{MPa}", PTex: "\\text{kN}", nome: "kN · kPa · MPa (padrão do livro)" }
  };

  function gwOf(ex) {
    const v = num(ex.gw);
    return Number.isFinite(v) ? v : (ex.unidades === "tf" ? 1 : 10);
  }
  // água só onde se desconta γw; formatos antigos (campo NA único ou "sub") usavam o γ como estava
  function normalize(ex) {
    (ex.camadas || []).forEach(c => { if (c.agua !== "sat") c.agua = "seco"; });
    return ex;
  }
  // trechos com água: [{ini, fim}] em profundidade
  function waterBlocks(camadas) {
    const out = [];
    let z = 0;
    camadas.forEach(c => {
      const h = num(c.h) || 0;
      if (c.agua === "sat") {
        const last = out[out.length - 1];
        if (last && Math.abs(last.fim - z) < 1e-9) last.fim = z + h; else out.push({ ini: z, fim: z + h });
      }
      z += h;
    });
    return out;
  }

  // ================= resolução =================
  function solve(ex) {
    const u = SYS[ex.unidades] || SYS.tf;
    const groups = [];
    const warns = [];
    const R = {};
    const add = (g, step) => g.steps.push(step);
    // resposta esperada de um passo (usada no modo treino)
    // alts: valores de erros típicos [{v, m}] para o diagnóstico
    const Q = (label, unit, v, tol, alts) => ({ label, unit, v, tol: tol || 0.02, alts: (alts || []).filter(a => a && Number.isFinite(a.v)) });

    const f = ex.fundacao, im = ex.imediato, ar = ex.argila, tp = ex.tempo;
    const B = num(f.B), Lraw = num(f.L), P0 = num(f.P), Df = num(f.Df) || 0;
    const forma = f.forma;
    let L = forma === "quadrada" ? B : forma === "circular" ? B : Lraw;
    let Bm = B, Lm = L;
    if (forma === "retangular" && Number.isFinite(L) && L < B) { Bm = L; Lm = B; }
    const Ptot = Number.isFinite(P0) ? P0 * (f.acresc10 ? 1.1 : 1) : NaN;

    // ---------- recalque imediato ----------
    if (im.metodo !== "nenhum") {
      const g = { title: "1. Recalque imediato (elástico) — ΔHi", steps: [] };
      groups.push(g);
      if (f.acresc10 && Number.isFinite(P0)) {
        add(g, {
          t: "Carga total com peso próprio da fundação (+10%)",
          eq: `P = ${T(P0, 1)} \\times 1{,}10 = ${T(Ptot, 1)}\\ ${u.PTex}`,
          why: "Costuma-se acrescentar cerca de 10% à carga do pilar para considerar o peso próprio da sapata e do solo sobre ela. Só faça isso se o enunciado pedir."
        });
      }
      if (im.metodo === "pontual") {
        const E = num(im.E), z = num(im.z);
        if (![Ptot, E, z].every(Number.isFinite)) {
          warns.push("Recalque imediato (carga pontual): preencha P, E e z.");
        } else {
          let dHi, eq;
          if (ex.unidades === "tf") {
            const Pk = Ptot * 1000, zc = z * 100;
            dHi = 3 * Pk / (2 * Math.PI * E * zc);
            eq = `\\Delta H_i = \\dfrac{3P}{2\\pi E z} = \\dfrac{3 \\times ${Tg(Pk)}\\ \\text{kgf}}{2\\pi \\times ${Tg(E)}\\ \\text{kgf/cm}^2 \\times ${Tg(zc)}\\ \\text{cm}} = ${T(dHi)}\\ \\text{cm}`;
          } else {
            const Ek = E * 1000;
            dHi = 3 * Ptot / (2 * Math.PI * Ek * z) * 100;
            eq = `\\Delta H_i = \\dfrac{3P}{2\\pi E z} = \\dfrac{3 \\times ${Tg(Ptot)}\\ \\text{kN}}{2\\pi \\times ${Tg(Ek)}\\ \\text{kPa} \\times ${Tg(z)}\\ \\text{m}} = ${T(dHi)}\\ \\text{cm}`;
          }
          R.dHi = dHi;
          add(g, {
            t: "Carga concentrada (aproximação usada na lista)",
            f: "\\Delta H_i = \\dfrac{3P}{2\\pi E z}",
            ans: [Q("ΔHi", "cm", dHi)],
            eq,
            res: `ΔHi = ${fmt(dHi)} cm`,
            why: "Essa expressão vem da solução de Boussinesq para carga pontual: a tensão vertical sob a carga é 3P/(2πz²); multiplicando a deformação σ/E pela espessura z da camada chega-se a 3P/(2πEz). Atenção às unidades: P em kgf, E em kgf/cm² e z em cm dão o recalque em cm."
          });
        }
      } else {
        const E = num(im.E), mu = num(im.mu);
        let A, areaEq;
        if (forma === "circular") { A = Math.PI * B * B / 4; areaEq = `A = \\dfrac{\\pi D^2}{4} = \\dfrac{\\pi \\times {${Tg(B)}}^2}{4} = ${T(A, 3)}\\ \\text{m}^2`; }
        else if (forma === "quadrada") { A = B * B; areaEq = `A = B^2 = {${Tg(B)}}^2 = ${T(A, 2)}\\ \\text{m}^2`; }
        else if (forma === "retangular") { A = Bm * Lm; areaEq = `A = B \\times L = ${Tg(Bm)} \\times ${Tg(Lm)} = ${T(A, 2)}\\ \\text{m}^2`; }
        if (forma === "nenhuma" || ![Ptot, B, E, mu].every(Number.isFinite) || (forma === "retangular" && !Number.isFinite(L))) {
          warns.push("Recalque imediato (sapata): escolha a forma e preencha B (e L), P, E e μ.");
        } else {
          const p = Ptot / A;
          add(g, { t: "Área da fundação", eq: areaEq });
          add(g, {
            t: "Pressão aplicada pela fundação",
            f: "p = \\dfrac{P}{A}",
            ans: [Q("p", u.p, p)],
            eq: `p =\\dfrac{P}{A} = \\dfrac{${Tg(Ptot)}}{${Tg(A, 3)}} = ${T(p)}\\ ${u.pTex}` + (ex.unidades === "tf" ? ` = ${T(p / 10, 3)}\\ \\text{kgf/cm}^2` : ""),
            why: ex.unidades === "tf"
              ? "Para usar E em kgf/cm², a pressão também precisa estar em kgf/cm². Lembre: 1 kgf/cm² = 10 tf/m² (porque 1 m² = 10.000 cm² e 1 tf = 1.000 kgf)."
              : "Com E em MPa, converta para kPa (1 MPa = 1.000 kPa) para ficar coerente com p em kPa."
          });
          // fator de influência
          let I;
          if (im.Imodo === "manual") {
            I = num(im.I);
            add(g, { t: "Fator de influência I (dado no enunciado)", eq: `I = ${Tg(I)}` });
          } else {
            const m1 = forma === "circular" ? NaN : Lm / Bm;
            const r = lookupI(forma, m1, im.rigidez, im.ponto);
            I = r.I;
            const ondeTxt = im.rigidez === "rigido" ? "sapata rígida" : (im.ponto === "canto" ? "flexível, no canto" : "flexível, no centro");
            let eq = forma === "circular" ? `I = ${Tg(I)}` :`m_1 = \\dfrac{L}{B} = \\dfrac{${Tg(Lm)}}{${Tg(Bm)}} = ${Tg(m1, 3)} \\;\\Rightarrow\\; I = ${Tg(I, 3)}`;
            add(g, {
              t: "Fator de influência I (tabela — " + ondeTxt + ")" + (r.interp ? " — interpolado" : ""),
              f: "m_1 = L/B \\;\\Rightarrow\\; I \\text{ na tabela}",
              ans: [Q("I", "", I, 0.01)],
              eq,
              why: "I depende da forma da área carregada, da rigidez da fundação e do ponto onde se quer o recalque. Sapata flexível recalca mais no centro do que nas bordas (bacia de recalque); sapata rígida recalca por igual. Por isso I(centro) ≈ 2 × I(canto) na flexível." + (r.interp ? ` Como L/B = ${fmtg(m1, 3)} está entre ${fmtg(r.a[0])} e ${fmtg(r.b[0])}, foi feita interpolação linear.` : "")
            });
            if (forma === "quadrada" && im.rigidez === "rigido") warns.push("Sapata quadrada rígida: o slide do professor mostra I = 0,55 (provável erro de digitação). Usamos 0,86, valor do livro (Tab. 9.3). Confirme com o professor.");
          }
          if (!Number.isFinite(I)) { warns.push("Informe o fator de influência I."); }
          else {
            let dHi, eq;
            if (ex.unidades === "tf") {
              const Bc = Bm * 100, pk = p / 10;
              dHi = Bc * pk * (1 - mu * mu) * I / E;
              eq = `\\Delta H_i = \\dfrac{B \\cdot p \\cdot (1-\\mu^2) \\cdot I}{E} = \\dfrac{${Tg(Bc)}\\ \\text{cm} \\times ${T(pk, 3)}\\ \\text{kgf/cm}^2 \\times (1-{${Tg(mu)}}^2) \\times ${Tg(I, 3)}}{${Tg(E)}\\ \\text{kgf/cm}^2} = ${T(dHi)}\\ \\text{cm}`;
            } else {
              const Ek = E * 1000;
              dHi = Bm * p * (1 - mu * mu) * I / Ek * 100;
              eq = `\\Delta H_i = \\dfrac{B \\cdot p \\cdot (1-\\mu^2) \\cdot I}{E} = \\dfrac{${Tg(Bm)}\\ \\text{m} \\times ${T(p)}\\ \\text{kPa} \\times (1-{${Tg(mu)}}^2) \\times ${Tg(I, 3)}}{${Tg(Ek)}\\ \\text{kPa}} = ${T(dHi)}\\ \\text{cm}`;
            }
            R.dHi = dHi;
            add(g, {
              t: "Recalque imediato (teoria da elasticidade)",
              f: "\\Delta H_i = \\dfrac{B \\cdot p \\cdot (1-\\mu^2) \\cdot I}{E}",
              ans: [Q("ΔHi", "cm", dHi, 0.02, [
                { v: dHi * (1 - mu) / (1 - mu * mu), m: "Você usou (1 − μ) em vez de (1 − μ²). O μ entra ao quadrado." },
                Lm !== Bm ? { v: dHi * Lm / Bm, m: "Você usou o lado maior da sapata. B é sempre a MENOR dimensão (largura)." } : null,
                ex.unidades === "tf" ? { v: dHi * 10, m: "Você não converteu a pressão para kgf/cm²: divida tf/m² por 10." } : null
              ])],
              eq,
              res: `ΔHi = ${fmt(dHi)} cm`,
              why: "B é sempre a MENOR dimensão (largura) da sapata. O termo (1 − μ²) vem da teoria da elasticidade: μ (Poisson) mede quanto o solo se expande lateralmente quando comprimido. Esse recalque acontece logo que a carga é aplicada — é o recalque típico das areias, por isso usamos o E e o μ da camada arenosa."
            });
            if (mu > 0.5) warns.push(`μ = ${fmtg(mu)} é maior que 0,5 — fisicamente o coeficiente de Poisson não passa de 0,5 (material incompressível). Use o valor do enunciado na prova, mas saiba que é uma inconsistência.`);
          }
        }
      }
    }

    // ---------- perfil / tensões ----------
    const gw = gwOf(ex);
    const camadas = (ex.camadas || []).map(c => {
      const g = num(c.g);
      const sat = c.agua === "sat";
      return { ...c, h: num(c.h), g, ge: sat ? g - gw : g, gTerm: sat ? `(${Tg(g)} - ${Tg(gw)})` : Tg(g) };
    });
    const idx = Number(ar.idx);
    if (ar.ativo) {
      const clay = camadas[idx];
      if (!clay) { warns.push("Escolha qual camada é a argila compressível."); }
      else {
        if (clay.tipo !== "argila") warns.push(`A camada marcada em "Argila?" é "${clay.nome || "camada " + (idx + 1)}", que não é do tipo Argila. Confira a bolinha na primeira coluna do perfil.`);
        const H = clay.h, e0 = num(ar.e0);
        const nsub = Math.max(1, Math.min(10, Math.round(num(ar.nsub) || 1)));
        let topo = 0;
        for (let i = 0; i < idx; i++) topo += camadas[i].h || 0;
        const zMeio = topo + H / 2;
        R.topoArgila = topo; R.zMeio = zMeio; R.Hargila = H;

        // Cc
        const g2 = { title: "2. Parâmetros da argila", steps: [] };
        groups.push(g2);
        let Cc = NaN;
        const LL = num(ar.LL);
        if (ar.ccModo === "dado") {
          Cc = num(ar.Cc);
          add(g2, { t: "Índice de compressão (dado)", eq: `C_c = ${Tg(Cc)}` });
        } else {
          const tab = { na: [0.009, 10, "argila normalmente adensada"], amolgada: [0.007, 10, "argila amolgada"], recife: [0.013, 33, "argila orgânica do Recife"] }[ar.ccModo];
          Cc = tab[0] * (LL - tab[1]);
          add(g2, {
            t: "Índice de compressão pela correlação com o LL (" + tab[2] + ")",
            f: `C_c = ${Tg(tab[0])}\\,(LL - ${tab[1]})`,
            ans: [Q("Cc", "", Cc, 0.01, [{ v: tab[0] * LL, m: `Faltou subtrair ${tab[1]} do LL antes de multiplicar.` }])],
            eq: `C_c = ${Tg(tab[0])}\\,(LL - ${tab[1]}\\%) = ${Tg(tab[0])} \\times (${Tg(LL)} - ${tab[1]}) = ${T(Cc, 3)}`,
            why: "Cc é a inclinação da reta virgem no gráfico e × log σ'. Quando não há ensaio de adensamento, usa-se uma correlação empírica com o limite de liquidez: quanto maior o LL, mais compressível a argila. Use o LL em % (ex.: 70, não 0,70)."
          });
        }
        R.Cc = Cc;
        const Cr = num(ar.Cr);
        if (ar.historico === "OA") add(g2, { t: "Índice de recompressão (dado)", eq: `C_r = ${Tg(Cr)}`, why: "Cr é a inclinação do trecho de recompressão (antes da tensão de pré-adensamento). Geralmente Cr ≈ 10% a 30% de Cc." });

        // σ'0 no meio
        const g3 = { title: "3. Tensões no meio da camada de argila", steps: [] };
        groups.push(g3);
        const termos = [];
        let somaAcima = 0, faltaG = false;
        for (let i = 0; i < idx; i++) {
          const c = camadas[i];
          if (!Number.isFinite(c.g) || !Number.isFinite(c.h)) { faltaG = true; continue; }
          somaAcima += c.ge * c.h;
          termos.push(`${c.gTerm} \\times ${Tg(c.h)}`);
        }
        if (faltaG) warns.push("Alguma camada acima da argila está sem γ ou espessura — σ'0 ficou incompleto.");
        if (!Number.isFinite(clay.g)) warns.push("Informe o γ da camada de argila.");
        const temSat = camadas.slice(0, idx + 1).some(c => c.agua === "sat");

        // Δp
        const gat = num(ar.gat), hat = num(ar.hat);
        let dpConst = ar.dpModo === "aterro" ? gat * hat : num(ar.dp);
        const dpAt = (z) => {
          if (ar.dpModo !== "21") return dpConst;
          const zz = z - Df;
          if (!(zz > 0) || !Number.isFinite(Ptot)) return NaN;
          if (forma === "circular") return Ptot / (Math.PI * Math.pow(B + zz, 2) / 4);
          return Ptot / ((Bm + zz) * (Lm + zz));
        };

        const subs = [];
        const hs = H / nsub;
        for (let k = 0; k < nsub; k++) {
          const zloc = hs * (k + 0.5);
          const s0 = somaAcima + clay.ge * zloc;
          const dp = dpAt(topo + zloc);
          subs.push({ k, z: topo + zloc, zloc, h: hs, s0, dp });
        }

        if (nsub === 1) {
          const s = subs[0];
          termos.push(`${clay.gTerm} \\times ${Tg(H / 2)}`);
          add(g3, {
            t: "Tensão efetiva inicial σ'0 (peso das terras) no meio da argila",
            f: "\\sigma'_0 = \\sum \\gamma_i\\, h_i \\quad (\\text{até o meio da argila})",
            ans: [Q("σ'0", u.p, s.s0, 0.02, [
              temSat ? { v: camadas.slice(0, idx).reduce((a, c) => a + (c.g || 0) * (c.h || 0), 0) + clay.g * H / 2, m: "Você não descontou a água: nas camadas com γsat abaixo do NA use γsat − γw." } : null,
              { v: somaAcima + clay.ge * H, m: "Você usou a espessura inteira da argila. O σ'0 é no MEIO da camada: da argila entra só H/2." },
              { v: somaAcima, m: "Faltou somar a parte de cima da própria argila (γ × H/2) — o ponto de cálculo é o meio dela." }
            ])],
            eq: `\\sigma'_0 = \\sum \\gamma_i\\, h_i = ${termos.join(" + ")} = ${T(s.s0)}\\ ${u.pTex}`,
            why: "Calculamos no MEIO da camada porque ele representa a média da camada inteira — da argila entra só metade da espessura. Acima do NA usa-se o γ natural. Abaixo do NA usa-se γsub = γsat − γw: a água sustenta parte do peso (empuxo), e assim já obtemos direto a tensão EFETIVA." + (temSat ? ` Nas camadas marcadas como "γsat", a calculadora descontou γw = ${fmtg(gw)} ${u.g}.` : "")
          });
        } else {
          add(g3, {
            t: `Camada dividida em ${nsub} subcamadas de ${fmtg(hs, 3)} m`,
            eq: `\\sigma'_{0,i} = ${Tg(somaAcima)} + ${clay.gTerm} \\times z_i`,
            why: "Dividir a argila em subcamadas e somar os recalques é mais preciso, pois a parte de cima (menor σ'0) comprime proporcionalmente mais. O livro mostra que o resultado fica bem próximo do cálculo com o ponto médio (0,56 m × 0,54 m)."
          });
        }
        if (ar.dpModo === "21") {
          const s = subs[Math.floor(nsub / 2)];
          const zz = (nsub === 1 ? zMeio : s.z) - Df;
          add(g3, {
            t: "Acréscimo de tensão Δp pelo método 2:1 (espraiamento)",
            f: forma === "circular" ? "\\Delta p = \\dfrac{P}{\\pi (D+z)^2/4}" : "\\Delta p = \\dfrac{P}{(B+z)(L+z)}",
            ans: nsub === 1 ? [Q("Δp", u.p, dpAt(Df + zz))] : undefined,
            eq: forma === "circular"
              ? `\\Delta p = \\dfrac{P}{\\pi (D+z)^2/4} = \\dfrac{${Tg(Ptot)}}{\\pi(${Tg(B)}+${Tg(zz, 3)})^2/4} = ${T(dpAt(Df + zz), 3)}\\ ${u.pTex}`
              : `\\Delta p = \\dfrac{P}{(B+z)(L+z)} = \\dfrac{${Tg(Ptot)}}{(${Tg(Bm)}+${Tg(zz, 3)})(${Tg(Lm)}+${Tg(zz, 3)})} = ${T(dpAt(Df + zz), 3)}\\ ${u.pTex}`,
            why: "O método 2:1 supõe que a carga se espalha com inclinação 2 (vertical) : 1 (horizontal), então a área cresce com a profundidade z (medida a partir da base da sapata). É só uma estimativa; nas listas o Δp normalmente já é dado."
          });
          if (!Number.isFinite(Ptot) || forma === "nenhuma") warns.push("Método 2:1 precisa da forma, dimensões e carga P da fundação.");
        } else if (ar.dpModo === "aterro") {
          if (![gat, hat].every(Number.isFinite)) warns.push("Informe o γat e a altura Hat do aterro.");
          add(g3, {
            t: "Acréscimo de tensão causado pelo aterro",
            f: "\\Delta p = \\gamma_{at} \\times H_{at}",
            ans: [Q("Δp", u.p, dpConst, 0.02, [{ v: gat * hat / 2, m: "Você usou metade da altura do aterro. O aterro inteiro pesa sobre o terreno: Δp = γat × Hat." }])],
            eq: `\\Delta p = \\gamma_{at} \\times H_{at} = ${Tg(gat)} \\times ${Tg(hat)} = ${T(dpConst)}\\ ${u.pTex}`,
            why: "Um aterro extenso (bem largo em relação à profundidade da argila) não se espalha: o peso dele chega inteiro à argila. Por isso o acréscimo de tensão é simplesmente o peso de uma coluna de aterro: γ do aterro × altura do aterro."
          });
        } else {
          add(g3, { t: "Acréscimo de tensão no meio da argila (dado)", eq: `\\Delta p = ${Tg(dpConst)}\\ ${u.pTex}`, why: "Δp é quanto a obra aumenta a tensão no meio da camada de argila. Ele é menor que a pressão na base da sapata, porque a carga se espalha com a profundidade (bulbo de tensões)." });
        }

        // adensamento
        const g4 = { title: "4. Recalque por adensamento primário — ΔHp", steps: [] };
        groups.push(g4);
        let sa = NaN;
        const saOf = (s0) => {
          if (ar.historico !== "OA") return NaN;
          if (ar.oaModo === "rsa") return num(ar.sa) * s0;
          if (ar.oaModo === "acr") return s0 + num(ar.sa);
          return num(ar.sa);
        };
        let dHp = 0, ok = true;
        const rows = [];
        subs.forEach((s) => {
          const sf = s.s0 + s.dp;
          let de, deEq, caso = "";
          if (ar.historico === "OA") {
            sa = saOf(s.s0);
            if (sa < s.s0) warns.push("σ'a menor que σ'0: isso indicaria argila ainda em adensamento. Confira os dados.");
            if (sf <= sa) {
              de = Cr * log10(sf / s.s0);
              caso = "σ'f ≤ σ'a: só recompressão";
              deEq = `\\Delta e = C_r \\log\\dfrac{\\sigma'_f}{\\sigma'_0} = ${Tg(Cr)} \\log\\dfrac{${T(sf)}}{${T(s.s0)}} = ${T(de, 4)}`;
            } else {
              de = Cr * log10(sa / s.s0) + Cc * log10(sf / sa);
              caso = "σ'f > σ'a: recompressão + reta virgem";
              deEq = `\\Delta e = C_r \\log\\dfrac{\\sigma'_a}{\\sigma'_0} + C_c \\log\\dfrac{\\sigma'_f}{\\sigma'_a} = ${Tg(Cr)} \\log\\dfrac{${T(sa)}}{${T(s.s0)}} + ${Tg(Cc, 3)} \\log\\dfrac{${T(sf)}}{${T(sa)}} = ${T(de, 4)}`;
            }
          } else {
            de = Cc * log10(sf / s.s0);
            deEq = `\\Delta e = C_c \\log\\dfrac{\\sigma'_f}{\\sigma'_0} = ${T(Cc, 3)} \\log\\dfrac{${T(sf)}}{${T(s.s0)}} = ${T(de, 4)}`;
          }
          const dh = de / (1 + e0) * s.h * 100;
          if (!Number.isFinite(dh)) ok = false;
          dHp += dh;
          rows.push({ ...s, sf, sa, de, dh, deEq, caso });
        });

        if (nsub === 1 && rows[0]) {
          const r = rows[0];
          add(g4, {
            t: "Tensão efetiva final",
            f: "\\sigma'_f = \\sigma'_0 + \\Delta p",
            ans: [Q("σ'f", u.p, r.sf)],
            eq: `\\sigma'_f = \\sigma'_0 + \\Delta p = ${T(r.s0)} + ${T(r.dp)} = ${T(r.sf)}\\ ${u.pTex}`,
            why: "Quando todo o excesso de pressão neutra se dissipar, todo o acréscimo Δp terá virado tensão efetiva."
          });
          if (ar.historico === "OA") {
            add(g4, {
              t: "Tensão de pré-adensamento e verificação",
              f: ar.oaModo === "rsa" ? "\\sigma'_a = RSA \\times \\sigma'_0" : ar.oaModo === "acr" ? "\\sigma'_a = \\sigma'_0 + \\text{acr\\'escimo}" : "\\sigma'_a \\text{ dado; compare } \\sigma'_f \\text{ com } \\sigma'_a",
              ans: ar.oaModo === "sa" ? undefined : [Q("σ'a", u.p, r.sa, 0.02, [
                ar.oaModo === "rsa" ? { v: r.s0 / num(ar.sa), m: "Você dividiu pela RSA. RSA = σ'a / σ'0, então σ'a = RSA × σ'0." } : null
              ])],
              eq: `\\sigma'_a = ${T(r.sa)}\\ ${u.pTex} \\quad (RSA = ${T(r.sa / r.s0)}) \\qquad ${r.sf <= r.sa ? "\\sigma'_f \\le \\sigma'_a" : "\\sigma'_f > \\sigma'_a"}`,
              why: "Argila sobreadensada (RSA > 1) já sentiu uma tensão maior no passado. Até σ'a ela é bem pouco compressível (usa Cr). Só o trecho acima de σ'a anda na reta virgem (usa Cc). Por isso é obrigatório comparar σ'f com σ'a."
            });
          }
          add(g4, {
            t: "Variação do índice de vazios" + (r.caso ? " (" + r.caso + ")" : ""),
            f: ar.historico === "OA"
              ? "\\sigma'_f \\le \\sigma'_a: \\Delta e = C_r\\log\\dfrac{\\sigma'_f}{\\sigma'_0} \\qquad \\sigma'_f > \\sigma'_a: \\Delta e = C_r\\log\\dfrac{\\sigma'_a}{\\sigma'_0} + C_c\\log\\dfrac{\\sigma'_f}{\\sigma'_a}"
              : "\\Delta e = C_c \\log\\dfrac{\\sigma'_f}{\\sigma'_0}",
            ans: [Q("Δe", "", r.de, 0.03, [
              ar.historico === "OA" ? { v: Cc * log10(r.sf / r.s0), m: "A argila é SOBREADENSADA: até σ'a use Cr (recompressão); só acima de σ'a use Cc." } : null,
              { v: (ar.historico === "OA" ? r.de : Cc * log10(r.sf / r.s0)) * Math.LN10, m: "Parece que você usou ln (logaritmo natural). Aqui é log na base 10 — a tecla \"log\" da calculadora." }
            ])],
            eq: r.deEq,
            why: ar.historico === "OA" ? "O logaritmo é decimal (log₁₀). Cada trecho usa seu índice: Cr até σ'a e Cc depois." : "Na argila normalmente adensada toda a compressão ocorre pela reta virgem, cuja inclinação é Cc. O log é decimal (log₁₀), não o ln!"
          });
          add(g4, {
            t: "Recalque por adensamento primário",
            f: "\\Delta H_p = \\dfrac{\\Delta e}{1+e_0}\\, H_0",
            ans: [Q("ΔHp", "cm", dHp, 0.025, [
              { v: dHp / 2, m: "Você usou metade da espessura. Em ΔHp = Δe/(1+e0)·H0, o H0 é a espessura TOTAL da argila." },
              { v: r.de * H * 100, m: "Faltou dividir por (1 + e0)." },
              { v: r.de / e0 * H * 100, m: "Você dividiu por e0, mas o denominador é (1 + e0)." },
              { v: dHp / 100, m: "Seu resultado está em metros; a resposta pede cm (H0 em cm)." }
            ])],
            eq: `\\Delta H_p = \\dfrac{\\Delta e}{1+e_0}\\, H_0 = \\dfrac{${T(r.de, 4)}}{1+${Tg(e0)}} \\times ${Tg(H * 100)}\\ \\text{cm} = ${T(dHp)}\\ \\text{cm}`,
            res: `ΔHp = ${fmt(dHp)} cm`,
            why: "Δe/(1+e0) é a deformação específica da camada (vem do esquema sólidos + vazios: H = Hs(1+e)). Multiplicando pela espessura TOTAL da argila H0 (em cm) temos o recalque em cm. Cuidado: H0 é a espessura inteira, não a metade!"
          });
        } else if (rows.length) {
          const head = `<tr><th>Sub.</th><th class="num">z (m)</th><th class="num">σ'0</th><th class="num">Δp</th><th class="num">σ'f</th>${ar.historico === "OA" ? '<th class="num">σ\'a</th>' : ""}<th class="num">Δe</th><th class="num">ΔH (cm)</th></tr>`;
          const body = rows.map((r, i) => `<tr><td>${i + 1}</td><td class="num">${fmt(r.z, 2)}</td><td class="num">${fmt(r.s0)}</td><td class="num">${fmt(r.dp)}</td><td class="num">${fmt(r.sf)}</td>${ar.historico === "OA" ? `<td class="num">${fmt(r.sa)}</td>` : ""}<td class="num">${fmt(r.de, 4)}</td><td class="num">${fmt(r.dh)}</td></tr>`).join("");
          add(g4, {
            t: `Cálculo por subcamada (pressões em ${u.p})`,
            f: "\\Delta H_p = \\sum \\dfrac{\\Delta e_i}{1+e_0}\\, h_i",
            ans: [Q("ΔHp", "cm", dHp, 0.025)],
            html: `<div class="table-wrap"><table>${head}${body}</table></div>`,
            eq: `\\Delta H_p = \\sum \\dfrac{\\Delta e_i}{1+e_0}\\, h_i = ${T(dHp)}\\ \\text{cm}`,
            res: `ΔHp = ${fmt(dHp)} cm`
          });
        }
        if (ok && Number.isFinite(dHp)) {
          R.dHp = dHp;
          R.deMedio = dHp / 100 / H * (1 + e0);
          R.e0 = e0;
          R.s0 = rows[Math.floor(rows.length / 2)].s0;
        } else warns.push("Recalque por adensamento: faltam dados (e0, Cc/LL, γ, Δp...).");
      }
    }

    // ---------- total ----------
    if (Number.isFinite(R.dHi) || Number.isFinite(R.dHp)) {
      const a = Number.isFinite(R.dHi) ? R.dHi : 0, b = Number.isFinite(R.dHp) ? R.dHp : 0;
      R.dHt = a + b;
    }
    if (Number.isFinite(R.dHi) && Number.isFinite(R.dHp)) {
      const g5 = { title: "5. Recalque total", steps: [] };
      groups.push(g5);
      const a = R.dHi, b = R.dHp;
      add(g5, {
        t: "Soma das parcelas",
        f: "\\Delta H_t = \\Delta H_i + \\Delta H_p",
        ans: [Q("ΔHt", "cm", R.dHt, 0.025)],
        eq: `\\Delta H_t = \\Delta H_i + \\Delta H_p = ${T(a)} + ${T(b)} = ${T(R.dHt)}\\ \\text{cm}`,
        res: `ΔHt = ${fmt(R.dHt)} cm`,
        why: "\"Toda areia é imediata\": o ΔHi acontece na hora, durante a construção. O ΔHp da argila acontece devagar, ao longo de meses ou anos — é ele que tem \"tempo de recalque\"."
      });
    }

    // ---------- secundário ----------
    if (ex.secundario && ex.secundario.ativo && Number.isFinite(R.dHp)) {
      const Ca = num(ex.secundario.Ca), r21 = num(ex.secundario.t2t1);
      const g = { title: "5b. Compressão secundária", steps: [] };
      groups.push(g);
      if (![Ca, r21].every(Number.isFinite)) warns.push("Compressão secundária: informe Cα e t2/t1.");
      else {
        const ep = R.e0 - R.deMedio;
        const Hp = R.Hargila - R.dHp / 100;
        const Cal = Ca / (1 + ep);
        const dHs = Cal * Hp * log10(r21) * 100;
        R.dHs = dHs;
        add(g, { t: "Índice de vazios e espessura ao fim do primário", eq: `e_p = e_0 - \\Delta e = ${T(R.e0, 3)} - ${T(R.deMedio, 4)} = ${T(ep, 3)} \\qquad H_p = ${T(R.Hargila, 2)} - ${T(R.dHp / 100, 3)} = ${T(Hp, 3)}\\ \\text{m}` });
        add(g, {
          t: "Recalque secundário",
          f: "\\Delta H_s = \\dfrac{C_\\alpha}{1+e_p}\\, H_p \\log\\dfrac{t_2}{t_1}",
          ans: [Q("ΔHs", "cm", dHs, 0.03)],
          eq: `\\Delta H_s = \\dfrac{C_\\alpha}{1+e_p}\\, H_p \\log\\dfrac{t_2}{t_1} = \\dfrac{${Tg(Ca)}}{1+${T(ep, 3)}} \\times ${T(Hp * 100, 1)} \\times \\log ${Tg(r21)} = ${T(dHs)}\\ \\text{cm}`,
          res: `ΔHs = ${fmt(dHs)} cm`,
          why: "Depois que a pressão neutra se dissipa, a argila continua deformando lentamente pelo rearranjo (fluência) da estrutura dos grãos. O recalque cresce o mesmo tanto a cada ciclo de log do tempo (t, 10t, 100t...). Em geral é pequeno, exceto em solos orgânicos."
        });
      }
    }

    // ---------- tempo ----------
    if (tp && tp.ativo) {
      const g = { title: "6. Tempo de recalque (Teoria de Terzaghi)", steps: [] };
      groups.push(g);
      const Cv = num(tp.Cv), faces = Number(tp.faces) || 2;
      const H = R.Hargila;
      if (!Number.isFinite(H) || !Number.isFinite(Cv)) warns.push("Tempo de recalque: informe Cv e configure a camada de argila.");
      else {
        const CU = {
          cm2s: { lab: "\\text{cm}^2/\\text{s}", hmul: 100, hTex: "\\text{cm}", tTex: "\\text{s}", toDays: 1 / 86400, why: "Com Cv em cm²/s, h entra em cm e o tempo sai em segundos (divida por 86.400 para dias)." },
          m2dia: { lab: "\\text{m}^2/\\text{dia}", hmul: 1, hTex: "\\text{m}", tTex: "\\text{dias}", toDays: 1, why: "Com Cv em m²/dia, h entra em metros e o tempo sai direto em dias." },
          m2ano: { lab: "\\text{m}^2/\\text{ano}", hmul: 1, hTex: "\\text{m}", tTex: "\\text{anos}", toDays: 365, why: "Com Cv em m²/ano, h entra em metros e o tempo sai direto em anos." }
        }[tp.cvUnidade || "cm2s"];
        const h = H / faces, hc = h * CU.hmul;
        R.hd = h;
        add(g, {
          t: "Altura (distância) de drenagem",
          f: "h = \\dfrac{H_0}{n^\\circ\\ \\text{faces drenantes}}",
          ans: [Q("h", "m", h, 0.01, [faces === 2 ? { v: H, m: "Há 2 faces drenantes (a água sai por cima e por baixo): h = H0/2." } : { v: H / 2, m: "Só 1 face drena (embaixo é impermeável): h = H0 inteiro." }])],
          eq: `h = \\dfrac{H_0}{n^\\circ\\ \\text{faces drenantes}} = \\dfrac{${Tg(H)}}{${faces}} = ${Tg(h, 3)}\\ \\text{m}` + (CU.hmul === 100 ? ` = ${Tg(hc)}\\ \\text{cm}` : ""),
          why: "h é o MAIOR caminho que uma gota d'água precisa percorrer para sair da argila. Com areia em cima e embaixo (2 faces), a água sai pelos dois lados → h = H/2. Se embaixo houver rocha ou argila rija impermeável (1 face), h = H. Como o tempo depende de h², drenar por uma face só faz o tempo ficar 4× maior."
        });
        add(g, { t: "Coeficiente de adensamento", eq: `C_v = ${Tg(Cv)}\\ ${CU.lab}`, why: "Cv junta permeabilidade e compressibilidade: Cv = k(1+e)/(av·γw). Quanto maior o Cv, mais rápido o adensamento. " + CU.why });
        const tempoRes = (d) => {
          if (CU.toDays === 365) return `t ≈ ${fmt(d / 365, d / 365 < 10 ? 2 : 1)} anos (${diasTexto(d)})`;
          return `t ≈ ${fmt(d, 0)} dias` + (d >= 30 ? ` (${diasTexto(d)})` : "");
        };

        const temposU = [];
        const doU = (U, origem) => {
          const Tv = TvProf(U);
          const ts = Tv * hc * hc / Cv;
          const d = ts * CU.toDays;
          let tvEq;
          if (U >= 100) tvEq = `U = 100\\% \\Rightarrow T_v = 2{,}0`;
          else if (U <= 60) tvEq = `U = ${Tg(U, 2)}\\% \\le 60\\% \\Rightarrow T_v = \\dfrac{\\pi}{4}\\left(\\dfrac{U}{100}\\right)^2 = \\dfrac{\\pi}{4}(${Tg(U / 100, 4)})^2 = ${T(Tv, 4)}`;
          else tvEq = `U = ${Tg(U, 2)}\\% > 60\\% \\Rightarrow T_v = 1{,}781 - 0{,}933\\log(100-U) = 1{,}781 - 0{,}933\\log(${Tg(100 - U, 2)}) = ${T(Tv, 4)}`;
          const anos = CU.toDays === 365;
          add(g, {
            t: origem,
            f: "U \\le 60\\%: T_v = \\dfrac{\\pi}{4}\\left(\\dfrac{U}{100}\\right)^2 \\quad U > 60\\%: T_v = 1{,}781 - 0{,}933\\log(100-U) \\quad U = 100\\%: T_v = 2 \\\\[6pt] t = \\dfrac{T_v\\, h^2}{C_v}",
            ans: [
              Q("Tv", "", Tv, 0.03, [
                U > 60 && U < 100 ? { v: Math.PI / 4 * Math.pow(U / 100, 2), m: "Para U > 60% a fórmula é Tv = 1,781 − 0,933·log(100 − U)." } : null,
                U <= 60 ? { v: 1.781 - 0.933 * log10(100 - U), m: "Para U ≤ 60% a fórmula é Tv = (π/4)·(U/100)²." } : null,
                U <= 60 ? { v: Math.PI / 4 * U * U, m: "Use U em decimal (U/100) dentro da fórmula." } : null
              ]),
              ((tv, sc) => Q("t", anos ? "anos" : "dias", tv * sc, 0.03, [
                faces === 2 ? { v: tv * sc * 4, m: "Seu tempo ficou 4× maior: parece que usou h = H0. Com 2 faces drenantes, h = H0/2." } : { v: tv * sc / 4, m: "Seu tempo ficou 4× menor: parece que usou h = H0/2. Com 1 face drenante, h = H0." },
                anos ? { v: d, m: "Você deu o resultado em dias; aqui a resposta é em anos." } : CU.toDays !== 1 ? { v: ts, m: "Você deu o resultado em segundos; divida por 86.400 para ter dias." } : null
              ]))(d, anos ? 1 / 365 : 1)
            ],
            eq: tvEq + `\\\\[6pt] t = \\dfrac{T_v\\, h^2}{C_v} = \\dfrac{${T(Tv, 4)} \\times {${Tg(hc)}}^2}{${Tg(Cv)}} = ${T(ts, CU.toDays === 1 ? 1 : CU.toDays === 365 ? 2 : 0)}\\ ${CU.tTex}` + (CU.toDays === 1 ? "" : ` = ${T(d, 1)}\\ \\text{dias}`),
            res: tempoRes(d),
            why: U >= 100
              ? "Teoricamente, 100% de adensamento só ocorre em tempo infinito. Na prática (e na lista do professor) adota-se Tv = 2,0 para 'fim do adensamento' — a série exata dá U ≈ 99,4% com Tv = 2."
              : `Pela tabela exata de Terzaghi (livro, Tab. 10.1), U = ${fmtg(U, 1)}% corresponde a Tv = ${fmtg(TvExato(U), 4)}. As fórmulas aproximadas dão praticamente o mesmo valor.`
          });
          temposU.push({ U, d });
        };
        list(tp.U).forEach(U => doU(U, `Tempo para U = ${fmtg(U)}%`));
        list(tp.dH).forEach(dh => {
          if (!Number.isFinite(R.dHp)) { warns.push("Para tempo de um recalque parcial é preciso calcular ΔHp."); return; }
          const U = dh / R.dHp * 100;
          if (U >= 100) { warns.push(`O recalque de ${fmtg(dh)} cm é maior que ΔHp = ${fmt(R.dHp)} cm — não vai acontecer só por adensamento primário.`); return; }
          add(g, {
            t: `Porcentagem correspondente a ΔHp(t) = ${fmtg(dh)} cm`,
            f: "U = \\dfrac{\\Delta H_p(t)}{\\Delta H_p} \\times 100",
            ans: [Q("U", "%", U, 0.025)],
            eq: `U = \\dfrac{\\Delta H_p(t)}{\\Delta H_p} \\times 100 = \\dfrac{${Tg(dh)}}{${T(R.dHp)}} \\times 100 = ${T(U)}\\%`,
            why: "A porcentagem de adensamento é proporcional ao recalque já ocorrido (regra de três). Use só o ΔHp da argila, não o ΔHt — o ΔHi da areia não depende do tempo."
          });
          doU(U, `Tempo para ocorrer ${fmtg(dh)} cm de recalque por adensamento`);
        });
        list(tp.dias).forEach(dd => {
          const ts = dd / CU.toDays;
          const Tv = Cv * ts / (hc * hc);
          const Up = UProf(Tv);
          const Ue = UExato(Tv);
          const rec = Number.isFinite(R.dHp) ? Up / 100 * R.dHp : NaN;
          add(g, {
            t: `Recalque ocorrido após ${fmtg(dd)} dias`,
            f: "T_v = \\dfrac{C_v\\, t}{h^2} \\;\\Rightarrow\\; U \\;\\Rightarrow\\; \\Delta H_p(t) = U \\cdot \\Delta H_p",
            ans: Number.isFinite(rec) ? [Q("U", "%", Up, 0.03), Q("ΔHp(t)", "cm", rec, 0.03)] : [Q("U", "%", Up, 0.03)],
            eq: `T_v = \\dfrac{C_v\\, t}{h^2} = \\dfrac{${Tg(Cv)} \\times ${T(ts, CU.toDays === 365 ? 3 : 0)}}{{${Tg(hc)}}^2} = ${T(Tv, 4)} \\;\\Rightarrow\\; U \\approx ${T(Up, 1)}\\%` + (Number.isFinite(rec) ? `\\\\[6pt] \\Delta H_p(t) = U \\cdot \\Delta H_p = ${T(Up / 100, 3)} \\times ${T(R.dHp)} = ${T(rec)}\\ \\text{cm}` : ""),
            res: Number.isFinite(rec) ? `U ≈ ${fmt(Up, 1)}% → ${fmt(rec)} cm` : `U ≈ ${fmt(Up, 1)}%`,
            why: `Aqui fazemos o caminho inverso: do tempo achamos Tv e, invertendo as fórmulas, achamos U. (Série exata: U = ${fmt(Ue, 1)}%.)`
          });
        });
        R.temposU = temposU;
      }
    }

    // ---------- diferencial ----------
    if (ex.diferencial && ex.diferencial.ativo) {
      const g = { title: "7. Recalque diferencial e distorção angular", steps: [] };
      groups.push(g);
      const viz = num(ex.diferencial.dHviz), Ld = num(ex.diferencial.L);
      if (!Number.isFinite(R.dHt) || ![viz, Ld].every(Number.isFinite)) warns.push("Recalque diferencial: informe o recalque do pilar vizinho e a distância entre eixos.");
      else {
        const dd = Math.abs(R.dHt - viz);
        const da = dd / (Ld * 100);
        R.dHd = dd; R.Da = da;
        add(g, {
          t: "Recalque diferencial",
          f: "\\Delta H_d = |\\Delta H_{t1} - \\Delta H_{t2}|",
          ans: [Q("ΔHd", "cm", dd, 0.03)],
          eq: `\\Delta H_d = |\\Delta H_{t1} - \\Delta H_{t2}| = |${T(R.dHt)} - ${Tg(viz)}| = ${T(dd)}\\ \\text{cm}`,
          res: `ΔHd = ${fmt(dd)} cm`,
          why: "Mais do que o recalque total, o que danifica a estrutura é a DIFERENÇA de recalque entre dois apoios vizinhos, que entorta vigas e trinca paredes."
        });
        const inv = 1 / da;
        let nivel = "abaixo de 1/500 — limite seguro para edifícios sem trincas (Bjerrum)";
        if (inv < 150) nivel = "pior que 1/150 — risco de danos estruturais (Bjerrum)";
        else if (inv < 300) nivel = "entre 1/300 e 1/150 — trincas em paredes e painéis (Bjerrum)";
        else if (inv < 500) nivel = "entre 1/500 e 1/300 — limite para edifícios sem trincas excedido";
        add(g, {
          t: "Distorção angular",
          f: "D_\\alpha = \\dfrac{\\Delta H_d}{L} = \\dfrac{1}{x}",
          ans: [Q("x em Dα = 1/x", "", inv, 0.03)],
          eq: `D_\\alpha = \\dfrac{\\Delta H_d}{L} = \\dfrac{${T(dd)}\\ \\text{cm}}{${Tg(Ld * 100)}\\ \\text{cm}} = ${T(da, 5)} \\approx \\dfrac{1}{${T(inv, 1)}}`,
          res: `Dα ≈ 1/${fmt(inv, 0)} (${nivel})`,
          why: "L é a distância entre os CENTROS (eixos) dos pilares, não o vão livre entre as sapatas. Use ΔHd e L na mesma unidade. A distorção costuma ser escrita como 1/x; quanto MAIOR o x, melhor."
        });
      }
    }

    return { groups, warns, R, u };
  }

  // ================= formulário =================
  const form = () => $("#calcForm");
  function blankExample() {
    return {
      v: 1, titulo: "", descricao: "", unidades: "tf",
      fundacao: { forma: "quadrada", B: "", L: "", P: "", acresc10: false, Df: "" },
      imediato: { metodo: "sapata", E: "", mu: "", Imodo: "tabela", rigidez: "flexivel", ponto: "centro", I: "", z: "" },
      gw: "",
      camadas: [{ nome: "Areia", tipo: "areia", h: "", g: "", agua: "seco" }, { nome: "Argila mole", tipo: "argila", h: "", g: "", agua: "seco" }],
      argila: { ativo: true, idx: 1, e0: "", ccModo: "na", Cc: "", LL: "", historico: "NA", oaModo: "sa", sa: "", Cr: "", dpModo: "dado", dp: "", nsub: "1" },
      tempo: { ativo: false, Cv: "", faces: "2", U: "", dH: "", dias: "" },
      secundario: { ativo: false, Ca: "", t2t1: "" },
      diferencial: { ativo: false, dHviz: "", L: "" }
    };
  }

  function renderLayers(camadas, idxArgila) {
    const tb = $("#layersBody");
    tb.innerHTML = "";
    camadas.forEach((c, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="text-align:center"><input type="radio" name="argilaIdx" value="${i}" ${i === idxArgila ? "checked" : ""} aria-label="Esta é a argila compressível"></td>
        <td><input type="text" data-l="nome" value="${escapeHtml(c.nome || "")}" aria-label="Nome da camada ${i + 1}"></td>
        <td><select data-l="tipo" aria-label="Tipo da camada ${i + 1}">
          <option value="areia">Areia</option><option value="argila">Argila</option><option value="silte">Silte</option><option value="outro">Outro / rocha</option>
        </select></td>
        <td><input type="text" inputmode="decimal" data-l="h" value="${escapeHtml(c.h ?? "")}" aria-label="Espessura da camada ${i + 1}"></td>
        <td><input type="text" inputmode="decimal" data-l="g" value="${escapeHtml(c.g ?? "")}" aria-label="Peso específico da camada ${i + 1}"></td>
        <td><select data-l="agua" aria-label="Água na camada ${i + 1}">
          <option value="seco">Sem água</option>
          <option value="sat">Com água (desconta γw)</option>
        </select></td>
        <td><button type="button" class="btn small danger" data-del="${i}" title="Remover camada">✕</button></td>`;
      tr.querySelector("[data-l=tipo]").value = c.tipo || "outro";
      tr.querySelector("[data-l=agua]").value = c.agua || "seco";
      tb.appendChild(tr);
    });
  }

  function writeForm(ex) {
    const F = form();
    const set = (name, v) => { const el = F.elements[name]; if (!el) return; if (el.type === "checkbox") el.checked = !!v; else el.value = v ?? ""; };
    set("titulo", ex.titulo); set("descricao", ex.descricao); set("unidades", ex.unidades || "tf");
    const fu = ex.fundacao || {};
    set("forma", fu.forma); set("B", fu.B); set("L", fu.L); set("P", fu.P); set("acresc10", fu.acresc10); set("Df", fu.Df);
    const im = ex.imediato || {};
    set("metodo", im.metodo); set("E", im.E); set("mu", im.mu); set("Imodo", im.Imodo); set("rigidez", im.rigidez); set("ponto", im.ponto); set("I", im.I); set("z", im.z);
    normalize(ex);
    set("gw", ex.gw);
    const ar = ex.argila || {};
    set("argAtivo", ar.ativo); set("e0", ar.e0); set("ccModo", ar.ccModo); set("Cc", ar.Cc); set("LL", ar.LL); set("historico", ar.historico);
    set("oaModo", ar.oaModo); set("sa", ar.sa); set("Cr", ar.Cr); set("dpModo", ar.dpModo); set("dp", ar.dp); set("gat", ar.gat); set("hat", ar.hat); set("nsub", ar.nsub || "1");
    const tp = ex.tempo || {};
    set("tempoAtivo", tp.ativo); set("Cv", tp.Cv); set("cvUnidade", tp.cvUnidade || "cm2s"); set("faces", tp.faces || "2"); set("Ulist", tp.U); set("dHlist", tp.dH); set("diasList", tp.dias);
    const se = ex.secundario || {};
    set("secAtivo", se.ativo); set("Ca", se.Ca); set("t2t1", se.t2t1);
    const di = ex.diferencial || {};
    set("difAtivo", di.ativo); set("dHviz", di.dHviz); set("Ldif", di.L);
    renderLayers(ex.camadas || [], Number(ar.idx));
    $("#exNota").innerHTML = ex.nota ? `<div class="callout warn"><strong>Observação sobre este exemplo</strong>${escapeHtml(ex.nota)}</div>` : "";
    $("#exNota").dataset.nota = ex.nota || "";
    $("#exNota").dataset.origem = ex.origem || "";
    syncVisibility();
  }

  function readForm() {
    const F = form();
    const g = (n) => { const el = F.elements[n]; if (!el) return ""; return el.type === "checkbox" ? el.checked : el.value; };
    const camadas = $$("#layersBody tr").map(tr => ({
      nome: $("[data-l=nome]", tr).value, tipo: $("[data-l=tipo]", tr).value,
      h: $("[data-l=h]", tr).value, g: $("[data-l=g]", tr).value, agua: $("[data-l=agua]", tr).value
    }));
    const r = $("input[name=argilaIdx]:checked");
    const ex = {
      v: 1, titulo: g("titulo"), descricao: g("descricao"), unidades: g("unidades"),
      fundacao: { forma: g("forma"), B: g("B"), L: g("L"), P: g("P"), acresc10: g("acresc10"), Df: g("Df") },
      imediato: { metodo: g("metodo"), E: g("E"), mu: g("mu"), Imodo: g("Imodo"), rigidez: g("rigidez"), ponto: g("ponto"), I: g("I"), z: g("z") },
      gw: g("gw"),
      camadas,
      argila: { ativo: g("argAtivo"), idx: r ? Number(r.value) : 0, e0: g("e0"), ccModo: g("ccModo"), Cc: g("Cc"), LL: g("LL"), historico: g("historico"), oaModo: g("oaModo"), sa: g("sa"), Cr: g("Cr"), dpModo: g("dpModo"), dp: g("dp"), gat: g("gat"), hat: g("hat"), nsub: g("nsub") },
      tempo: { ativo: g("tempoAtivo"), Cv: g("Cv"), cvUnidade: g("cvUnidade"), faces: g("faces"), U: g("Ulist"), dH: g("dHlist"), dias: g("diasList") },
      secundario: { ativo: g("secAtivo"), Ca: g("Ca"), t2t1: g("t2t1") },
      diferencial: { ativo: g("difAtivo"), dHviz: g("dHviz"), L: g("Ldif") }
    };
    const n = $("#exNota").dataset.nota; if (n) ex.nota = n;
    const o = $("#exNota").dataset.origem; if (o) ex.origem = o;
    return ex;
  }

  function syncVisibility() {
    const F = form();
    const v = (n) => F.elements[n].type === "checkbox" ? F.elements[n].checked : F.elements[n].value;
    const show = (sel, on) => $$(sel).forEach(el => el.classList.toggle("hidden", !on));
    const u = SYS[v("unidades")] || SYS.tf;
    $$("[data-unit=g]").forEach(el => el.textContent = u.g);
    $$("[data-unit=p]").forEach(el => el.textContent = u.p);
    $$("[data-unit=E]").forEach(el => el.textContent = u.E);
    $$("[data-unit=P]").forEach(el => el.textContent = u.P);
    show(".only-L", v("forma") === "retangular");
    show(".only-fund", v("forma") !== "nenhuma");
    show(".only-sapata", v("metodo") === "sapata");
    show(".only-pontual", v("metodo") === "pontual");
    show(".only-imed", v("metodo") !== "nenhum");
    show(".only-Itab", v("Imodo") === "tabela" && v("metodo") === "sapata");
    show(".only-Iman", v("Imodo") === "manual" && v("metodo") === "sapata");
    show(".only-ponto", v("rigidez") === "flexivel");
    show(".only-arg", v("argAtivo"));
    show(".only-ccdado", v("ccModo") === "dado");
    show(".only-ccLL", v("ccModo") !== "dado");
    show(".only-OA", v("historico") === "OA");
    show(".only-dpdado", v("dpModo") === "dado");
    show(".only-dpaterro", v("dpModo") === "aterro");
    show(".only-tempo", v("tempoAtivo"));
    show(".only-sec", v("secAtivo"));
    show(".only-dif", v("difAtivo"));
    const lab = { sa: "σ'a (tensão de pré-adensamento)", rsa: "RSA (σ'a / σ'0)", acr: "σ'a − σ'0 (acréscimo)" }[v("oaModo")];
    $("#saLabel").textContent = lab;
    $$(".only-sa-unit").forEach(el => el.classList.toggle("hidden", v("oaModo") === "rsa"));
  }

  // ================= desenho do perfil =================
  function drawProfile(ex, R, svg) {
    const camadas = (ex.camadas || []).map(c => ({ ...c, h: num(c.h) })).filter(c => c.h > 0);
    svg = svg || $("#profileSvg");
    if (!camadas.length) { svg.innerHTML = ""; return; }
    const total = camadas.reduce((a, c) => a + c.h, 0);
    const W = 520, top = 70, H = 300, x0 = 70, x1 = 380;
    const sc = H / total;
    const css = getComputedStyle(document.documentElement);
    const col = (n) => css.getPropertyValue(n).trim();
    const fill = { areia: col("--sand"), argila: col("--clay"), silte: col("--silt"), outro: col("--silt") };
    let s = `<defs>
      <pattern id="${svg.id}Clay" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="${col("--clay-2")}" stroke-width="2"/></pattern>
      <pattern id="${svg.id}Sand" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="${col("--sand-2")}"/><circle cx="7" cy="6" r="1.1" fill="${col("--sand-2")}"/></pattern>
      <pattern id="${svg.id}Water" width="24" height="9" patternUnits="userSpaceOnUse"><path d="M0 5 q6 -4 12 0 t12 0" fill="none" stroke="${col("--water")}" stroke-width="1.3" opacity=".75"/></pattern>
    </defs>`;
    let z = 0;
    const idx = Number(ex.argila.idx);
    camadas.forEach((c, i) => {
      const y = top + z * sc, h = c.h * sc;
      s += `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="${h}" fill="${fill[c.tipo] || fill.outro}"/>`;
      if (c.tipo === "argila") s += `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="${h}" fill="url(#${svg.id}Clay)" opacity=".35"/>`;
      if (c.tipo === "areia") s += `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="${h}" fill="url(#${svg.id}Sand)"/>`;
      s += `<line x1="${x0}" x2="${x1}" y1="${y}" y2="${y}" stroke="${col("--text")}" stroke-width="1" opacity=".5"/>`;
      s += `<text x="${x0 - 8}" y="${y + 4}" text-anchor="end" font-size="12" fill="${col("--muted")}">${fmtg(z, 2)}</text>`;
      const label = escapeHtml(c.nome || c.tipo);
      const gtxt = Number.isFinite(num(c.g)) ? ` · ${c.agua === "sat" ? "γsat" : "γ"}=${fmtg(num(c.g))}` : "";
      if (h > 14) s += `<text x="${x1 + 8}" y="${y + h / 2 + 4}" font-size="12" fill="${col("--text")}">${label}</text>`;
      if (h > 30) s += `<text x="${x1 + 8}" y="${y + h / 2 + 19}" font-size="11" fill="${col("--muted")}">h=${fmtg(c.h)} m${gtxt}</text>`;
      z += c.h;
    });
    s += `<text x="${x0 - 8}" y="${top + total * sc + 4}" text-anchor="end" font-size="12" fill="${col("--muted")}">${fmtg(total, 2)}</text>`;
    s += `<text x="${x0 - 40}" y="${top - 10}" font-size="11" fill="${col("--muted")}">prof. (m)</text>`;
    s += `<line x1="${x0}" x2="${x1}" y1="${top}" y2="${top}" stroke="${col("--text")}" stroke-width="2"/>`;

    // água: hachura em cada trecho + símbolo de NA no topo
    waterBlocks(camadas).forEach(b => {
      const y = top + b.ini * sc, h = (b.fim - b.ini) * sc;
      s += `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="${h}" fill="url(#${svg.id}Water)"/>`;
      s += `<line x1="${x0}" x2="${x1}" y1="${y}" y2="${y}" stroke="${col("--water")}" stroke-width="2.5"/>`;
      const xs = x1 - 40;
      s += `<path d="M ${xs - 7} ${y - 13} h 14 l -7 11 z" fill="${col("--water")}"/>`;
      s += `<line x1="${xs - 8}" x2="${xs + 8}" y1="${y + 4}" y2="${y + 4}" stroke="${col("--water")}" stroke-width="1.5"/>`;
      s += `<line x1="${xs - 5}" x2="${xs + 5}" y1="${y + 8}" y2="${y + 8}" stroke="${col("--water")}" stroke-width="1.5"/>`;
      s += `<line x1="${xs - 2}" x2="${xs + 2}" y1="${y + 12}" y2="${y + 12}" stroke="${col("--water")}" stroke-width="1.5"/>`;
      s += `<text x="${xs - 12}" y="${y - 4}" font-size="11" font-weight="700" fill="${col("--water")}" text-anchor="end">NA</text>`;
    });
    // fundação
    const f = ex.fundacao;
    const Df = num(f.Df) || 0;
    if (f.forma !== "nenhuma") {
      const yb = top + Df * sc;
      const cx = (x0 + x1) / 2;
      const bw = 80;
      const ph = Math.max(10, Math.min(18, yb - top + 10));
      s += `<rect x="${cx - bw / 2}" y="${yb - ph}" width="${bw}" height="${ph}" fill="${col("--surface")}" stroke="${col("--text")}" stroke-width="1.5"/>`;
      s += `<rect x="${cx - 9}" y="${top - 46}" width="18" height="${yb - ph - top + 46}" fill="${col("--surface")}" stroke="${col("--text")}" stroke-width="1.5"/>`;
      const P = num(f.P);
      s += `<line x1="${cx}" x2="${cx}" y1="${top - 66}" y2="${top - 50}" stroke="${col("--primary")}" stroke-width="2.5"/><path d="M ${cx - 5} ${top - 54} l 5 8 l 5 -8 z" fill="${col("--primary")}"/>`;
      if (Number.isFinite(P)) s += `<text x="${cx + 12}" y="${top - 56}" font-size="12" font-weight="700" fill="${col("--primary")}">P = ${fmtg(P)} ${SYS[ex.unidades].P}</text>`;
    } else if (ex.argila.ativo && ex.argila.dpModo === "aterro") {
      const gat = num(ex.argila.gat), hat = num(ex.argila.hat);
      s += `<path d="M ${x0 + 20} ${top} L ${x0 + 70} ${top - 44} L ${x1 - 70} ${top - 44} L ${x1 - 20} ${top} Z" fill="${col("--silt")}" stroke="${col("--text")}" stroke-width="1.2"/>`;
      s += `<text x="${(x0 + x1) / 2}" y="${top - 25}" text-anchor="middle" font-size="12" font-weight="700" fill="${col("--text")}">Aterro${Number.isFinite(hat) ? ` · Hat = ${fmtg(hat)} m` : ""}</text>`;
      if (Number.isFinite(gat)) s += `<text x="${(x0 + x1) / 2}" y="${top - 10}" text-anchor="middle" font-size="11" fill="${col("--text")}">γat = ${fmtg(gat)} ${SYS[ex.unidades].g}</text>`;
    } else if (ex.argila.ativo && Number.isFinite(num(ex.argila.dp))) {
      s += `<text x="${(x0 + x1) / 2}" y="${top - 30}" text-anchor="middle" font-size="12" font-weight="700" fill="${col("--primary")}">carregamento extenso: Δp = ${fmtg(num(ex.argila.dp))} ${SYS[ex.unidades].p}</text>`;
      for (let x = x0 + 15; x < x1; x += 30) s += `<line x1="${x}" x2="${x}" y1="${top - 22}" y2="${top - 4}" stroke="${col("--primary")}" stroke-width="1.5"/><path d="M ${x - 3} ${top - 8} l 3 6 l 3 -6 z" fill="${col("--primary")}"/>`;
    }
    // ponto médio da argila
    if (ex.argila.ativo && Number.isFinite(R.zMeio)) {
      const y = top + R.zMeio * sc;
      s += `<line x1="${x0 + 10}" x2="${x1 - 10}" y1="${y}" y2="${y}" stroke="${col("--primary")}" stroke-width="1" stroke-dasharray="3 3"/>`;
      s += `<circle cx="${(x0 + x1) / 2}" cy="${y}" r="5" fill="${col("--primary")}"/>`;
      s += `<text x="${(x0 + x1) / 2 + 10}" y="${y - 6}" font-size="11" font-weight="700" fill="${col("--text")}">meio da argila (z = ${fmtg(R.zMeio, 2)} m)</text>`;
      if (ex.tempo.ativo) {
        const idxc = Number(ex.argila.idx);
        const faces = Number(ex.tempo.faces) || 2;
        const yt = top + R.topoArgila * sc, yb = top + (R.topoArgila + R.Hargila) * sc;
        const ax = x0 + 24;
        s += `<path d="M ${ax} ${y} L ${ax} ${yt + 6}" stroke="${col("--water")}" stroke-width="2"/><path d="M ${ax - 4} ${yt + 12} l 4 -7 l 4 7 z" fill="${col("--water")}"/>`;
        if (faces === 2) s += `<path d="M ${ax} ${y} L ${ax} ${yb - 6}" stroke="${col("--water")}" stroke-width="2"/><path d="M ${ax - 4} ${yb - 12} l 4 7 l 4 -7 z" fill="${col("--water")}"/>`;
        s += `<text x="${ax + 6}" y="${(y + yt) / 2 + 4}" font-size="11" fill="${col("--water")}">h</text>`;
        void idxc;
      }
    }
    svg.setAttribute("viewBox", `0 0 ${W} ${top + H + 20}`);
    svg.innerHTML = s;
  }

  // ================= curva U x Tv =================
  function drawCurve(pts) {
    const svg = $("#curveSvg");
    if (!svg) return;
    const css = getComputedStyle(document.documentElement);
    const col = (n) => css.getPropertyValue(n).trim();
    const W = 420, H = 230, x0 = 46, y0 = 16, w = W - x0 - 14, h = H - y0 - 36;
    const X = (t) => x0 + t / 1.0 * w, Y = (U) => y0 + U / 100 * h;
    let s = "";
    for (let t = 0; t <= 1.0001; t += 0.1) s += `<line x1="${X(t)}" x2="${X(t)}" y1="${y0}" y2="${y0 + h}" stroke="${col("--border")}"/><text x="${X(t)}" y="${y0 + h + 16}" font-size="10" text-anchor="middle" fill="${col("--muted")}">${fmtg(t, 1)}</text>`;
    for (let U = 0; U <= 100; U += 20) s += `<line x1="${x0}" x2="${x0 + w}" y1="${Y(U)}" y2="${Y(U)}" stroke="${col("--border")}"/><text x="${x0 - 6}" y="${Y(U) + 4}" font-size="10" text-anchor="end" fill="${col("--muted")}">${U}</text>`;
    let d = "";
    for (let i = 0; i <= 200; i++) { const t = i / 200; d += (i ? "L" : "M") + X(t).toFixed(1) + " " + Y(UExato(t)).toFixed(1) + " "; }
    s += `<path d="${d}" fill="none" stroke="${col("--accent")}" stroke-width="2.5"/>`;
    s += `<text x="${x0 + w / 2}" y="${H - 2}" font-size="11" text-anchor="middle" fill="${col("--muted")}">Fator tempo Tv</text>`;
    s += `<text x="12" y="${y0 + h / 2}" font-size="11" text-anchor="middle" fill="${col("--muted")}" transform="rotate(-90 12 ${y0 + h / 2})">U (%)</text>`;
    (pts || []).forEach(p => {
      if (p.Tv > 1) return;
      s += `<line x1="${X(p.Tv)}" x2="${X(p.Tv)}" y1="${y0}" y2="${Y(p.U)}" stroke="${col("--primary")}" stroke-dasharray="3 3"/><line x1="${x0}" x2="${X(p.Tv)}" y1="${Y(p.U)}" y2="${Y(p.U)}" stroke="${col("--primary")}" stroke-dasharray="3 3"/><circle cx="${X(p.Tv)}" cy="${Y(p.U)}" r="4.5" fill="${col("--primary")}"/>`;
    });
    svg.innerHTML = s;
  }

  // ================= render resultado =================
  function render() {
    const ex = readForm();
    syncVisibility();
    const { groups, warns, R } = solve(ex);
    const sum = [];
    if (Number.isFinite(R.dHi)) sum.push(["ΔHi (imediato)", fmt(R.dHi) + " cm"]);
    if (Number.isFinite(R.dHp)) sum.push(["ΔHp (adensamento)", fmt(R.dHp) + " cm"]);
    if (Number.isFinite(R.dHi) && Number.isFinite(R.dHp)) sum.push(["ΔHt (total)", fmt(R.dHt) + " cm", true]);
    if (Number.isFinite(R.dHs)) sum.push(["ΔHs (secundário)", fmt(R.dHs) + " cm"]);
    if (Number.isFinite(R.Da)) sum.push(["Distorção Dα", "1/" + fmt(1 / R.Da, 0)]);
    $("#summary").innerHTML = sum.map(([k, v, m]) => `<div class="stat ${m ? "main" : ""}"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");
    $("#warns").innerHTML = warns.map(w => `<div class="callout warn">${escapeHtml(w)}</div>`).join("");
    $("#steps").innerHTML = groups.filter(g => g.steps.length).map(g => `
      <div class="step-group"><h4>${escapeHtml(g.title)}</h4>
      ${g.steps.map(s => `<div class="step">
        <div class="t">${escapeHtml(s.t)}</div>
        ${s.html || ""}
        ${s.eq ? `<div class="eq">${tex(s.eq, true)}</div>` : ""}
        ${s.res ? `<div class="res">→ ${escapeHtml(s.res)}</div>` : ""}
        ${s.why ? `<details class="why"><summary>Por quê? / Explicação</summary>${escapeHtml(s.why)}</details>` : ""}
      </div>`).join("")}</div>`).join("") || `<p class="muted">Preencha os dados ao lado (ou carregue um exemplo) para ver a resolução passo a passo.</p>`;
    drawProfile(ex, R);
    const pts = (R.temposU || []).filter(p => p.U < 100).map(p => ({ U: p.U, Tv: TvProf(p.U) }));
    drawCurve(pts);
    $("#curveWrap").classList.toggle("hidden", !(ex.tempo && ex.tempo.ativo));
  }

  // ================= compartilhamento =================
  function b64urlEncode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlDecode(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    const bin = atob(s);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  function shareLink(ex) {
    const clean = JSON.parse(JSON.stringify(ex));
    delete clean.id;
    return location.origin + location.pathname + "#ex=" + b64urlEncode(JSON.stringify(clean));
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
      ta.remove(); return ok;
    }
  }

  // ================= meus exemplos =================
  function loadMine() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveMine(arr) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); return true; } catch (e) { return false; }
  }

  function exCard(ex, kind) {
    const div = document.createElement("div");
    div.className = "ex-card";
    div.innerHTML = `<span class="pill">${escapeHtml(ex.origem || (kind === "mine" ? "Meu exemplo" : "Exemplo"))}</span>
      <h4>${escapeHtml(ex.titulo || "(sem título)")}</h4>
      <p>${escapeHtml(ex.descricao || "")}</p>
      <div class="btnrow">
        <button type="button" class="btn small primary" data-act="train">Treinar (resolver eu)</button>
        <button type="button" class="btn small" data-act="load">Calculadora rápida</button>
        <button type="button" class="btn small" data-act="share">Copiar link</button>
        ${kind === "mine" ? '<button type="button" class="btn small danger" data-act="del">Excluir</button>' : ""}
      </div>`;
    div.querySelector("[data-act=train]").onclick = () => window.SolosTreino && window.SolosTreino.start(ex);
    div.querySelector("[data-act=load]").onclick = () => { writeForm(ex); render(); $("#calculadora").scrollIntoView(); toast("Exemplo carregado"); };
    div.querySelector("[data-act=share]").onclick = async () => { toast(await copy(shareLink(ex)) ? "Link copiado!" : "Não consegui copiar o link"); };
    const del = div.querySelector("[data-act=del]");
    if (del) del.onclick = () => {
      if (!confirm("Excluir \"" + (ex.titulo || "sem título") + "\" dos seus exemplos?")) return;
      saveMine(loadMine().filter(e => e.id !== ex.id));
      renderMine();
    };
    return div;
  }
  function renderPresets() {
    const box = $("#presetList");
    box.innerHTML = "";
    (window.EXEMPLOS_RECALQUE || []).forEach(ex => box.appendChild(exCard(ex, "preset")));
  }
  function renderMine() {
    const box = $("#mineList");
    const arr = loadMine();
    box.innerHTML = "";
    $("#mineEmpty").classList.toggle("hidden", arr.length > 0);
    arr.forEach(ex => box.appendChild(exCard(ex, "mine")));
  }

  // ================= ferramentas rápidas =================
  function initTools() {
    const tvU = () => {
      const U = num($("#toolU").value);
      const out = $("#toolUout");
      if (!Number.isFinite(U) || U <= 0 || U > 100) { out.innerHTML = '<span class="muted">Digite U entre 0 e 100.</span>'; return; }
      const tp = TvProf(U), te = TvExato(U);
      out.innerHTML = `Professor: ${tex(`T_v = ${T(tp, 4)}`)} &nbsp;·&nbsp; Exato (Terzaghi): ${tex(Number.isFinite(te) ? `T_v = ${T(te, 4)}` : "T_v \\to \\infty")}`;
    };
    const uTv = () => {
      const Tv = num($("#toolTv").value);
      const out = $("#toolTvout");
      if (!Number.isFinite(Tv) || Tv <= 0) { out.innerHTML = '<span class="muted">Digite Tv &gt; 0.</span>'; return; }
      out.innerHTML = `Professor (fórmulas invertidas): ${tex(`U = ${T(UProf(Tv), 1)}\\%`)} &nbsp;·&nbsp; Exato: ${tex(`U = ${T(UExato(Tv), 1)}\\%`)}`;
    };
    $("#toolU").addEventListener("input", tvU);
    $("#toolTv").addEventListener("input", uTv);
    tvU(); uTv();

    const cv = () => {
      const k = num($("#cvK").value), e = num($("#cvE").value), av = num($("#cvAv").value), gw = num($("#cvGw").value);
      const out = $("#cvOut");
      if (![k, e, av, gw].every(Number.isFinite)) { out.innerHTML = '<span class="muted">Preencha k, e, av e γw.</span>'; return; }
      const kms = k / 100;
      const cvm2 = kms * (1 + e) / (av * gw);
      out.innerHTML = tex(`C_v = \\dfrac{k(1+e)}{a_v\\,\\gamma_w} = \\dfrac{${Tg(kms)} \\times (1+${Tg(e)})}{${Tg(av)} \\times ${Tg(gw)}} = ${T(cvm2)}\\ \\text{m}^2/\\text{s} = ${T(cvm2 * 1e4)}\\ \\text{cm}^2/\\text{s} = ${T(cvm2 * 86400, 4)}\\ \\text{m}^2/\\text{dia}`, true);
    };
    ["#cvK", "#cvE", "#cvAv", "#cvGw"].forEach(s => $(s).addEventListener("input", cv));
    cv();

    const el = () => {
      const C = num($("#elC").value), s0 = num($("#elS").value), a = num($("#elA").value), tipo = $("#elTipo").value;
      const out = $("#elOut");
      if (![C, s0, a].every(Number.isFinite)) { out.innerHTML = '<span class="muted">Preencha os valores.</span>'; return; }
      const div = tipo === "continua" ? 2 * a : a;
      const lab = { quadrada: "a", circular: "d", continua: "2b" }[tipo];
      const r = C * s0 / div;
      out.innerHTML = tex(`\\Delta h_e = \\dfrac{C \\cdot \\Delta\\sigma_0}{${lab}} = \\dfrac{${Tg(C)} \\times ${Tg(s0)}}{${Tg(div)}} = ${T(r, 3)}\\ \\text{cm}`, true);
    };
    ["#elC", "#elS", "#elA", "#elTipo"].forEach(s => $(s).addEventListener("input", el));
    el();

    const conv = () => {
      const v = num($("#cvtV").value), from = $("#cvtFrom").value;
      const out = $("#cvtOut");
      if (!Number.isFinite(v)) { out.textContent = ""; return; }
      const toKPa = { kPa: 1, tfm2: 9.80665, kgfcm2: 98.0665, MPa: 1000 }[from];
      const k = v * toKPa;
      out.innerHTML = `<table><tr><th>kPa</th><th>tf/m²</th><th>kgf/cm²</th><th>MPa</th></tr><tr><td class="num">${fmtg(k, 3)}</td><td class="num">${fmtg(k / 9.80665, 4)}</td><td class="num">${fmtg(k / 98.0665, 4)}</td><td class="num">${fmtg(k / 1000, 5)}</td></tr></table><p class="hint">Na prática de prova: 1 kgf/cm² ≈ 10 tf/m² ≈ 100 kPa (usando g ≈ 10 m/s²).</p>`;
    };
    ["#cvtV", "#cvtFrom"].forEach(s => $(s).addEventListener("input", conv));
    conv();
  }

  // ================= tabela de Tv =================
  function renderTvTable() {
    const tb = $("#tvTable");
    if (!tb) return;
    let rows = "";
    const cols = 5;
    for (let r = 1; r <= 20; r++) {
      rows += "<tr>";
      for (let c = 0; c < cols; c++) {
        const U = r + c * 20;
        const Tv = U === 100 ? "∞" : fmt(TvExato(U), U < 10 ? 4 : 3);
        rows += `<td class="num"><strong>${U}</strong></td><td class="num">${Tv}</td>`;
      }
      rows += "</tr>";
    }
    tb.innerHTML = `<thead><tr>${"<th class='num'>U (%)</th><th class='num'>Tv</th>".repeat(cols)}</tr></thead><tbody>${rows}</tbody>`;
  }

  // ================= quiz =================
  function renderQuiz() {
    const box = $("#quizBox");
    if (!box || !window.QUIZ_RECALQUE) return;
    let acertos = 0, respondidas = 0;
    const score = $("#quizScore");
    window.QUIZ_RECALQUE.forEach((q, i) => {
      const div = document.createElement("div");
      div.className = "quiz-q";
      div.innerHTML = `<strong>${i + 1}. ${q.q}</strong><div class="opts"></div><div class="exp hidden"></div>`;
      const opts = div.querySelector(".opts");
      q.opts.forEach((o, j) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "opt"; b.innerHTML = o;
        b.onclick = () => {
          $$("button", opts).forEach((x, k) => { x.disabled = true; if (k === q.a) x.classList.add("right"); });
          if (j !== q.a) b.classList.add("wrong"); else acertos++;
          respondidas++;
          const exp = div.querySelector(".exp");
          exp.innerHTML = (j === q.a ? "<strong>Certo!</strong> " : "<strong>Não é essa.</strong> ") + q.exp;
          exp.classList.remove("hidden");
          score.textContent = `${acertos} de ${respondidas} certas (total: ${window.QUIZ_RECALQUE.length})`;
        };
        opts.appendChild(b);
      });
      box.appendChild(div);
    });
  }

  // ================= init =================
  function init() {
    const F = form();
    renderPresets();
    renderMine();
    renderTvTable();
    renderQuiz();
    initTools();

    let t;
    F.addEventListener("input", () => { clearTimeout(t); t = setTimeout(render, 120); });
    F.addEventListener("change", () => render());
    $("#layersBody").addEventListener("change", (e) => {
      const sel = e.target.closest("[data-l=tipo]");
      if (sel && sel.value === "argila") sel.closest("tr").querySelector("input[name=argilaIdx]").checked = true;
    });
    $("#layersBody").addEventListener("click", (e) => {
      const b = e.target.closest("[data-del]");
      if (!b) return;
      const ex = readForm();
      const i = Number(b.dataset.del);
      ex.camadas.splice(i, 1);
      if (ex.argila.idx >= ex.camadas.length) ex.argila.idx = Math.max(0, ex.camadas.length - 1);
      else if (ex.argila.idx > i) ex.argila.idx--;
      renderLayers(ex.camadas, ex.argila.idx);
      render();
    });
    $("#addLayer").onclick = () => {
      const ex = readForm();
      ex.camadas.push({ nome: "Nova camada", tipo: "areia", h: "", g: "", agua: "seco" });
      renderLayers(ex.camadas, ex.argila.idx);
      render();
    };
    $("#btnNovo").onclick = () => { writeForm(blankExample()); render(); toast("Formulário limpo"); };
    $("#btnTreinar").onclick = () => window.SolosTreino && window.SolosTreino.start(readForm());
    $("#btnSalvar").onclick = () => {
      const ex = readForm();
      if (!ex.titulo.trim()) { toast("Dê um título ao exemplo antes de salvar"); F.elements.titulo.focus(); return; }
      ex.id = "m" + Date.now();
      ex.origem = "Meu exemplo";
      const arr = loadMine(); arr.unshift(ex);
      toast(saveMine(arr) ? "Salvo em \"Meus exemplos\" (neste navegador)" : "Não foi possível salvar neste navegador");
      renderMine();
    };
    $("#btnLink").onclick = async () => {
      const ex = readForm();
      const link = shareLink(ex);
      $("#shareOut").value = link;
      $("#shareBox").classList.remove("hidden");
      toast(await copy(link) ? "Link copiado! É só mandar para alguém." : "Copie o link abaixo");
    };
    $("#btnJson").onclick = () => {
      const ex = readForm();
      const blob = new Blob([JSON.stringify(ex, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (ex.titulo || "exemplo-recalque").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w-]+/g, "-").toLowerCase() + ".json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
    $("#fileJson").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const data = JSON.parse(rd.result);
          const arr = Array.isArray(data) ? data : [data];
          writeForm(arr[0]); render();
          toast(arr.length > 1 ? "Arquivo com vários exemplos: carreguei o primeiro" : "Exemplo importado");
        } catch (err) { toast("Arquivo inválido"); }
        e.target.value = "";
      };
      rd.readAsText(file);
    });

    // exemplo vindo de link compartilhado
    const m = location.hash.match(/#ex=([\w-]+)/);
    if (m) {
      try {
        const ex = JSON.parse(b64urlDecode(m[1]));
        writeForm(ex);
        $("#sharedBanner").innerHTML = `<div class="banner"><strong>Exemplo compartilhado com você:</strong> ${escapeHtml(ex.titulo || "(sem título)")}. Ele está carregado na calculadora abaixo — você pode alterar e salvar nos seus exemplos.</div>`;
        setTimeout(() => $("#calculadora").scrollIntoView(), 50);
      } catch (e) {
        writeForm(window.EXEMPLOS_RECALQUE.find(e => e.id === "sala-adensamento") || window.EXEMPLOS_RECALQUE[0]);
        toast("Link de exemplo inválido");
      }
    } else {
      writeForm(window.EXEMPLOS_RECALQUE.find(e => e.id === "sala-adensamento") || window.EXEMPLOS_RECALQUE[0]);
    }
    render();

    // tema
    $("#themeBtn").onclick = () => {
      const root = document.documentElement;
      const isDark = root.dataset.theme === "dark" || (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
      root.dataset.theme = isDark ? "light" : "dark";
      try { localStorage.setItem("solos2ee.theme", root.dataset.theme); } catch (e) { /* sem storage */ }
      render();
    };
  }

  window.SolosCalc = { solve, drawProfile, normalize, tex, fmt, fmtg, num, escapeHtml, toast, SYS, gwOf };
  window.addEventListener("DOMContentLoaded", init);
})();
