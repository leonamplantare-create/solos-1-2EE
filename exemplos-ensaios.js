// Exercícios prontos de envoltórias de resistência (UU, CU, CD e cisalhamento direto).
// modo "identificar": o aluno vê o gráfico e diz tipo, parâmetros, nível de tensão, equação, c e φ.
// modo "desenhar": o aluno recebe tipo + parâmetros e traça a envoltória.
// tg = tgφ (UU: 0). s3 = tensões confinantes dos círculos (opcional). sig = σ dos pontos do cisalhamento direto (opcional).
window.EXEMPLOS_ENSAIOS = [
  { id: "sala-1", origem: "Exemplo de sala", titulo: "Sala — Gráfico 1", modo: "identificar", tipo: "UU", c: 3, tg: 0, s3: [0, 2, 4] },
  { id: "sala-2", origem: "Exemplo de sala", titulo: "Sala — Gráfico 2", modo: "identificar", tipo: "DIRETO", c: 0, tg: 1, sig: [2, 4, 6, 8] },
  { id: "sala-3", origem: "Exemplo de sala", titulo: "Sala — Gráfico 3", modo: "identificar", tipo: "CU", c: 3, tg: 1 / 3, s3: [0, 1, 2] },
  { id: "sala-4", origem: "Exemplo de sala", titulo: "Sala — Gráfico 4", modo: "identificar", tipo: "CD", c: 1, tg: 2 / 3, s3: [0, 0.8, 1.6] },
  { id: "prova-1", origem: "Prova 2024.2 — 1º quesito", titulo: "Prova — Cisalhamento direto: C = 2 e φ = arctg 0,50", modo: "desenhar", tipo: "DIRETO", c: 2, tg: 0.5 },
  { id: "prova-2", origem: "Prova 2024.2 — 1º quesito", titulo: "Prova — Triaxial UU: Cu = 2", modo: "desenhar", tipo: "UU", c: 2, tg: 0 },
  { id: "prova-3", origem: "Prova 2024.2 — 1º quesito", titulo: "Prova — Triaxial CD: φ = arctg 0,3333", modo: "desenhar", tipo: "CD", c: 0, tg: 1 / 3 },
  { id: "prova-4", origem: "Prova 2024.2 — 1º quesito", titulo: "Prova — Triaxial CU: C = 1 e φ = arctg 0,25", modo: "desenhar", tipo: "CU", c: 1, tg: 0.25 },
  // 2º Exercício Escolar 2024.2 (versão "2.0"): valores lidos da foto, aproximados
  { id: "prova2-1", origem: "Prova 2024.2 (2.0) — leitura da foto", titulo: "Prova 2.0 — Gráfico 1", modo: "identificar", tipo: "CD", c: 1, tg: 0.75, s3: [0, 0.6, 1.4] },
  { id: "prova2-2", origem: "Prova 2024.2 (2.0) — leitura da foto", titulo: "Prova 2.0 — Gráfico 2", modo: "identificar", tipo: "CU", c: 2, tg: 0.2, s3: [0, 1.5, 3] },
  { id: "prova2-3", origem: "Prova 2024.2 (2.0) — leitura da foto", titulo: "Prova 2.0 — Gráfico 3", modo: "identificar", tipo: "DIRETO", c: 0, tg: 0.75, sig: [2, 4, 6, 8] },
  { id: "prova2-4", origem: "Prova 2024.2 (2.0) — leitura da foto", titulo: "Prova 2.0 — Gráfico 4", modo: "identificar", tipo: "UU", c: 2, tg: 0, s3: [0, 2, 4] },
  // Círculo de Mohr (2º quesito). kind "mohr": s3 e s1 em kPa; alpha = ângulo do plano E com o plano principal maior
  { kind: "mohr", letras: true, id: "prova2-mohr", origem: "Prova 2024.2 (2.0) — 2º quesito", titulo: "Prova 2.0 — Indique os pontos A a E no círculo de Mohr", s3: 2, s1: 14, alpha: 30 },
  { kind: "mohr", id: "prova-mohr", origem: "Prova 2024.2 — 2º quesito (leitura da foto)", titulo: "Prova — Círculo de Mohr de 3 a 17 kPa", s3: 3, s1: 17, alpha: 30 }
];
