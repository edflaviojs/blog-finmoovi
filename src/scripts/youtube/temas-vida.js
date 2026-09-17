/**
 * O CATÁLOGO DA VIDA — a fonte de temas do Short de 16s em loop (07/08/2026).
 *
 * ═══ POR QUE EXISTE, E POR QUE NÃO USA O GLOSSÁRIO ═══
 * Ordem do dono, ao aprovar os dois Shorts de 16s por dia: *"para não se esgotar os
 * temas, não deve mexer na sequência do glossário"*. O glossário tem 249 termos e
 * serve o Short de 50s há semanas, na ordem dele. Se o formato novo comesse dessa
 * mesma fila, três vídeos por dia esvaziariam-na em ~79 dias E baralhariam a ordem
 * que já está a correr.
 *
 * A saída não é uma fila maior: é uma MATRIZ.
 *
 *     40 situações da vida  ×  10 ganchos  =  400 vídeos diferentes
 *
 * A 2 por dia isso dá mais de seis meses, e cresce só de acrescentar uma linha aqui
 * — sem IA, sem custo, sem tocar em nada do que já corre.
 *
 * ═══ O QUE MANDA NO CONTEÚDO ═══
 * O público, nas palavras do dono: *"família brasileira, coisas do dia a dia, de
 * homens e mulheres casados que precisam controlar gastos e equilibrar as contas…
 * classe baixa e média"*. Por isso NENHUMA situação aqui é um conceito financeiro.
 * São cenas de casa: a fatura que veio maior, o carro que quebrou no meio do mês, a
 * reforma do banheiro que sempre adia.
 *
 * ⚠️ **NENHUMA SITUAÇÃO TRAZ NÚMERO, e é de propósito.** Em 07/08 o canal ficou sem
 * vídeo porque o tema sorteado tinha um valor em dinheiro no enunciado e as travas de
 * número tornaram-no impossível de escrever. Aqui o vídeo conta uma HISTÓRIA, não faz
 * uma conta — e o que não existe no tema não pode envenená-lo.
 *
 * ═══ OS DOIS TURNOS ═══
 * O dono marcou 9h e 19h. De manhã e de noite não é a mesma pessoa a ver:
 *   · manhã (9h) → PLANEJAR: o carro, a reforma, o seguro, o futuro dos filhos.
 *   · noite (19h) → O APERTO: a conta que chegou, a fatura, o mercado caro.
 *
 * ═══ O SORTEIO NÃO É SORTEIO ═══
 * É rodízio pelo MENOS USADO, com desempate pela ordem de escrita. Assim cada gancho
 * apanha o mesmo número de vídeos, que é o que torna honesta a medição de retenção
 * por gancho (§ do relatório de segunda). Aleatório dava a uns 8 vídeos e a outros 1,
 * e no fim não se saberia se o gancho é mau ou se teve azar de tema.
 *
 * Uso:
 *   node src/scripts/youtube/temas-vida.js --turno=manha
 *   node src/scripts/youtube/temas-vida.js --turno=noite --excluir=fatura-maior --verbose
 *   node src/scripts/youtube/temas-vida.js marcar --situacao=fatura-maior --gancho=nunca-faca
 *   node src/scripts/youtube/temas-vida.js listar
 *
 * Saída: `VIDA:<situacao>:<gancho>` na ÚLTIMA linha do stdout (o resto vai para
 * stderr, como no pick-next-short). Código 78 = nada a fazer (sucesso neutro).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
/**
 * ⚠️ A régua dos 70% vem de `retencao.js` e NÃO se escreve outra vez aqui. Uma régua em
 * dois sítios é a família de defeito nº1 desta casa: no dia em que alguém mudar o número
 * e esquecer uma cópia, os dois lados passam a discordar em silêncio.
 *
 * ⚠️ Importar `retencao.js` é seguro e está provado: ele só corre a medição quando é
 * chamado PELO NOME (a guarda `chamadoPeloNome`, no fim daquele ficheiro, existe
 * exactamente porque uma prova de mesa já disparou a medição sem querer).
 */
import { RETENCAO_MINIMA } from './retencao.js';

const ROOT = process.cwd();
const ESTADO = join(ROOT, '.github', 'data', 'vida-usados.json');
const NOTHING_TO_DO = 78;

/** O que a última medição do canal apurou. Escrito por `retencao.js`. */
const MEDICAO = join(ROOT, '.github', 'data', 'youtube-retencao.json');

