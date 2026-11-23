# CLAUDE.md — Neon Ophis (NEON OPHIS)

> **Project name:** `NEON OPHIS` — *Ophis* (ὄφις) is "snake" in ancient Greek.
> A name that holds the Snake DNA without using the over-saturated English word.
> **Project codename:** `NEON_OPHIS_64`
> **Inspiração técnica:** *Mapping the Commodore 64* (COMPUTE! Publications) — toda decisão de arquitetura abaixo é traduzida de princípios reais do hardware C64 (VIC-II, SID, CIA) para web moderna.
> **Filosofia:** "Faça parecer um arcade dos anos 80 sonhando em 4K." Cada pixel deve dar dopamina.

---

## 1. VISÃO DO PRODUTO

Um Snake **moderno, neon, caótico e absurdamente satisfatório**. A sensação alvo é a colisão entre:

- A nostalgia crocante de um cartucho de C64 ligado numa TV CRT.
- O polimento indie de um *Downwell* / *Vampire Survivors* / *Balatro*.
- O caos colorido de um cartoon de sábado de manhã.
- O loop dopaminérgico de um slot-machine bem feito (juice em cada ação).

Se em qualquer momento o jogo parecer "limpo e profissional mas sem alma" — está errado. Se parecer "maluco mas amador" — também está errado. O alvo é **profissional E energético**.

---

## 2. STACK TÉCNICA (decisão fechada)

- **Linguagem:** TypeScript (strict mode obrigatório).
- **Renderização:** `<canvas>` 2D principal + um `<canvas>` secundário em camada para o background animado (separação de buffers, ver §6).
- **Áudio:** Web Audio API pura (sem libs). Síntese procedural inspirada no SID — ver §9.
- **Build:** Vite. Zero dependências runtime obrigatórias além do que está em `<script>`.
- **Sem framework.** Nada de React/Vue/Svelte. Um arcade não precisa de DOM diffing.
- **Estrutura:** módulos ES separados por sistema (engine, input, audio, render, fx, gameplay, ui).

---

## 3. PRINCÍPIO ARQUITETURAL CENTRAL — "O LOOP DO RASTER"

> 📖 **Do livro (p. 147–149, Raster Compare IRQ):** O VIC-II do C64 dispara uma interrupção exata quando o feixe de raster atinge uma scanline específica. Isso permite mudar registradores no meio do frame, criando efeitos como split-screen, cores diferentes por banda, e movimento de sprite sem flicker.
> 📖 *"Sprites should always be moved when the raster is scanning offscreen, because if they are moved while they are being scanned, their shapes waver slightly."* — p. 137

**Tradução para web:**

O game loop **separa rigorosamente** três fases por frame, exatamente como o C64 separava trabalho do CPU em "raster onscreen" vs "raster offscreen":

```
requestAnimationFrame:
  ├── PHASE 1: INPUT POLL        (lê buffer de input bufferizado — §5)
  ├── PHASE 2: SIMULATE (fixed)  (lógica de jogo a 60 ticks/s, com accumulator)
  └── PHASE 3: RENDER (variable) (interpola entre estados, desenha tudo)
```

Regras invioláveis:

1. **Nunca mutar estado de jogo durante render.** É o equivalente moderno de mover um sprite enquanto o raster está desenhando ele — causa "wavering" visual e bugs de colisão.
2. **Tick lógico fixo a 60Hz** com `accumulator += dt` clássico (Glenn Fiedler "Fix Your Timestep"). Velocidade do snake é desacoplada do framerate via `moveInterval` em ticks, não em ms.
3. **Render sempre interpola** entre `previousState` e `currentState` usando `alpha = accumulator / fixedDt`. A cabeça da cobra desliza suavemente entre células — não pula em saltos discretos como o Snake do Nokia 3310.

---

## 4. ARQUITETURA DE MÓDULOS

```
src/
├── main.ts                  # Bootstrap, monta canvas, inicia loop
├── engine/
│   ├── loop.ts              # Fixed timestep + interpolation
│   ├── state.ts             # Game state machine (MENU, PLAYING, PAUSED, GAMEOVER)
│   └── rng.ts               # Xorshift seeded RNG (§8)
├── input/
│   ├── keyboard.ts          # Buffer de inputs (§5)
│   └── touch.ts             # Swipe gestures para mobile
├── gameplay/
│   ├── snake.ts             # Lógica da cobra (deque de segmentos)
│   ├── food.ts              # Spawning, tipos, power-ups
│   ├── collision.ts         # Detecção (§10)
│   ├── combo.ts             # Sistema de combos e multiplicador
│   ├── modes.ts             # Classic, Chaos, TimeAttack, Relax
│   └── powerups.ts          # Sistema modular de power-ups (§11)
├── render/
│   ├── renderer.ts          # Pipeline de desenho em camadas
│   ├── background.ts        # Canvas secundário com waves animadas
│   ├── snakeRenderer.ts     # Olhos, expressões, gradientes, trail
│   ├── foodRenderer.ts      # Comida cartoon com bounce
│   └── ui.ts                # HUD, score, combo flutuante
├── fx/
│   ├── particles.ts         # Sistema de partículas (pool de objetos)
│   ├── screenshake.ts       # Trauma-based shake (§12)
│   ├── glow.ts              # Bloom barato via composite operations
│   └── flash.ts             # Flashes de tela em eventos especiais
├── audio/
│   ├── synth.ts             # Sintetizador estilo SID (§9)
│   ├── sfx.ts               # Biblioteca de efeitos
│   └── music.ts             # Trilha que escala intensidade com score
└── ui/
    ├── menu.ts              # Menus animados
    └── gameover.ts          # Tela de fim com stats
```

Cada módulo expõe uma interface mínima. Comunicação entre sistemas é via um **event bus** simples (publish/subscribe), não via referências cruzadas. Isso é o equivalente moderno do bus de interrupts do C64 — sistemas não se conhecem, só reagem a sinais.

---

## 5. INPUT — "DEBOUNCE COMO O KERNEL FAZIA"

> 📖 **Do livro (p. 36–37, location 197 LSTX e 198 NDX):** O C64 mantinha um **buffer de teclado** de 10 caracteres. A interrupção de keyscan rodava 60×/s e fazia debounce comparando a tecla atual com a anterior. Sem isso, segurar uma tecla geraria centenas de eventos por segundo.

