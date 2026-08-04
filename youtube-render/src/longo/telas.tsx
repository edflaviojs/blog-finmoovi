/**
 * AS TELAS DO VÍDEO LONGO — o vocabulário visual que nasce do texto (04/08/2026).
 *
 * ═══ POR QUE ESTE FICHEIRO EXISTE ═══
 * O dono viu o primeiro vídeo longo e disse três coisas:
 *   *"as imagens e os b-rolls não têm muito a ver com o que se diz"*
 *   *"tem muito b-roll, um atrás do outro, isso cansa"*
 *   *"esses cards informativos poderiam ser usados mais, noutros formatos"*
 * E o alvo, nas palavras dele sobre o canal VOX: *"lá todas as imagens e palavras é
 * realmente o que aparece na tela"*.
 *
 * Quem decide QUAL destas telas entra em cada cena é o `lib/imagens-longo.js`, lendo a
 * narração e a lista fechada de valores do guião. Aqui só se desenha o que ele mandou —
 * e **nenhum número é inventado neste ficheiro**: todos chegam por parâmetro, já
 * conferidos contra o mapa.
 *
 * ═══ O QUE ESTE FICHEIRO NÃO TOCA ═══
 * Nada do Short. Ele IMPORTA peças partilhadas (o fundo, o cartão de crédito sem
 * valores, o kit 3D, a marca d'água, as 32 coreografias do ator) — importar não é
 * tocar, e nenhuma delas foi modificada.
 */

import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND, DISPLAY, BODY, gradientText } from '../theme';
import { panel, Pop3D } from '../broll/card3d-kit';
import { HeroCard } from '../CreditCards3D';
import { CoreografiaDaCapa } from '../capas';
import { PALCO_W, PALCO_H } from '../capa';
import { activeIndex, wordTimingsFromReal, layoutWords } from '../captions';

export type PalavraDita = { word: string; start: number; end: number };

/**
 * ⚠️ O DINHEIRO ESCREVE-SE SEM CÊNTIMOS QUANDO É REDONDO, e não é gosto: a narração diz
 * *"mil e duzentos reais"*, não *"mil e duzentos reais e zero centavos"*. Escrever
 * "R$ 1.200,00" no ecrã quando a voz diz "mil e duzentos" já é o ecrã a dizer outra
 * coisa — em ponto pequeno, mas é o mesmo defeito que estamos aqui a consertar.
 */
export const dinheiro = (n: number): string =>
  'R$ ' + Number(n).toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });

/** A ZONA SEGURA. Abaixo disto vive a legenda karaokê e o trilho de progresso. */
const FUNDO_LIVRE = 210;

// ─── a etiqueta do valor ─────────────────────────────────────────────────────
/**
 * A CHAPA DO VALOR — a segunda metade do conserto do defeito nº 1.
 *
 * "mil e duzentos" é dito quatro vezes neste guião. Quatro cartões grandes iguais
 * seriam a monotonia de volta por outra porta, mas calar o número nas três repetições
 * deixava o ecrã outra vez desligado da voz. A chapa resolve as duas coisas: pequena,
 * no canto, sempre com o valor certo, por cima da imagem que lá estiver.
 */
export const Etiqueta: React.FC<{ valor: number; rotulo?: string }> = ({ valor, rotulo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame, fps, delay: 6, config: { damping: 15, mass: 0.6 } });
  return (
    <div style={{
      position: 'absolute', top: 64, right: 72,
      transform: `translateY(${interpolate(entra, [0, 1], [-34, 0])}px)`, opacity: entra,
      display: 'flex', alignItems: 'center', gap: 18,
      padding: '18px 30px', borderRadius: 20,
      background: 'rgba(13,17,23,0.86)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(148,163,184,0.18)', boxShadow: '0 18px 50px rgba(0,0,0,0.5)',
    }}>
      {rotulo ? (
        <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 24, color: BRAND.sub, maxWidth: 320 }}>{rotulo}</div>
      ) : null}
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 46, ...gradientText }}>{dinheiro(valor)}</div>
    </div>
  );
};

// ─── 1. o cartão do número ───────────────────────────────────────────────────
/**
 * O NÚMERO A NASCER NO ECRÃ NO INSTANTE EM QUE É DITO.
 * Ele conta de zero até ao valor: é a diferença entre mostrar um número e fazer o
 * número ACONTECER. E o rótulo por cima é o nome que o guião lhe deu — não um nome
 * inventado aqui, senão o ecrã volta a chamar às coisas o que a voz não chama.
 */