/**
 * AS 40 SITUAÇÕES — a lista que o dono leu e aprovou em 07/08/2026.
 *
 * `titulo`  → o que aparece na etiqueta do vídeo e alimenta o título do YouTube.
 * `cena`    → a imagem concreta que o escritor tem de encenar. É isto que impede o
 *             roteiro de virar conselho genérico: uma cena tem lugar, hora e gente.
 * `chave`   → a palavra que vai em MAIÚSCULAS no título (regra do dono, 06/08).
 * `metafora`→ qual das 32 ilustrações já desenhadas encena esta situação.
 * `valor` + `valorDoQue` → ver abaixo. Desde 17/09.
 *
 * ⚠️ **A METÁFORA É ESCOLHIDA AQUI, À MÃO, E NÃO PELA IA.** Nos vídeos de 50s, cinco
 * dos últimos seis tiveram erro de âncora porque o modelo inventava a imagem. Com o
 * mapa fixo isso deixa de ser possível: cada situação já nasce com a sua ilustração,
 * e o significado sai do catálogo que já existe (`METAPHOR_MEANINGS` em
 * `lib/schema-short.js`) — não de gosto meu. Como as situações rodam em ordem, duas
 * seguidas nunca partilham a mesma imagem.
 *
 * ═══ ♦ 17/09/2026 — O VALOR, E POR QUE ELE NASCEU ═══
 *
 * 🔴 **MEDIDO:** metade da audiência sai ao SEGUNDO 6. Aos 3s ainda lá estão todos
 * (92%–143%). O gancho funciona; o que vem a seguir é que não diz nada. E não dizia por
 * ORDEM ESCRITA: `roteiro-loop.js` reprovava qualquer roteiro com um número. Varridos os
 * 80 roteiros deste formato, **80 em 80 não tinham um único número, valor ou dado.**
 *
 * A proibição nasceu certa, a 07/08: o canal ficou sem vídeo porque as travas de número
 * tornaram um roteiro impossível de escrever. O conserto matou o problema — e a
 * substância com ele. Isto devolve a substância SEM devolver o problema.
 *
 * ⚠️ **A IA NUNCA ESCOLHE O NÚMERO. Ela recebe-o.** É a mesma disciplina da metáfora
 * aqui em cima: não se pede ao modelo que não invente — tira-se-lhe o caminho de
 * inventar. O `valor` é dado no pedido, é exigido à letra na 2ª fala, e QUALQUER outro
 * algarismo no roteiro reprova. Some a classe inteira de "número inventado", que era
 * exactamente o que a proibição de 07/08 protegia.
 *
 * ⚠️ **ESTES VALORES SÃO DA HISTÓRIA, NÃO SÃO ESTATÍSTICA.** "Paguei R$ 130 no botijão"
 * é o narrador a contar o que lhe aconteceu — não é uma afirmação sobre o Brasil, não
 * precisa de fonte e não pode ser lida como tal. Para número sobre o MUNDO (Selic, IPCA)
 * existe `src/data/statistics.json`, que vem do Banco Central e do IBGE; nunca se
 * escreve um desses à mão.
 *
 * 📋 **PENDENTE DE REVISÃO DO DONO.** Foram escolhidos plausíveis para uma família
 * brasileira de classe média/baixa em 2026, mas quem vive o preço é ele. Um valor
 * irreal não parte o robô — só faz o vídeo soar falso, que é o que se veio consertar.
 */
