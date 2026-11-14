// Exemplos prontos da calculadora de recalque.
// Para adicionar um exemplo permanente: monte-o na página, clique em "Baixar .json"
// e cole o conteúdo como um novo item desta lista.
window.EXEMPLOS_RECALQUE = [
  {
    id: "sala-adensamento",
    origem: "Exemplo de sala (caderno)",
    titulo: "Exemplo de sala — Aterro de 50 kPa sobre argila mole de 10 m",
    descricao: "Aterro aplica Δp = 50 kPa. Areia: 2 m com γh = 17 kN/m³ e 2 m com γsat = 21 kN/m³ (a água está só nessa camada). Argila mole de 10 m, sem água (γn = 12 kN/m³, e₀ = 0,6, Cc = 0,5, Cv = 0,4 m²/ano). Embaixo, argila rija (impermeável). Pede ΔHp, t para 100%, t para 60% e t para 10 cm de recalque.",
    nota: "Só a areia saturada tem água, então só ela é descontada (21 − 10 = 11); a argila mole entra com γn = 12. Assim P'0 = 17×2 + 11×2 + 12×5 = 116 kPa e P'f = 166 kPa. A argila rija embaixo não drena: só 1 face drenante (a areia em cima), então h = H0 = 10 m.",
    unidades: "kN",
    fundacao: { forma: "nenhuma", B: "", L: "", P: "", acresc10: false, Df: "0" },
    imediato: { metodo: "nenhum", E: "", mu: "", Imodo: "tabela", rigidez: "flexivel", ponto: "centro", I: "", z: "" },
    camadas: [
      { nome: "Areia", tipo: "areia", h: "2", g: "17", agua: "seco" },
      { nome: "Areia saturada", tipo: "areia", h: "2", g: "21", agua: "sat" },
      { nome: "Argila mole", tipo: "argila", h: "10", g: "12", agua: "seco" },
      { nome: "Argila rija (impermeável)", tipo: "outro", h: "2", g: "", agua: "seco" }
    ],
    argila: { ativo: true, idx: 2, e0: "0.6", ccModo: "dado", Cc: "0.5", LL: "", historico: "NA", oaModo: "sa", sa: "", Cr: "", dpModo: "dado", dp: "50", nsub: "1" },
    tempo: { ativo: true, Cv: "0.4", cvUnidade: "m2ano", faces: "1", U: "100; 60", dH: "10", dias: "" },
    secundario: { ativo: false, Ca: "", t2t1: "" },
    diferencial: { ativo: false, dHviz: "", L: "" }
  },
  {
    id: "sala-caderno-2",
    origem: "Exemplo de sala (caderno 2)",
    titulo: "Exemplo de sala 2 — Argila mole de 5 m sob aterro de 30 kPa",
    descricao: "Aterro aplica Δp = 30 kPa. Areia de 2 m (γ = 18 kN/m³) sobre argila mole de 5 m (γn = 15 kN/m³, e₀ = 0,8, Cc = 0,49, Cv = 3 m²/ano). Embaixo da argila a camada é impermeável (1 face drenante). Pede ΔHp, t para 100%, 95% e 50%, e t para 2 cm de recalque.",
    nota: "No exemplo salvo o 30 estava no campo da carga P; aqui ele foi usado como Δp = 30 kPa do aterro — confira com o caderno. P'0 = 18×2 + 15×2,5 = 73,5 kPa; P'f = 103,5 kPa; ΔHp ≈ 20,2 cm. Com 1 face drenante, h = 5 m.",
    unidades: "kN",
    fundacao: { forma: "nenhuma", B: "", L: "", P: "", acresc10: false, Df: "0" },
    imediato: { metodo: "nenhum", E: "", mu: "", Imodo: "tabela", rigidez: "flexivel", ponto: "centro", I: "", z: "" },
    gw: "10",
    camadas: [
      { nome: "Areia", tipo: "areia", h: "2", g: "18", agua: "seco" },
      { nome: "Argila mole", tipo: "argila", h: "5", g: "15", agua: "seco" },
      { nome: "Camada impermeável", tipo: "outro", h: "1", g: "", agua: "seco" }
    ],
    argila: { ativo: true, idx: 1, e0: "0.8", ccModo: "dado", Cc: "0.49", LL: "", historico: "NA", oaModo: "sa", sa: "", Cr: "", dpModo: "dado", dp: "30", nsub: "1" },
    tempo: { ativo: true, Cv: "3", cvUnidade: "m2ano", faces: "1", U: "100; 95; 50", dH: "2", dias: "" },
    secundario: { ativo: false, Ca: "", t2t1: "" },
    diferencial: { ativo: false, dHviz: "", L: "" }
  },
  {
    id: "prova-aterro-35",
    origem: "Questão de prova (PDF \"POR NO SITE\")",
    titulo: "Prova — Aterro de 3,5 m sobre argila orgânica mole",
    descricao: "Para o aterro sobre uma camada de argila mole, estime o recalque por adensamento primário provocado pelo aterro na camada de argila orgânica mole. Estime também os tempos para que ocorram 95% deste recalque, metade deste recalque, e o tempo para que ocorram 24 cm do recalque por adensamento primário. Aterro: Hat = 3,50 m, γat = 19,0 kN/m³. Areia média: 2,00 m, γ = 16,0 kN/m³. Argila mole: 6,00 m, γ = 14,0 kN/m³, e₀ = 0,80, Cc = 0,35, Cv = 5,0 m²/ano. Embaixo: rocha.",
    nota: "Δp = γat × Hat = 19 × 3,5 = 66,5 kPa. P'0 = 16×2 + 14×3 = 74 kPa; P'f = 140,5 kPa; Δe = 0,35·log(140,5/74) ≈ 0,0975; ΔHp ≈ 32,5 cm. Rocha embaixo → 1 face drenante → h = 6 m. A fórmula Tv = −0,9332·log(1 − U) − 0,0851 do formulário da prova dá o mesmo que 1,781 − 0,933·log(100 − U%).",
    unidades: "kN",
    fundacao: { forma: "nenhuma", B: "", L: "", P: "", acresc10: false, Df: "0" },
    imediato: { metodo: "nenhum", E: "", mu: "", Imodo: "tabela", rigidez: "flexivel", ponto: "centro", I: "", z: "" },
    gw: "10",
    camadas: [
      { nome: "Areia média", tipo: "areia", h: "2", g: "16", agua: "seco" },
      { nome: "Argila orgânica mole", tipo: "argila", h: "6", g: "14", agua: "seco" },
      { nome: "Rocha", tipo: "outro", h: "1", g: "", agua: "seco" }
    ],
    argila: { ativo: true, idx: 1, e0: "0.8", ccModo: "dado", Cc: "0.35", LL: "", historico: "NA", oaModo: "sa", sa: "", Cr: "", dpModo: "aterro", dp: "", gat: "19", hat: "3.5", nsub: "1" },
    tempo: { ativo: true, Cv: "5", cvUnidade: "m2ano", faces: "1", U: "95; 50", dH: "24", dias: "" },
    secundario: { ativo: false, Ca: "", t2t1: "" },
    diferencial: { ativo: false, dHviz: "", L: "" }
  },
  {
    id: "oa-5-prova-rsa",
    origem: "Pré-adensada — exercício elaborado",
    titulo: "Pré-adensada 5 — A questão de prova com argila pré-adensada (RSA = 1,5)",
    descricao: "Mesma situação da questão de prova (aterro de 3,5 m com γat = 19 kN/m³; areia média de 2 m com γ = 16 kN/m³; argila mole de 6 m com γ = 14 kN/m³, e₀ = 0,80, Cc = 0,35, Cv = 5 m²/ano; rocha embaixo), mas agora a argila é pré-adensada: RSA = 1,5 e Cr = 0,05. Pede Δp, P'0, σ'a, P'f, ΔHp e o tempo para 95% do recalque.",
    nota: "Δp = 66,5 kPa; P'0 = 74 kPa; σ'a = 1,5 × 74 = 111 kPa; P'f = 140,5 kPa > σ'a → Cr + Cc: Δe = 0,05·log(111/74) + 0,35·log(140,5/111) ≈ 0,0088 + 0,0358 = 0,0446; ΔHp ≈ 14,9 cm (contra ≈ 32,5 cm se fosse normalmente adensada). O tempo NÃO muda: ele só depende de Cv e h, não do Cc/Cr.",
    unidades: "kN",
    fundacao: { forma: "nenhuma", B: "", L: "", P: "", acresc10: false, Df: "0" },
    imediato: { metodo: "nenhum", E: "", mu: "", Imodo: "tabela", rigidez: "flexivel", ponto: "centro", I: "", z: "" },
    gw: "10",
    camadas: [
      { nome: "Areia média", tipo: "areia", h: "2", g: "16", agua: "seco" },
      { nome: "Argila pré-adensada", tipo: "argila", h: "6", g: "14", agua: "seco" },
      { nome: "Rocha", tipo: "outro", h: "1", g: "", agua: "seco" }
    ],
    argila: { ativo: true, idx: 1, e0: "0.8", ccModo: "dado", Cc: "0.35", LL: "", historico: "OA", oaModo: "rsa", sa: "1.5", Cr: "0.05", dpModo: "aterro", dp: "", gat: "19", hat: "3.5", nsub: "1" },
    tempo: { ativo: true, Cv: "5", cvUnidade: "m2ano", faces: "1", U: "95", dH: "", dias: "" },
    secundario: { ativo: false, Ca: "", t2t1: "" },
    diferencial: { ativo: false, dHviz: "", L: "" }
  },
  {
    id: "oa-1-so-recompressao",
    origem: "Pré-adensada — exercício elaborado",
    titulo: "Pré-adensada 1 — A carga não passa de σ'a (só Cr)",
    descricao: "Aterro aplica Δp = 40 kPa. Areia de 3 m (γ = 18 kN/m³); NA a 3 m; areia saturada de 2 m (γsat = 20 kN/m³). Argila de 6 m pré-adensada (γn = 16 kN/m³, e₀ = 0,80, Cc = 0,40, Cr = 0,05, σ'a = 180 kPa, Cv = 2 m²/ano). Embaixo, areia (drena). Pede P'0, P'f, ΔHp e o tempo para 50% e 90% de adensamento.",
    nota: "P'0 = 18×3 + (20 − 10)×2 + 16×3 = 122 kPa. P'f = 122 + 40 = 162 kPa, que NÃO passa de σ'a = 180 kPa: todo o carregamento fica no trecho de recompressão, então só entra o Cr. Δe = 0,05·log(162/122) ≈ 0,0062 e ΔHp ≈ 2,05 cm — bem pouco, porque a argila já 'conhece' tensões até 180 kPa. Duas faces drenantes: h = 3 m.",
    unidades: "kN",
    fundacao: { forma: "nenhuma", B: "", L: "", P: "", acresc10: false, Df: "0" },
    imediato: { metodo: "nenhum", E: "", mu: "", Imodo: "tabela", rigidez: "flexivel", ponto: "centro", I: "", z: "" },
    gw: "10",
    camadas: [
      { nome: "Areia", tipo: "areia", h: "3", g: "18", agua: "seco" },
      { nome: "Areia saturada", tipo: "areia", h: "2", g: "20", agua: "sat" },
      { nome: "Argila pré-adensada", tipo: "argila", h: "6", g: "16", agua: "seco" },
      { nome: "Areia (drenante)", tipo: "areia", h: "2", g: "", agua: "seco" }
    ],
    argila: { ativo: true, idx: 2, e0: "0.8", ccModo: "dado", Cc: "0.4", LL: "", historico: "OA", oaModo: "sa", sa: "180", Cr: "0.05", dpModo: "dado", dp: "40", nsub: "1" },
    tempo: { ativo: true, Cv: "2", cvUnidade: "m2ano", faces: "2", U: "50; 90", dH: "", dias: "" },
    secundario: { ativo: false, Ca: "", t2t1: "" },
    diferencial: { ativo: false, dHviz: "", L: "" }
  },
  {
    id: "oa-2-rsa",
    origem: "Pré-adensada — exercício elaborado",
    titulo: "Pré-adensada 2 — RSA = 1,5 e a carga passa de σ'a (Cr + Cc)",
    descricao: "Aterro aplica Δp = 80 kPa. Areia de 2 m (γ = 17 kN/m³); NA a 2 m; areia saturada de 2 m (γsat = 20 kN/m³). Argila de 8 m com RSA = 1,5 (γn = 15 kN/m³, e₀ = 1,20, LL = 60%, Cr = 0,07, Cv = 1,5 m²/ano). Embaixo, rocha sã (impermeável). Pede Cc, P'0, P'f, ΔHp, o tempo para 100% e o tempo para ocorrerem 5 cm de recalque.",
    nota: "Cc = 0,009×(60 − 10) = 0,45. P'0 = 17×2 + (20 − 10)×2 + 15×4 = 114 kPa → σ'a = RSA × P'0 = 1,5 × 114 = 171 kPa. P'f = 114 + 80 = 194 kPa, que PASSA de σ'a: Δe = Cr·log(171/114) + Cc·log(194/171) ≈ 0,0123 + 0,0247 = 0,0370 e ΔHp ≈ 13,45 cm. Rocha embaixo → 1 face drenante → h = 8 m.",
    unidades: "kN",
    fundacao: { forma: "nenhuma", B: "", L: "", P: "", acresc10: false, Df: "0" },
    imediato: { metodo: "nenhum", E: "", mu: "", Imodo: "tabela", rigidez: "flexivel", ponto: "centro", I: "", z: "" },
    gw: "10",
    camadas: [
      { nome: "Areia", tipo: "areia", h: "2", g: "17", agua: "seco" },
      { nome: "Areia saturada", tipo: "areia", h: "2", g: "20", agua: "sat" },
      { nome: "Argila pré-adensada", tipo: "argila", h: "8", g: "15", agua: "seco" },
      { nome: "Rocha sã (impermeável)", tipo: "outro", h: "1.5", g: "", agua: "seco" }
    ],
    argila: { ativo: true, idx: 2, e0: "1.2", ccModo: "na", Cc: "", LL: "60", historico: "OA", oaModo: "rsa", sa: "1.5", Cr: "0.07", dpModo: "dado", dp: "80", nsub: "1" },
    tempo: { ativo: true, Cv: "1.5", cvUnidade: "m2ano", faces: "1", U: "100", dH: "5", dias: "" },
    secundario: { ativo: false, Ca: "", t2t1: "" },
    diferencial: { ativo: false, dHviz: "", L: "" }
  },
  {
    id: "oa-3-erosao",
    origem: "Pré-adensada — exercício elaborado",
    titulo: "Pré-adensada 3 — Camada erodida: σ'a = P'0 + 30 kPa",
    descricao: "No passado havia sobre o terreno uma camada que foi erodida, e por isso a argila tem σ'a 30 kPa maior que o P'0 atual. Hoje: areia de 1,5 m (γ = 18 kN/m³); NA a 1,5 m; areia saturada de 1,5 m (γsat = 19 kN/m³); argila de 6 m (γn = 16 kN/m³, e₀ = 1,50, Cc = 0,80, Cr = 0,12, Cv = 0,8 m²/ano) sobre areia. Um aterro aplica Δp = 60 kPa. Pede P'0, σ'a, P'f, ΔHp, o tempo para 50% e o recalque após 1 ano (365 dias).",
    nota: "P'0 = 18×1,5 + (19 − 10)×1,5 + 16×3 = 88,5 kPa → σ'a = 88,5 + 30 = 118,5 kPa. P'f = 148,5 kPa > σ'a: Δe = 0,12·log(118,5/88,5) + 0,80·log(148,5/118,5) ≈ 0,0152 + 0,0784 = 0,0936 e ΔHp ≈ 22,5 cm. Duas faces drenantes: h = 3 m. Em 1 ano: Tv = 0,8×1/3² ≈ 0,089 → U ≈ 34% → ≈ 7,6 cm.",
    unidades: "kN",
    fundacao: { forma: "nenhuma", B: "", L: "", P: "", acresc10: false, Df: "0" },
    imediato: { metodo: "nenhum", E: "", mu: "", Imodo: "tabela", rigidez: "flexivel", ponto: "centro", I: "", z: "" },
    gw: "10",
    camadas: [
      { nome: "Areia", tipo: "areia", h: "1.5", g: "18", agua: "seco" },
      { nome: "Areia saturada", tipo: "areia", h: "1.5", g: "19", agua: "sat" },
      { nome: "Argila pré-adensada", tipo: "argila", h: "6", g: "16", agua: "seco" },
      { nome: "Areia (drenante)", tipo: "areia", h: "2", g: "", agua: "seco" }
    ],
    argila: { ativo: true, idx: 2, e0: "1.5", ccModo: "dado", Cc: "0.8", LL: "", historico: "OA", oaModo: "acr", sa: "30", Cr: "0.12", dpModo: "dado", dp: "60", nsub: "1" },
    tempo: { ativo: true, Cv: "0.8", cvUnidade: "m2ano", faces: "2", U: "50", dH: "", dias: "365" },
    secundario: { ativo: false, Ca: "", t2t1: "" },
    diferencial: { ativo: false, dHviz: "", L: "" }
  },
  {
    id: "oa-4-comparacao",
    origem: "Pré-adensada — exercício elaborado",
    titulo: "Pré-adensada 4 — Mesmo terreno do caderno 2, agora com RSA = 2",
    descricao: "Mesmos dados do Exemplo de sala 2 (areia de 2 m com γ = 18; argila mole de 5 m com γn = 15, e₀ = 0,8, Cc = 0,49; Δp = 30 kPa), mas agora a argila é pré-adensada com RSA = 2 e Cr = 0,08. Pede P'0, σ'a, P'f e ΔHp. Compare com o resultado da argila normalmente adensada.",
    nota: "P'0 = 73,5 kPa → σ'a = 2 × 73,5 = 147 kPa. P'f = 103,5 kPa ≤ σ'a: só recompressão. Δe = 0,08·log(103,5/73,5) ≈ 0,0119 e ΔHp ≈ 3,3 cm, contra ≈ 20,2 cm se ela fosse normalmente adensada (Exemplo de sala 2). O pré-adensamento reduziu o recalque em cerca de 6 vezes!",
    unidades: "kN",
    fundacao: { forma: "nenhuma", B: "", L: "", P: "", acresc10: false, Df: "0" },
    imediato: { metodo: "nenhum", E: "", mu: "", Imodo: "tabela", rigidez: "flexivel", ponto: "centro", I: "", z: "" },
    gw: "10",
    camadas: [
      { nome: "Areia", tipo: "areia", h: "2", g: "18", agua: "seco" },
      { nome: "Argila pré-adensada", tipo: "argila", h: "5", g: "15", agua: "seco" },
      { nome: "Camada impermeável", tipo: "outro", h: "1", g: "", agua: "seco" }
    ],
    argila: { ativo: true, idx: 1, e0: "0.8", ccModo: "dado", Cc: "0.49", LL: "", historico: "OA", oaModo: "rsa", sa: "2", Cr: "0.08", dpModo: "dado", dp: "30", nsub: "1" },
    tempo: { ativo: false, Cv: "", faces: "1", U: "", dH: "", dias: "" },
    secundario: { ativo: false, Ca: "", t2t1: "" },
    diferencial: { ativo: false, dHviz: "", L: "" }
  }
];
