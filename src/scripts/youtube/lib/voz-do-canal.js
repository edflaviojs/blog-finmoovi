/**
 * A VOZ DO CANAL — um sítio só, lido pelo ESCRITOR e pelo LEITOR (01/08/2026).
 *
 * ═══ POR QUE ESTE FICHEIRO EXISTE ═══
 * O dono, ao ler um roteiro: *"olha que frase nada a ver… se alguém falar isso num
 * vídeo curto a pessoa já sai. Isso está robótico!"* E depois a pergunta certa:
 * *"não existe outra forma de corrigirmos isso definitivamente? por essas tentativas
 * e erros não vejo como algo seguro pro futuro."*
 *
 * Ele tinha razão. Eu estava a tentar medir GOSTO com listas de palavras. Uma trava
 * só sabe dizer "esta palavra é proibida" — e escrever bem não é a ausência de
 * palavras más. O resultado media-se: quatro tentativas, quatro regras diferentes,
 * nada a convergir.
 *
 * ═══ A DIVISÃO QUE PASSA A VALER ═══
 *   VERDADE (números, catálogo, promessas)  → CÓDIGO. Travas. Isto fica.
 *   GOSTO   (soar a pessoa, fluir, prender) → um SEGUNDO LEITOR. Nunca regex.
 * É a irmã da regra que já tínhamos: *o que se calcula não se pede ao modelo*.
 *
 * ═══ DE ONDE VEM ESTE CONTEÚDO ═══
 * Da skill pública `no-ai-slop` (catálogo dos vícios que fazem um texto cheirar a
 * IA), traduzida e ADAPTADA para português falado — não copiada. Duas adaptações
 * que valem a pena registar, porque copiar à letra teria estragado o canal:
 *  · a skill manda cortar "aberturas de pigarro"; em português falado **"olha"** e
 *    **"sabe"** não são pigarro, são a forma de chamar alguém — e o dono pediu-as.
 *  · a skill é para texto ESCRITO e lido; aqui é texto FALADO e ouvido uma vez só.
 * Mais as batidas de retenção da skill `short-video-scripter`.
 *
 * ⚠️ E o achado mais incómodo da leitura: **vários padrões que eu tinha tornado
 * OBRIGATÓRIOS no prompt estão na lista de vícios.** O "não é X, é Y" da virada e o
 * "Pergunta? Resposta." da corrente eram meus. Por isso todos os vídeos soavam ao
 * mesmo — a forma que eu prescrevia era a forma da escrita de IA.
 */

/** Quem fala, e com quem. É a frase do dono, e manda em tudo o resto. */
export const PERSONA = `Um gerente de banco a explicar, com muita paciência e muita simplicidade, a um senhor humilde que nunca estudou finanças e tem vergonha de perguntar. Fale COM ele, não SOBRE o assunto.`;

/**
 * O CATÁLOGO DE VÍCIOS — para o SEGUNDO LEITOR, que é onde o detalhe paga.
 * O escritor recebe só a versão curta (ver VICIOS_ESSENCIAIS), porque encher o
 * prompt do escritor foi exatamente o que fez o roteiro deixar de passar.
 */