**Tradução:** Em Snake, o pior bug do mundo é o jogador apertar ←→ rapidamente e a cobra fazer 180° na própria espinha. Solução:

1. Ler input com `keydown` (não `keypress`).
2. Empurrar a direção desejada num **buffer pequeno (FIFO de tamanho 2)**.
3. A cada **tick lógico** (não a cada frame), consumir uma entrada do buffer e validar:
   - A nova direção não pode ser oposta à direção atual da cobra.
   - Se for inválida, descarta e tenta a próxima.
4. Buffer de tamanho 2 permite ao jogador "pré-digitar" um movimento em curva fechada — feel de Tetris moderno.

Comparação direta: o C64 tinha buffer de 10 (via location 631 `$277`). Nosso buffer é menor porque jogadores humanos não digitam com a velocidade de 60Hz do scan, e buffer grande em Snake gera sensação de "input lag".

```ts
// input/keyboard.ts (esqueleto)
const buffer: Direction[] = [];
const MAX_BUFFER = 2;

function pushInput(dir: Direction) {
  if (buffer.length >= MAX_BUFFER) return;
  // Não adiciona se for igual ao último item do buffer
  if (buffer[buffer.length - 1] === dir) return;
  buffer.push(dir);
}

// Chamado pelo tick lógico
export function consumeNextDirection(currentDir: Direction): Direction {
  while (buffer.length > 0) {
    const next = buffer.shift()!;
    if (!isOpposite(next, currentDir)) return next;
  }
  return currentDir;
}
```

**Mobile:** swipe detection com threshold de 24px e timeout de 300ms. WASD + Setas + Swipe — todos alimentam o mesmo buffer.

---

## 6. RENDERING — "CAMADAS COMO O VIC-II"

> 📖 **Do livro (p. 152, location 53275 SPBGPR):** O C64 tinha um Sprite-to-Foreground Priority Register que decidia, bit a bit, se cada sprite ficava na frente ou atrás dos gráficos de fundo. Isso permitia "3D effects" sem hardware 3D.

**Tradução — pipeline de render em 5 camadas, desenhadas nesta ordem (de trás para frente):**

```
LAYER 0: BG ANIMADO    → canvas separado, atualizado a 30Hz (waves, gradientes, partículas lentas)
LAYER 1: GRID          → linhas neon sutis pulsando levemente
LAYER 2: FOOD          → comida com bounce (lerp + sin())
LAYER 3: SNAKE BODY    → segmentos com gradiente + glow
LAYER 4: SNAKE HEAD    → olhos, expressão, sempre por cima
LAYER 5: PARTICLES + FX → partículas, screenshake aplicado aqui
LAYER 6: UI            → score, combo, HUD (acima de tudo)
```

**Truques de performance:**

- Background renderiza num **canvas offscreen** atualizado a metade do framerate (30Hz). É copiado para o canvas principal via `drawImage()` a 60Hz. Background é caro; gameplay precisa ser barato.
- Glow neon: **não usar `shadowBlur`** (caro). Usar uma técnica de duas passadas:
  1. Desenhar a forma com `globalCompositeOperation = 'lighter'` em cor saturada e tamanho um pouco maior.
  2. Desenhar a forma "core" por cima, normal.
- Para o **trail rainbow** da cobra: manter um array circular dos últimos 30 pontos da cabeça com seu hue. Renderizar como linha gradient.

**Tipografia:** fonte arcade neon. Em uso atualmente: **Rubik Iso** (display 3D
isométrico para títulos / headings) + **Bitcount Grid Double** (pixel-grid
bitmap para HUD / body), ambas SIL OFL via Google Fonts, embarcadas via
`@font-face` em **base64 inline** para zero FOUT. Re-gerar via
`scripts/build-fonts.sh`.

---

## 7. ASSETS GRÁFICOS — "PIPELINE COM IMAGEMAGICK"

> 📖 **Do livro (p. 124–125, 199–201, sprite shape data):** No C64, criar um sprite era trabalho de matriz: 24 dots por 21 linhas, organizados em 63 bytes. Cada bit era um pixel. *"Your original characters may be created by darkening squares on an 8 by 8 grid, converting all darkened squares to their bit values, and then adding the bit values for each of the eight bytes. Or, you may use one of the many character graphics editor programs that are available commercially to generate the data interactively by drawing on the screen."*
>
> Ou seja: já em 1984 o livro reconhecia dois caminhos — **fazer na mão** (lento, controlado) ou **usar uma ferramenta** (rápido, automatizável). O conselho moderno é o mesmo.

### 7.1 Filosofia: programmatic-first

A maior parte dos visuais deste jogo é **gerada em runtime via Canvas** (cobra, comida, partículas, glow). É o caminho preferido porque:

- Zero bytes de asset no bundle.
- Cores e formas escalam livremente com tema (ex: skin "GOLD" só muda HSL).
- Animação procedural é trivial.

**Mas** algumas coisas pedem assets pré-renderizados:

- **Favicon** (`.ico`, `.png` 16/32/48/192/512).
- **Splash / OG image** para compartilhamento (1200×630).
- **Manifest icons** para PWA / "Add to Home Screen".
- **Texturas de fundo** complexas demais para gerar em runtime (ex: padrão de scanlines CRT, ruído estático sutil).
- **Sprites de chapéus/acessórios** desbloqueáveis (cowboy hat, coroa, óculos) — desenhar à mão em SVG é mais rápido que codar Canvas paths para cada um.
- **Screenshots de marketing** para README.

### 7.2 Ferramenta padrão: **ImageMagick**

ImageMagick está disponível neste ambiente (`convert`, `magick`). Use-o como ferramenta de pipeline para todos os assets pré-renderizados. Razões:

1. **Determinístico:** mesmo comando, mesmo output. Reprodutível em qualquer máquina.
2. **Versionável:** os comandos `convert ...` ficam num script `scripts/build-assets.sh`. O *processo* de criar o asset entra no Git, não só o asset final.
3. **Compositável:** combinar SVG + filtros + overlays numa única pipeline.
4. **Sem GUI necessária:** funciona em CI/CD, em headless, em qualquer lugar.

### 7.3 Receitas prontas para o projeto

Crie `scripts/build-assets.sh` com receitas como estas:

