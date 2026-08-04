/**
 * OS SONS DO VÍDEO LONGO (04/08/2026, tarde).
 *
 * ═══ POR QUE ISTO EXISTE ═══
 * O dono viu o vídeo e disse: *"não temos os sons dos efeitos… assim como já fazemos
 * nos shorts. Não precisa ser exagerado, mas precisa ter e isso já temos nos shorts,
 * não podemos deixar pra lá."*
 * Ele tinha razão duas vezes: **temos 18 efeitos guardados** em `public/sfx/` e o vídeo
 * longo usava **zero**. Nem sequer era preciso desenhar nada — a peça que os dispara na
 * palavra certa (`audio/sfx.tsx`) já existe e é partilhada. Nunca foi ligada aqui.
 *
 * ═══ MAS NÃO SE PODE LIGAR A DO SHORT TAL E QUAL, E A RAZÃO É ARITMÉTICA ═══
 * O disparador do Short toca um som sempre que uma palavra-gatilho é dita, e a única
 * regra é *não repetir o MESMO som duas vezes seguidas*. Num Short de 50 segundos e
 * ~130 palavras isso dá meia dúzia de sons. Neste vídeo há **933 palavras** e o assunto
 * é dívida: "conta", "dívida", "cartão", "reais", "mil" e "juros" aparecem dezenas de
 * vezes. Ligado tal e qual, o vídeo levava com uma metralhadora de moedas.
 *
 * Por isso a versão longa acrescenta **três regras de espaçamento**, e nenhuma delas
 * existe no Short (que não precisa delas):
 *   1. no mínimo 3,5 segundos entre dois sons — o ouvido precisa de silêncio para o
 *      som seguinte voltar a ser um acontecimento;
 *   2. no máximo 2 sons por cena;
 *   3. nunca o mesmo som duas vezes seguidas (esta vem do Short).
 * E o volume é mais baixo (0,3 contra 0,5): aqui há seis minutos de narração e a voz
 * manda sempre.
 */

import React from 'react';
import { Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import { iconFor } from '../icons-fx';
import { wordTimingsFromReal, layoutWords } from '../captions';

/** Os seis sons de palavra, iguais aos do Short — mesmo ficheiro, mesmo significado. */
const SOM_DA_PALAVRA: Record<string, string> = {
  money: 'sfx/money.ogg',
  coins: 'sfx/coins.ogg',
  growth: 'sfx/growth.ogg',
  clock: 'sfx/clock.ogg',
  card: 'sfx/card.ogg',
  warning: 'sfx/warning.ogg',
};

const VOLUME_DA_PALAVRA = 0.3;
const INTERVALO_MINIMO_SEC = 3.5;
const MAXIMO_POR_CENA = 2;

export const SonsDaCena: React.FC<{
  narration: string;
  frames: number;
  words?: { word: string; start: number; end: number }[];
}> = ({ narration, frames, words }) => {
  const { fps } = useVideoConfig();
  const timings = words && words.length ? wordTimingsFromReal(words, fps) : layoutWords(narration, frames);
  const intervalo = Math.round(INTERVALO_MINIMO_SEC * fps);

  const disparos: { from: number; som: string }[] = [];
  let ultimoFrame = -Infinity;
  let ultimoSom: string | null = null;
  for (const t of timings) {
    if (disparos.length >= MAXIMO_POR_CENA) break;
    const chave = iconFor(t.word);
    if (!chave) continue;
    const som = SOM_DA_PALAVRA[chave];
    if (!som || som === ultimoSom) continue;
    const from = Math.max(0, Math.round(t.start));
    if (from - ultimoFrame < intervalo) continue;
    ultimoFrame = from;
    ultimoSom = som;
    disparos.push({ from, som });
  }

  return (
    <>
      {disparos.map((d, i) => (
        <Sequence key={i} from={d.from} durationInFrames={Math.round(fps * 2)}>
          <Audio src={staticFile(d.som)} volume={VOLUME_DA_PALAVRA} />
        </Sequence>
      ))}
    </>
  );
};

/**
 * O SOM DE CADA TIPO DE CENA — o que a imagem faz, ouve-se.
 *
 * Isto é o outro metade do pedido dele (*"usarmos os sons sincronizados com relação ao
 * que é dito"*): não é só a palavra que dispara som, é o próprio acontecimento visual.
 * O número que conta leva moedas; cada linha da conta leva um toque; o card do capítulo
 * entra a deslizar e ouve-se deslizar; a mãozinha clica e ouve-se o clique.
 *
 * ⚠️ Cada som tem o seu atraso ALINHADO ao momento em que a coisa acontece no ecrã, e
 * não ao início da cena. É a mesma regra de fonte única que o Short usa no clique
 * (`clickPressOffset`): se o som e o desenho forem calculados em sítios diferentes,
 * mais tarde ou mais cedo deixam de bater certo.
 */
export const SomDoMomento: React.FC<{ ficheiro: string; atraso?: number; volume?: number }> = ({ ficheiro, atraso = 0, volume = 0.35 }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence from={Math.max(0, Math.round(atraso))} durationInFrames={Math.round(fps * 2.5)}>
      <Audio src={staticFile(ficheiro)} volume={volume} />
    </Sequence>
  );
};

export const SOM = {
  moedas: 'sfx/money.ogg',
  pilha: 'sfx/coins.ogg',
  subida: 'sfx/growth.ogg',
  relogio: 'sfx/clock.ogg',
  cartao: 'sfx/card.ogg',
  alerta: 'sfx/warning.ogg',
  estalo: 'sfx/pop.ogg',
  toque: 'sfx/ding.ogg',
  clique: 'sfx/click.ogg',
  deslize: 'sfx/slide.ogg',
  baque: 'sfx/thud.ogg',
  brilho: 'sfx/sparkle.ogg',
  registadora: 'sfx/kaching.ogg',
} as const;