export const VICIOS = `
1. CONTRASTE BINÁRIO — "não é X, é Y" / "a pergunta não é X, é Y".
   Diga Y e pronto. ✗ "Não é o juro que te quebra, é o mínimo." ✓ "O que te quebra é o mínimo."

2. PERGUNTA-RESPOSTA COLADA — a frase acaba a perguntar e a seguinte REPETE a pergunta para responder.
   ✗ "…qual pesa mais? / A que pesa mais é…"  ✓ "…qual pesa mais? / É a fatura que você deixou pra depois."
   ⚠️ Perguntar e responder DIRETO é o padrão da capa deste canal — o vício é só o eco da pergunta dentro da resposta.

3. ECO — abrir uma frase repetindo a última palavra da anterior, sobretudo como pergunta solta.
   ✗ "…faz a dívida crescer." → "Crescer assim?"

4. FALSO SEGREDO — "o que ninguém te conta", "poucos sabem", "a parte que todo mundo pula".
   Isso põe quem fala num pedestal. Diga a coisa.

5. PALAVRA DE ESCRITÓRIO — drenagem, solução, estratégia, mecanismo, processo, impacto, gestão, otimizar, efetivamente, utilizar, adquirir.

6. JARGÃO DE BANCO — rotativo, saldo devedor, amortizar, encargos, IOF, liquidez, rentabilidade, aporte.
   Exceção: a palavra do próprio TEMA pode ser dita — é o título. Mas explique-a com palavras do dia a dia.

7. SUBSTANTIVO ABSTRATO NO LUGAR DO VERBO — "fazer a gestão do gasto" em vez de "controlar o gasto";
   "a devolução do valor" em vez de "o dinheiro volta".

8. VOZ PASSIVA E COISAS QUE AGEM SOZINHAS — "são calculados no app", "o valor foi impactado".
   Quem faz, faz: "você joga a fatura lá e ele te mostra".

9. IMPORTÂNCIA POSTIÇA — "é fundamental", "é essencial", "isso muda tudo", "isso é enorme".
   Diga o facto e deixe quem ouve julgar.

10. SINÓNIMOS A ROLAR — trocar a palavra certa por outra só para variar. Se é "pedra", é sempre "pedra".

11. FRAGMENTAÇÃO DRAMÁTICA — "É isso. Simples assim." / "X. E Y. E Z."

12. REMATE PSEUDO-PROFUNDO — a última frase a virar aforismo bonito e vazio.
    (O bordão do canal é a ÚNICA exceção, e só no fim.)

13. RITMO DE ROBÔ — todas as frases com o mesmo tamanho e a mesma forma.
    Uma curta, uma mais longa, outra curta.

14. METÁFORA QUE SE CONTRADIZ — a imagem tem de funcionar com a física dela do princípio ao fim.
    ✗ "esvaziando a mochila" quando o que a enche são pedras (fica mais PESADA, nunca mais vazia).

15. CONECTOR DE TEXTO ESCRITO — "Além disso", "Ademais", "Portanto", "No entanto", "Dessa forma",
    "Sendo assim", "Em suma", "Vale ressaltar", "Por outro lado". Isto escreve-se, não se fala.
    ⚠️ **TROQUE o conector, NUNCA o corte.** Sem elo nenhum as frases ficam soltas, e frase solta é
    o defeito que este canal mais paga. O elo falado existe e é curto:
      "Além disso," → "E aí" · "No entanto," → "Só que" · "Portanto," → "Então" · "Dessa forma," → "Assim"
    ✗ "Além disso, você ainda paga juros."   ✓ "E aí você ainda paga juros."
`;

/** A versão curta, para o ESCRITOR. Só os cinco que mais aparecem. */
export const VICIOS_ESSENCIAIS = `
⛔ Nada de "não é X, é Y" — diga só o Y.
⛔ Nada de acabar a perguntar e a frase seguinte REPETIR a pergunta para responder. (Perguntar e responder direto é o padrão da capa — o vício é só o eco.)
⛔ Nada de abrir uma frase ecoando a última palavra da anterior.
⛔ Nada de palavra de escritório (drenagem, solução, estratégia) nem jargão de banco (rotativo, amortizar, encargos).
⛔ Nada de importância postiça ("é fundamental", "isso muda tudo").
⛔ Nada de conector de texto escrito ("Além disso", "Portanto", "No entanto", "Dessa forma") — a fala liga com "E aí", "Só que", "Então". Trocar, nunca cortar: sem elo a frase fica solta.
`;

/**
 * AS BATIDAS DE RETENÇÃO (da skill `short-video-scripter`).
 * A batida 2 é a que quase todos os roteiros saltam — e o nosso saltava.
 */
export const BATIDAS = `
· 0-2s   PARAR O DEDO: a dor ou o número, já com a imagem do vídeo.
· 2-5s   PROVAR QUE É VERDADE: uma prova de que a promessa do início é real. **É a batida que quase todos saltam.**
· 5-50s  ENTREGAR: uma ideia de cada vez, encadeadas.
· fim    FECHAR EM CÍRCULO: a última frase devolve quem ouve ao início do vídeo.
`;

/** O que se guarda com unhas e dentes — não é vício nenhum, é a voz. */
export const O_QUE_PRESERVAR = `
✓ "olha", "sabe", "presta atenção", "calma", "vou te explicar" — em português falado isto NÃO é enchimento, é chamar a pessoa. O dono pediu-o.
✓ diminutivos do dia a dia ("errinho", "caladinho", "um pouquinho") quando soam a fala.
✓ frases curtas, ditas de uma vez.
✓ nomes, números e coisas concretas: "quinhentos reais" vale mais que "um valor considerável".
✓ o sentido, a imagem e os números do original — o leitor melhora a FALA, nunca inventa facto novo.
`;
