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
import { fitText } from '@remotion/layout-utils';

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
  /** A etiqueta do canto superior direito — a promessa. Vazia = não aparece. */
  etiqueta?: string;
  /** 'largo' = miniatura do YouTube (1280×720); 'vertical' = capa do Reel (1080×1920). */
  formato?: 'vertical' | 'largo';
};

/**
 * ⚠️ O NÚMERO NUNCA PODE PARTIR-SE AO MEIO NEM SANGRAR PARA FORA — e as duas coisas
 * aconteceram, uma a seguir à outra, porque eu estava a ADIVINHAR a largura do texto.
 *
 * A história, para não se repetir:
 *   1ª tentativa — corpo escolhido por degraus de comprimento: "R$ 2 MIL" partiu-se
 *      em duas linhas ("R$ 2" / "MIL"). Um número partido deixa de ser um número.
 *   2ª — proibido partir e o corpo calculado a 0,58 por caractere: o "R" ficou
 *      cortado pela margem esquerda.
 *   3ª — subi para 0,70, medido no quadro renderizado. "R$ 2 MIL" passou a caber…
 *      e "R$ 500/MÊS" sangrou à mesma. E tinha de sangrar: **não existe uma largura
 *      média**. Um "1" e um "M" não medem o mesmo, e uma palavra cheia de maiúsculas
 *      largas não mede como uma cheia de algarismos.
 *
 * A 4ª tentativa não adivinha: `fitText` **mede o texto de verdade** com a fonte
 * verdadeira e devolve o corpo que cabe. É a peça oficial do Remotion para isto.
 * Três tentativas a afinar um número inventado valeram menos do que uma medição.
 */
function corpoDoNumero(texto: string, base: number, largura: number) {
  if (!texto.length) return base;
  const medido = fitText({
    text: texto,
    withinWidth: largura,
    fontFamily: DISPLAY,
    fontWeight: 900,
    letterSpacing: '-2px',
  });
  return Math.min(base, medido.fontSize);
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
 * ⚠️ A FAIXA DE CIMA — E NUNCA O RODAPÉ. Correção do dono (05/08): a primeira
 * versão punha a marca em baixo, e ele apanhou o erro:
 *   *"o correto seria ficar no topo e não no rodapé… rodapé tem muita informação
 *   e pode ficar coberto"*.
 * Tem razão, e é literal: o Instagram escreve o nome do perfil e a legenda POR CIMA
 * do rodapé do Reel, e o YouTube carimba lá a duração e as visualizações. Uma marca
 * no rodapé é uma marca que às vezes não existe.
 *
 * O preço, dito por inteiro: a grelha do perfil do Instagram recorta um quadrado ao
 * meio (y 420–1500) e **a faixa de cima fica fora dele**. Trocou-se "às vezes tapada
 * em todo o lado" por "inteira no sítio que importa, ausente na grelha" — e a grelha
 * é o único sítio onde a marca já é óbvia, porque o perfil é dele.
 *
 * A ETIQUETA vive no canto oposto: é uma promessa ("7 Dias Grátis"), não é decoração,
 * e um canto superior é onde o olho vai a seguir ao número.
 */
const FAIXA_DE_CIMA = 96;

const Marca: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <FinMooviIcon size={58} idSuffix="capa" />
    <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 52, letterSpacing: -0.5 }}>
      <span style={{ color: BRAND.text }}>Fin</span>
      <span style={gradientText}>Moovi</span>
    </div>
  </div>
);

