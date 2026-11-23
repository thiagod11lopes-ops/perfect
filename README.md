# PERFECT — Desafio Zero ao Topo

Aplicativo web de **desafio de dieta e treino** (28 dias): rotina diária, cartões de hábitos, economia de moedas, minijogos e celebrações ao desbloquear novas semanas.

## Demo online (GitHub Pages)

**Interface celular:** [https://thiagod11lopes-ops.github.io/perfect/celular/](https://thiagod11lopes-ops.github.io/perfect/celular/) (sem barra final também abre o app via fallback SPA)

## Desenvolvimento

O app principal fica em `app/` (React + Vite + TypeScript).

```bash
cd app
npm install
npm run dev
```

Interface celular (layout phone): abra `http://localhost:5173/celular` após `npm run dev`.

Minijogos e builds embed estão nos diretórios irmãos (`workout-vision-main`, `neonophis-main`, `perfect-snake-phone`, `Slotmachine_react-master`); use os scripts `build:*` e `sync:*` do `package.json` do app quando precisar regenerar os bundles em `app/public/games/`.

## Conteúdo do desafio

PDFs e materiais de apoio (dietas, treinos, listas de compras) estão na raiz deste repositório.