**Favicon multi-resolução a partir de um SVG mestre:**

```bash
# Master: assets/src/icon.svg (cobra neon estilizada, 512×512)
for size in 16 32 48 192 512; do
  convert -background none -density 300 \
          assets/src/icon.svg \
          -resize ${size}x${size} \
          assets/icon-${size}.png
done

# Combinar em .ico multi-resolução
convert assets/icon-16.png assets/icon-32.png assets/icon-48.png \
        assets/favicon.ico
```

**OG image / splash 1200×630 com glow neon:**

```bash
convert -size 1200x630 \
        gradient:'#0a0420-#1a0840' \
        \( assets/src/snake-logo.svg -resize 800x \
           -channel A -blur 0x12 +channel \) \
        -compose screen -composite \
        \( assets/src/snake-logo.svg -resize 800x \) \
        -compose over -composite \
        -font "Press-Start-2P" -fill '#ff00ff' -pointsize 48 \
        -gravity south -annotate +0+60 'NEON OPHIS' \
        assets/og-image.png
```

**Textura de scanlines CRT (tile pequeno, repetido em CSS):**

```bash
# 4×4 tile com uma linha escura — vira pattern via CSS background-repeat
convert -size 4x4 xc:transparent \
        -fill 'rgba(0,0,0,0.15)' \
        -draw 'line 0,0 4,0' \
        assets/scanline-tile.png
```

**Ruído estático sutil para o background:**

```bash
convert -size 256x256 xc: +noise Random \
        -channel RGBA -separate -threshold 50% -negate \
        -evaluate multiply 0.04 \
        assets/noise-tile.png
```

**Spritesheet de chapéus a partir de SVGs individuais:**

```bash
# assets/src/hats/*.svg → assets/sprites/hats.png (atlas horizontal)
montage assets/src/hats/*.svg \
        -tile x1 -geometry 64x64+0+0 \
        -background none \
        assets/sprites/hats.png

# Gerar JSON com offsets para o renderer consumir
ls assets/src/hats/*.svg | awk -v w=64 '
  BEGIN { print "{"; first=1 }
  { name=$0; sub(/.*\//,"",name); sub(/\.svg$/,"",name);
    if (!first) print ",";
    printf "  \"%s\": { \"x\": %d, \"y\": 0, \"w\": %d, \"h\": %d }",
           name, NR-1, w*(NR-1), w, w;
    first=0 }
  END { print "\n}" }
' > assets/sprites/hats.json
```

### 7.4 Otimização final — **sempre rode**

Depois de gerar PNG, passe por compressão lossless. ImageMagick sozinho não é o melhor compressor; combine com `pngquant` ou `oxipng` se disponíveis. Exemplo de fallback puro ImageMagick:

```bash
# Strip de metadata + recompressão máxima
convert assets/og-image.png \
        -strip -define png:compression-level=9 \
        -define png:compression-filter=5 \
        assets/og-image.png
```

Para texturas onde lossy serve, use WebP:

```bash
convert assets/noise-tile.png -quality 85 assets/noise-tile.webp
```

### 7.5 Regras invioláveis

- **Nunca commite PNG sem o SVG/script-fonte.** Se não dá pra regenerar do zero, virou dívida técnica.
- **Toda receita vai em `scripts/build-assets.sh`.** Rodar `npm run assets` regenera tudo.
- **PNGs ficam em `assets/` (output).** SVGs e fontes ficam em `assets/src/` (input).
- **`assets/src/`** entra no Git. **`assets/`** *também* entra (para builds reprodutíveis sem ImageMagick instalado).
- **Limite total de assets pré-renderizados: 50KB** combinados. Se passar disso, a regra do "programmatic-first" foi violada — refatore para Canvas.

### 7.6 Quando NÃO usar ImageMagick

- **Cobra, comida, partículas, glow, trail:** sempre Canvas em runtime. Sem exceção.
- **Animações de UI:** CSS + Canvas. Nunca GIFs.
- **Ícones simples (play, pause, X):** SVG inline no HTML, não PNG via ImageMagick.

ImageMagick é para **assets estáticos de borda** (favicon, OG image, texturas) — não para gameplay.

---

## 8. RANDOMNESS — "O OSCILADOR 3 DO SID"

> 📖 **Do livro (p. 168–169, location 54299 RANDOM):** O C64 gerava aleatoriedade lendo os 8 bits superiores do oscilador 3 do SID configurado em modo noise. Era determinístico em hardware mas imprevisível para o jogador.

**Tradução:** Use um **PRNG seedável (xorshift32)**, não `Math.random()`. Razões:

1. **Replays e debugging:** mesma seed → mesma partida.
2. **Daily challenge:** seed = data atual → todos jogam o mesmo nível.
3. **Reprodutibilidade de bugs:** se um bug aparece, o jogador manda a seed e você reproduz.

```ts
// engine/rng.ts
let state = 0;
export function seed(s: number) { state = s | 0 || 1; }
export function rand(): number {
  state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
  return ((state >>> 0) / 0xFFFFFFFF);
}
export function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}
```

---

## 9. ÁUDIO — "SÍNTESE COMO O SID"

> 📖 **Do livro (p. 158–167, SID Registers $D400-$D41C):** O SID tinha 3 vozes, cada uma com:
> - 4 waveforms (triangle, sawtooth, pulse, noise)
> - Envelope ADSR (attack/decay/sustain/release)
> - Pulse-width modulation
> - Ring modulation, hard sync, filtros (low/band/high-pass)
>
> *"Bit 7 of Oscillator 3 disconnects audio output, allowing oscillator to modulate other voices."* — p. 167

**Filosofia:** **NÃO use samples WAV/MP3.** Use Web Audio API para sintetizar tudo proceduralmente, replicando o sabor SID. Vantagens:

- Bundle minúsculo (sem assets de áudio).
- Variação infinita (toda vez que come, frequência sobe um pouco — comer 10 maçãs em sequência soa como uma escala subindo).
- Fidelidade ao espírito arcade.

**Mapeamento de SFX para "vozes" sintéticas:**