/**
 * ⚠️ A ETIQUETA É A ÚNICA COISA DO QUADRO QUE **NÃO** USA AS CORES DA MARCA.
 * Ordem do dono (05/08): *"tem que ser mais destacada pra chamar a atenção mesmo…
 * tipo usar um vermelho com amarelo, algo assim bem disruptivo"*.
 *
 * E o raciocínio dele está certo por uma razão técnica: a paleta da casa é
 * ciano→violeta→magenta, e o número gigante já a usa toda. Uma etiqueta feita das
 * MESMAS cores derrete no resto do quadro — foi exatamente o que aconteceu na
 * primeira versão. Vermelho e amarelo não existem em mais lado nenhum da capa, e é
 * por isso que o olho vai lá: não é por serem berrantes, é por serem **as únicas**.
 *
 * O ligeiro torto é de propósito: um autocolante colado à mão lê-se como um carimbo,
 * e um carimbo lê-se antes do texto.
 */
const VERMELHO = '#ff1f3d';
const LARANJA = '#ff7a00';

/**
 * A MÃOZINHA A CARREGAR NA ETIQUETA — pedido do dono (05/08).
 *
 * ⚠️ **É O MESMO DESENHO** da mão que já carrega no "Comenta FINMOOVI" dentro do
 * vídeo (`MetaClickLink`, no scenes.tsx): o mesmo caminho SVG, o mesmo contorno em
 * degradê, o mesmo miolo escuro. Desenhar outra mão daria duas mãos diferentes na
 * mesma marca — e ninguém saberia dizer porquê, mas ficaria errado.
 *
 * O que muda: aqui ela está PARADA, no instante do toque. No vídeo a mão viaja numa
 * curva e mergulha; numa fotografia não há viagem, há só o momento — por isso o anel
 * do clique já está aberto e a mão já está pousada.
 */
const MaoQueCarrega: React.FC = () => (
  /**
   * ⚠️ A MÃO TOCA NO CANTO, NUNCA NO MEIO. Na primeira tentativa ela ficou por cima
   * da etiqueta e tapou metade da palavra: lia-se "APP GRÁT". Uma mão que esconde
   * aquilo em que está a carregar é pior do que mão nenhuma.
   * A ponta do dedo assenta na aresta direita, perto do fundo; o corpo da mão cresce
   * para fora do carimbo, onde não há nada para tapar.
   */
  <svg width={190} height={210} style={{ position: 'absolute', right: -120, bottom: -150, overflow: 'visible' }}>
    <defs>
      <linearGradient id="capa-mao-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={BRAND.yellow} />
        <stop offset="100%" stopColor={LARANJA} />
      </linearGradient>
    </defs>
    {/* o anel do clique, aberto: é o que diz "isto acabou de ser tocado" */}
    <circle cx={76} cy={25} r={34} fill="none" stroke={BRAND.yellow} strokeWidth={6} opacity={0.5} />
    <circle cx={76} cy={25} r={56} fill="none" stroke={BRAND.yellow} strokeWidth={4} opacity={0.2} />
    <g transform="translate(28 12) scale(1.6)">
      <path
        d="M24 6 a8 8 0 0 1 16 0 v34 l12 3 a12 12 0 0 1 9 11 v14 a16 16 0 0 1 -16 16 h-18 a16 16 0 0 1 -13 -7 l-14 -20 a7 7 0 0 1 10 -9 l6 6 v-58 a8 8 0 0 1 8 -8 Z"
        fill={BRAND.panel} stroke="url(#capa-mao-g)" strokeWidth={5} strokeLinejoin="round" strokeLinecap="round"
      />
    </g>
  </svg>
);

const Etiqueta: React.FC<{ texto: string }> = ({ texto }) => (
  <div style={{ position: 'relative', transform: 'rotate(-5deg)' }}>
    <div style={{
      background: `linear-gradient(135deg, ${VERMELHO} 0%, ${LARANJA} 100%)`,
      color: BRAND.yellow,
      fontFamily: BODY, fontWeight: 900, fontSize: 46, letterSpacing: 1,
      textTransform: 'uppercase',
      padding: '20px 40px', borderRadius: 24,
      border: `6px solid ${BRAND.yellow}`,
      textShadow: '0 3px 0 rgba(0,0,0,0.35)',
      boxShadow: `0 0 60px ${VERMELHO}aa, 0 12px 30px rgba(0,0,0,0.6)`,
      whiteSpace: 'nowrap',
    }}>{texto}</div>
    <MaoQueCarrega />
  </div>
);