export const SITUACOES = [
  // ── MANHÃ (9h) — planejar ───────────────────────────────────────────────────
  { id: 'entrada-do-carro', turno: 'manha', titulo: 'Juntar a entrada do carro', chave: 'CARRO', metafora: 'escada', cena: 'o casal olhando o anúncio do carro usado e fazendo a conta da entrada', valor: 'R$ 8.000', valorDoQue: 'a entrada que o vendedor pediu no carro usado' },
  { id: 'reforma-banheiro', turno: 'manha', titulo: 'A reforma que sempre adia', chave: 'REFORMA', metafora: 'ampulheta', cena: 'o azulejo solto do banheiro que já está assim faz dois anos', valor: 'R$ 1.400', valorDoQue: 'o orçamento do pedreiro para o azulejo solto' },
  { id: 'seguro-venceu', turno: 'manha', titulo: 'O seguro que venceu', chave: 'SEGURO', metafora: 'escudo', cena: 'a mensagem do corretor avisando que o seguro venceu ontem', valor: 'R$ 2.300', valorDoQue: 'o conserto que eu paguei do bolso com o seguro vencido' },
  { id: 'guardar-salario-curto', turno: 'manha', titulo: 'Guardar com salário curto', chave: 'GUARDAR', metafora: 'balde-furado', cena: 'o envelope onde sobrava dinheiro e agora não sobra', valor: 'R$ 50', valorDoQue: 'o pouco que eu consegui separar na primeira semana' },
  { id: 'escola-ano-que-vem', turno: 'manha', titulo: 'A escola do ano que vem', chave: 'ESCOLA', metafora: 'relogio', cena: 'a lista da matrícula chegando em novembro', valor: 'R$ 900', valorDoQue: 'a matrícula que chegou em novembro' },
  { id: 'geladeira-nova', turno: 'manha', titulo: 'Trocar a geladeira', chave: 'GELADEIRA', metafora: 'ratoeira', cena: 'a geladeira velha fazendo barulho de madrugada', valor: 'R$ 2.600', valorDoQue: 'a geladeira nova que eu acabei comprando às pressas' },
  { id: 'primeiro-guardado', turno: 'manha', titulo: 'O primeiro dinheiro guardado', chave: 'GUARDADO', metafora: 'semente', cena: 'o casal fechando o mês com dinheiro sobrando pela primeira vez', valor: 'R$ 300', valorDoQue: 'o que sobrou no fim do mês pela primeira vez' },
  { id: 'sair-do-aluguel', turno: 'manha', titulo: 'Sair do aluguel', chave: 'ALUGUEL', metafora: 'ralo', cena: 'o boleto do aluguel que sobe todo ano e nunca vira nada seu', valor: 'R$ 1.500', valorDoQue: 'o aluguel que eu pago todo mês e nunca volta' },
  { id: 'viagem-fim-de-ano', turno: 'manha', titulo: 'A viagem de fim de ano', chave: 'VIAGEM', metafora: 'cofre', cena: 'as crianças pedindo praia em dezembro e o bolso dizendo não', valor: 'R$ 1.800', valorDoQue: 'o que a praia de dezembro custou para a família toda' },
  { id: 'decimo-terceiro', turno: 'manha', titulo: 'O 13º antes que suma', chave: '13º', metafora: 'fumaca', cena: 'o dinheiro do fim do ano caindo na conta e sumindo antes do carnaval', valor: 'R$ 2.400', valorDoQue: 'o décimo terceiro que caiu na conta e sumiu' },
  { id: 'reserva-emergencia', turno: 'manha', titulo: 'A reserva de emergência', chave: 'RESERVA', metafora: 'guarda-chuva', cena: 'o mês em que tudo quebrou junto e não tinha de onde tirar', valor: 'R$ 600', valorDoQue: 'o que eu passei a separar todo mês depois daquele susto' },
  { id: 'limpar-o-nome', turno: 'manha', titulo: 'Limpar o nome', chave: 'NOME', metafora: 'buraco', cena: 'a compra recusada na loja na frente dos outros', valor: 'R$ 380', valorDoQue: 'a dívida velha que sujou o meu nome' },
  { id: 'trocar-divida-cara', turno: 'manha', titulo: 'Trocar dívida cara por barata', chave: 'DÍVIDA', metafora: 'balanca', cena: 'a pessoa pagando a dívida mais barata primeiro e a cara crescendo', valor: 'R$ 4.000', valorDoQue: 'a dívida cara que eu deixei crescer enquanto pagava a barata' },
  { id: 'conta-so-das-contas', turno: 'manha', titulo: 'Uma conta só para as contas', chave: 'CONTA', metafora: 'bifurcacao', cena: 'o salário caindo tudo junto e sumindo tudo junto', valor: 'R$ 2.100', valorDoQue: 'o que sai em boleto todo mês lá em casa' },
  { id: 'dividir-sem-brigar', turno: 'manha', titulo: 'Dividir as contas sem brigar', chave: 'CASAL', metafora: 'gangorra', cena: 'a discussão de domingo sobre quem pagou o quê', valor: 'R$ 3.200', valorDoQue: 'o total das contas que a gente divide todo mês' },
  { id: 'plano-de-saude-subiu', turno: 'manha', titulo: 'O plano de saúde que subiu', chave: 'PLANO', metafora: 'bola-neve', cena: 'a carta do reajuste chegando no aniversário do contrato', valor: 'R$ 240', valorDoQue: 'quanto o plano de saúde subiu de um mês para o outro' },
  { id: 'pagar-a-vista', turno: 'manha', titulo: 'Pagar à vista e pedir desconto', chave: 'DESCONTO', metafora: 'duas-portas', cena: 'a vergonha de perguntar quanto fica à vista', valor: 'R$ 150', valorDoQue: 'o desconto que eu ganhei só por ter perguntado' },
  { id: 'vender-o-parado', turno: 'manha', titulo: 'Vender o que está parado', chave: 'VENDER', metafora: 'semente', cena: 'a garagem cheia de coisa que ninguém usa há anos', valor: 'R$ 700', valorDoQue: 'o que eu tirei vendendo o que estava parado na garagem' },
  { id: 'dinheiro-so-seu', turno: 'manha', titulo: 'Um dinheiro só seu', chave: 'SEU', metafora: 'cofre', cena: 'ter que pedir para o outro toda vez que quer comprar algo pequeno', valor: 'R$ 200', valorDoQue: 'o que eu passei a guardar como dinheiro só meu' },
  { id: 'aposentadoria-por-conta', turno: 'manha', titulo: 'Aposentadoria de quem é autônomo', chave: 'APOSENTADORIA', metafora: 'ampulheta', cena: 'quem trabalha por conta e nunca contribuiu com nada', valor: 'R$ 180', valorDoQue: 'a contribuição por mês que eu nunca cheguei a pagar' },

  // ── NOITE (19h) — o aperto ──────────────────────────────────────────────────
  { id: 'fatura-maior', turno: 'noite', titulo: 'A fatura veio maior', chave: 'FATURA', metafora: 'bola-neve', cena: 'abrir o aplicativo do banco e o valor da fatura não bater com a lembrança', valor: 'R$ 1.900', valorDoQue: 'a fatura que veio maior do que eu lembrava' },
  { id: 'conta-de-luz', turno: 'noite', titulo: 'A conta de luz do verão', chave: 'LUZ', metafora: 'ralo', cena: 'a conta de janeiro chegando depois de um mês de ventilador ligado', valor: 'R$ 420', valorDoQue: 'a conta de luz de janeiro' },
  { id: 'pagar-o-minimo', turno: 'noite', titulo: 'Pagar só o mínimo', chave: 'MÍNIMO', metafora: 'ratoeira', cena: 'o dedo hesitando entre pagar tudo e pagar o mínimo', valor: 'R$ 90', valorDoQue: 'o mínimo que eu paguei e que virou bola de neve' },
  { id: 'mercado-subindo', turno: 'noite', titulo: 'O mercado que sobe toda semana', chave: 'MERCADO', metafora: 'escada', cena: 'o mesmo carrinho de sempre custando mais do que no mês passado', valor: 'R$ 640', valorDoQue: 'o mesmo carrinho de sempre, agora' },
  { id: 'carro-quebrou', turno: 'noite', titulo: 'O carro quebrou no meio do mês', chave: 'CARRO', metafora: 'domino', cena: 'o carro parado na oficina no meio do mês', valor: 'R$ 1.200', valorDoQue: 'o conserto que apareceu no meio do mês' },
  { id: 'dentista-das-criancas', turno: 'noite', titulo: 'O dentista das crianças', chave: 'DENTISTA', metafora: 'buraco', cena: 'o orçamento do aparelho na mão, sem saber de onde tirar', valor: 'R$ 3.500', valorDoQue: 'o aparelho da minha filha' },
  { id: 'emprestimo-por-telefone', turno: 'noite', titulo: 'O empréstimo que o banco ofereceu', chave: 'EMPRÉSTIMO', metafora: 'areia-movedica', cena: 'a ligação do banco oferecendo dinheiro fácil bem no fim do mês', valor: 'R$ 5.000', valorDoQue: 'o dinheiro fácil que o banco ofereceu por telefone' },
  { id: 'dez-vezes-sem-juros', turno: 'noite', titulo: 'O sem juros que virou rombo', chave: 'PARCELA', metafora: 'mochila-pedras', cena: 'a fatura do mês seguinte com um monte de parcelas diferentes dentro', valor: 'R$ 780', valorDoQue: 'a soma das parcelas que caíram todas na mesma fatura' },
  { id: 'remedio-todo-mes', turno: 'noite', titulo: 'O remédio de todo mês', chave: 'REMÉDIO', metafora: 'balde-furado', cena: 'a receita contínua que não dá para adiar nem para negociar', valor: 'R$ 260', valorDoQue: 'o remédio de uso contínuo, todo mês' },
  { id: 'ipva-e-iptu', turno: 'noite', titulo: 'IPVA e IPTU de janeiro', chave: 'JANEIRO', metafora: 'avalanche', cena: 'os dois carnês chegando na mesma semana de janeiro', valor: 'R$ 1.600', valorDoQue: 'os dois carnês que chegaram na mesma semana' },
  { id: 'material-escolar', turno: 'noite', titulo: 'O material escolar', chave: 'MATERIAL', metafora: 'mochila-pedras', cena: 'a lista da escola na papelaria e a calculadora do celular na mão', valor: 'R$ 550', valorDoQue: 'a lista da escola inteira na papelaria' },
  { id: 'gas-acabou', turno: 'noite', titulo: 'O gás que acabou', chave: 'GÁS', metafora: 'escorregao', cena: 'o gás acabando no meio do almoço de domingo', valor: 'R$ 130', valorDoQue: 'o botijão que eu tive de comprar às pressas no domingo' },
  { id: 'aniversario-do-filho', turno: 'noite', titulo: 'Aniversário do filho', chave: 'ANIVERSÁRIO', metafora: 'bolha', cena: 'a festa que a criança pediu e o orçamento que não fecha', valor: 'R$ 800', valorDoQue: 'a festa que o meu filho pediu' },
  { id: 'presente-de-natal', turno: 'noite', titulo: 'O presente de Natal', chave: 'NATAL', metafora: 'fumaca', cena: 'dezembro chegando com a lista de presentes da família toda', valor: 'R$ 1.100', valorDoQue: 'a lista de presentes da família toda' },
  { id: 'delivery-de-sexta', turno: 'noite', titulo: 'O delivery de toda sexta', chave: 'DELIVERY', metafora: 'ralo', cena: 'o cansaço da sexta-feira decidindo o jantar pelo aplicativo', valor: 'R$ 320', valorDoQue: 'o delivery de quatro sextas somado no mês' },
  { id: 'assinaturas-esquecidas', turno: 'noite', titulo: 'As assinaturas que ninguém cancela', chave: 'ASSINATURA', metafora: 'balde-furado', cena: 'a fatura com serviços que ninguém em casa abre há meses', valor: 'R$ 95', valorDoQue: 'as assinaturas por mês que ninguém em casa abria' },
  { id: 'emprestar-pra-parente', turno: 'noite', titulo: 'Emprestar dinheiro pra parente', chave: 'EMPRESTAR', metafora: 'corda-bamba', cena: 'o parente pedindo emprestado e prometendo devolver no fim do mês', valor: 'R$ 500', valorDoQue: 'o que eu emprestei e nunca voltou' },
  { id: 'parcela-atrasada', turno: 'noite', titulo: 'A parcela que atrasou', chave: 'ATRASO', metafora: 'domino', cena: 'o boleto vencido no sábado, quando o banco está fechado', valor: 'R$ 45', valorDoQue: 'a multa do boleto que venceu no sábado' },
  { id: 'cheque-especial', turno: 'noite', titulo: 'O cheque especial', chave: 'ESPECIAL', metafora: 'areia-movedica', cena: 'a conta no vermelho que a pessoa nem percebeu que entrou', valor: 'R$ 210', valorDoQue: 'os juros do vermelho que eu nem vi entrar' },
  { id: 'saque-no-cartao', turno: 'noite', titulo: 'Sacar dinheiro no cartão', chave: 'SAQUE', metafora: 'ratoeira', cena: 'o caixa eletrônico tarde da noite e o cartão de crédito na mão', valor: 'R$ 60', valorDoQue: 'a taxa que me cobraram pelo saque no cartão' },
];

