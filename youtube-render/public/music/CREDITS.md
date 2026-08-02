# Música de fundo — origem e licença

**Faixa atual:** *"Leito FinMoovi"* — **gerada pelo próprio canal**, por
`src/scripts/youtube/gerar-trilha.js`.
**Licença:** nenhuma. É nossa. **Não exige atribuição, não exige nada.**

Para regerar (ou afinar o som), correr na raiz do repositório:

```
node src/scripts/youtube/gerar-trilha.js
```

O volume do leito ajusta-se em `youtube-render/src/audio/music.tsx` (`BED_VOLUME`).

---

## ⚠️ A fonte da verdade NÃO é este ficheiro

Este texto é para humanos. **Quem manda é `src/scripts/youtube/lib/musica.js`** — é lá que
está declarado se a faixa exige crédito, e é de lá que a descrição do vídeo o vai buscar
sozinha. Trocar de faixa é mudar esse objeto; o resto acontece por si.

**Porquê:** de 21/07 a 02/08/2026 a faixa era *"Deliberate Thought"* de Kevin MacLeod
(CC BY 4.0), que obriga a creditar o autor na descrição. **Este ficheiro dizia isso, em
maiúsculas, e nove vídeos foram na mesma ao ar sem o crédito** — porque nada no código
lia este aviso. Um aviso que ninguém lê é o mesmo que não existir.

Os nove vídeos afetados são corrigidos por
`src/scripts/youtube/corrigir-creditos-musica.js`, que lhes acrescenta a linha do crédito
à descrição. O texto sai de `lib/musica.js` (`TRILHA_ANTERIOR`), nunca escrito à mão.
