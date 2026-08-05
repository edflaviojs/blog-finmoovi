/**
 * A CAPA FOTOGRAFIA — a imagem parada que representa o vídeo (IMPL20 §52, 05/08/2026).
 *
 * ═══ POR QUE ESTE FICHEIRO EXISTE ═══
 * Os 11 Shorts publicados **não têm capa nenhuma**. O programa que os envia ao
 * YouTube nunca teve uma linha sobre isso — não é um defeito, é uma peça que nunca
 * foi feita. Resultado: a página do canal é uma grelha de fotogramas apanhados ao
 * calhas, provavelmente a meio de uma animação. (O vídeo LONGO já envia capa; foi
 * daí que se soube que o canal está autorizado a fazê-lo.)
 *
 * ═══ POR QUE NÃO SE PEDIU UMA IMAGEM A UMA IA ═══
 * Porque já existe coisa melhor, paga e parada: **as 32 coreografias** da abertura,
 * com um ator articulado, desenhadas para parar o dedo de quem passa. E porque
 * gerador de imagem nenhum escreve texto legível — e aqui o texto é metade do
 * trabalho. Isto custa zero e sai sempre igual a si próprio.
 *
 * ═══ O INSTANTE ═══
 * Não se escolhe um fotograma qualquer: usa-se **o mesmo instante que o vídeo trata
 * como o momento** (t = 0,34 da abertura — a queda, o susto, o estouro). Está
 * escrito no `Palco` e é ele que manda; se um dia mudar lá, muda aqui também.
 *
 * ═══ UM SÓ FORMATO: EM PÉ (1080×1920) ═══
 * A primeira versão tinha também um formato deitado (1280×720), o que a API do
 * YouTube diz preferir. **Foi deitado fora, e o dono é que reparou:** "não entendi
 * essa capa horizontal, onde vai ser usada?" Tinha razão — não tinha casa nenhuma.
 *   • o vídeo LONGO já tem capa própria (as imagens da Manus);
 *   • e um Short é visto na grelha de Shorts do canal e na pesquisa, que mostram a
 *     miniatura **em pé**.
 * O que decide é o que se perde em cada caso: uma imagem deitada, cortada para caber
 * num sítio vertical, **perde as pontas** — e era exatamente lá que estava o texto.
 * Uma imagem em pé, mostrada num sítio deitado, ganha barras ao lado mas **não perde
 * nada**. Entre perder informação e ganhar barras, escolhe-se as barras.
 *
 * ⚠️ A grelha do perfil do Instagram recorta um QUADRADO ao meio (y 420–1500), por
 * isso o que interessa vive no terço central.
 */

import React from 'react';
import { AbsoluteFill } from 'remotion';
import { BRAND, DISPLAY, BODY, gradientText } from './theme';
import { CoreografiaDaCapa } from './capas';
import { PALCO_W, PALCO_H } from './capa';
import { FinMooviIcon } from './icon';

/** O instante-chave da abertura. É o mesmo valor que o `Palco` usa como `em`. */
export const INSTANTE_CHAVE = 0.34;
/** Quantos fotogramas dura a abertura (3,5s a 30 fps). */
export const VIDA_DA_CAPA = 105;

export type CapaFotoProps = {
  /** Qual das 32 coreografias — vem do `fioCondutor` do roteiro. */
  metaphor?: string | null;
  /** A etiqueta de cima: o assunto, em maiúsculas. */
  tema?: string;
  /** O número. É ele que trava o dedo — quando existe, é o maior elemento do quadro. */
  numero?: string;
  /** A consequência, em linguagem de gente. */
  remate?: string;

};

/**
 * ⚠️ O NÚMERO NUNCA PODE PARTIR-SE AO MEIO — e a primeira versão partia.
 * Renderizada e OLHADA, "R$ 2 MIL" saiu em duas linhas: "R$ 2" em cima e "MIL" em
 * baixo. Um número partido deixa de ser um número; vira duas coisas que ninguém lê.
 *
 * Por isso não se escolhe o corpo da letra por degraus de comprimento (que é
 * adivinhar): mede-se a largura disponível e divide-se.
 *
 * ⚠️ O 0,58 da primeira tentativa foi um palpite e SANGROU — "R$ 2 MIL" saiu com o
 * "R" cortado pela margem esquerda. Medido no quadro renderizado: a 207px de corpo,
 * oito caracteres ocuparam os 1080 do quadro inteiro, ou seja 0,65 por caractere.
 * O valor aqui é 0,70 — o medido mais uma folga, porque um número que sangra é um
 * defeito visível e um número 7% mais pequeno não é defeito nenhum.
 */
const LARGURA_MEDIA_DO_CARACTERE = 0.70;