export const CartaoDeNumero: React.FC<{ valor: number; rotulo?: string }> = ({ valor, rotulo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const conta = spring({ frame, fps, delay: 8, config: { damping: 200, mass: 1.1 } });
  const pop = spring({ frame, fps, config: { damping: 13, mass: 0.7 } });
  const anel = interpolate(frame, [8, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', paddingBottom: FUNDO_LIVRE }}>
      {/* o halo por trás do número — dá-lhe peso sem lhe pôr uma caixa à volta */}
      <div style={{
        position: 'absolute', width: 1180, height: 1180, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.20), rgba(13,17,23,0) 62%)',
        transform: `scale(${interpolate(anel, [0, 1], [0.6, 1])})`, opacity: anel,
      }} />
      <div style={{ textAlign: 'center', transform: `scale(${interpolate(pop, [0, 1], [0.88, 1])})` }}>
        {rotulo ? (
          <div style={{
            fontFamily: BODY, fontWeight: 800, fontSize: 40, letterSpacing: 2,
            color: BRAND.sub, textTransform: 'uppercase', marginBottom: 18, opacity: pop,
          }}>{rotulo}</div>
        ) : null}
        <div style={{
          fontFamily: DISPLAY, fontWeight: 900, fontSize: 230, lineHeight: 1,
          ...gradientText, filter: 'drop-shadow(0 0 60px rgba(139,92,246,0.45))',
        }}>{dinheiro(Math.round(valor * conta))}</div>
        <div style={{
          margin: '34px auto 0', height: 10, borderRadius: 5,
          width: `${interpolate(pop, [0, 1], [0, 520])}px`,
          background: `linear-gradient(90deg, ${BRAND.cyan}, ${BRAND.violet}, ${BRAND.magenta})`,
        }} />
      </div>
    </AbsoluteFill>
  );
};

// ─── 2. a conta (o plano-revelação) ──────────────────────────────────────────
export type LinhaDaConta = { rotulo: string; valor: number; tom: string; forte?: boolean };

/**
 * A CONTA A CONSTRUIR-SE LINHA A LINHA — é o **plano que o vídeo quer que se lembre**
 * (a destilação #9 do VOX: um plano-revelação por vídeo, e nós não tínhamos o conceito).
 *
 * Cada linha entra no seu tempo, e as duas últimas — o total pago e o quanto é a mais —
 * entram com carimbo. É a única imagem do vídeo que mostra números que a narração não
 * diz um a um, e é uma exceção assumida: todos eles saem da ficha do Banco Central que
 * o gerador calculou, todos estão na lista de valores permitidos do guião, e são eles
 * que EXPLICAM o número que a voz diz. Sem eles, o "novecentos e quarenta e quatro reais
 * a mais" fica a ser uma afirmação; com eles, é uma conta que a pessoa pode seguir.
 */