| Evento          | Waveform     | ADSR (ms)       | Frequência            | Notas                                |
|-----------------|--------------|------------------|-----------------------|--------------------------------------|
| Eat (crunch)    | square+noise | A:5  D:80 S:0 R:50 | 440Hz + slide up      | Pitch sobe a cada combo             |
| Combo level up  | triangle     | A:10 D:200 S:0.3 R:300 | arpejo C-E-G-C    | 4 notas em 80ms, ring mod nas 2 últimas |
| Power-up grab   | sawtooth     | A:50 D:500 S:0.4 R:400 | sweep 200→2000Hz   | Filtro low-pass abrindo             |
| Game over       | pulse+noise  | A:0  D:1500 S:0 R:500 | sweep 800→50Hz     | Pitch desce + noise overlay         |
| Speed boost     | sawtooth     | A:10 D:30 S:0.7 R:100 | 880Hz triplo      | 3 disparos em rápida sucessão       |
| Wall bonk       | noise         | A:0  D:80 S:0 R:30 | —                     | Pulse de noise + screenshake        |

**Música:** uma melodia procedural baseada em escala pentatônica (impossível soar errada). Tempo aumenta com o score:

```
score < 50    → 100 BPM
score 50–150  → 120 BPM
score 150–300 → 140 BPM
score > 300   → 160 BPM, adiciona segunda voz, adiciona kick (noise+envelope)
```

**Camada extra — tier por combo (sobreposto ao score):**

```
combo < 5    → Tier 0  (calmo, pentatônica pura, 4/4)
combo 5–9    → Tier 1  (+15 BPM, snare backbeat 2/4, microtonal ±15¢,
                        acentos cromáticos ocasionais — tensão crescente)
combo ≥ 10   → Tier 2  (+25 BPM, time-sig 7/8, blast-beat kick em 8ths,
                        baixo frenético com saltos de oitava, hat constante,
                        microtonal ±35¢, cluster dissonante root+tritono+9ª
                        menor no compasso — vibe Primus / Igorrr)
```

**Power-ups também tocam na trilha:**

```
🔥 Fire ativo    → +20 BPM, tier +1, drone grave (sub-bass square no bar 0)
❄️ Ice ativo     → −25 BPM, tier −1, bell shimmer (triangle agudo + 5ª no bar 0)
🧲 Magnet ativo  → suspende a melodia procedural; entra uma **fanfarra
                   marcial original** — melodia épica em sawtooth duplo
                   (unison ±8¢) + quinta aberta, com bateria militar cheia:
                   timbal/bombo grave em cada nota, snare a cada 8ths, pratos
                   crash nos beats 1 e 3. Uma nota por semínima. Recomeça do
                   início a cada nova ativação do ímã.
```

Fire e ice são aditivos com a tier de combo — podem se cancelar em BPM/tier
mas as texturas (drone + bell) tocam juntas se ambos estiverem ativos
(esperado em Chaos mode). A tier de combo *empilha em cima* do BPM derivado
do score; o BPM final = score-tier + combo-bonus + fire/ice. O ímã
substitui a melodia mas mantém a base rítmica — em tier 2 com magnet ativo,
o hino imperial flutua sobre blast-beat 7/8 com clusters dissonantes, vibe
"Igorrr regendo Tchaikovsky". Quando o combo decai abaixo do threshold ou
o power-up expira, o efeito cai imediatamente — feedback direto ao
jogador. Ver `audio/music.ts` para a implementação.

**Implementação:** uma classe `Synth` com método `play(preset, freq)`. Cada preset é uma config de osciladores + envelopes. Toque tudo via `OscillatorNode + GainNode` com `setValueAtTime` para envelopes precisos.

> **Atualização (2026-05-15) — música é orientada a dados.** Toda
> constante / probabilidade / padrão de bateria / ADSR / ganho que antes
> era hardcoded em `audio/music.ts` agora vive como dado puro tipado em
> `audio/musicConfig.ts` (`MusicConfig` / `DEFAULT_MUSIC_CONFIG`).
> `music.ts` virou um **interpretador puro** desse config; helpers puros
> (`computeBpm` / `computeIntensity` / `computeComboTier`) são a única
> fonte de verdade compartilhada entre o motor e o lab. O default é
> **bit-idêntico** ao som pré-refator. O jogo prefere
> `musicConfig.override.json` no boot (config autorado no Audio Lab) e
> cai no default se ausente. A autoria/tuning ao vivo é feita no
> **Audio Lab dev-only — ver §22**. Ver `DECISION_LOG.md` (2026-05-15).

---

## 10. COLISÃO — "PRECISA, NÃO POR PIXEL"

> 📖 **Do livro (p. 154, locations 53278-53279):** Os Sprite Collision Registers do C64 detectavam colisão por **bit overlap**, não bounding box. Mas o livro adverte: *"It is quite possible to have three sprites lined up in a row [...] the register would show that all three are involved. The only way to make absolutely certain which collided with which is to check the position of each sprite."*

**Lição:** detecção rápida ≠ detecção correta. Para Snake, use **detecção lógica em grid**, não geométrica:

1. O mundo é um grid (padrão: 32×24 células de 24px = 768×576).
2. A cobra é uma `Deque<{x, y}>` em coordenadas de grid.
3. A cabeça avança 1 célula por tick lógico.
4. Antes de aplicar movimento:
   - **Wall:** `newHead.x < 0 || newHead.x >= GRID_W || newHead.y < 0 || newHead.y >= GRID_H`
   - **Self:** loop pelos segmentos do corpo (exceto cauda, que vai sair). `O(n)` é fine — nunca passará de 200 células.
   - **Food:** comparação direta com posição da comida.
5. **Visualmente** a cabeça é renderizada interpolada entre `prev` e `next` cell — então o jogador vê movimento contínuo, mas a colisão é discreta.

**Por que grid e não pixel-perfect:** previsibilidade. O jogador precisa saber exatamente onde vai morrer. Pixel-perfect em Snake = unfair. Isso é uma lição do livro: *"The only way to make absolutely certain [...] is to check the position."* Em Snake moderno, a posição autoritativa é o grid lógico, não os pixels renderizados.

**Performance:** spatial hash não é necessário. Snake é small-scale.

---

## 11. POWER-UPS — "REGISTRADORES MODULARES"

> 📖 **Do livro:** Cada chip do C64 (VIC-II, SID, CIA) era um conjunto de **registradores** acessíveis por endereço. Cada registrador fazia uma coisa, e efeitos complexos vinham de combinar registradores.

