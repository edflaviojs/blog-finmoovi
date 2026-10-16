# O molde novo dos Shorts — motion graphics feitos do zero (sem Remotion)

**Frente aberta em:** 16/10/2026 · **Última atualização:** 16/10/2026 · **Pasta do código:** `youtube-molde/`

## De onde veio

O Ed trouxe o artigo "How to build motion design studio with Opus 5.5" (@0xMovez), o gist do @__morse
(ui-morph-colorful) e 14 vídeos do X. Comparando com os nossos, os nossos tinham os três "proibidos" do artigo:
o mesmo fundo roxo do início ao fim, o texto sempre no meio e cantoneiras nos cantos.
Ordem do Ed: **fazer do zero, sem Remotion, sem HyperFrames, sem skill — "crie da sua maneira natural"**.

Pilotos aprovados pelo Ed (todos em `../PILOTO-MOTION-LUZ/out/`, fora do repositório):
Short da conta de luz v1 e v2, piloto do vídeo longo (38 s, com o boneco), os 4 ritmos de cursor
(MOLDE-1 a MOLDE-4), o piloto de objetos do carro e o Short com os 5 itens (`COMPLETO-5-itens-carro-quebrou.mp4`).

## Como funciona (o essencial para quem chega)

- `plano.mjs` lê o roteiro do robô (`src/scripts/youtube/output/<slug>.script.json`) e a voz que o passo
  `tts-short.js` já produz (`youtube-render/public/audio/<slug>/timing.json`). Põe as cenas em cima das batidas da
  música (`musicas.json`, medido uma vez), escolhe telas do app, objetos, manchetes, cores e o ritmo do cursor.
- `index.html` desenha qualquer instante com `seek(t)` (função pura do tempo). `render.mjs` fotografa com o
  Playwright (60 q/s, 4 subfotos misturadas = rastro de movimento). `mixar.mjs` faz o som (voz + música + efeitos
  criados no código). `legendas.mjs` acerta os `.srt` ao tempo do molde. `conferencia.mjs` mede defeitos.
- `fazer.mjs` faz tudo de uma vez. Sai com erro se não conseguir: é o sinal para o robô usar o Remotion.
- Catálogo: 33 metáforas (`metaforas.js`), 102 objetos (`objetos*.js`), 14 cenários, 8 efeitos, 34 ícones
  (`icones.js`), 40 situações (`situacoes.mjs`), as palavras que chamam objetos com peso (`palavras.mjs`),
  o cenário no fundo (`fundos.js`) e o boneco (`boneco.js`). Galerias: `galeria.html` e `galeria-objetos.html`.

## ✅ MEDIDO (feito e visto a funcionar)

- 3 Shorts publicados refeitos no molde, cada um com um ritmo de cursor; o Ed: "os três ficaram bons!".
- Conferência automática com **prova de controle**: com o vídeo estragado de propósito acusou 75 defeitos;
  com o vídeo bom, aprova.
- Robô de teste `youtube-molde-teste.yml` (só à mão, não publica, voz sem Whisper pago): corridas
  38898112112 (346 s), 38914537838 (444 s), 38916822424 (369 s, com os 5 itens) — todas com conferência OK.
- Legendas: a PT recontada pelas palavras do plano (testado no carro: a 3.ª legenda começa em "mil").
- Rodízio do ritmo: repassa os Shorts publicados e nunca repete o mesmo ritmo 3 vezes seguidas.
- Página blindada: funciona sem metáfora ou sem extrato; camada de tela fora do plano fica escondida.

## ⚠️ ESCRITO, MAS POR MEDIR

- **O passo do molde no robô de verdade** (`youtube-short16-render.yml`, ligado por `vars.MOLDE_NOVO == 'sim'`
  desde 16/10 12:34 UTC). Nunca correu numa produção real. A 1.ª é a de **17/10** (ver `DIVIDA.md` B5).
- As legendas EN/ES esticadas pela régua: só testado com uma cópia da PT; ver no YouTube.
- A capa (`capa-short.js`) continua do Remotion; não foi conferida junto com o vídeo do molde.

## ⏳ POR FAZER (ver `DIVIDA.md` A6)

1. Conferir a 1.ª corrida real (17/10).
2. O vídeo longo no estilo novo (fase 5). O piloto existe em `../PILOTO-MOTION-LUZ/longo/`.
3. O Short de 50 s no molde.
4. Retirar o Remotion dos Shorts de 16s depois de 2 semanas sem falha.
5. Afinar objetos de desenho mais simples.

## 🪤 Armadilhas

- **Esta máquina fica sem memória ao renderizar** (o sistema matou o processo duas vezes a 16/10). Fazer os
  vídeos de prova **na nuvem** (`youtube-molde-teste.yml`), ou localmente com `WORKERS=3`.
- `fs.rmSync` com acento no caminho às vezes não apaga: o render corta com `-frames:v` para não misturar fotos velhas.
- O robô sobe para o YouTube **todos** os `.srt` da pasta da voz: cópias de segurança nunca ficam ali
  (ficam em `youtube-molde/trabalho/<slug>/srt-remotion/`).
- A transcrição erra palavras ("adiar custa" → "de arkusta"): a legenda usa sempre o texto do roteiro.
- O código de som e de batidas do gist do artigo **não tem licença**: foi reescrito; não copiar do gist para cá
  (o repositório é público). As fontes vão com a licença OFL em `youtube-molde/fonts/`.

## ⛔ Decisões fechadas

- Do zero, sem Remotion/HyperFrames/GSAP/skill (Ed).
- 4 ritmos de cursor, escolhidos pelo clima, nunca 3 iguais seguidos (Ed).
- Os Shorts ficam com 17–18 s ("pode deixar nesses segundos", Ed).
- Ícones desenhados por nós, sem emoji ("Pode desenhar!", Ed).
- Os 5 itens completos e 100+ objetos ("25 objetos acho pouco", Ed).
- Nada de imagem ou vídeo gerado por IA paga a cada vídeo.
- A conferência nunca impede o vídeo de sair; o Remotion é o estepe.

## Fora deste repositório

- `../PILOTO-MOTION-LUZ/` — pilotos, vídeos de prova e o plano original (`PLANO-ROBOS-MOTION.md`).
- `../../PROMPT-MOTION-PARA-SITES.md` — o prompt do método para o GoApexi e o Portal das Vagas.
