/**
 * GALERIA DAS IMAGENS DO CANAL (IMPLEMENTACAO20 §20.2, passo B0).
 *
 * POR QUE EXISTE. Até 31/07/2026 não havia forma de VER uma imagem do catálogo sem
 * renderizar um vídeo inteiro — e o histórico mostra que as 9 existentes foram
 * escritas em duas levas e **nunca revistas**. Ou seja: foram ao ar sem ninguém as
 * ter olhado, e no vídeo aparecem por 1 ou 2 segundos (o log de julho regista uma
 * com 0,34s). O dono nunca as viu.
 *
 * Esta composição mostra CADA imagem sozinha, com o nome e o significado, à mesma
 * escala em que aparece no vídeo e à mesma velocidade. É a lição de 31/07 virada
 * ferramenta: **olhe o quadro antes de tocar no código.**
 *
 * BÓNUS — é também a rede contra o defeito silencioso do §20.5: `ShotMetaphor` cai
 * em `bola-neve` para qualquer nome que não saiba desenhar. Se uma imagem nova for
 * acrescentada ao catálogo e esquecida no render, ela aparece aqui como uma BOLA DE
 * NEVE com o nome errado por baixo — impossível não ver.
 *
 * Renderizar:  npm run galeria      (ou o workflow "YouTube — Galeria de imagens")
 */

import React from 'react';
import { AbsoluteFill, Series, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND, DISPLAY, BODY } from './theme';
import { Background, ShotMetaphor } from './scenes';
// A LISTA VEM DO CATÁLOGO, de propósito — não de uma cópia local. A pergunta que
// esta galeria responde é "o render sabe desenhar tudo o que o roteirista pode
// escolher?", e para isso tem de partir do que o roteirista vê.
import { METAPHORS, METAPHOR_MEANINGS } from '../../src/scripts/youtube/lib/schema-short.js';

// Cada imagem fica 2,5s no ecrã — perto do tempo real que tem num Short.
export const GALERIA_FPS = 30;
export const GALERIA_FRAMES_POR_IMAGEM = 75;

/**
 * O TAMANHO TEM DE SER O DO VÍDEO — senão a galeria mente (erro apanhado em 31/07).
 *
 * ⚠️ `entradaFor('metaphor')` em `scenes.tsx` devolve `s: 0.62`, mas isso **não é o
 * tamanho da imagem**: é o tamanho de ENTRADA. `ShotView` faz
 * `interpolate(pop, [0,1], [ent.s, 1])`, ou seja a imagem entra a 0,62 e assenta em
 * **1,0**, com um Ken Burns lento até 1,04. Desenhar a galeria a 0,62 mostrava as
 * imagens ~40% menores do que o público as vê.
 * Aqui repete-se a MESMA mola, com a MESMA configuração, para o que o dono vê nesta
 * galeria ser o que sai no vídeo.
 */
const ESCALA_ENTRADA = 0.62;
const MOLA = { damping: 12, mass: 0.5 };
const KEN_BURNS: [number, number] = [1, 1.04];
const DESFOQUE_ENTRADA = 5;
const DESFOQUE_FRAMES = 5;

// O significado vem do CATÁLOGO (`METAPHOR_MEANINGS`), o mesmo que o prompt do
// roteirista lê. De propósito: se a galeria tivesse a sua própria cópia, ela podia
// mostrar ao dono um significado diferente daquele que o gerador usa — que é o modo
// de falha crónico deste repositório.
const SIGNIFICADO: Record<string, string> = METAPHOR_MEANINGS;

export const GALERIA_TOTAL_FRAMES = METAPHORS.length * GALERIA_FRAMES_POR_IMAGEM;

const Cartao: React.FC<{ nome: string; indice: number; total: number }> = ({ nome, indice, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // entrada suave, só para não piscar entre imagens
  const entrada = interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // a MESMA mola + Ken Burns + desfoque do `ShotView` (ver o comentário acima)
  const mola = spring({ frame, fps, config: MOLA });
  const kb = interpolate(frame, [0, GALERIA_FRAMES_POR_IMAGEM], KEN_BURNS, { extrapolateRight: 'clamp' });
  const escala = interpolate(mola, [0, 1], [ESCALA_ENTRADA, 1]) * kb;
  const desfoque = interpolate(frame, [0, DESFOQUE_FRAMES], [DESFOQUE_ENTRADA, 0], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill style={{ opacity: entrada }}>
        {/* contador */}
        <div style={{
          position: 'absolute', top: 70, width: '100%', textAlign: 'center',
          fontFamily: BODY, fontSize: 34, fontWeight: 700, color: BRAND.sub, letterSpacing: 2,
        }}>
          {indice + 1} de {total}
        </div>

        {/* o nome do catálogo — é este que se escreve no roteiro */}
        <div style={{
          position: 'absolute', top: 140, width: '100%', textAlign: 'center',
          fontFamily: DISPLAY, fontSize: 76, fontWeight: 900, color: BRAND.text,
        }}>
          {nome}
        </div>

        {/* o significado */}
        <div style={{
          position: 'absolute', top: 250, width: '100%', textAlign: 'center',
          fontFamily: BODY, fontSize: 40, fontWeight: 600, color: BRAND.cyan, padding: '0 80px',
        }}>
          {SIGNIFICADO[nome] || '(sem significado registado no catálogo)'}
        </div>

        {/* a imagem, à escala do vídeo */}
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ transform: `scale(${escala})`, transformOrigin: 'center', filter: desfoque > 0.05 ? `blur(${desfoque}px)` : undefined }}>
            <ShotMetaphor metaphor={nome} life={GALERIA_FRAMES_POR_IMAGEM} />
          </div>
        </AbsoluteFill>

        <div style={{
          position: 'absolute', bottom: 90, width: '100%', textAlign: 'center',
          fontFamily: BODY, fontSize: 30, fontWeight: 600, color: BRAND.sub, padding: '0 90px',
        }}>
          mesmo tamanho, mesma entrada e mesma velocidade do vídeo real
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Galeria: React.FC = () => (
  <Series>
    {METAPHORS.map((nome: string, i: number) => (
      <Series.Sequence key={nome} durationInFrames={GALERIA_FRAMES_POR_IMAGEM}>
        <Cartao nome={nome} indice={i} total={METAPHORS.length} />
      </Series.Sequence>
    ))}
  </Series>
);