**Tradução:** cada power-up é uma **classe que implementa uma interface** `PowerUp`:

```ts
interface PowerUp {
  id: string;
  duration: number;          // ms; 0 = instantâneo
  onActivate(state: GameState): void;
  onTick(state: GameState, dt: number): void;
  onExpire(state: GameState): void;
  renderOverlay?(ctx: CanvasRenderingContext2D, alpha: number): void;
}
```

Power-ups especificados:

| Nome           | Visual            | Efeito                                        | Duração |
|----------------|-------------------|-----------------------------------------------|---------|
| 🌈 Rainbow     | comida iridescente | invencibilidade (passa por paredes e por si) | 5s      |
| ❄️ Ice         | cubo brilhante     | tempo dos inimigos/timer a 50%                | 4s      |
| 🔥 Fire        | chama animada     | velocidade ×1.5, pontos ×2                    | 6s      |
| 🧲 Magnet      | íman pulsante     | comida num raio de 4 células flutua para cabeça | 5s    |

Power-ups **podem se combinar**. Ex: Fire + Ice = velocidade alta mas timer congelado = combo OP. Não tente impedir combinações; deixe o caos rolar (é Chaos Mode, afinal).

**Gerenciador:** um `PowerUpManager` mantém uma lista de power-ups ativos. A cada tick chama `onTick` de todos. Quando expira, chama `onExpire`. Visualmente, um HUD mostra ícones com timer radial.

---

## 12. JUICE & FEEDBACK — "TUDO TREME, TUDO PISCA"

> 📖 **Do livro (p. 152, sprite priority + p. 137, raster blanking):** O hardware C64 não tinha "screen shake" embutido. Programadores faziam isso modificando os registradores de scroll fino ($D011, $D016) durante a vertical blank. Cada efeito visual era trabalho manual.

**Filosofia "Juice it or lose it":** todo evento dá feedback em **3 sentidos** (visão, audição, "tato" via screen shake):

| Evento         | Visual                                | Áudio          | Shake     |
|----------------|---------------------------------------|----------------|-----------|
| Eat normal     | flash branco 50ms na comida + 8 partículas + texto "+10" flutuante | crunch (§9) | shake 2px |
| Eat power-up   | flash colorido fullscreen 80ms + 30 partículas + zoom 1.05 (100ms) | sweep         | shake 6px |
| Combo +1       | texto "COMBO ×N" pulsando             | arpejo subindo | —         |
| Game over      | freeze 200ms → fade vermelho → shake forte | sweep grave   | shake 20px |
| Speed up tick  | borda da tela pulsa neon              | nota curta     | —         |

**Screen shake — "trauma based"** (técnica de Squirrel Eiserloh, GDC 2013):

```ts
let trauma = 0; // 0..1
function addTrauma(amount: number) { trauma = Math.min(1, trauma + amount); }

function applyShake(ctx: CanvasRenderingContext2D) {
  const shake = trauma * trauma; // poder² para suavizar
  const dx = (rand() * 2 - 1) * shake * MAX_SHAKE_PX;
  const dy = (rand() * 2 - 1) * shake * MAX_SHAKE_PX;
  ctx.translate(dx, dy);
  trauma = Math.max(0, trauma - dt * 1.5); // decay
}
```

**Partículas — pool de objetos:** pré-aloque 500 partículas no startup. Nunca dê `new` durante gameplay (GC = stutter). Use um free-list.

---

## 13. EXPRESSÕES DA COBRA

A cobra tem **olhos enormes** desenhados em código (canvas paths, não sprites):

- **Idle:** olhos arredondados, pupila preta, leve blink a cada 3-5s.
- **Comendo:** olhos fecham por 100ms (^_^), boca abre.
- **Combo alto:** olhos viram estrelas (✦) e mudam de cor com o combo.
- **Power-up Fire ativo:** sobrancelhas franzidas, olhos vermelhos.
- **Power-up Ice ativo:** olhos azul-claro com brilho.
- **Quase morrendo (parede próxima):** pupilas dilatam, viram diagonalmente para o perigo.
- **Game over:** XX nos olhos, língua de fora.

Implementar como **state machine de expressão**, separada do estado de jogo. Atualizada a cada tick mas sem afetar lógica.

---

## 14. MODOS DE JOGO

| Modo         | Regras                                                                 |
|--------------|------------------------------------------------------------------------|
| **Classic**  | Snake clássico. Velocidade aumenta a cada 5 comidas. Morre em parede e em si. |
| **Chaos**    | Power-ups spawnam 3× mais. Eventos aleatórios a cada 15s (disco mode, paredes movem, food multiplica, etc). |
| **TimeAttack** | 60 segundos. Maior score possível. Não morre em parede (atravessa). |
| **Relax**    | Sem morte. Foco em explorar visuals. Música mais calma. Ideal para mostrar pra alguém. |

Cada modo é uma classe que implementa interface `GameMode` com hooks `onTick`, `shouldEndGame`, `getDifficultyMultiplier`.

---

## 15. HIGH SCORES & PERSISTÊNCIA

Top 5 por modo. Cada entrada: `{ score, playerName, date, modeSeed, durationS, applesEaten }`.
O jogador digita o nome (até 8 chars, estilo arcade) na tela de game over ao bater recorde.

### Arquitetura dual-endpoint

```
import.meta.env.DEV  →  /__api/scores      (Vite dev-server middleware)
produção             →  __api/scores        (URL relativa → Apache proxy → scores-server.js)
```

**Dev (`npm run dev`):** plugin `highscoreServer()` em `vite.config.ts` intercepta
`/__api/scores` GET/POST e lê/grava `highscores.json` na raiz do projeto.

**Produção (VPS + Apache):**
- `public/.htaccess` (copiado para `dist/` pelo Vite) faz proxy do path relativo:
  ```
  RewriteEngine On
  RewriteRule ^__api/(.*)$ http://127.0.0.1:3001/$1 [P,L]
  ```
- `scores-server.js` na raiz do projeto — deployar na VPS e rodar com PM2:
  ```bash
  pm2 start scores-server.js --name neonophis-scores
  pm2 save && pm2 startup
  ```
- Grava `highscores.json` ao lado de si mesmo. **Nunca é apagado por rebuild** —
  fica fora do `dist/`, sobrevive a qualquer redeploy.

