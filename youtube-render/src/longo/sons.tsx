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
/**
 * 🔴 O RITMO — ordem do dono, 08/08/2026: *"em nenhum instante a tela pode ficar 2,5
 * segundos sem que algo entre, saia, cresça ou reaja"*.
 *
 * Medido no vídeo que foi ao ar: as cenas têm ~11 segundos e **2 entradas cada** —
 * uma a cada 5,5s. Seis das trinta cenas não disparavam ícone nenhum.
 *
 * ⚠️ **MAS NÃO SE ABRE A TORNEIRA TODA**, e a razão está escrita no repositório desde
 * 04/08: o disparador do Short posto tal e qual no longo dava *"uma metralhadora"* —
 * 933 palavras a pedir som. Por isso o teto sobe de 2 para 3 e o intervalo desce de
 * 3,5 para 3,0 segundos: dá uma entrada COM SOM a cada ~3,5s numa cena de 11s, que é
 * quase o dobro do que havia e ainda longe da metralhadora.
 *
 * O resto dos 2,5 segundos é preenchido por movimento SEM som: a cena passou a REAGIR
 * a cada ícone que chega (ver `PULSO_DA_REACCAO` em `Long.tsx`) — que é a outra regra
 * do dono, *"quando algo chega, algo tem que reagir; movimento sem consequência é
 * enfeite"*.
 */
const INTERVALO_MINIMO_SEC = 3.0;
const MAXIMO_POR_CENA = 3;

export type Disparo = { from: number; chave: string; som: string; palavra: string };

/**
 * ⚠️ OS DISPAROS SÃO CALCULADOS AQUI, UMA VEZ, E SERVEM O SOM **E** O ÍCONE.
 *
 * O dono pediu: *"quando há muito texto… aqui deveria, quando se falar, aparecer um
 * ícone relacionado JUNTO COM O SOM"*. A palavra "junto" é a especificação inteira: se
 * o ícone escolher os seus momentos e o som escolher os dele, mais tarde ou mais cedo
 * aparece um ícone sem som e ouve-se um som sem ícone. É a mesma regra de fonte única
 * que o Short já usa no clique da mãozinha.
 */
export function disparosDaCena(timings: { word: string; start: number }[], fps: number): Disparo[] {
  const intervalo = Math.round(INTERVALO_MINIMO_SEC * fps);
  const disparos: Disparo[] = [];
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
    disparos.push({ from, chave, som, palavra: t.word });
  }
  return disparos;
}

/**
 * ⚠️ **FONTE ÚNICA DOS MOMENTOS DA CENA.** Três sítios precisam dos mesmos fotogramas:
 * o som (`SonsDaCena`), o ícone (`IconesDaCena`) e, desde 08/08, a REACÇÃO da imagem
 * (`CenaLonga`, em `Long.tsx`). Se cada um fizer a sua conta, mais tarde ou mais cedo
 * a imagem reage num fotograma e o som toca noutro — é a regra que este ficheiro já
 * tinha para o par som+ícone, agora com um terceiro cliente.
 */
export function momentosDaCena(
  narration: string,
  frames: number,
  words: { word: string; start: number; end: number }[] | undefined,
  fps: number,
): Disparo[] {
  const timings = words && words.length ? wordTimingsFromReal(words, fps) : layoutWords(narration, frames);
  return disparosDaCena(timings, fps);
}

export const SonsDaCena: React.FC<{
  narration: string;
  frames: number;
  words?: { word: string; start: number; end: number }[];
}> = ({ narration, frames, words }) => {
  const { fps } = useVideoConfig();
  const disparos = momentosDaCena(narration, frames, words, fps);

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

/**
 * 🔴 O `deslize` SAIU DA TRANSIÇÃO DO CAPÍTULO — e é o conserto de uma queixa dele.
 *
 * *"Sempre que tem a transição para a cena com o passo 1 ainda dá um errinho no som.
 * Ele meio que pica e ou reinicia, mas há um ruído nessas transições."*
 *
 * Fui medir e **não há estalo nenhum**: o maior salto entre amostras à volta dos três
 * cartões é ~290 em 32768, contra **3381** numa transição de cena normal — ou seja, doze
 * vezes MENOR do que numa transição que ele nunca reparou.
 *
 * O que havia era o próprio som que eu lá pus. Fui ler o catálogo e está escrito com
 * todas as letras no `audio/sfx.tsx`: **`slide` é um "apito descendo cómico"**. Um apito
 * de desenho animado por cima da música limpa, no momento mais sério do vídeo — não é um
 * ruído, é um som errado, e a diferença só se vê a ler o que o ficheiro é.
 * Ficou o `subida` (o whoosh), que é o que uma passagem de capítulo pede.
 */
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
  /**
   * ⚠️ QUATRO SONS PAGOS ESTAVAM INALCANÇÁVEIS NO VÍDEO LONGO — `public/sfx/` tem 17
   * ficheiros e esta lista expunha 13. Ficavam de fora `boom`, `avalanche`, `keyboard`
   * e `typewriter`. O `boom` faz falta desde já: é a pancada do soco de abertura, que
   * até 08/08 não existia (o longo abria com um clarão branco e SILÊNCIO — um flash
   * sem pancada). Os outros três entram porque custa zero e a próxima pessoa que
   * procurar um som de desmoronamento vai encontrá-lo em vez de o mandar gerar.
   */
  baque_forte: 'sfx/boom.ogg',
  desmoronar: 'sfx/avalanche.ogg',
  teclado: 'sfx/keyboard.ogg',
  maquina_de_escrever: 'sfx/typewriter.ogg',
} as const;
