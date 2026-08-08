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
import { AbsoluteFill, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND, DISPLAY, BODY, gradientText } from '../theme';
import { panel, Pop3D } from '../broll/card3d-kit';
import { HeroCard } from '../CreditCards3D';
import { CoreografiaDaCapa } from '../capas';
// ⚠️ IMPORTAR NÃO É TOCAR. O `scenes.tsx` é o render do Short, que publica todos os
// dias, e não leva uma linha por causa disto. O que se traz de lá são as **32 metáforas
// animadas** que ele já tem desenhadas e que o vídeo longo nunca usou — ver `Ilustracao`.
import { ShotMetaphor, clickPressOffset, Watermark } from '../scenes';
import { PALCO_W, PALCO_H } from '../capa';
import { SHOT_ICONS } from '../icons-fx';
import { activeIndex, wordTimingsFromReal, layoutWords } from '../captions';
import { disparosDaCena } from './sons';

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
 * ⚠️ 0,58 e não 0,78: no fotograma de prova, a meio da cena ainda faltavam as DUAS
 * linhas que interessam (o total pago e o quanto é a mais) e o painel tinha um vazio em
 * baixo à espera delas. A conta tem de estar FEITA quando a voz diz o resultado.
 *
 * ⚠️ E ISTO É FONTE ÚNICA. O desenho usa esta conta para saber quando cada linha entra,
 * e o SOM usa-a para saber quando tocar o baque da última. Calculados em sítios
 * diferentes, mais tarde ou mais cedo deixavam de bater certo — é a mesma regra que o
 * Short já aplica ao clique da mãozinha.
 */
export const janelaDaConta = (frames: number, nLinhas: number): number =>
  Math.max(8, Math.floor((frames * 0.58) / Math.max(1, nLinhas)));

/** O fotograma em que a ÚLTIMA linha da conta entra — para o som cair em cima dela. */
export const atrasoDaUltimaLinha = (frames: number, nLinhas: number): number =>
  6 + Math.max(0, nLinhas - 1) * janelaDaConta(frames, nLinhas);

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
  const janela = janelaDaConta(frames, linhas.length);
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
export const CartaoDeFrase: React.FC<{ texto: string; etiquetaTexto?: string; variante?: string; frames: number }> = ({ texto, etiquetaTexto, variante, frames }) => {
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

  /**
   * ⚠️ ESTE CARTÃO ERA UMA FOTOGRAFIA — e o dono viu-o: *"ainda tem muito texto e pouco
   * movimento… tem que criar alguns efeitos mais dinâmicos nessas cenas."*
   * Ele aparecia inteiro de uma vez e ficava quieto treze segundos.
   * Agora **constrói-se palavra a palavra** (a mesma ideia do cartão de capítulo, que
   * funcionou), a cena aproxima-se devagar e há uma forma abstrata a crescer por trás.
   */
  const palavras = String(texto).trim().split(/\s+/).filter(Boolean);
  const passo = palavras.length > 14 ? 2 : 3;
  const aproxima = interpolate(frame, [0, Math.max(1, frames)], [1, 1.05]);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <FundoAbstrato variante={aoLado ? 1 : 2} frames={frames} />
      <AbsoluteFill style={{
        justifyContent: 'center', alignItems: aoLado ? 'flex-start' : 'center',
        padding: `0 ${aoLado ? 120 : 190}px ${FUNDO_LIVRE}px ${aoLado ? 120 : 190}px`,
        transform: `scale(${aproxima})`,
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
            opacity: interpolate(frame, [2, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>{etiquetaTexto}</div>
        ) : null}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: `4px ${Math.round(tamanho * 0.26)}px`,
          justifyContent: aoLado ? 'flex-start' : 'center',
          fontFamily: DISPLAY, fontWeight: 900, fontSize: tamanho, lineHeight: 1.16,
          color: BRAND.text, textShadow: '0 6px 40px rgba(0,0,0,0.65)',
        }}>
          {palavras.map((p, i) => {
            const pop = spring({ frame: frame - (8 + i * passo), fps, config: { damping: 15, mass: 0.5 } });
            return (
              <span key={i} style={{
                display: 'inline-block', opacity: pop,
                transform: `translateY(${interpolate(pop, [0, 1], [22, 0])}px)`,
                ...(chamada ? gradientText : {}),
                ...(chamada ? { filter: 'drop-shadow(0 0 44px rgba(139,92,246,0.55))' } : {}),
              }}>{p}</span>
            );
          })}
        </div>
      </div>
      </AbsoluteFill>
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
  narration: string; frames: number; words?: PalavraDita[]; variante?: number; pular?: number;
}> = ({ narration, frames, words, variante = 0, pular = 0 }) => {
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
  /**
   * ⚠️ `pular` — AS PALAVRAS QUE A CAPA JÁ MOSTROU NÃO SE REPETEM AQUI.
   *
   * O dono apanhou isto: a capa abre com *"Você já pagou uma dívida e mesmo assim parece
   * que ela nunca acaba?"* e, mal ela sai, o ecrã seguinte começava com *"parece que ela
   * nunca acaba? Isso acontece porque"*. A frase aparecia duas vezes seguidas.
   * A causa é simples: a capa mostra a PRIMEIRA FRASE da abertura, mas os blocos de
   * palavras eram contados desde a primeira palavra da cena — e um bloco de oito
   * palavras cai a meio da pergunta, portanto a cauda dela vinha outra vez.
   * Agora a cena 1 salta exatamente as palavras que a capa já disse.
   */
  const timings = bruto.slice(Math.max(0, pular)).map((t, i) => ({ ...t, line: Math.floor(i / porBloco) }));
  const active = activeIndex(timings, frame);
  const blocoAtual = timings[active]?.line ?? 0;
  const doBloco = timings.filter((t) => t.line === blocoAtual);
  const inicioDoBloco = doBloco[0]?.start ?? 0;
  const entra = spring({ frame: frame - inicioDoBloco, fps, config: { damping: 18, mass: 0.7 } });

  const compacto = doBloco.some((t) => t.word.length > 11) || porBloco > 7;
  const corpo = compacto ? 84 : 96;

  /**
   * ⚠️ O ECRÃ NUNCA ESTÁ PARADO — e isto é ordem direta do dono depois de ver o vídeo:
   * *"aqui talvez se ir dando um zoom out ou zoom in acho que melhora um pouco"* e
   * *"temos q dar mais ação, mais movimento, isso serve também para todo o vídeo".*
   *
   * Duas camadas de movimento, e são diferentes de propósito:
   *  · a APROXIMAÇÃO LENTA da cena inteira (1,00 → 1,07 ao longo dos ~13 segundos). É
   *    lenta que baste para não se notar como efeito e depressa que baste para o olho
   *    saber que a imagem está viva. As cenas ímpares afastam-se em vez de se
   *    aproximarem, senão seis cenas seguidas fariam todas o mesmo gesto;
   *  · a ENTRADA de cada bloco de palavras, que desliza de lado e assenta.
   */
  const aproxima = variante % 2 === 0
    ? interpolate(frame, [0, Math.max(1, frames)], [1, 1.07])
    : interpolate(frame, [0, Math.max(1, frames)], [1.07, 1]);
  const deriva = interpolate(frame, [0, Math.max(1, frames)], [0, aEsquerda ? 18 : -14]);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <FundoAbstrato variante={variante} frames={frames} />
      <AbsoluteFill style={{
        justifyContent: 'center', alignItems: aEsquerda ? 'flex-start' : 'center',
        padding: `120px ${aEsquerda ? 140 : 200}px ${FUNDO_LIVRE - 60}px ${aEsquerda ? 140 : 200}px`,
        transform: `scale(${aproxima}) translateX(${deriva}px)`,
      }}>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '14px 18px', maxWidth: 1560,
        justifyContent: aEsquerda ? 'flex-start' : 'center',
        textAlign: aEsquerda ? 'left' : 'center',
        opacity: entra,
        transform: `translate(${interpolate(entra, [0, 1], [aEsquerda ? -46 : 0, 0])}px, ${interpolate(entra, [0, 1], [26, 0])}px)`,
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
    </AbsoluteFill>
  );
};

