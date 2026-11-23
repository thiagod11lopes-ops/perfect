// Entry point do Audio Lab — DEV-ONLY.
//
// Camadas de proteção contra vazamento para produção:
//  1) BUILD   — vite.config.ts não inclui lab.html como input em `vite build`,
//               então o módulo nunca é compilado para o bundle final.
//  2) PLUGIN  — neonophis-dev-only-lab (em vite.config.ts) é um plugin com
//               `apply: 'build'` que aborta o build se algum arquivo de
//               src/lab/ for puxado pelo grafo de produção.
//  3) RUNTIME — o guard abaixo (`import.meta.env.DEV`) garante que, mesmo
//               num cenário improvável onde o módulo escape para produção
//               (servidor mal configurado, bundle externo, etc.), ele
//               aborta sem efeitos colaterais.

if (!import.meta.env.DEV) {
  throw new Error('[neonophis-lab] Audio Lab tentou rodar fora de modo dev.');
}

import './styles.css';
import { buildLayout } from './ui/layout';
import { mountEditor } from './ui/editor';
import { mountOutputPanel } from './ui/outputPanel';
import { mountPreviewPanel } from './ui/previewPanel';
import { mountPropertiesPanel } from './ui/properties';
import { mountTrackList } from './ui/trackList';
import { mountVisualizers } from './viz/visualizers';
// Importa preview.ts pelo side-effect de registrar o subscriber que sincroniza
// state → motor de música. Sem isso, mudanças nos inputs não chegariam ao
// engine.
import './preview';

const root = document.getElementById('lab-root');
if (!root) {
  throw new Error('[neonophis-lab] #lab-root não encontrado em lab.html');
}

const regions = buildLayout(root);
mountTrackList(regions.left);
mountEditor(regions.editor);
mountPreviewPanel(regions.center);
mountVisualizers(regions.viz);
mountPropertiesPanel(regions.right);
mountOutputPanel(regions.bottom);

console.info('[neonophis-lab] dashboard montada — tracks, editor, preview, viz, propriedades e output prontos.');
