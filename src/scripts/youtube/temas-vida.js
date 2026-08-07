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

const ROOT = process.cwd();
const ESTADO = join(ROOT, '.github', 'data', 'vida-usados.json');
const NOTHING_TO_DO = 78;

/**
 * AS 40 SITUAÇÕES — a lista que o dono leu e aprovou em 07/08/2026.
 *
 * `titulo`  → o que aparece na etiqueta do vídeo e alimenta o título do YouTube.
 * `cena`    → a imagem concreta que o escritor tem de encenar. É isto que impede o
 *             roteiro de virar conselho genérico: uma cena tem lugar, hora e gente.
 * `chave`   → a palavra que vai em MAIÚSCULAS no título (regra do dono, 06/08).
 * `metafora`→ qual das 32 ilustrações já desenhadas encena esta situação.
 *
 * ⚠️ **A METÁFORA É ESCOLHIDA AQUI, À MÃO, E NÃO PELA IA.** Nos vídeos de 50s, cinco
 * dos últimos seis tiveram erro de âncora porque o modelo inventava a imagem. Com o
 * mapa fixo isso deixa de ser possível: cada situação já nasce com a sua ilustração,
 * e o significado sai do catálogo que já existe (`METAPHOR_MEANINGS` em
 * `lib/schema-short.js`) — não de gosto meu. Como as situações rodam em ordem, duas
 * seguidas nunca partilham a mesma imagem.
 */