**Fallback:** se o endpoint não responder (hosting estático puro), cai para
`localStorage` com as mesmas chaves `neonophis:hi:{mode}`.

### Arquivos-chave
- `src/storage/highscores.ts` — cache em memória + `initHighScores()` + `saveScore()`
- `src/ui/gameover.ts` — UI de entrada do nome (slots arcade com cursor piscante)
- `vite.config.ts` → `highscoreServer()` — endpoint de dev
- `scores-server.js` — servidor de produção (Node.js puro, sem dependências)
- `public/.htaccess` — proxy Apache para o servidor de scores

---

## 16. RESPONSIVIDADE

- Canvas usa `resizeObserver`. Tamanho lógico do grid é fixo (32×24 células). Tamanho de cada célula em pixels = `Math.floor(min(viewportW/32, viewportH/24))`.
- Em mobile (`pointer: coarse`): **swipe dirige a cobra** (sem D-pad na
  tela — decisão do usuário, ver nota abaixo). Uma camada de controle DOM
  cobre tudo que o swipe não expressa: tap no modo (menu), pílulas de
  pause/sair, modal QUIT? SIM/NÃO, JOGAR DE NOVO/MENU, e um `<input>` real
  (teclado nativo) para o nome no hi-score.
- Em desktop: esconde controles touch (teclado/setas/WASD inalterados).
- Mínimo suportado: 360×640. Máximo útil: ~1920×1080 (acima disso, o canvas centraliza com letterbox).

> **Atualização (2026-05-16) — camada de touch isolada.** A intenção
> original ("mostra controles touch + swipe") evoluiu: a direção é **só
> por swipe** (o D-pad na tela foi construído e removido — redundante e
> obstruía o campo). Todo o resto do toque vive em
> `src/input/touchControls.ts`, dentro de `#touch-overlay`, que é
> `display:none` exceto sob `@media (pointer: coarse)` — esse media query
> é o **único gate** que mantém a camada fora do desktop, que fica
> byte-a-byte idêntico. Os botões não têm lógica de jogo: reusam as
> mesmas flags `commands` do teclado via `injectCommand`
> (`input/keyboard.ts`); o tap no menu usa a geometria do próprio render
> (`MENU_ORDER`/`menuHitTest` em `ui/menu.ts`). `main.ts` integra com um
> `initTouchControls(...)` + um `syncTouchControls(...)` por frame. O
> campo em retrato segue pequeno/centralizado (grid fixo 32×24, 4:3) —
> questão aberta em `HANDOFF.md`. Bug correlato corrigido: `background.ts`
> desenha em espaço CSS (antes encolhia para ~2/3 em telas DPR 3). Ver
> `DECISION_LOG.md` (2026-05-16) e `HANDOFF.md`.

> **Atualização (2026-05-17) — splash só avança pelo botão JOGAR no mobile.**
> O listener `pointerdown` no `stage` que avançava da splash para o menu em
> qualquer toque foi restrito a `e.pointerType !== 'touch'` — no desktop,
> clicar em qualquer lugar continua funcionando; no mobile, apenas o botão
> JOGAR (`onSplashStart` → `goToMenu()`) avança. Sem alteração na camada DOM
> ou no `#touch-overlay` — a mudança é de uma linha em `main.ts`.

> **Atualização (2026-05-17) — créditos com scrub de toque.** O roll
> automático dos créditos (`speed = 50px/s`, puramente baseado em `timeMs`)
> ganhou um offset manual aditivo no mobile: arrastar o dedo para **baixo**
> recua o conteúdo, arrastar para **cima** adianta. Implementação:
> - `renderCredits` aceita `scrollOffsetPx = 0` (default preserva desktop
>   byte-a-byte). Cálculo: `((timeMs/1000 * speed + scrollOffsetPx) % cycle + cycle) % cycle` —
>   o `+ cycle` garante módulo correto com valores negativos (rewind além do início).
> - Três listeners `touchstart/touchmove/touchend` adicionados ao
>   `#touch-overlay` em `main.ts`, ativos apenas quando `screen === 'CREDITS'`.
>   O delta Y acumulado é subtraído do offset a cada `touchmove` (delta positivo
>   = dedo desce = rewind; negativo = dedo sobe = fast-forward).
> - `creditsScrollOffset` é zerado toda vez que os créditos são abertos (tanto
>   pelo Enter no desktop quanto pelo botão mobile), garantindo início limpo.
> - O botão VOLTAR em `tc-creditsback` chama `stopPropagation()` no
>   `touchstart`, então toque no botão nunca aciona o scrub.
> - O auto-scroll continua correndo enquanto o dedo está na tela — o offset é
>   aditivo, não pausa o tempo. Soltar o dedo retoma do ponto exato.

---

## 17. EASTER EGGS (deixe para o final)

- Konami code (↑↑↓↓←→←→BA) → ativa **disco mode** permanente.
- Digite "snek" → cobra ganha um chapéu de cowboy.
- Score exato 256 → flash com mensagem "ROM OVERFLOW $0100" (referência ao livro).
- Score exato 1337 → cobra fica verde Matrix com chuva de chars.
- Comer 13 power-ups numa run → desbloqueia skin "GOLD".

---

## 18. PERFORMANCE — METAS RIGOROSAS

- **60 FPS estável** num laptop de 2018 (Intel UHD 620).
- Frame budget: 16.6ms. Alvo de uso: <8ms para folga.
- **Zero allocations no hot path.** Use object pools para particles, vetores reutilizáveis para math.
- `console.log` proibido em produção (use um `logger.debug` que é stripped no build).
- Bundle final < 100KB gzipped. Sem assets externos.

**Tooling:** rode com Performance tab do DevTools. Se `Animation Frame` aparecer vermelho, achou um bug.

---

## 19. ROADMAP DE IMPLEMENTAÇÃO

Implementar nesta ordem. **Não pule etapas.** Cada uma deve estar redonda antes da próxima.

