/**
 * GALERIA DAS 32 CAPAS (IMPLEMENTACAO20 §21.2 — T1, 01/08/2026).
 *
 * POR QUE EXISTE, e não é zelo a mais: das 24 imagens desenhadas em 31/07, **ONZE
 * precisaram de correção depois de VISTAS** na galeria das imagens — e nenhuma
 * dessas correções teria sido apanhada por teste automático. Uma bola preta sobre
 * fundo preto compila. Uma estrada que o degradê não pinta compila. Duas alças que
 * se leem como orelhas de coelho compilam.
 *
 * Aqui cada capa aparece SOZINHA, com o nome da imagem, **à mesma duração (3,5s) e à
 * mesma velocidade do vídeo real** — senão a galeria mente. Há também uma marca no
 * ecrã no instante 1,2s, que é onde o momento-chave TEM de acontecer (regra 3): se a
 * queda vier depois da marca, essa capa não prende ninguém e tem de ser refeita.
 *
 * BÓNUS — é a rede contra o defeito silencioso: `CoreografiaDaCapa` cai no escorregão
 * para qualquer nome sem coreografia. Se uma imagem nova for acrescentada ao catálogo
 * e esquecida aqui, ela aparece como ESCORREGÃO com o nome errado por baixo.
 *
 * Renderizar:  npm run capas   (ou o workflow "YouTube — Galeria de CAPAS")
 */

import React from 'react';
import { AbsoluteFill, Series, useCurrentFrame } from 'remotion';
import { BRAND, DISPLAY, BODY } from './theme';
import { Background } from './scenes';
import { CoreografiaDaCapa, COREOGRAFIAS } from './capas';
import { PALCO_W, PALCO_H } from './capa';
// A lista vem do CATÁLOGO, não de uma cópia local — é o que faz a galeria responder
// à pergunta certa: "o render sabe desenhar tudo o que o roteirista pode escolher?"
import { METAPHORS } from '../../src/scripts/youtube/lib/schema-short.js';

export const CAPAS_FPS = 30;
/** 105 frames = 3,5s: EXATAMENTE o que a capa dura no vídeo (CAPA_FRAMES_V3). */
export const CAPAS_FRAMES_POR_CAPA = 105;
/** O momento-chave tem de cair aqui ou antes (regra 3: primeiro terço). */
const MARCA_MOMENTO = Math.round(CAPAS_FRAMES_POR_CAPA * 0.34);

// `clique-link` é a mãozinha da chamada e nunca é o fio condutor de um vídeo, logo
// nunca vira capa. Fica de fora de propósito — não é esquecimento.
export const CAPAS_DA_GALERIA: string[] = (METAPHORS as string[]).filter((m) => m !== 'clique-link');
export const CAPAS_TOTAL_FRAMES = CAPAS_DA_GALERIA.length * CAPAS_FRAMES_POR_CAPA;

const Cartao: React.FC<{ nome: string; indice: number; total: number }> = ({ nome, indice, total }) => {
  const frame = useCurrentFrame();
  const registada = !!COREOGRAFIAS[nome];
  const passouOMomento = frame >= MARCA_MOMENTO;
  return (
    <AbsoluteFill>
      <Background />
      {/* a capa, tal e qual sai no vídeo: mesmo palco, mesmo desvio, mesma vida */}
      <div style={{ position: 'absolute', bottom: 120, left: (1080 - PALCO_W) / 2, width: PALCO_W, height: PALCO_H }}>
        <CoreografiaDaCapa metaphor={nome} life={CAPAS_FRAMES_POR_CAPA} />
      </div>

      <div style={{
        position: 'absolute', top: 60, width: '100%', textAlign: 'center',
        fontFamily: BODY, fontSize: 34, fontWeight: 700, color: BRAND.sub, letterSpacing: 2,
      }}>
        {indice + 1} de {total}
      </div>
      <div style={{
        position: 'absolute', top: 124, width: '100%', textAlign: 'center',
        fontFamily: DISPLAY, fontSize: 72, fontWeight: 900, color: registada ? BRAND.text : BRAND.magenta,
      }}>
        {nome}
      </div>
      {!registada && (
        <div style={{
          position: 'absolute', top: 218, width: '100%', textAlign: 'center',
          fontFamily: BODY, fontSize: 36, fontWeight: 800, color: BRAND.magenta,
        }}>
          ⚠ SEM COREOGRAFIA — está a mostrar o escorregão
        </div>
      )}

      {/* A MARCA DO PRIMEIRO TERÇO. Antes de 1,2s a barra está fria; depois acende.
          Se o momento-chave desta capa só acontecer com a barra já acesa, a capa
          está fora da regra 3 e tem de ser refeita — foi assim que a ratoeira
          fechava tarde demais em 31/07. */}
      <div style={{ position: 'absolute', bottom: 62, left: 90, right: 90, height: 12, borderRadius: 6, background: '#2b3242' }}>
        <div style={{
          height: '100%', borderRadius: 6,
          width: `${(frame / CAPAS_FRAMES_POR_CAPA) * 100}%`,
          background: passouOMomento ? BRAND.magenta : BRAND.cyan,
        }} />
        <div style={{ position: 'absolute', left: '34%', top: -14, width: 4, height: 40, background: BRAND.yellow }} />
      </div>
      <div style={{
        position: 'absolute', bottom: 16, width: '100%', textAlign: 'center',
        fontFamily: BODY, fontSize: 26, fontWeight: 600, color: BRAND.sub,
      }}>
        a marca amarela é 1,2s — o momento-chave tem de acontecer ANTES dela
      </div>
    </AbsoluteFill>
  );
};

export const GaleriaCapas: React.FC = () => (
  <Series>
    {CAPAS_DA_GALERIA.map((nome, i) => (
      <Series.Sequence key={nome} durationInFrames={CAPAS_FRAMES_POR_CAPA}>
        <Cartao nome={nome} indice={i} total={CAPAS_DA_GALERIA.length} />
      </Series.Sequence>
    ))}
  </Series>
);