function corpoDoNumero(texto: string, base: number, largura: number) {
  if (!texto.length) return base;
  return Math.min(base, largura / (texto.length * LARGURA_MEDIA_DO_CARACTERE));
}

const Fundo: React.FC = () => (
  <AbsoluteFill style={{ background: BRAND.bg }}>
    {/* duas manchas de luz — dão profundidade sem competir com o ator */}
    <AbsoluteFill style={{
      background: `radial-gradient(60% 45% at 22% 18%, ${BRAND.violet}33 0%, transparent 70%),
                   radial-gradient(55% 40% at 82% 72%, ${BRAND.cyan}22 0%, transparent 70%)`,
    }} />
  </AbsoluteFill>
);

/** O ator congelado no instante-chave, encaixado numa moldura de tamanho livre. */
const Ação: React.FC<{ metaphor?: string | null; largura: number; altura: number }> = ({ metaphor, largura, altura }) => {
  const escala = Math.min(largura / PALCO_W, altura / PALCO_H);
  return (
    <div style={{ width: largura, height: altura, overflow: 'hidden', position: 'relative' }}>
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: PALCO_W, height: PALCO_H,
        transform: `translate(-50%, -50%) scale(${escala})`,
      }}>
        <CoreografiaDaCapa metaphor={metaphor} life={VIDA_DA_CAPA} />
      </div>
    </div>
  );
};

const Tema: React.FC<{ texto: string; corpo: number }> = ({ texto, corpo }) => (
  <div style={{
    fontFamily: BODY, fontWeight: 900, fontSize: corpo, letterSpacing: corpo * 0.14,
    color: BRAND.cyan, textTransform: 'uppercase',
  }}>{texto}</div>
);

const Numero: React.FC<{ texto: string; corpo: number; largura: number }> = ({ texto, corpo, largura }) => (
  <div style={{
    ...gradientText, fontFamily: DISPLAY, fontWeight: 900,
    fontSize: corpoDoNumero(texto, corpo, largura), lineHeight: 0.95, letterSpacing: -2,
    whiteSpace: 'nowrap',
  }}>{texto}</div>
);

const Remate: React.FC<{ texto: string; corpo: number; largura: number }> = ({ texto, corpo, largura }) => (
  <div style={{
    fontFamily: DISPLAY, fontWeight: 800, fontSize: corpo, lineHeight: 1.12,
    color: BRAND.text, maxWidth: largura,
  }}>{texto}</div>
);

/**
 * A MARCA — o mesmo ícone e a mesma assinatura da marca d'água do vídeo.
 * Vive no RODAPÉ, por baixo do chão do palco: em cima competiria com o número, que
 * é o elemento que trava o dedo. É o único sítio do quadro que está sempre vazio,
 * seja qual for a coreografia das 32.
 */
const Marca: React.FC<{ escala?: number }> = ({ escala = 1 }) => (
  <div style={{
    position: 'absolute', bottom: 70 * escala, width: '100%',
    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 * escala,
  }}>
    <FinMooviIcon size={58 * escala} idSuffix="capa" />
    <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 52 * escala, letterSpacing: -0.5 }}>
      <span style={{ color: BRAND.text }}>Fin</span>
      <span style={gradientText}>Moovi</span>
    </div>
  </div>
);

export const CapaFoto: React.FC<CapaFotoProps> = ({
  metaphor, tema = '', numero = '', remate = '',
}) => {
  // 1080×1920 — texto em cima, ação em baixo.
  // ⚠️ O texto vive no TERÇO CENTRAL de propósito: a grelha do perfil do Instagram
  // corta um quadrado ao meio, e o que estiver colado ao topo desaparece lá.
  return (
    <AbsoluteFill>
      <Fundo />
      <AbsoluteFill style={{ flexDirection: 'column', alignItems: 'center' }}>
        {/* ⚠️ 340 do topo, e não 470: a primeira versão deixava o terço de cima vazio
            e empurrava o ator para o rodapé, pequeno e longe. O quadrado que o
            Instagram recorta (y 420–1500) tem de conter o número E a cabeça do ator. */}
        <div style={{
          marginTop: 340, display: 'flex', flexDirection: 'column', alignItems: 'center',
          textAlign: 'center', gap: 18, paddingLeft: 60, paddingRight: 60,
        }}>
          {tema ? <Tema texto={tema} corpo={38} /> : null}
          {numero ? <Numero texto={numero} corpo={250} largura={960} /> : null}
          {remate ? <Remate texto={remate} corpo={62} largura={900} /> : null}
        </div>
        {/* a ação assenta acima do rodapé, para não pisar a marca */}
        <div style={{ position: 'absolute', bottom: 150, width: '100%', display: 'flex', justifyContent: 'center' }}>
          <Ação metaphor={metaphor} largura={1080} altura={940} />
        </div>
        <Marca />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
