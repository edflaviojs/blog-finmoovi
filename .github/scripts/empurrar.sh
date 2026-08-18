#!/usr/bin/env bash
#
# O EMPURRÃO SEGURO — uma regra, um sítio (07/08/2026).
#
# ═══ O QUE ISTO SUBSTITUI, E PORQUÊ ═══
# Cinquenta e oito sítios faziam exactamente isto:
#
#     git pull --rebase origin main || true
#     git push
#
# ⚠️ **Estas duas linhas escondem um alçapão.** Quando o rebase encalha num
# conflito, o git NÃO volta ao ramo — fica a meio da operação, sem ramo nenhum.
# O `|| true` engole esse erro em silêncio, e o `git push` seguinte morre com
# «You are not currently on a branch», código 128. O commit acabado de fazer
# desaparece com a máquina, que é descartável.
#
# Não é teoria: foi assim que a *Correção de conteúdo i18n* de 06/08 perdeu a
# tanda inteira **depois** de a IA já a ter escrito e paga.
#
# ═══ O QUE ESTE FAZ DE DIFERENTE ═══
#   1. Tenta o empurrão PRIMEIRO. Na esmagadora maioria dos dias corre à
#      primeira, e nem chega a buscar nada.
#   2. Se for recusado, actualiza-se e tenta OUTRA VEZ — porque a causa quase
#      sempre é banal: outro robô empurrou entretanto.
#   3. Se o rebase encalhar, DESFÁ-LO. O ramo fica inteiro. Era exactamente
#      aqui que o trabalho se perdia.
#   4. Falhar as três vezes é falha a sério — e o passo fica VERMELHO de
#      propósito. O silêncio é o defeito que se está a corrigir.
#
# ═══ O SEGUNDO ALÇAPÃO — `--autostash` (18/08/2026) ═══
# O ponto 3 protegia contra o rebase ENCALHAR. Mas há um caso anterior a esse:
# o rebase **recusa-se a começar** quando ficam ficheiros por guardar.
#
#     error: cannot pull with rebase: You have unstaged changes.
#     error: Please commit or stash them.
#
# Não é conflito — é recusa liminar, antes de tocar em nada. Logo o
# `git rebase --abort` a seguir não tem rebase nenhum para desfazer, as três
# tentativas fazem exactamente o mesmo, e a corrida acaba VERMELHA com o
# trabalho por empurrar. Foi assim que o **vídeo longo de 15/08 morreu três
# vezes seguidas** (e as *Dicas Financeiras* de 17/08) — e é comum, porque
# quase todos os robôs deixam ficheiros mexidos que não entram no commit.
#
# `--autostash` é a resposta do próprio git: põe de lado o que está por guardar,
# faz o rebase, e repõe. Se a reposição encalhar, o material fica em `git stash`
# — nunca no lixo.
#
# Uso, dentro de qualquer workflow:  bash .github/scripts/empurrar.sh

RAMO="${GITHUB_REF_NAME:-main}"
TENTATIVAS=3

for tentativa in $(seq 1 "$TENTATIVAS"); do
  # `git push` sem nada para empurrar devolve 0 ("Everything up-to-date"), por
  # isso não é preciso perguntar antes se há commits — perguntar era o que a
  # segunda família de workflows fazia com `git rev-list --count`.
  if git push; then
    exit 0
  fi

  if [ "$tentativa" = "$TENTATIVAS" ]; then
    break
  fi

  echo "::warning::empurrão recusado (${tentativa}/${TENTATIVAS}) — alguém escreveu primeiro; a actualizar e a tentar de novo."
  if ! git pull --rebase --autostash origin "$RAMO"; then
    git rebase --abort 2>/dev/null
    echo "::warning::o rebase encalhou e foi DESFEITO — o ramo continua inteiro (sem isto, o push seguinte morria a 128)."
  fi
  sleep $(( tentativa * 5 ))
done

echo "❌ não foi possível empurrar para '${RAMO}' após ${TENTATIVAS} tentativas."
echo "   O trabalho desta corrida NÃO ficou guardado — repita o robô, ou resolva o conflito à mão."
exit 1