1. **Loop fixo 60Hz + render interpolado.** Cobra preta num grid branco. Sem nada mais.
2. **Input bufferizado** (teclado). Validar com 180° impossível.
3. **Comida + crescimento + colisão + game over.** Snake jogável feio.
4. **Renderer neon:** gradientes, glow barato, fonte arcade.
5. **Sintetizador SID-like** + 3 SFX básicos (eat, gameover, move opcional).
6. **Partículas + screen shake.** Aqui já vira "ah, é divertido".
7. **Combos + multiplier + texto flutuante.**
8. **Background animado** em camada separada.
9. **Olhos expressivos da cobra.**
10. **Power-ups (um por vez):** Rainbow → Fire → Ice → Magnet.
11. **Música procedural** com escalas dinâmicas.
12. **Modos:** Classic já existe; adicione Chaos, TimeAttack, Relax.
13. **Menus animados + tela de game over com stats.**
14. **High scores localStorage.**
15. **Mobile:** swipe + responsive.
16. **Skins desbloqueáveis + chapéus.** Aqui entra o pipeline ImageMagick (§7): `scripts/build-assets.sh` para favicon, OG image e spritesheet de chapéus. Antes desta etapa, use um favicon temporário.
17. **Easter eggs.**
18. **Polish pass:** cada animação revisada, cada som revisado.

---

## 20. CRITÉRIOS DE "PRONTO"

O projeto está pronto quando:

- [ ] Roda 60 FPS sólido em hardware modesto.
- [ ] Funciona em Chrome, Firefox, Safari (desktop e mobile).
- [ ] Um amigo joga e ri pelo menos uma vez nos primeiros 30 segundos.
- [ ] Um amigo joga e diz "só mais uma" pelo menos 3 vezes.
- [ ] Bundle < 100KB gzipped.
- [ ] Zero erros no console em produção.
- [ ] Modo Relax é genuinamente relaxante, não chato.
- [ ] Modo Chaos é genuinamente caótico, não confuso.
- [ ] A tela de game over dá vontade de jogar de novo, não de fechar a aba.

---

## 21. PRINCÍPIOS NORTEADORES — TATUAR NA TESTA

1. **Game feel > features.** Um snake com 4 power-ups e screen shake perfeito é melhor que 20 power-ups sem juice.
2. **Determinismo é dignidade.** Mesma seed, mesma partida. Sempre.
3. **Aloque uma vez, use sempre.** GC durante gameplay é falha de design.
4. **Cada som tem motivo.** Cada partícula tem motivo. Cada flash tem motivo. Sem ruído visual gratuito.
5. **O C64 fez magia com 64KB e 1MHz.** Você tem GB e GHz. Seja envergonhadamente generoso com efeitos, MAS sem perder frame.
6. **Se ficar em dúvida entre limpo e divertido — escolha divertido.** Mas **divertido também precisa rodar a 60fps**.

---

## 22. AUDIO LAB — FERRAMENTA INTERNA DEV-ONLY

> Adicionado em 2026-05-15. É **tooling de desenvolvimento**, não uma
> feature do jogo e não um passo do roadmap §19. Existe para autorar,
> visualizar, depurar e afinar a trilha procedural (§9). Híbrido
> interno entre Chrome Music Lab / Tone.js Playground / mini-DAW /
> console de debug de áudio, seguindo as convenções do projeto (sem
> framework, DOM + canvas, TypeScript strict).

**Regra inviolável: o Audio Lab NUNCA entra em produção.** Isolamento
em três camadas independentes — qualquer uma sozinha já basta:

1. **Build:** o único input de `vite build` é `index.html`. `lab.html`
   fica na raiz; o dev-server o serve automaticamente, mas o build de
   produção não o lista como input → nunca é compilado nem copiado
   para `dist/`.
2. **Plugin:** `neonophis-dev-only-lab` (`apply:'build'`,
   `enforce:'pre'` em `vite.config.ts`) estoura o build se qualquer id
   contendo `/src/lab/` ou `/lab.html` entrar no grafo de produção —
   falha alto em vez de vazar em silêncio.
3. **Runtime:** `src/lab/main.ts` lança erro em `!import.meta.env.DEV`
   antes de qualquer efeito colateral — guarda de último recurso.

A persistência é um **endpoint do dev-server** (`labConfigSaver`,
`apply:'serve'` — não existe em `vite build`):
`POST /__lab/save-music-config` grava `src/audio/musicConfig.override.json`.
Esse JSON é o **único artefato do lab que cruza para produção** — e
intencionalmente, porque é *dado de jogo* sob `src/audio/`, lido pelo
próprio `import.meta.glob` do jogo em `musicConfig.ts`, não código do
lab.

**Arquitetura (`src/lab/`):** dashboard com lista de tracks (esquerda),
editores no centro (step-grid de kick/snare/hat, piano-roll de baixo,
editores de cluster / texturas fire-ice / magnet / globais / melodia),
preview ao vivo ligado ao **motor real** `music.ts` via `preview.ts`
(reusa o `AudioContext` singleton de `synth.ts` — nunca cria um
segundo), visualizadores oscilloscope + FFT via `AnalyserNode`
(`viz/visualizers.ts`), e painel de JSON gerado. Estado central em
`state.ts` (store minimalista subscribe/notify, sem reatividade
automática). Tracks marcadas `editor: 'placeholder'` em `tracks.ts`
são vagas a preencher — `tracks.ts` é a fonte de verdade do que está
editável.

**Higiene Web Audio (crítico — §18):** um único `AudioContext`
reusado; nós desconectados ao destruir; `requestAnimationFrame` dos
visualizadores cancelado no cleanup; subscribers retornam função de
unsubscribe. Sem nós órfãos, sem analyzers zumbis, sem loops de render
duplicados.

> Para detalhes da decisão e da verificação de exclusão do bundle, ver
> `DECISION_LOG.md` (entradas de 2026-05-15) e `HANDOFF.md`.

---

## 23. INTERNACIONALIZAÇÃO (i18n) — PT / EN

> Adicionado em 2026-05-17. O jogo nasceu com strings cravadas no código
> (mistura de PT e EN). Agora **toda string visível ao jogador** passa por
> uma tabela i18n. Decisão fechada: **PT + EN, extensível a novas línguas
> sem tocar em código.**

**Dados, não código.** Cada idioma é um JSON puro em
`src/i18n/locales/<code>.json`, descoberto via `import.meta.glob` — o mesmo
padrão de `audio/musicConfig.ts` (§9). Largar um `es.json` ao lado de
`en.json`/`pt.json` torna o espanhol selecionável **sem nenhuma mudança de
código**. `src/i18n/index.ts` é o interpretador; `t(key, params?)` é o
único ponto de consumo. Chave ausente cai para `en` e, por fim, para a
própria chave (nunca quebra a tela).

