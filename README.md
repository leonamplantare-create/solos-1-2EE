# Mecânica dos Solos 2 — estudos para a 2ª EE

Site estático com teoria, exercícios resolvidos passo a passo e calculadoras.

- `index.html` — página inicial com os assuntos
- `recalque.html` — deformação dos solos e recalque
- `assets/exemplos-recalque.js` — exemplos prontos (para adicionar um exemplo fixo, baixe o `.json` na calculadora e cole como novo item da lista)
- `assets/quiz-recalque.js` — perguntas do teste rápido

## Publicar no GitHub Pages

1. Crie um repositório no GitHub (ex.: `solos-2ee`).
2. Envie **o conteúdo desta pasta `site/`** para a raiz do repositório (não envie os PDFs do livro/slides).
3. No repositório: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, pasta `/ (root)`.
4. Em ~1 minuto o site fica em `https://SEU-USUARIO.github.io/solos-2ee/`.

## Compartilhar exemplos

Na calculadora, **Copiar link para compartilhar** coloca o exemplo inteiro dentro do link. Quem abrir vê a calculadora já preenchida e a resolução. **Salvar nos meus exemplos** guarda só no seu navegador.

## Rodar localmente

```
python -m http.server 8765 --directory site
```
