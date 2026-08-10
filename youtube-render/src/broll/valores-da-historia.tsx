import React, { createContext, useContext } from 'react';

/**
 * OS VALORES DA HISTÓRIA DENTRO DAS TELAS DO APP — 10/08/2026.
 *
 * ═══ 🔴 O DEFEITO QUE ISTO CONSERTA, E É A QUEIXA Nº 1 DO DONO ═══
 * As dezasseis telas do catálogo (`broll/*.ts`) têm os valores GRAVADOS, tirados da
 * gravação do ecrã: fatura **R$ 1.240**, limite **R$ 5.000**, disponível R$ 3.760. Num
 * vídeo cuja história fala de trezentos reais, elas põem no ecrã números que a voz nunca
 * diz — e um que a contradiz. Palavras dele, sobre o primeiro vídeo longo: *"fala
 * R$ 1.200 mas está mostrando um b-roll de R$ 5.000"*.
 *
 * Por causa disso o b-roll do catálogo foi **desligado inteiro** no vídeo longo
 * (`BROLL_PERMITIDO = []` em `lib/imagens-longo.js`), com esta nota ao lado: *"no dia em
 * que as telas do catálogo souberem receber os valores do guião, elas voltam para aqui"*.
 * É esse dia. Ordem do dono, 10/08: *"usar mais nossos b-rolls"*.
 *
 * ═══ ⚠️ POR QUE UM ENVELOPE E NÃO PARÂMETROS ═══
 * As telas leem o objeto de dados **directamente do módulo**, em dezenas de sítios. Passar
 * tudo por parâmetro obrigaria a mudar cada um deles — e cada mudança é uma hipótese de
 * partir o **Short que publica todos os dias**.
 *
 * Aqui a peça só muda de `cartoes.faturaValue` para `d.faturaValue`, onde `d` é o mesmo
 * objeto de sempre **quando ninguém pôs nada no envelope**. E ninguém põe, excepto o
 * vídeo longo.
 *
 * ═══ 🔴 A GARANTIA, E É ELA QUE TORNA ISTO SEGURO ═══
 * **O Short nunca abre o envelope.** `CartoesCountUpShort` continua a ser exactamente a
 * mesma função de antes: não está dentro de nenhum `ValoresDaHistoria`, portanto
 * `useContext` devolve vazio e `useDados` devolve o objeto original, campo a campo.
 * Não é uma promessa — é o que o código faz. E é a mesma forma que fez o Short de 16s
 * não mudar **um único pixel de 2.073.600** em 08/08, quando o `impacto.tsx` ganhou o
 * `formato`: uma opção nova com o comportamento antigo por omissão.
 *
 * ⚠️ **O QUE NÃO ENTRA AQUI:** as telas que usam a GRAVAÇÃO do ecrã (Mosaico, Carrossel,
 * Quadro). Nessas o número está dentro do vídeo gravado e não há parâmetro que o mude —
 * continuam de fora do vídeo longo, e é a razão certa.
 */
export type ValoresDaHistoria = Record<string, unknown>;

const Envelope = createContext<ValoresDaHistoria | null>(null);

/**
 * Abre o envelope para tudo o que estiver lá dentro. **Só o vídeo longo usa isto.**
 * @param valores por família de dados: `{ cartoes: {...}, extrato: {...} }`
 */
export const ComValoresDaHistoria: React.FC<{
  valores?: Record<string, ValoresDaHistoria> | null;
  children: React.ReactNode;
}> = ({ valores, children }) => (
  <Envelope.Provider value={valores || null}>{children}</Envelope.Provider>
);

/**
 * Os dados desta tela: os de sempre, com o que a história tiver por cima.
 *
 * ⚠️ **Sem envelope devolve o objeto ORIGINAL, e não uma cópia** — para não haver nem a
 * hipótese de uma diferença de referência mudar seja o que for no Short.
 */
export function useDados<T extends object>(padrao: T, familia: string): T {
  const envelope = useContext(Envelope);
  const daHistoria = envelope?.[familia] as Partial<T> | undefined;
  if (!daHistoria) return padrao;
  return { ...padrao, ...daHistoria };
}