**Resolução de idioma:** escolha salva (`localStorage`, chave
`neonophis:lang` — mesmo prefixo dos hi-scores) → `navigator.language`
(`pt*` → PT) → `en`. Trocar idioma reescreve `<html lang>`,
`document.title` e a meta description, e dispara `onLangChange` para o DOM
(o canvas relê sozinho a cada frame; o DOM não).

**Hot path (§18).** `t()` sem `params` retorna a referência da string já
parseada do JSON — zero alocação. O render canvas chama `t()` por frame
sem custo. Strings interpoladas (`COMBO ×N`) já alocavam antes do i18n —
sem regressão.

**Toggle = bandeiras, sem teclado** (decisão do usuário). Vive na **splash
e no menu**. Desktop: bandeiras desenhadas no canvas
(`ui/langToggle.ts`, uma única função de geometria compartilhada por
render e hit-test — mesmo princípio de `menuHitTest`, §16) + clique no
canvas. Mobile: pílulas DOM dentro de `#touch-overlay`, o mesmo split
desktop-canvas / mobile-DOM do §16 (o toggle de canvas dá no-op sob
`pointer: coarse`). As bandeiras são **desenhadas proceduralmente** —
emoji de bandeira degrada para par de letras no Windows Chrome/Firefox e
é instável em `<canvas>`, o que quebraria o critério cross-plataforma do
§20.

**Regra inviolável — a marca fica em inglês.** `tagline`
("AN ARCADE THAT DREAMS IN 4K"), a meta description e o nome do produto
("NEON OPHIS") permanecem em **inglês em todos os locales** — são
identidade de marca, não UI. Um valor igual ao inglês no `pt.json` é
**intencional**; não "corrigir" como tradução faltante. Traduz-se
gameplay, HUD, menus, game over e o texto narrativo dos créditos; a voz
da marca, não.

> Ver `DECISION_LOG.md` (2026-05-17 — Internacionalização) e `HANDOFF.md`.

---

## 24. PWA / OFFLINE — "O CARTUCHO QUE RODA SEM A REDE"

> Adicionado em 2026-05-18. O jogo já é um app offline disfarçado (bundle
> minúsculo, zero assets externos, áudio/gráficos procedurais, fontes
> inline). Agora é **instalável** e joga **100% offline após uma única
> visita online**. Decisão fechada: **service worker hand-rolled (zero
> deps, §2), cache-first em runtime, `display: fullscreen`.**

**Três peças, todas em `public/` (copiadas verbatim para `dist/`):**

- `public/manifest.webmanifest` — `display: "fullscreen"` (+
  `display_override` → `standalone`); `start_url`/`scope`/`id` relativos
  (funciona sob sub-path tipo `/neonophis/`); `theme_color #0a0420`,
  `background_color #05030f`. `name`/`description` ficam **em inglês** —
  marca, a regra inviolável do §23 vale aqui também.
- `public/sw.js` — interpretador de cache, ~95 linhas vanilla:
  - `__api/*` → **network-only**, nunca cacheado. O ranking segue
    autoritativo; offline, `storage/highscores.ts` cai sozinho no
    `localStorage` (§15). **Nunca cachear a API.**
  - navegação (HTML) → **network-first** com timeout, fallback ao shell
    cacheado. Redeploy é pego na próxima vez que o jogador estiver online
    — **sem bump de versão para updates de conteúdo**.
  - `/assets/*` → **cache-first**. Vite faz content-hash → imutável;
    build novo emite nomes novos, entradas velhas só ficam órfãs.
  - resto (ícones, manifest) → cache-first.
  - Gap fechado: o bundle hasheado é pedido no primeiro load *antes* de o
    SW controlar a página, então o `install` busca o `index.html`, raspa
    as URLs hasheadas injetadas pelo Vite e as pré-cacheia — offline real
    após **uma** visita online, sem plugin de build.
- `public/icons/*` — gerados por `scripts/build-assets.sh` (§7); ver a
  ressalva ao §7.5 abaixo.

**Regra inviolável — o SW NUNCA roda em dev.** O registro em `main.ts` é
guardado por `if (import.meta.env.DEV) return;` antes de qualquer efeito
— mesma disciplina do §22. Um SW no dev-server do Vite envenena HMR e o
Audio Lab. Esse guard é a única coisa que mantém o SW fora do dev; não
enfraquecer.

**Propagação de update (a dúvida clássica de PWA).** Auto-instala sem
ação do jogador via: SW versionado + `skipWaiting()` + `clients.claim()`
(novo SW assume na hora) + navegação network-first (HTML novo no
reconnect) + `sw.js` servido **sem cache HTTP longo** no Apache (passo de
ops manual, documentado no `HANDOFF.md`). O `VERSION` em `sw.js` só sobe
quando a *lógica* do SW muda (o `activate` limpa caches antigos); updates
de conteúdo não precisam de bump.

**Ressalva ao §7.5.** O §7.5 manda PNG em `assets/`. Os ícones PWA vão em
`public/icons/` (→ `dist/icons/`) porque o manifest precisa de URL
servida estável — e o §7.1 já lista "Manifest icons para PWA" como asset
pré-renderizado legítimo. O SVG-mestre (`assets/src/icon.svg`) + o script
seguem no Git → regenerável, o espírito da regra (nunca PNG órfão) é
mantido. Total: ~32 KB (orçamento §7.5: 50 KB). Nota técnica: este
ambiente não tem rasterizador de SVG com gradiente, então
`build-assets.sh` reproduz o ícone via ops vetoriais nativas do
ImageMagick (MVG), não rasterizando o SVG — determinístico, IM puro
(§7.2).

> Ver `DECISION_LOG.md` (2026-05-18 — PWA / offline) e `HANDOFF.md`.

---

> **Última nota:** este documento é o blueprint. Quando implementar, crie um `PROGRESS.md` separado para tracking. Mantenha este `CLAUDE.md` como verdade do projeto — atualize-o se uma decisão mudar, não invente fatos novos em cima.
>
> *"There are a few simple rules concerning what does or does not cause a collision."* — *Mapping the C64*, p. 154. As regras são simples. A magia está em segui-las direitinho.