export const SITUACOES = [
  // ── MANHÃ (9h) — planejar ───────────────────────────────────────────────────
  { id: 'entrada-do-carro', turno: 'manha', titulo: 'Juntar a entrada do carro', chave: 'CARRO', metafora: 'escada', cena: 'o casal olhando o anúncio do carro usado e fazendo a conta da entrada' },
  { id: 'reforma-banheiro', turno: 'manha', titulo: 'A reforma que sempre adia', chave: 'REFORMA', metafora: 'ampulheta', cena: 'o azulejo solto do banheiro que já está assim faz dois anos' },
  { id: 'seguro-venceu', turno: 'manha', titulo: 'O seguro que venceu', chave: 'SEGURO', metafora: 'escudo', cena: 'a mensagem do corretor avisando que o seguro venceu ontem' },
  { id: 'guardar-salario-curto', turno: 'manha', titulo: 'Guardar com salário curto', chave: 'GUARDAR', metafora: 'balde-furado', cena: 'o envelope onde sobrava dinheiro e agora não sobra' },
  { id: 'escola-ano-que-vem', turno: 'manha', titulo: 'A escola do ano que vem', chave: 'ESCOLA', metafora: 'relogio', cena: 'a lista da matrícula chegando em novembro' },
  { id: 'geladeira-nova', turno: 'manha', titulo: 'Trocar a geladeira', chave: 'GELADEIRA', metafora: 'ratoeira', cena: 'a geladeira velha fazendo barulho de madrugada' },
  { id: 'primeiro-guardado', turno: 'manha', titulo: 'O primeiro dinheiro guardado', chave: 'GUARDADO', metafora: 'semente', cena: 'o casal fechando o mês com dinheiro sobrando pela primeira vez' },
  { id: 'sair-do-aluguel', turno: 'manha', titulo: 'Sair do aluguel', chave: 'ALUGUEL', metafora: 'ralo', cena: 'o boleto do aluguel que sobe todo ano e nunca vira nada seu' },
  { id: 'viagem-fim-de-ano', turno: 'manha', titulo: 'A viagem de fim de ano', chave: 'VIAGEM', metafora: 'cofre', cena: 'as crianças pedindo praia em dezembro e o bolso dizendo não' },
  { id: 'decimo-terceiro', turno: 'manha', titulo: 'O 13º antes que suma', chave: '13º', metafora: 'fumaca', cena: 'o dinheiro do fim do ano caindo na conta e sumindo antes do carnaval' },
  { id: 'reserva-emergencia', turno: 'manha', titulo: 'A reserva de emergência', chave: 'RESERVA', metafora: 'guarda-chuva', cena: 'o mês em que tudo quebrou junto e não tinha de onde tirar' },
  { id: 'limpar-o-nome', turno: 'manha', titulo: 'Limpar o nome', chave: 'NOME', metafora: 'buraco', cena: 'a compra recusada na loja na frente dos outros' },
  { id: 'trocar-divida-cara', turno: 'manha', titulo: 'Trocar dívida cara por barata', chave: 'DÍVIDA', metafora: 'balanca', cena: 'a pessoa pagando a dívida mais barata primeiro e a cara crescendo' },
  { id: 'conta-so-das-contas', turno: 'manha', titulo: 'Uma conta só para as contas', chave: 'CONTA', metafora: 'bifurcacao', cena: 'o salário caindo tudo junto e sumindo tudo junto' },
  { id: 'dividir-sem-brigar', turno: 'manha', titulo: 'Dividir as contas sem brigar', chave: 'CASAL', metafora: 'gangorra', cena: 'a discussão de domingo sobre quem pagou o quê' },
  { id: 'plano-de-saude-subiu', turno: 'manha', titulo: 'O plano de saúde que subiu', chave: 'PLANO', metafora: 'bola-neve', cena: 'a carta do reajuste chegando no aniversário do contrato' },
  { id: 'pagar-a-vista', turno: 'manha', titulo: 'Pagar à vista e pedir desconto', chave: 'DESCONTO', metafora: 'duas-portas', cena: 'a vergonha de perguntar quanto fica à vista' },
  { id: 'vender-o-parado', turno: 'manha', titulo: 'Vender o que está parado', chave: 'VENDER', metafora: 'semente', cena: 'a garagem cheia de coisa que ninguém usa há anos' },
  { id: 'dinheiro-so-seu', turno: 'manha', titulo: 'Um dinheiro só seu', chave: 'SEU', metafora: 'cofre', cena: 'ter que pedir para o outro toda vez que quer comprar algo pequeno' },
  { id: 'aposentadoria-por-conta', turno: 'manha', titulo: 'Aposentadoria de quem é autônomo', chave: 'APOSENTADORIA', metafora: 'ampulheta', cena: 'quem trabalha por conta e nunca contribuiu com nada' },

  // ── NOITE (19h) — o aperto ──────────────────────────────────────────────────
  { id: 'fatura-maior', turno: 'noite', titulo: 'A fatura veio maior', chave: 'FATURA', metafora: 'bola-neve', cena: 'abrir o aplicativo do banco e o valor da fatura não bater com a lembrança' },
  { id: 'conta-de-luz', turno: 'noite', titulo: 'A conta de luz do verão', chave: 'LUZ', metafora: 'ralo', cena: 'a conta de janeiro chegando depois de um mês de ventilador ligado' },
  { id: 'pagar-o-minimo', turno: 'noite', titulo: 'Pagar só o mínimo', chave: 'MÍNIMO', metafora: 'ratoeira', cena: 'o dedo hesitando entre pagar tudo e pagar o mínimo' },
  { id: 'mercado-subindo', turno: 'noite', titulo: 'O mercado que sobe toda semana', chave: 'MERCADO', metafora: 'escada', cena: 'o mesmo carrinho de sempre custando mais do que no mês passado' },
  { id: 'carro-quebrou', turno: 'noite', titulo: 'O carro quebrou no meio do mês', chave: 'CARRO', metafora: 'domino', cena: 'o carro parado na oficina no meio do mês' },
  { id: 'dentista-das-criancas', turno: 'noite', titulo: 'O dentista das crianças', chave: 'DENTISTA', metafora: 'buraco', cena: 'o orçamento do aparelho na mão, sem saber de onde tirar' },
  { id: 'emprestimo-por-telefone', turno: 'noite', titulo: 'O empréstimo que o banco ofereceu', chave: 'EMPRÉSTIMO', metafora: 'areia-movedica', cena: 'a ligação do banco oferecendo dinheiro fácil bem no fim do mês' },
  { id: 'dez-vezes-sem-juros', turno: 'noite', titulo: 'O sem juros que virou rombo', chave: 'PARCELA', metafora: 'mochila-pedras', cena: 'a fatura do mês seguinte com um monte de parcelas diferentes dentro' },
  { id: 'remedio-todo-mes', turno: 'noite', titulo: 'O remédio de todo mês', chave: 'REMÉDIO', metafora: 'balde-furado', cena: 'a receita contínua que não dá para adiar nem para negociar' },
  { id: 'ipva-e-iptu', turno: 'noite', titulo: 'IPVA e IPTU de janeiro', chave: 'JANEIRO', metafora: 'avalanche', cena: 'os dois carnês chegando na mesma semana de janeiro' },
  { id: 'material-escolar', turno: 'noite', titulo: 'O material escolar', chave: 'MATERIAL', metafora: 'mochila-pedras', cena: 'a lista da escola na papelaria e a calculadora do celular na mão' },
  { id: 'gas-acabou', turno: 'noite', titulo: 'O gás que acabou', chave: 'GÁS', metafora: 'escorregao', cena: 'o gás acabando no meio do almoço de domingo' },
  { id: 'aniversario-do-filho', turno: 'noite', titulo: 'Aniversário do filho', chave: 'ANIVERSÁRIO', metafora: 'bolha', cena: 'a festa que a criança pediu e o orçamento que não fecha' },
  { id: 'presente-de-natal', turno: 'noite', titulo: 'O presente de Natal', chave: 'NATAL', metafora: 'fumaca', cena: 'dezembro chegando com a lista de presentes da família toda' },
  { id: 'delivery-de-sexta', turno: 'noite', titulo: 'O delivery de toda sexta', chave: 'DELIVERY', metafora: 'ralo', cena: 'o cansaço da sexta-feira decidindo o jantar pelo aplicativo' },
  { id: 'assinaturas-esquecidas', turno: 'noite', titulo: 'As assinaturas que ninguém cancela', chave: 'ASSINATURA', metafora: 'balde-furado', cena: 'a fatura com serviços que ninguém em casa abre há meses' },
  { id: 'emprestar-pra-parente', turno: 'noite', titulo: 'Emprestar dinheiro pra parente', chave: 'EMPRESTAR', metafora: 'corda-bamba', cena: 'o parente pedindo emprestado e prometendo devolver no fim do mês' },
  { id: 'parcela-atrasada', turno: 'noite', titulo: 'A parcela que atrasou', chave: 'ATRASO', metafora: 'domino', cena: 'o boleto vencido no sábado, quando o banco está fechado' },
  { id: 'cheque-especial', turno: 'noite', titulo: 'O cheque especial', chave: 'ESPECIAL', metafora: 'areia-movedica', cena: 'a conta no vermelho que a pessoa nem percebeu que entrou' },
  { id: 'saque-no-cartao', turno: 'noite', titulo: 'Sacar dinheiro no cartão', chave: 'SAQUE', metafora: 'ratoeira', cena: 'o caixa eletrônico tarde da noite e o cartão de crédito na mão' },
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

// ─── escolha ──────────────────────────────────────────────────────────────────

/**
 * A PRÓXIMA COMBINAÇÃO DO TURNO.
 *
 * Regra, por ordem:
 *  1. A situação do turno **menos recentemente usada** (nunca usada ganha sempre).
 *  2. Dentro dela, o gancho **menos usado no canal inteiro** — é isto que mantém os
 *     10 ganchos com o mesmo número de vídeos e torna a medição justa.
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
  ganchosLivres.sort((a, b) => {
    const ca = contagemDoGancho.get(a.id) || 0;
    const cb = contagemDoGancho.get(b.id) || 0;
    if (ca !== cb) return ca - cb;
    return GANCHOS.indexOf(a) - GANCHOS.indexOf(b);
  });

  return { situacao, gancho: ganchosLivres[0] };
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