// ─── 7. os fundos abstratos ──────────────────────────────────────────────────
/**
 * AS FORMAS QUE CRESCEM POR TRÁS — pedido do dono, e sai de graça.
 *
 * *"Teria como em algumas colocarmos algumas imagens abstratas e essas imagens fossem
 * crescendo com zoom out, etc, para retirar essa sensação de monótono?"*
 *
 * Não é preciso comprar nada nem gerar nada: são formas desenhadas por código, na
 * paleta do canal, que **crescem devagar durante a cena inteira**. Quatro desenhos, e a
 * cena escolhe pelo mesmo número que já escolhe o alinhamento do texto — portanto duas
 * cenas seguidas nunca têm o mesmo fundo nem o mesmo movimento.
 *
 * ⚠️ Opacidades baixas de propósito (0,10 a 0,22). Isto é FUNDO: se competir com a
 * palavra que está a ser dita, deixa de resolver a monotonia e passa a criar ruído —
 * que é o defeito do lado oposto.
 */
export const FundoAbstrato: React.FC<{ variante: number; frames: number }> = ({ variante, frames }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, Math.max(1, frames)], [0, 1]);
  const v = ((variante % 4) + 4) % 4;

  if (v === 0) {
    // manchas de cor que incham e derivam
    const bolhas = [
      { x: 22, y: 34, r: 460, c: 'rgba(34,211,238,0.16)', f: 1.0 },
      { x: 78, y: 62, r: 520, c: 'rgba(139,92,246,0.20)', f: 1.3 },
      { x: 56, y: 22, r: 380, c: 'rgba(214,33,156,0.13)', f: 0.8 },
    ];
    return (
      <AbsoluteFill>
        {bolhas.map((b, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${b.x}%`, top: `${b.y}%`,
            width: b.r, height: b.r, borderRadius: '50%',
            background: `radial-gradient(circle, ${b.c}, rgba(13,17,23,0) 68%)`,
            transform: `translate(-50%,-50%) scale(${1 + t * 0.5 * b.f}) translateY(${-t * 60 * b.f}px)`,
          }} />
        ))}
      </AbsoluteFill>
    );
  }

  if (v === 1) {
    // anéis concêntricos que se abrem a partir do lado esquerdo (onde está o texto)
    return (
      <AbsoluteFill>
        {[0, 1, 2, 3, 4].map((i) => {
          const p = (t * 1.2 + i * 0.2) % 1.2;
          return (
            <div key={i} style={{
              position: 'absolute', left: '18%', top: '50%',
              width: 300 + p * 1500, height: 300 + p * 1500, borderRadius: '50%',
              border: `2px solid rgba(139,92,246,${Math.max(0, 0.22 - p * 0.18)})`,
              transform: 'translate(-50%,-50%)',
            }} />
          );
        })}
      </AbsoluteFill>
    );
  }

  if (v === 2) {
    // a faixa diagonal do canal, a abrir e a inclinar-se devagar
    return (
      <AbsoluteFill>
        <div style={{
          position: 'absolute', left: -200, right: -200, top: '50%',
          height: 240 + t * 240,
          transform: `translateY(-50%) skewY(${-4 - t * 2}deg) scale(${1 + t * 0.12})`,
          background: 'linear-gradient(100deg, rgba(34,211,238,0.10), rgba(139,92,246,0.18), rgba(214,33,156,0.10))',
        }} />
      </AbsoluteFill>
    );
  }

  // grelha de pontos que se afasta (dá profundidade sem desenhar nada)
  const passo = 74;
  return (
    <AbsoluteFill style={{ opacity: 0.5 }}>
      <div style={{
        position: 'absolute', inset: -300,
        backgroundImage: 'radial-gradient(rgba(148,163,184,0.35) 2px, transparent 2px)',
        backgroundSize: `${passo}px ${passo}px`,
        transform: `scale(${1.35 - t * 0.3}) rotate(${-2 + t * 1.4}deg)`,
        maskImage: 'radial-gradient(ellipse at 50% 50%, black 20%, transparent 72%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 20%, transparent 72%)',
      }} />
    </AbsoluteFill>
  );
};

// ─── 8. o cartão de capítulo, com cena própria ───────────────────────────────
/**
 * O CARD DO CAPÍTULO DEIXOU DE SER UM AUTOCOLANTE E PASSOU A SER UMA CENA.
 *
 * ⚠️ O dono apanhou isto a ver o vídeo: *"aqui nessas cenas onde aparecem os cards dos
 * Passos ficou muito congestionado, não dá tempo de ler nada"*. Ele tinha razão e o
 * fotograma prova-o: a placa entrava POR CIMA de uma cena que já tinha uma frase
 * grande no ecrã. **Dois textos grandes ao mesmo tempo, 2,6 segundos.** Ninguém lê os
 * dois — e o que se perde é justamente o que organiza o vídeo.
 *
 * A ideia de o pôr em cena própria é dele, e é melhor do que a minha: *"daria até pra
 * ganharmos mais tempo de vídeo/tela e respiro… mas não podemos criar uma cena somente
 * com o card e esse ficar parado! Temos q dar mais ação, mais movimento."*
 *
 * Por isso aqui nada está parado: o número entra em profundidade e roda, a barra
 * cresce, o título aparece palavra a palavra e o fundo abre-se. E leva som.
 */
export const CARTAO_CAPITULO_FRAMES = 78; // 2,6s — o respiro, com a música a segurar

export const CartaoDeCapitulo: React.FC<{ numero: number; titulo: string; frames?: number }> = ({ numero, titulo, frames = CARTAO_CAPITULO_FRAMES }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame, fps, config: { damping: 16, mass: 0.8 } });
  const sai = interpolate(frame, [frames - 10, frames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // a cena inteira aproxima-se devagar — a regra nova do dono, "nada parado"
  const aproxima = interpolate(frame, [0, Math.max(1, frames)], [1.04, 1]);
  const palavras = String(titulo).trim().split(/\s+/).filter(Boolean);

  return (
    <AbsoluteFill style={{ opacity: sai, overflow: 'hidden' }}>
      <FundoAbstrato variante={1} frames={frames} />
      {/* o clarão que abre a partir do número */}
      <AbsoluteFill style={{
        background: `radial-gradient(circle at 26% 50%, rgba(139,92,246,${interpolate(entra, [0, 1], [0.45, 0.16])}), rgba(13,17,23,0) 58%)`,
      }} />
      <AbsoluteFill style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 70, padding: '0 140px', transform: `scale(${aproxima})`,
      }}>
        <div style={{
          fontFamily: DISPLAY, fontWeight: 900, fontSize: 340, lineHeight: 0.9,
          ...gradientText,
          filter: 'drop-shadow(0 0 70px rgba(139,92,246,0.55))',
          transform: `perspective(1200px) rotateY(${interpolate(entra, [0, 1], [-70, 0])}deg) translateZ(${interpolate(entra, [0, 1], [-500, 0])}px)`,
          opacity: entra,
        }}>{numero}</div>

        <div style={{ borderLeft: `8px solid ${BRAND.violet}`, paddingLeft: 44, maxWidth: 1000 }}>
          <div style={{
            fontFamily: BODY, fontWeight: 800, fontSize: 30, letterSpacing: 6,
            color: BRAND.cyan, marginBottom: 18,
            opacity: interpolate(frame, [4, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>PASSO {numero}</div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '6px 18px',
            fontFamily: DISPLAY, fontWeight: 900, fontSize: 68, lineHeight: 1.14, color: BRAND.text,
          }}>
            {/* palavra a palavra: o título CONSTRÓI-SE, e é isso que dá a sensação de
                que alguma coisa está a acontecer em vez de estar escrita */}
            {palavras.map((p, i) => {
              const pop = spring({ frame: frame - (10 + i * 3), fps, config: { damping: 15, mass: 0.5 } });
              return (
                <span key={i} style={{
                  display: 'inline-block', opacity: pop,
                  transform: `translateY(${interpolate(pop, [0, 1], [26, 0])}px)`,
                }}>{p}</span>
              );
            })}
          </div>
          <div style={{
            marginTop: 30, height: 8, borderRadius: 4,
            width: `${interpolate(entra, [0, 1], [0, 560])}px`,
            background: `linear-gradient(90deg, ${BRAND.cyan}, ${BRAND.violet}, ${BRAND.magenta})`,
          }} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── 9. as 32 metáforas animadas que estavam paradas ─────────────────────────
/**
 * ⚠️ O ACHADO QUE VALE MAIS DO QUE QUALQUER CÓDIGO NOVO: **já temos 32 ilustrações
 * animadas desenhadas e pagas, e o vídeo longo usava UMA.**
 *
 * O dono pediu *"criar mais variações de telas, e sermos mais ilustrativos"*. Antes de
 * gerar seja o que for, fui ver o que já existe: o `scenes.tsx` do Short tem 32 cenas
 * animadas — o ralo, a ampulheta, a ratoeira, a bola de ferro, a areia movediça, o
 * dominó, o castelo de cartas, a corda bamba, o balde furado, a avalanche, a balança,
 * o cofre, o escudo, a bóia, a escada, o foguete, a semente… Todas na paleta do canal,
 * todas com movimento próprio. **Estavam na gaveta.**
 *
 * ⚠️ Elas são desenhadas para o Short, em telas de ~720×660 a 900×520. Em 16:9 têm de
 * ser ampliadas com caixa própria e cortadas em cima e em baixo — é o mesmo cuidado do
 * ator da capa (§34 defeito 7), e por isso `overflow: hidden` e a âncora do chão.
 */
/**
 * ⚠️ A ILUSTRAÇÃO VAI EMOLDURADA, E NÃO ESTICADA A OCUPAR O ECRÃ — corrigido a olhar o
 * fotograma, como sempre.
 *
 * A 1ª versão ampliava-a 1,5× e punha-a a sangrar de bordo a bordo. Renderizei a
 * `areia-movedica` e o que apareceu foi **uma parede de amarelo** a cobrir dois terços
 * do ecrã, com o boneco a afundar do tamanho de uma moeda no meio: a mesma imagem que
 * no Short é uma vinheta de 900×520 e funciona muito bem. Ampliar não a torna maior,
 * torna-a **fundo** — e um fundo amarelo vivo briga com a paleta do canal inteiro.
 *
 * Emoldurada num painel, ela volta a ler-se como o que é: uma ILUSTRAÇÃO. E de
 * caminho responde à outra coisa que o dono pediu — *"esses cards informativos poderiam
 * ser utilizados mais, talvez com outros formatos"*.
 */
const ESCALA_DA_ILUSTRACAO = 1.06;
const MOLDURA = { largura: 1180, altura: 620 };

export const Ilustracao: React.FC<{ figura: string; frames: number }> = ({ figura, frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame, fps, config: { damping: 18, mass: 0.8 } });
  // aproximação lenta DENTRO da moldura — a regra "nada parado", sem sangrar o ecrã
  const aproxima = interpolate(frame, [0, Math.max(1, frames)], [1, 1.09]);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <FundoAbstrato variante={3} frames={frames} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', paddingBottom: FUNDO_LIVRE - 130 }}>
        <div style={{
          ...panel({ width: MOLDURA.largura, height: MOLDURA.altura, padding: 0 }),
          overflow: 'hidden', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: entra,
          transform: `translateY(${interpolate(entra, [0, 1], [34, 0])}px) scale(${interpolate(entra, [0, 1], [0.94, 1])})`,
        }}>
          <div style={{ transform: `scale(${ESCALA_DA_ILUSTRACAO * aproxima})` }}>
            <ShotMetaphor metaphor={figura} life={frames} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── 9-bis. as fotografias ───────────────────────────────────────────────────
/**
 * 📸 A FOTOGRAFIA, COM MOVIMENTO — pedido do dono (04/08/2026, fim):
 * *"quero que entrem as 3 imagens no vídeo, mas quero que elas fiquem com movimento,
 * uma pode ser um zoom out, outra zoom in ou outro qualquer."*
 *
 * ⚠️ **A SANGRAR O ECRÃ, e é o contrário do que se fez às ilustrações.** As 32
 * ilustrações são vinhetas de ~900×520 desenhadas para o vertical: esticadas viram
 * fundo (§37.5, a parede de amarelo). Estas são fotografias de **2560×1440 feitas em
 * 16:9 para este vídeo** — emoldurá-las seria desperdiçar a única coisa que elas têm
 * de melhor, que é encherem o ecrã.
 *
 * ⚠️ **E O MOVIMENTO NUNCA MOSTRA BORDO.** Todos os passeios partem de uma escala
 * MAIOR do que 1 e nunca descem abaixo dela — um zoom out honesto acabaria a mostrar
 * a moldura preta à volta. Aqui "afastar" é ir de 1,14 para 1,03: lê-se como
 * afastamento e continua a encher o ecrã.
 *
 * ⚠️ **A LEGENDA CONTINUA POR CIMA**, como em qualquer outra cena — por isso há um véu
 * escuro em baixo: sobre uma fotografia clara, texto branco sem véu não se lê.
 */
/**
 * ⚠️ 🔴 O CARTAZ NÃO PODE SER CORTADO, E ISSO SÓ SE VIU NO FOTOGRAMA.
 *
 * A 1ª versão tratava as três fotografias por igual: a encher o ecrã, com aproximação.
 * Renderizado, o cartaz do juro apareceu **com o "AO MÊS" cortado em cima e o «Fonte:
 * Banco Central do Brasil» cortado em baixo**.
 *
 * > Cortar a fonte de um número é pior do que cortar um pedaço de imagem: **é o que
 * > torna aquele 16% uma afirmação verificável em vez de um número inventado.** Era a
 * > única linha da imagem que não podia desaparecer, e foi a primeira a ir.
 *
 * Por isso há dois modos, e o modo não é enfeite:
 *   · `cheia`  — fotografia. Enche o ecrã, e o passeio nunca desce abaixo de 1 (um zoom
 *                out honesto acabaria a mostrar a moldura preta à volta);
 *   · `cartaz` — imagem com TEXTO. Aparece **inteira**, sempre abaixo de 1, levantada
 *                para o texto dela não brigar com a legenda que corre por baixo.
 */
/**
 * ⚠️ O MOVIMENTO SUBIU DEPOIS DE ELE VER: *"ficou ótimo, mas ainda colocaria um pouco de
 * movimento um pouco mais rápido, quase não se percebe o zoom"*.
 *
 * A 1ª versão andava **12%** ao longo de toda a cena. Numa cena de dez a catorze
 * segundos isso é cerca de 1% por segundo — abaixo do que o olho regista como
 * movimento, portanto o custo estava lá e o efeito não. Passou a **25 a 28%**, que é a
 * velocidade a que o cinema move uma fotografia parada. **Continua a ser um passeio, não
 * um safanão** — e continua a nunca mostrar bordo.
 */
const PASSEIOS: Record<string, { de: number; ate: number; x?: [number, number]; y?: [number, number]; modo?: 'cheia' | 'cartaz' }> = {
  // aproxima, e desce um pouco — o olhar entra na imagem
  aproxima: { de: 1.03, ate: 1.30, y: [-26, 30], modo: 'cheia' },
  // afasta, mas sem nunca chegar ao bordo
  afasta: { de: 1.30, ate: 1.03, modo: 'cheia' },
  // o plano do fecho: aproxima com deriva lateral, para o corredor "andar"
  'aproxima-lento': { de: 1.04, ate: 1.28, x: [44, -44], modo: 'cheia' },
  // o cartaz: inteiro, SEMPRE abaixo de 1, com uma aproximação que nunca chega a cortar
  cartaz: { de: 0.74, ate: 0.94, modo: 'cartaz' },
};

/** Quanto o cartaz sobe, para o texto dele ficar acima da faixa da legenda. */
const CARTAZ_SOBE = 82;

export const Foto: React.FC<{ ficheiro: string; movimento?: string; frames: number }> = ({ ficheiro, movimento = 'aproxima', frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame, fps, config: { damping: 20, mass: 0.9 } });
  const p = PASSEIOS[movimento] || PASSEIOS.aproxima;
  const cartaz = p.modo === 'cartaz';
  const fim = Math.max(1, frames);
  const escala = interpolate(frame, [0, fim], [p.de, p.ate], { extrapolateRight: 'clamp' });
  const dx = p.x ? interpolate(frame, [0, fim], p.x, { extrapolateRight: 'clamp' }) : 0;
  const dy = (p.y ? interpolate(frame, [0, fim], p.y, { extrapolateRight: 'clamp' }) : 0) - (cartaz ? CARTAZ_SOBE : 0);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: BRAND.bg }}>
      {/* no modo cartaz há fundo à vista, e ele é do canal — não um preto qualquer */}
      {cartaz ? <FundoAbstrato variante={1} frames={frames} /> : null}
      <AbsoluteFill style={{ opacity: entra }}>
        <img
          src={staticFile(ficheiro)}
          alt=""
          style={{
            width: '100%', height: '100%',
            objectFit: cartaz ? 'contain' : 'cover',
            transform: `scale(${escala}) translate(${dx}px, ${dy}px)`,
            filter: cartaz ? 'drop-shadow(0 30px 70px rgba(0,0,0,0.65))' : undefined,
          }}
        />
      </AbsoluteFill>
      {/* o véu de baixo — sem ele a legenda branca desaparece sobre a parte clara */}
      <AbsoluteFill style={{
        background: `linear-gradient(to top, ${BRAND.bg}f2 0%, ${BRAND.bg}b0 ${FUNDO_LIVRE - 40}px, transparent ${FUNDO_LIVRE + 170}px)`,
      }} />
      {/* uma sombra suave em cima, para a assinatura do canal não competir com a foto */}
      <AbsoluteFill style={{
        background: `linear-gradient(to bottom, ${BRAND.bg}cc 0%, transparent 190px)`,
      }} />
      {/**
       * ⚠️ A MARCA DO CANAL, OUTRA VEZ POR CIMA — e isto também só se viu no fotograma.
       * O `Long.tsx` desenha a assinatura ANTES das cenas, portanto uma imagem que enche
       * o ecrã tapa-a. Em três cenas de trinta, o vídeo ficava sem marca nenhuma, e é
       * justamente nas três que alguém mais provavelmente recorta para partilhar.
       * Não há risco de sair a dobrar: a de baixo está tapada pela fotografia.
       */}
      <Watermark />
    </AbsoluteFill>
  );
};

// ─── 10. a mãozinha da chamada ───────────────────────────────────────────────
/**
 * A MÃOZINHA A CLICAR NO "COMENTA FINMOOVI" — pedido direto do dono:
 * *"quando fala comenta FinMoovi, no shorts tem a mãozinha caminhando e clicando com
 * som no finmoovi, isso que eu quero no vídeo."*
 *
 * Ela já existe, desenhada e afinada, dentro do render do Short: a mão viaja numa
 * curva, a pílula afunda, há um flash e um anel de clique. Aqui é **reaproveitada tal
 * e qual** — e o `clickPressOffset` é a MESMA conta que o Short usa para marcar o
 * instante do toque, o que garante que o som cai no fotograma exato do clique.
 * ⚠️ Nada do `scenes.tsx` foi alterado.
 */
export const momentoDoClique = clickPressOffset;

export const MaoQueClica: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame, fps, config: { damping: 18, mass: 0.7 } });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', paddingBottom: FUNDO_LIVRE - 80 }}>
      <div style={{ transform: `scale(${1.45 * interpolate(entra, [0, 1], [0.92, 1])})`, opacity: entra }}>
        <ShotMetaphor metaphor="clique-link" life={frames} />
      </div>
    </AbsoluteFill>
  );
};

// ─── 11. os ícones que entram com o som ──────────────────────────────────────
/**
 * O ÍCONE APARECE COM O SOM, NA PALAVRA — pedido do dono depois de ver o vídeo:
 * *"ainda sinto falta de entrar algumas animações, ícones de movimento… quando há muito
 * texto, aqui deveria, quando se falar, aparecer um ícone relacionado JUNTO COM O SOM."*
 *
 * ⚠️ Os momentos NÃO são escolhidos aqui. Vêm do `disparosDaCena`, o mesmo que escolhe
 * os sons — se cada camada escolhesse os seus, mais tarde ou mais cedo aparecia um ícone
 * mudo e ouvia-se um som invisível.
 *
 * ⚠️ E NÃO É O `IconBurst` DO SHORT, embora ele exista e faça quase isto. Duas razões
 * medidas: ele desenha a `top: 300` no meio do ecrã — num vertical de 1920 de altura é o
 * terço superior, em 16:9 é **em cima do texto**; e ele dispara em TODA a palavra-gatilho,
 * o que num vídeo de 933 palavras sobre dívida seria um ícone quase permanente.
 * Aqui o ícone vive no canto, entra a rodar, respira e sai.
 */
export const IconesDaCena: React.FC<{
  narration: string; frames: number; words?: PalavraDita[];
}> = ({ narration, frames, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timings = words && words.length ? wordTimingsFromReal(words, fps) : layoutWords(narration, frames);
  const disparos = disparosDaCena(timings, fps);

  const VIDA = Math.round(fps * 1.6);
  const activo = [...disparos].reverse().find((d) => frame >= d.from && frame - d.from < VIDA);
  if (!activo) return null;

  const local = frame - activo.from;
  const pop = spring({ frame: local, fps, config: { damping: 11, mass: 0.45 } });
  const fade = interpolate(local, [0, 5, VIDA - 10, VIDA], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const flutua = Math.sin(local / 7) * 9;
  const gira = interpolate(pop, [0, 1], [-22, 0]) + Math.sin(local / 22) * 3;
  const Icone = SHOT_ICONS[activo.chave as keyof typeof SHOT_ICONS];
  if (!Icone) return null;

  return (
    <div style={{
      position: 'absolute', left: 96, bottom: 250,
      opacity: fade,
      transform: `translateY(${flutua}px) scale(${interpolate(pop, [0, 1], [0.35, 1])}) rotate(${gira}deg)`,
      filter: 'drop-shadow(0 10px 34px rgba(139,92,246,0.55))',
    }}>
      <Icone />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// A TELA FINAL — IMPL20 §61 (06/08/2026)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ⚠️ **DEZ SEGUNDOS, E O NÚMERO NÃO É AO ACASO.** O YouTube só deixa pôr os cartões
 * clicáveis (a "tela final") nos **últimos 5 a 20 segundos** do vídeo. Menos de 5 e ele
 * recusa; muito mais e ninguém fica. Dez dá tempo de ler as duas coisas e ainda sobra
 * para clicar.
 */
export const TELA_FINAL_FRAMES = 300; // 10s a 30fps

/**
 * A TELA FINAL DO VÍDEO LONGO — o que fica no ecrã quando a narração acaba.
 *
 * ═══ O PROBLEMA QUE ELA RESOLVE ═══
 * O vídeo acabava em 2,5 segundos de assinatura e **o espectador ficava sem destino** —
 * o YouTube enche o ecrã com sugestões de OUTROS canais. O dono: *"só para que o vídeo
 * não fique sem nada no final e percamos espectadores para concorrentes"*.
 *
 * ═══ 🔴 A PARTE CLICÁVEL NÃO É NOSSA, E NÃO PODE SER ═══
 * Os cartões em que se clica são a **tela final do YouTube**, e **não existem na API**
 * (pedido aberto na Google desde janeiro de 2025). Põem-se à mão no Studio — mas só na
 * PRIMEIRA vez: a partir daí o editor tem *"Importar de outro vídeo"*, e são dois
 * cliques por semana.
 *
 * **Então o que este ecrã faz é preparar o sítio para eles.** As duas molduras vazias —
 * o retângulo e o círculo — são onde o dono larga o cartão da playlist e o de inscrever.
 * Sem elas, os cartões do YouTube caem por cima do desenho e fica tudo sujo; com elas,
 * parece que o vídeo foi desenhado à volta deles. **É o mesmo truque do carimbo dentro
 * do Short (§53): quando não se manda na ferramenta, veste-se o que ela faz.**
 *
 * ⚠️ **A PLAYLIST E NÃO "O PRÓXIMO VÍDEO"** — decisão do dono, e está certa: quando este
 * vídeo é feito, o próximo ainda não existe, e um cartão a apontar para um vídeo que
 * ainda não foi escrito é um cartão que aponta para o vazio. A playlist nunca fica
 * desatualizada e ainda encadeia vários (§59).
 *
 * ⚠️ **É SEMPRE A MESMA, E NÃO SE GERA POR VÍDEO.** Nada aqui depende do assunto: o
 * fundo é uma arte só, feita uma vez, e o texto é fixo. Custo por vídeo: **zero**.
 *
 * ⚠️ **AS MARGENS SÃO 6%** — o YouTube não deixa pôr cartões coladinhos à borda, e um
 * desenho que encoste lá fica com metade tapada.
 */
/**
 * A ARTE DE FUNDO DA TELA FINAL — feita UMA vez pela Manus, usada em todos os vídeos.
 *
 * ⚠️ **SE O FICHEIRO NÃO EXISTIR, ISTO DESAPARECE EM SILÊNCIO E O VÍDEO SAI À MESMA.**
 * O fundo desenhado por nós já está por baixo. Uma imagem em falta **não pode** derrubar
 * um render de 36 minutos — é a mesma regra da capa do Reel e do primeiro comentário.
 *
 * Onde pôr o ficheiro: `youtube-render/public/manus/tela-final.jpg` (1920×1080).
 */
const FundoDaManus: React.FC = () => {
  const [falhou, setFalhou] = React.useState(false);
  if (falhou) return null;
  return (
    <AbsoluteFill>
      <img
        src={staticFile('manus/tela-final.jpg')}
        onError={() => setFalhou(true)}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {/* Um véu por cima: seja qual for a arte, o texto tem de continuar a ler-se. */}
      <AbsoluteFill style={{ background: `${BRAND.bg}66` }} />
    </AbsoluteFill>
  );
};

export const TelaFinal: React.FC<{ frames?: number }> = ({ frames = TELA_FINAL_FRAMES }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entra = spring({ frame, fps, config: { damping: 18, mass: 0.9 } });
  // Sai nos últimos 8 fotogramas, para não cortar a seco no fim do ficheiro.
  const sai = interpolate(frame, [frames - 8, frames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // Nada fica parado — a regra do dono desde 04/08.
  const aproxima = interpolate(frame, [0, frames], [1.03, 1]);
  const pulsa = 0.5 + 0.5 * Math.sin((frame / fps) * 2.2);

  /** A moldura vazia onde o cartão do YouTube vai aterrar. */
  /**
   * 🔴 O FAROL — 08/08/2026, ordem do dono: a tela final tinha **8,8 segundos
   * praticamente congelados** (medido na tira de fotogramas do vídeo que foi ao ar).
   * Os dois cartões entravam nos primeiros 1,5s e depois nada mais acontecia.
   *
   * Ele decidiu manter os 10 segundos — é onde vivem os cartões clicáveis do YouTube —
   * e mandou animar. Então a atenção passa de um cartão para o outro **a cada 2
   * segundos**: o que está "da vez" ganha borda viva e um halo que cresce e assenta.
   *
   * ⚠️ Não é enfeite: é exactamente o gesto que se quer que o espectador faça —
   * olhar para um, depois para o outro. E cumpre a regra dos 2,5 segundos sem
   * acrescentar um único som novo a uma tela que já tem a voz da assinatura.
   */
  const CICLO_DO_FAROL = 60; // 2 segundos
  const farolDe = (indice: number) => {
    const desdeQueEntrou = frame - 34;
    if (desdeQueEntrou < 0) return 0;
    const vez = Math.floor(desdeQueEntrou / CICLO_DO_FAROL) % 2;
    if (vez !== indice) return 0;
    const dentro = desdeQueEntrou % CICLO_DO_FAROL;
    return interpolate(dentro, [0, 8, 40, CICLO_DO_FAROL], [0, 1, 0.75, 0], { extrapolateRight: 'clamp' });
  };

  /**
   * ⚠️ **A PRIMEIRA VERSÃO DO FAROL ERA SUBTIL DEMAIS E NÃO CONTOU COMO MOVIMENTO.**
   * Medido no vídeo renderizado: a tela final continuava a marcar **dois trechos
   * parados de 3,8 segundos** na tira de fotogramas, apesar do farol. Mexer só na
   * borda e na sombra de um cartão não move pixels que cheguem — nem para a régua,
   * nem para o olho.
   *
   * Então o cartão da vez passa a **crescer 6%** (era 2,2%) e a coluna do texto passa
   * a deslizar devagar mas SEM PARAR. Isto é o que faz a diferença entre "há um
   * detalhe a mudar" e "a tela está viva".
   */
  const deslizeDoTexto = Math.sin(frame / 44) * 9;

  const Moldura: React.FC<{ estilo: React.CSSProperties; rotulo: string; redonda?: boolean; atraso: number; farol?: number }> = ({ estilo, rotulo, redonda, atraso, farol = 0 }) => {
    const ap = spring({ frame: frame - atraso, fps, config: { damping: 16, mass: 0.8 } });
    return (
      <div style={{
        position: 'absolute',
        ...estilo,
        opacity: ap,
        transform: `scale(${interpolate(ap, [0, 1], [0.94, 1]) * (1 + farol * 0.06)})`,
        borderRadius: redonda ? '50%' : 22,
        border: `${3 + farol * 2}px dashed ${BRAND.cyan}${redonda ? '66' : '55'}`,
        background: `${BRAND.panel}cc`,
        boxShadow: `0 0 ${40 + pulsa * 30 + farol * 70}px ${BRAND.violet}${farol > 0.35 ? '88' : '33'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: 18,
      }}>
        <span style={{
          fontFamily: BODY, fontWeight: 800, fontSize: redonda ? 26 : 30,
          letterSpacing: 3, color: BRAND.sub, textTransform: 'uppercase', lineHeight: 1.25,
        }}>{rotulo}</span>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ opacity: sai, overflow: 'hidden' }}>
      {/*
        O fundo desenhado por nós — e é ele que fica se a arte da Manus não existir.
        ⚠️ **A ORDEM IMPORTA:** o nosso vem PRIMEIRO e a arte por cima. Assim, no dia em
        que o ficheiro faltar (ou vier estragado), a tela final continua a sair bonita em
        vez de sair preta. **Nada de imagem pode derrubar um vídeo de 36 minutos.**
      */}
      <FundoAbstrato variante={2} frames={frames} />
      <FundoDaManus />
      <AbsoluteFill style={{
        background: `radial-gradient(circle at 30% 45%, ${BRAND.violet}2e, ${BRAND.bg}00 62%)`,
      }} />

      <AbsoluteFill style={{ transform: `scale(${aproxima})` }}>
        {/* ── o lado do texto (esquerda) ── */}
        <div style={{
          position: 'absolute', left: '6%', top: '22%', width: '42%',
          opacity: entra,
          transform: `translateX(${interpolate(entra, [0, 1], [-40, 0]) + deslizeDoTexto}px)`,
        }}>
          {/* ⚠️ A marca já está no alto do ecrã (a `Watermark`) — repeti-la aqui era
              dizer o nome duas vezes no mesmo quadro. */}
          <div style={{
            fontFamily: DISPLAY, fontWeight: 900, fontSize: 100, lineHeight: 1.05,
            ...gradientText,
          }}>Continue<br />por aqui</div>
          <div style={{
            marginTop: 28, height: 8, borderRadius: 4, width: 420,
            background: BRAND.gradient,
          }} />
          {/*
            🔴 PORTUGUÊS DO BRASIL. A primeira versão dizia *"escolhe"* e
            *"inscreve-te"* — português de Portugal, num canal brasileiro. Passaria num
            vídeo por semana, para sempre, e ninguém o teria escrito de propósito: é a
            língua de quem escreve o código a escapar para o ecrã.
          */}
          <div style={{
            marginTop: 34, fontFamily: BODY, fontWeight: 600, fontSize: 40,
            color: BRAND.text, lineHeight: 1.4,
          }}>
            Escolha o próximo aí do lado —<br />
            e <span style={{ color: BRAND.cyan, fontWeight: 800 }}>se inscreva</span> pra não perder o de domingo.
          </div>
          <div style={{
            marginTop: 30, fontFamily: BODY, fontWeight: 700, fontSize: 30, color: BRAND.sub,
          }}>app.finmoovi.com · grátis, sem instalar</div>
        </div>

        {/*
          ── os dois lugares dos cartões do YouTube ──
          ⚠️ As medidas são em percentagem do quadro, e nunca colam à borda (margem de 6%).
          O retângulo é 16:9, que é a forma do cartão de playlist; o círculo é a forma do
          cartão de inscrever. Se um dia estas proporções mudarem no YouTube, é AQUI que
          se acerta — e vê-se no vídeo, não no código.
        */}
        <Moldura
          atraso={10}
          rotulo={'▶  A PLAYLIST\ndo canal'}
          farol={farolDe(0)}
          estilo={{ left: '54%', top: '14%', width: '38%', height: '38%' }}
        />
        {/*
          ⚠️ **NADA ENCOSTA AO FUNDO DO QUADRO.** Os controlos do leitor do YouTube
          aparecem por cima dos últimos ~10% do ecrã, e um cartão ali fica meio tapado
          quando o espectador mexe o rato. Este círculo acaba aos 88%, com folga.
        */}
        <Moldura
          atraso={22}
          redonda
          rotulo={'INSCREVA-SE'}
          farol={farolDe(1)}
          estilo={{ left: '63.5%', top: '56%', width: '18.5%', height: '32.9%' }}
        />
      </AbsoluteFill>

      <Watermark />
    </AbsoluteFill>
  );
};