export const CartaoDaConta: React.FC<{ linhas: LinhaDaConta[]; frames: number }> = ({ linhas, frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // as linhas repartem o tempo da cena, com uma folga no fim para a última respirar
  // ⚠️ 0,58 e não 0,78: no fotograma de prova, a meio da cena ainda faltavam as DUAS
  // linhas que interessam (o total pago e o quanto é a mais) e o painel tinha um vazio
  // em baixo à espera delas. A conta tem de estar FEITA quando a voz diz o resultado.
  const janela = Math.max(8, Math.floor((frames * 0.58) / Math.max(1, linhas.length)));
  const cor = (tom: string) => (tom === 'alerta' ? '#f87171' : tom === 'mau' ? '#fb923c' : tom === 'bom' ? '#22c55e' : BRAND.text);

  return (
    // ⚠️ `paddingTop` de 150: sem ele o painel subia até aos 78px e tapava a assinatura
    // FinMoovi do topo — visto no fotograma, com o logótipo a espreitar por trás da
    // borda. É o mesmo defeito de família do §34.3-6 (uma camada a comer outra).
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', paddingTop: 150, paddingBottom: FUNDO_LIVRE - 60 }}>
      <div style={panel({ width: 1180, padding: '34px 56px 38px' })}>
        <div style={{
          fontFamily: BODY, fontWeight: 800, fontSize: 26, letterSpacing: 3,
          color: BRAND.cyan, textTransform: 'uppercase', marginBottom: 22,
        }}>A conta que ninguém faz</div>
        {linhas.map((l, i) => {
          const entra = spring({ frame, fps, delay: 6 + i * janela, config: { damping: 17, mass: 0.6 } });
          const carimbo = l.forte ? interpolate(entra, [0, 1], [1.35, 1]) : 1;
          return (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              padding: l.forte ? '16px 0 4px' : '9px 0',
              borderTop: i === 0 ? 'none' : '1px solid rgba(148,163,184,0.12)',
              opacity: entra, transform: `translateX(${interpolate(entra, [0, 1], [-40, 0])}px)`,
            }}>
              <div style={{
                fontFamily: BODY, fontWeight: l.forte ? 800 : 600,
                fontSize: l.forte ? 42 : 34, color: l.forte ? BRAND.text : BRAND.sub,
              }}>{l.rotulo}</div>
              <div style={{
                fontFamily: DISPLAY, fontWeight: 900,
                fontSize: l.forte ? 76 : 48, color: cor(l.tom),
                transform: `scale(${carimbo})`, transformOrigin: 'right center',
                textShadow: l.forte ? '0 0 40px rgba(248,113,113,0.35)' : 'none',
              }}>{dinheiro(l.valor)}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ─── 3. a tela do app, com os números DA HISTÓRIA ────────────────────────────
/**
 * O APP COM O NÚMERO DA HISTÓRIA — e é aqui que morre o defeito que o dono apanhou.
 *
 * ⚠️ **POR QUE ISTO NÃO USA O B-ROLL DO CATÁLOGO.** As telas prontas do catálogo têm os
 * números gravados desde a gravação do ecrã: fatura R$ 1.240, limite R$ 5.000,
 * disponível R$ 3.760. Num vídeo cuja história é uma fatura de R$ 1.200, elas põem no
 * ecrã três números que a voz nunca diz e um que a contradiz — foi exatamente isso que
 * ele viu (*"fala R$ 1.200 mas está mostrando um b-roll de R$ 5.000"*).
 *
 * ⚠️ **E POR QUE NÃO SE MEXEU NO CATÁLOGO PARA O CORRIGIR.** Aquelas composições são
 * importadas pelo `scenes.tsx`, que é o render do Short que publica todos os dias.
 * A saída é esta: o cartão de crédito (`HeroCard`) **não tem valor nenhum lá dentro** —
 * só o nome do banco, os quatro dígitos e a data — portanto é reaproveitado tal e qual,
 * e o painel do dinheiro é desenhado aqui com o valor que chega por parâmetro. Mesma
 * cara, mesmo kit, zero risco para o robô diário.
 *
 * O `passo` faz o ecrã crescer com a narração: primeiro a fatura, depois as cobranças
 * espalhadas a juntarem-se num sítio só — que é a frase que a voz está a dizer.
 * ⚠️ As cobranças entram **sem valores**. Inventar "R$ 340 de parcelas" seria pôr no ar
 * um número financeiro que ninguém calculou, e é a coisa que este canal não faz.
 */
const COBRANCAS = ['fatura do cartão', 'compras parceladas', 'cobranças antigas'];

export const TelaDoApp: React.FC<{ valor: number; rotulo?: string; passo?: number }> = ({ valor, rotulo, passo = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const conta = spring({ frame, fps, delay: 16, config: { damping: 200, mass: 1.2 } });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', perspective: 1600, paddingBottom: FUNDO_LIVRE - 60 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 70, transformStyle: 'preserve-3d' }}>
        <Pop3D delay={0} rotY={8}><HeroCard /></Pop3D>
        <Pop3D delay={10} rotY={-7}>
          <div style={panel({ width: 640, padding: 40 })}>
            <div style={{ color: BRAND.sub, fontSize: 28, fontFamily: BODY, marginBottom: 8 }}>
              {rotulo ? rotulo.charAt(0).toUpperCase() + rotulo.slice(1) : 'A fatura do cartão'}
            </div>
            <div style={{
              fontFamily: DISPLAY, fontWeight: 900, fontSize: 96, lineHeight: 1.05,
              letterSpacing: -2, color: '#ef4444',
            }}>{dinheiro(Math.round(valor * conta))}</div>

            {passo >= 2 ? (
              <div style={{ marginTop: 30, borderTop: '1px solid rgba(148,163,184,0.14)', paddingTop: 24 }}>
                <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 24, color: BRAND.cyan, letterSpacing: 2, marginBottom: 16 }}>
                  TUDO NUM LUGAR SÓ
                </div>
                {COBRANCAS.map((n, i) => {
                  const junta = spring({ frame, fps, delay: 8 + i * 9, config: { damping: 16, mass: 0.6 } });
                  return (
                    <div key={n} style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0',
                      opacity: junta,
                      transform: `translateX(${interpolate(junta, [0, 1], [(i % 2 ? 1 : -1) * 190, 0])}px)`,
                    }}>
                      <div style={{ width: 12, height: 12, borderRadius: 6, background: BRAND.violet }} />
                      <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 30, color: BRAND.text }}>{n}</div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </Pop3D>
      </div>
      {/* ⚠️ SEM `RoamingWatermark` AQUI. As composições do catálogo trazem-na porque são
          clipes soltos que também vão para a biblioteca; dentro do vídeo longo o
          `Long.tsx` já desenha a marca por cima de tudo, e as duas juntas punham o
          logótipo duas vezes no mesmo fotograma. */}
    </AbsoluteFill>
  );
};

// ─── 4. o cartão de frase ────────────────────────────────────────────────────
/**
 * UMA FRASE QUE O GUIÃO JÁ ESCREVEU — nunca uma inventada aqui.
 * É o pedido do dono (*"esses cards poderiam ser usados mais, noutros formatos"*), e o
 * formato muda com o papel da frase: a promessa e a resposta ficam centradas e largas;
 * o gancho fica encostado à esquerda com a barra de acento; a chamada acende a palavra
 * que a pessoa tem de escrever no comentário.
 */
export const CartaoDeFrase: React.FC<{ texto: string; etiquetaTexto?: string; variante?: string }> = ({ texto, etiquetaTexto, variante }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame, fps, config: { damping: 17, mass: 0.7 } });
  const aoLado = variante === 'gancho';
  const chamada = variante === 'chamada';

  // ⚠️ A LETRA ENCOLHE COM O COMPRIMENTO. As frases declaradas do guião vão dos 16 aos
  // 130 caracteres (a chamada é curta, a resposta da promessa é uma frase inteira), e um
  // tamanho fixo ou cortava a longa ou fazia a curta parecer um erro.
  const n = texto.length;
  const tamanho = chamada ? 120 : n > 110 ? 60 : n > 74 ? 70 : n > 44 ? 82 : 96;

  return (
    <AbsoluteFill style={{
      justifyContent: 'center', alignItems: aoLado ? 'flex-start' : 'center',
      padding: `0 ${aoLado ? 120 : 190}px ${FUNDO_LIVRE}px ${aoLado ? 120 : 190}px`,
    }}>
      <div style={{
        maxWidth: 1500, textAlign: aoLado ? 'left' : 'center',
        opacity: entra, transform: `translateY(${interpolate(entra, [0, 1], [40, 0])}px)`,
        borderLeft: aoLado ? `10px solid ${BRAND.violet}` : 'none',
        paddingLeft: aoLado ? 44 : 0,
      }}>
        {etiquetaTexto ? (
          <div style={{
            fontFamily: BODY, fontWeight: 800, fontSize: 30, letterSpacing: 4,
            color: BRAND.cyan, textTransform: 'uppercase', marginBottom: 22,
          }}>{etiquetaTexto}</div>
        ) : null}
        <div style={{
          fontFamily: DISPLAY, fontWeight: 900, fontSize: tamanho, lineHeight: 1.16,
          color: BRAND.text, textShadow: '0 6px 40px rgba(0,0,0,0.65)',
        }}>
          {chamada ? <span style={{ ...gradientText, filter: 'drop-shadow(0 0 44px rgba(139,92,246,0.55))' }}>{texto}</span> : texto}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── 5. a metáfora (o ator) ──────────────────────────────────────────────────
/**
 * O ATOR DO FIO CONDUTOR — e é a destilação #1 do VOX finalmente aplicada.
 *
 * Temos **32 coreografias** desenhadas para as capas, e até hoje elas viviam **oito
 * segundos**, na abertura, e nunca mais apareciam. O objeto condutor do VOX é
 * exatamente o contrário: um objeto físico atravessa o vídeo inteiro e ESCALA.
 * Aqui o `estagio` faz a câmara aproximar-se a cada regresso — a mesma coreografia,
 * vista mais de perto, lê-se como a história a apertar.
 */
export const Metafora: React.FC<{ fio?: string | null; estagio?: number; frames: number }> = ({ fio, estagio = 1, frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame, fps, config: { damping: 18, mass: 0.8 } });

  // ⚠️ O palco é desenhado em 1240×1560 (retrato) e TEM DE SER ENCOLHIDO COM CAIXA
  // PRÓPRIA — é o defeito nº 7 do §34, em que o boneco saía pela direita fora porque
  // o `scale` estava na coluna e o SVG continuava a ocupar 1240px de largura.
  //
  // ⚠️ 0,86 E NÃO 0,62 — corrigido a olhar o fotograma. A 0,62 o ator ficava do tamanho
  // de um selo no meio de um ecrã vazio: é palavra por palavra o defeito que a Onda 2
  // documentou em 31/07 (*"o quadro tinha UM elemento, no centro, sobre preto, com ~60%
  // de espaço morto"* — §16.10). O palco é RETRATO num ecrã DEITADO, portanto ampliar
  // significa cortar em cima e em baixo; é de propósito, e `overflow: hidden` trata
  // disso. A coreografia desenha o boneco na metade de baixo, por isso o palco é ainda
  // puxado para cima, senão cortavam-se-lhe os pés — o mesmo defeito da capa do §34.
  const base = 0.78;
  const aperta = 1 + Math.min(3, estagio - 1) * 0.07; // 1ª vez de longe, depois mais perto
  const escala = base * aperta * interpolate(entra, [0, 1], [0.94, 1]);

  /**
   * ⚠️ O CHÃO DO BONECO FICA SEMPRE NO MESMO SÍTIO DO ECRÃ, e isto foi medido no
   * fotograma, não calculado no ar. A 1ª versão subia o palco por uma FRAÇÃO da altura,
   * e como a escala cresce a cada estágio, a fração crescia com ela: no estágio 3 os pés
   * do boneco caíam por baixo da legenda e ficavam cortados. Agora ancora-se o CHÃO —
   * ele está a 87,5% da altura do palco (medido no fotograma do estágio 1) — a 880px do
   * topo do ecrã, que é logo acima da legenda. Muda a escala, o chão não se mexe.
   */
  // ⚠️ A ÂNCORA TEM FOLGA DE PROPÓSITO. Medindo dois fotogramas de estágios diferentes,
  // o chão apareceu a 0,879 da altura do palco num e a 0,94 no outro — ou seja, a
  // coreografia MEXE o chão enquanto o boneco salta e aterra. Ancora-se pela medida mais
  // baixa (0,94), com o alvo a 830px: assim, mesmo no instante em que a cena desce mais,
  // nada cai por baixo da legenda. Uma âncora certinha para UM fotograma seria uma
  // âncora errada para os outros quatrocentos.
  const CHAO_NO_PALCO = 0.94;
  const CHAO_NO_ECRA = 830;
  const alturaReal = PALCO_H * escala;
  const topoNatural = (1080 - alturaReal) / 2;
  const topoQueQueremos = CHAO_NO_ECRA - CHAO_NO_PALCO * alturaReal;
  // deriva lenta: um plano parado durante 15 segundos lê-se como imagem congelada
  const deriva = interpolate(frame, [0, Math.max(1, frames)], [0, -22]);

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{
        width: PALCO_W * escala, height: alturaReal, position: 'relative',
        opacity: entra, transform: `translateY(${deriva + topoQueQueremos - topoNatural}px)`,
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, transformOrigin: 'top left', transform: `scale(${escala})` }}>
          <CoreografiaDaCapa metaphor={fio} life={frames} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── 6. as palavras ditas, como imagem ───────────────────────────────────────
/**
 * O CAVALO DE CARGA — *"todas as imagens e palavras é realmente o que aparece na tela"*.
 *
 * Nas cenas de história pura não há número para mostrar nem frase declarada para citar,
 * e era aí que o vídeo antigo enfiava mais uma tela do app sem relação nenhuma. Aqui a
 * imagem passa a ser a própria fala, grande, com a palavra do momento acesa.
 *
 * ⚠️ **NESTAS CENAS A LEGENDA DE BAIXO NÃO É DESENHADA** (ver `Long.tsx`): seria o mesmo
 * texto duas vezes no mesmo ecrã.
 *
 * Três desenhos, e a variante roda pela ordem das cenas para duas seguidas nunca terem
 * o mesmo. Não é enfeite: é a diferença entre "o vídeo mudou de imagem" e "o vídeo está
 * parado a mostrar texto".
 */
export const PalavrasNaTela: React.FC<{
  narration: string; frames: number; words?: PalavraDita[]; variante?: number;
}> = ({ narration, frames, words, variante = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const aEsquerda = variante === 1;
  /**
   * ⚠️ MOSTRA-SE UM BLOCO DE CADA VEZ, NÃO A CENA TODA — e a conta é simples.
   * Uma cena chega às 40 palavras. A 76px, 40 palavras enchem seis linhas e ocupam o
   * ecrã de alto a baixo: deixaria de ser uma imagem e passaria a ser uma página. Em
   * blocos, o ecrã MUDA várias vezes dentro da mesma cena — que é precisamente o
   * contrário da monotonia de que o dono se queixou.
   */
  const porBloco = aEsquerda ? 6 : 8;
  const bruto = words && words.length ? wordTimingsFromReal(words, fps) : layoutWords(narration, frames);
  const timings = bruto.map((t, i) => ({ ...t, line: Math.floor(i / porBloco) }));
  const active = activeIndex(timings, frame);
  const blocoAtual = timings[active]?.line ?? 0;
  const doBloco = timings.filter((t) => t.line === blocoAtual);
  const inicioDoBloco = doBloco[0]?.start ?? 0;
  const entra = spring({ frame: frame - inicioDoBloco, fps, config: { damping: 18, mass: 0.7 } });

  const compacto = doBloco.some((t) => t.word.length > 11) || porBloco > 7;
  const corpo = compacto ? 84 : 96;

  return (
    <AbsoluteFill style={{
      justifyContent: 'center', alignItems: aEsquerda ? 'flex-start' : 'center',
      padding: `120px ${aEsquerda ? 140 : 200}px ${FUNDO_LIVRE - 60}px ${aEsquerda ? 140 : 200}px`,
    }}>
      {/* variante 2: um traço de acento por trás, para o ecrã não ser só letra no vazio */}
      {variante === 2 ? (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '50%', height: 300,
          transform: 'translateY(-50%) skewY(-4deg)',
          background: 'linear-gradient(100deg, rgba(34,211,238,0.10), rgba(139,92,246,0.16), rgba(214,33,156,0.10))',
        }} />
      ) : null}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '14px 18px', maxWidth: 1560,
        justifyContent: aEsquerda ? 'flex-start' : 'center',
        textAlign: aEsquerda ? 'left' : 'center',
        opacity: entra, transform: `translateY(${interpolate(entra, [0, 1], [26, 0])}px)`,
        borderLeft: aEsquerda ? `10px solid ${BRAND.violet}` : 'none',
        paddingLeft: aEsquerda ? 46 : 0,
      }}>
        {doBloco.map((t) => {
          const i = timings.indexOf(t);
          const dito = frame >= t.start;
          const isActive = i === active;
          const pop = spring({ frame: frame - t.start, fps, config: { damping: 12, mass: 0.4 } });
          return (
            <span key={i} style={{
              display: 'inline-block',
              fontFamily: DISPLAY, fontWeight: 900, lineHeight: 1.12,
              fontSize: t.emphasis ? corpo * 1.22 : corpo,
              transform: `scale(${isActive ? interpolate(pop, [0, 1], [0.86, 1.03]) : 1})`,
              // ⚠️ 0,55 e não 0,34 na palavra ainda por dizer: a 0,34 ela quase
              // desaparecia contra o fundo violeta e o fotograma lia-se como texto meio
              // carregado, não como uma frase a ser dita.
              color: isActive ? BRAND.yellow : dito ? BRAND.text : 'rgba(148,163,184,0.55)',
              textShadow: dito ? '0 6px 30px rgba(0,0,0,0.6)' : 'none',
              transition: 'none',
            }}>{t.word}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
