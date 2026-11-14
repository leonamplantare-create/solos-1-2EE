window.QUIZ_RECALQUE = [
  {
    q: "Numa camada de areia sobre argila saturada, qual parcela do recalque depende do tempo?",
    opts: ["O recalque imediato da areia", "O recalque por adensamento da argila", "Os dois, igualmente", "Nenhum dos dois"],
    a: 1,
    exp: "A areia é muito permeável e deforma na hora. A argila saturada só comprime quando a água sai dos vazios, o que é lento: é o adensamento."
  },
  {
    q: "Logo após aplicar uma carga numa argila saturada (t = 0), quem suporta o acréscimo de tensão?",
    opts: ["O esqueleto sólido (tensão efetiva)", "A água (sobrepressão neutra)", "Metade cada um", "Ninguém: a carga se dissipa"],
    a: 1,
    exp: "Na analogia de Terzaghi, no instante inicial a mola ainda não deformou: toda a carga está na água, Δu = Δp e Δσ' = 0."
  },
  {
    q: "Uma argila tem LL = 60%. Pela correlação para argila normalmente adensada, Cc vale:",
    opts: ["0,54", "0,45", "0,36", "0,50"],
    a: 1,
    exp: "Cc = 0,009 × (60 − 10) = 0,009 × 50 = 0,45."
  },
  {
    q: "No cálculo de σ'0 para o adensamento, abaixo do nível d'água usamos:",
    opts: ["γ natural", "γ saturado", "γ submerso (γsat − γw)", "γ dos sólidos"],
    a: 2,
    exp: "Com γsub já se desconta a pressão neutra, obtendo diretamente a tensão efetiva."
  },
  {
    q: "Uma argila com 8 m de espessura está entre duas camadas de areia. A altura de drenagem h é:",
    opts: ["8 m", "4 m", "2 m", "16 m"],
    a: 1,
    exp: "Duas faces drenantes → h = H/2 = 4 m. A água do meio caminha no máximo 4 m para sair."
  },
  {
    q: "Se a mesma argila tivesse rocha impermeável embaixo (uma face drenante), o tempo para atingir 50% de adensamento seria:",
    opts: ["O mesmo", "2 vezes maior", "4 vezes maior", "Metade"],
    a: 2,
    exp: "h passa de H/2 para H (dobra). Como t = Tv·h²/Cv, o tempo fica 2² = 4 vezes maior. O recalque total não muda."
  },
  {
    q: "Para U = 50%, o fator tempo Tv vale aproximadamente:",
    opts: ["0,050", "0,197", "0,500", "0,848"],
    a: 1,
    exp: "Tv = (π/4)·0,5² = 0,196 ≈ 0,197. Esse valor é usado no método de Casagrande para obter Cv."
  },
  {
    q: "Uma argila sobreadensada tem σ'0 = 50 kPa e σ'a = 120 kPa. Uma obra leva σ'f a 100 kPa. Qual índice usar?",
    opts: ["Só Cc", "Só Cr", "Cr até σ'a e Cc depois", "Cα"],
    a: 1,
    exp: "Como σ'f = 100 ≤ σ'a = 120, todo o carregamento fica no trecho de recompressão: Δe = Cr·log(100/50)."
  },
  {
    q: "A razão de sobreadensamento (RSA ou OCR) de uma argila normalmente adensada é:",
    opts: ["0", "Menor que 1", "Igual a 1", "Maior que 1"],
    a: 2,
    exp: "Normalmente adensada: σ'a = σ'0, logo RSA = 1. Sobreadensada: RSA > 1."
  },
  {
    q: "Dois pilares a 6 m entre eixos recalcam 12 cm e 8 cm. A distorção angular é:",
    opts: ["1/50", "1/150", "1/300", "1/600"],
    a: 1,
    exp: "ΔHd = 4 cm; Dα = 4/600 = 1/150. Pelos limites de Bjerrum, já indica risco de danos estruturais."
  },
  {
    q: "O que caracteriza a compressão secundária?",
    opts: [
      "Ocorre antes do adensamento primário",
      "Ocorre com dissipação de pressão neutra",
      "Ocorre após o primário, por fluência do esqueleto, sem variação de tensão efetiva",
      "Só ocorre em areias"
    ],
    a: 2,
    exp: "É o rearranjo viscoplástico da estrutura dos grãos depois que a pressão neutra já se dissipou. É desacelerada (cresce com log t) e importante em solos orgânicos."
  },
  {
    q: "Rebaixar permanentemente o nível d'água sobre uma camada de argila provoca:",
    opts: ["Elevação do terreno", "Recalque, pois aumenta a tensão efetiva", "Nada, pois o peso total não muda", "Só recalque imediato"],
    a: 1,
    exp: "O solo acima do novo NA passa de γsub para γ natural: a tensão efetiva na argila aumenta e ela adensa (livro, ex. 9.3)."
  }
];