/**
 * OS 10 GANCHOS — a lista do dono, palavra por palavra dele (07/08/2026).
 *
 * `molde` é o formato da PRIMEIRA frase falada, que é também a primeira coisa
 * escrita na tela. `familia` é o nome curto que vai para o relatório de retenção:
 * é por ele que, dentro de duas semanas, se vai saber qual gancho segura gente e
 * qual não segura. Sem esse campo, medir gancho seria impossível.
 *
 * `assinatura` é o pedaço da frase que TEM de aparecer na primeira fala. É o que
 * transforma "usa este gancho" (um pedido, que o modelo ignora quando lhe convém) em
 * "sem isto o roteiro é reprovado" — a lição do [[prompt-versus-validador]]: o que o
 * prompt pede e nada pune, um dia deixa de acontecer.
 */
export const GANCHOS = [
  { id: 'faca-isso', familia: 'faça isso', molde: 'Se você quer [X], FAÇA ISSO', assinatura: /fa[çc]a isso/i },
  { id: 'se-parar', familia: 'e se parar', molde: 'O que acontece se você parar de [X]?', assinatura: /o que acontece se/i },
  { id: 'ta-perdendo', familia: 'tá perdendo', molde: 'Se você ainda faz [X], tá perdendo [Y]', assinatura: /t[áa] perdendo|est[áa] perdendo/i },
  { id: 'ninguem-fala', familia: 'ninguém fala', molde: 'Ninguém fala isso sobre [X], mas é real', assinatura: /ningu[ée]m fala/i },
  { id: 'comeca-assim', familia: 'começa assim', molde: 'Quer aprender [X]? Começa assim', assinatura: /come[çc]a assim/i },
  { id: 'depois-de-anos', familia: 'depois de anos', molde: 'Depois de anos tentando, descobri isso', assinatura: /depois de anos/i },
  { id: 'nunca-faca', familia: 'nunca faça', molde: 'Nunca faça [X]', assinatura: /nunca fa[çc]a/i },
  { id: 'voces-viram', familia: 'vocês viram', molde: 'Gente, vocês viram que [X]…', assinatura: /voc[êe]s viram/i },
  { id: 'e-serio-que', familia: 'é sério que', molde: 'É sério que ninguém está falando de [X]?', assinatura: /[ée] s[ée]rio que/i },
  { id: 'nao-vai-acreditar', familia: 'não vai acreditar', molde: 'Você não vai acreditar, mas…', assinatura: /n[ãa]o vai acreditar/i },
];