/**
 * A faixa desenha-se sempre no mesmo tamanho e depois ENCOLHE por inteiro.
 * Assim a marca, o carimbo e a mãozinha mantêm as proporções entre si nos dois
 * formatos — em vez de cada peça ter o seu próprio tamanho em cada capa, que é
 * como se perde a coerência sem ninguém dar por isso.
 */
const FaixaDeCima: React.FC<{ etiqueta?: string; largura?: number; escala?: number; topo?: number }> = ({
  etiqueta, largura = 1080, escala = 1, topo = FAIXA_DE_CIMA,
}) => (
  <div style={{
    position: 'absolute', top: topo, left: 0, width: largura / escala,
    transform: `scale(${escala})`, transformOrigin: 'top left',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    paddingLeft: 56, paddingRight: 104,
  }}>
    <Marca />
    {etiqueta ? <Etiqueta texto={etiqueta} /> : <div />}
  </div>
);

export const CapaFoto: React.FC<CapaFotoProps> = ({
  // ⚠️ "7 Dias Grátis" e não "App Grátis" (12/08/2026): o app é um TESTE de sete dias
  // e prometer o contrário na capa é propaganda enganosa — ver o carimbo em `scenes.tsx`.
  metaphor, tema = '', numero = '', remate = '', etiqueta = '7 Dias Grátis', formato = 'vertical',
}) => {
  /**
   * ⚠️ 1280×720 — E ELA VOLTOU, porque eu a tinha deitado fora por engano.
   *
   * O raciocínio errado foi: *"um Short vê-se em sítios verticais, logo a capa é
   * vertical"*. Verdade a meio. A porta que os robôs conseguem usar (`thumbnails.set`)
   * escreve na miniatura **deitada** — e é ELA que aparece na lista do Studio, na
   * pesquisa, nas sugestões e na pré-visualização de quem partilha o link.
   *
   * Ao lá pôr um desenho vertical, o YouTube encaixou-o com barras escuras dos dois
   * lados. Como o nosso fundo já é quase preto, o resultado, visto pequeno, é **um
   * retângulo preto** — foi o dono que viu: *"me parece que agora ficou sem capa
   * nenhuma"*. Tinha razão: ficou pior do que antes.
   *
   * Agora são duas, cada uma para a sua casa:
   *   • **larga** → miniatura do YouTube (a que a API escreve);
   *   • **vertical** → capa do Reel no Instagram (que aceita 9:16 de verdade).
   * E a grelha de Shorts do YouTube não é servida por nenhuma delas — essa ele
   * escolhe sozinho de um fotograma, e é por isso que o carimbo passou a viver
   * dentro do vídeo (IMPL20 §53).
   */
  if (formato === 'largo') {
    return (
      <AbsoluteFill>
        <Fundo />
        <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center' }}>
          <div style={{
            flex: '0 0 62%', paddingLeft: 64, paddingTop: 60,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {tema ? <Tema texto={tema} corpo={26} /> : null}
            {numero ? <Numero texto={numero} corpo={148} largura={700} /> : null}
            {remate ? <Remate texto={remate} corpo={42} largura={700} /> : null}
          </div>
          <div style={{ flex: '1 1 auto', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
            <Ação metaphor={metaphor} largura={460} altura={640} />
          </div>
        </AbsoluteFill>
        <FaixaDeCima etiqueta={etiqueta} largura={1280} escala={0.56} topo={30} />
      </AbsoluteFill>
    );
  }

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
        {/* o rodapé volta a ser todo da ação: a marca subiu para a faixa de cima */}
        <div style={{ position: 'absolute', bottom: 0, width: '100%', display: 'flex', justifyContent: 'center' }}>
          <Ação metaphor={metaphor} largura={1080} altura={980} />
        </div>
        <FaixaDeCima etiqueta={etiqueta} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