// ─── estado ───────────────────────────────────────────────────────────────────

/** O histórico de combinações já usadas. Nunca lança: ficheiro ilegível = lista vazia. */
export function lerUsados() {
  if (!existsSync(ESTADO)) return [];
  try {
    const data = JSON.parse(readFileSync(ESTADO, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function gravarUsados(lista) {
  mkdirSync(dirname(ESTADO), { recursive: true });
  writeFileSync(ESTADO, `${JSON.stringify(lista, null, 2)}\n`);
}

/** Marca uma combinação como usada. Idempotente por (situação, gancho). */
export function marcar({ situacao, gancho, turno = '', em = new Date().toISOString() }) {
  const lista = lerUsados();
  if (lista.some((u) => u.situacao === situacao && u.gancho === gancho)) return lista;
  lista.push({ situacao, gancho, turno, em });
  gravarUsados(lista);
  return lista;
}

// ─── o peso da medição ────────────────────────────────────────────────────────

/**
 * ♦ 17/09/2026 — O GANCHO FRACO PASSA A SAIR MENOS. E **NUNCA A ZERO**.
 *
 * ═══ O QUE ESTAVA ERRADO ═══
 * `retencao.js` media a retenção por gancho, imprimia-a e deitava-a fora. A escolha aqui
 * em baixo rodava por "quem usou menos". **Medido a 17/09** (medianas, nunca médias):
 * `ninguém fala` 107%, `tá perdendo` 79%, `faça isso` 75% … `não vai acreditar` 22%,
 * `depois de anos` 0%. **E o de 22% saía tantas vezes como o de 107%.**
 *
 * ═══ POR QUE NÃO SE ELIMINA O PIOR ═══
 * ⚠️ São 6 a 8 vídeos por gancho. **Isso é amostra fina**, e eliminar com esta evidência
 * seria congelar a opinião de hoje para sempre — o defeito de [[regua-grossa-demais-inventa-defeito]]
 * pelo outro lado. Por isso o gancho fraco não morre: ganha uma **dívida**, conta como se
 * já tivesse saído mais vezes, e continua a sair. À medida que sai, a amostra cresce e a
 * própria medição corrige-se. Quem estava mal julgado volta sozinho.
 *
 * ═══ AS DUAS SEGURANÇAS QUE NÃO SE NEGOCEIAM ═══
 * ⚠️ **Sem ficheiro de medição, ou com amostra curta, o comportamento é EXACTAMENTE o de
 * antes** — penalidade zero para todos. Uma regra nova que muda o robô sem dados seria
 * palpite disfarçado de número.
 * ⚠️ **Nunca lança.** Ficheiro ilegível, JSON partido, campo em falta: devolve vazio e o
 * robô segue. Um relatório partido não pode ser a razão de o canal ficar sem vídeo.
 */

/** Abaixo disto o gancho começa a pagar dívida. É a régua do dono, vinda de `retencao.js`. */
export const RETENCAO_ALVO = RETENCAO_MINIMA;
/** Menos vídeos COM AUDIÊNCIA do que isto e o gancho não é julgado — é o mesmo corte que o relatório usa para eleger o melhor. */
export const MIN_AUDIENCIA_PARA_JULGAR = 3;
/** Cada 25 pontos percentuais abaixo da régua valem uma unidade de dívida. */
const PASSO_DA_DIVIDA = 0.25;
/** O tecto da dívida. É ele que garante que nenhum gancho é eliminado de facto. */
export const DIVIDA_MAXIMA = 3;

/**
 * A dívida de cada gancho, por `familia` (é o campo que o roteiro grava e que o relatório
 * usa — o slug é conveniência e muda; a família é o registo).
 *
 * @returns {Map<string, number>} família → dívida (0 a {@link DIVIDA_MAXIMA}). Vazio = sem medição.
 */
export function dividaDosGanchos(caminho = MEDICAO) {
  const divida = new Map();
  let medicao;
  try {
    if (!existsSync(caminho)) return divida;
    medicao = JSON.parse(readFileSync(caminho, 'utf-8'));
  } catch {
    return divida; // relatório partido não trava o robô
  }
  const lista = Array.isArray(medicao && medicao.ganchos) ? medicao.ganchos : [];
  for (const g of lista) {
    const familia = g && g.familia;
    const nota = g && g.medianaRetencao;
    if (!familia || !Number.isFinite(nota)) continue;
    if ((g.comAudiencia || 0) < MIN_AUDIENCIA_PARA_JULGAR) continue; // ainda é cedo
    if (nota >= RETENCAO_ALVO) continue;                             // está bem, não deve nada
    const paga = Math.min(DIVIDA_MAXIMA, Math.max(1, Math.round((RETENCAO_ALVO - nota) / PASSO_DA_DIVIDA)));
    divida.set(familia, paga);
  }
  return divida;
}

// ─── escolha ──────────────────────────────────────────────────────────────────

/**
 * A PRÓXIMA COMBINAÇÃO DO TURNO.
 *
 * Regra, por ordem:
 *  1. A situação do turno **menos recentemente usada** (nunca usada ganha sempre).
 *  2. Dentro dela, o gancho de menor **contagem efectiva** = quantas vezes já saiu
 *     **mais a dívida** que a medição lhe deu (ver `dividaDosGanchos`). Sem medição a
 *     dívida é zero e isto volta a ser o "menos usado no canal inteiro" de sempre.
 *  3. A combinação exacta (situação+gancho) nunca se repete.
 *  4. Desempate pela ordem de escrita da lista. Sem aleatório: o mesmo estado dá
 *     sempre a mesma resposta, e um vídeo mau é reproduzível.
 */
export function escolher({ turno, excluir = [] } = {}) {
  const banidos = new Set(excluir.filter(Boolean));
  const usados = lerUsados();

  const combinacaoUsada = new Set(usados.map((u) => `${u.situacao}|${u.gancho}`));
  const ultimoUsoDaSituacao = new Map();
  const contagemDoGancho = new Map(GANCHOS.map((g) => [g.id, 0]));
  usados.forEach((u, i) => {
    ultimoUsoDaSituacao.set(u.situacao, i);
    contagemDoGancho.set(u.gancho, (contagemDoGancho.get(u.gancho) || 0) + 1);
  });

  const candidatas = SITUACOES
    .filter((s) => (turno ? s.turno === turno : true))
    .filter((s) => !banidos.has(s.id))
    // sem gancho livre = situação esgotada (já rodou os 10)
    .filter((s) => GANCHOS.some((g) => !combinacaoUsada.has(`${s.id}|${g.id}`)));

  if (candidatas.length === 0) return null;

  // -1 para quem nunca foi usada: ganha de qualquer uma que já saiu.
  candidatas.sort((a, b) => {
    const ua = ultimoUsoDaSituacao.has(a.id) ? ultimoUsoDaSituacao.get(a.id) : -1;
    const ub = ultimoUsoDaSituacao.has(b.id) ? ultimoUsoDaSituacao.get(b.id) : -1;
    if (ua !== ub) return ua - ub;
    return SITUACOES.indexOf(a) - SITUACOES.indexOf(b);
  });

  const situacao = candidatas[0];
  const ganchosLivres = GANCHOS.filter((g) => !combinacaoUsada.has(`${situacao.id}|${g.id}`));
  // A dívida lê-se UMA vez: dentro do `sort` seria um ficheiro aberto por comparação.
  const divida = dividaDosGanchos();
  const efectiva = (g) => (contagemDoGancho.get(g.id) || 0) + (divida.get(g.familia) || 0);
  ganchosLivres.sort((a, b) => {
    const ca = efectiva(a);
    const cb = efectiva(b);
    if (ca !== cb) return ca - cb;
    return GANCHOS.indexOf(a) - GANCHOS.indexOf(b);
  });

  return { situacao, gancho: ganchosLivres[0], divida: divida.get(ganchosLivres[0].familia) || 0 };
}

/** Quantas combinações ainda existem (para o aviso de fila curta). */
export function restantes() {
  const usados = new Set(lerUsados().map((u) => `${u.situacao}|${u.gancho}`));
  return SITUACOES.length * GANCHOS.length - usados.size;
}

/** Desmonta `VIDA:<situacao>:<gancho>` — o formato que viaja pelo workflow. */
export function lerId(id) {
  const m = /^VIDA:([^:]+):(.+)$/.exec(String(id || '').trim());
  if (!m) return null;
  const situacao = SITUACOES.find((s) => s.id === m[1]);
  const gancho = GANCHOS.find((g) => g.id === m[2]);
  if (!situacao || !gancho) return null;
  return { situacao, gancho };
}

// ─── execução directa (CLI dos workflows) ─────────────────────────────────────

const executadoDireto = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('temas-vida.js');
if (executadoDireto) {
  const args = process.argv.slice(2);
  const flags = Object.fromEntries(
    args.filter((a) => a.startsWith('--')).map((a) => {
      const [k, ...v] = a.slice(2).split('=');
      return [k, v.join('=') || true];
    }),
  );
  const comando = args.find((a) => !a.startsWith('--')) || 'escolher';
  const VERBOSE = Boolean(flags.verbose);

  try {
    if (comando === 'listar') {
      const usados = lerUsados();
      console.error(`📚 situações: ${SITUACOES.length} · ganchos: ${GANCHOS.length} · combinações: ${SITUACOES.length * GANCHOS.length}`);
      console.error(`✅ já usadas: ${usados.length} · restantes: ${restantes()}`);
      for (const t of ['manha', 'noite']) {
        const n = SITUACOES.filter((s) => s.turno === t).length;
        console.error(`   ${t}: ${n} situações`);
      }
      process.exit(0);
    }

    if (comando === 'marcar') {
      if (!flags.situacao || !flags.gancho) {
        console.error('❌ marcar exige --situacao= e --gancho=');
        process.exit(1);
      }
      const s = SITUACOES.find((x) => x.id === flags.situacao);
      marcar({ situacao: flags.situacao, gancho: flags.gancho, turno: s ? s.turno : '' });
      console.error(`✅ marcado: ${flags.situacao} × ${flags.gancho} (restam ${restantes()})`);
      process.exit(0);
    }

    // escolher (padrão)
    const turno = typeof flags.turno === 'string' ? flags.turno : '';
    if (turno && turno !== 'manha' && turno !== 'noite') {
      console.error(`❌ --turno tem de ser "manha" ou "noite" (recebi "${turno}")`);
      process.exit(1);
    }
    const excluir = String(flags.excluir || '')
      .split(',')
      .map((s) => s.trim().replace(/^VIDA:/, '').split(':')[0])
      .filter(Boolean);

    const escolha = escolher({ turno, excluir });
    if (!escolha) {
      console.error('as 400 combinações acabaram 🎉 — acrescente situações em temas-vida.js.');
      process.exit(NOTHING_TO_DO);
    }

    const id = `VIDA:${escolha.situacao.id}:${escolha.gancho.id}`;
    if (VERBOSE) {
      console.error(`🕘 turno            : ${turno || '(qualquer)'}`);
      console.error(`🎬 situação         : ${escolha.situacao.titulo}`);
      console.error(`🪝 gancho           : ${escolha.gancho.molde}`);
      // ⚠️ A dívida vai para o registo da corrida de propósito: sem ela, a escolha
      // passaria a depender de um ficheiro de medição e ninguém saberia disso ao ler o log.
      const divida = dividaDosGanchos();
      if (divida.size) {
        console.error(`📉 medição a pesar   : ${divida.size} gancho(s) com dívida${escolha.divida ? ` · este leva ${escolha.divida}` : ' · este não deve nada'}`);
      } else {
        console.error('📉 medição a pesar   : nenhuma (sem relatório de retenção, ou amostra ainda curta) — rodízio simples');
      }
      console.error(`📦 combinações livres: ${restantes()}`);
    }
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `slug=${id}\nsituacao=${escolha.situacao.id}\ngancho=${escolha.gancho.id}\nremaining=${restantes()}\nsource=vida\n`,
      );
    }
    console.log(id);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
}
