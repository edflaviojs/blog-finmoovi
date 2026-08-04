"""
TRANSCRICAO POR PALAVRA, LOCAL E DE GRACA (04/08/2026).

═══ POR QUE ISTO EXISTE ═══
O dono viu o video longo e apontou: *"quando tem as cenas com as palavras grandes na
tela precisa corrigir a sincronizacao. Esta desincronizado."* Ele tinha razao, e o
defeito foi medido: no instante que ele fotografou, o programa achava que "dinheiro"
estava a ser dito aos 6,13s e "saindo" aos 7,00s — a letra estava quase **um segundo**
atrasada em relacao a voz.

A causa nao era o desenho: os tempos das palavras **nunca foram medidos**. Eram
estimados, repartindo a duracao do audio pelo numero de letras de cada palavra — um
modelo que nao sabe que o locutor respira nas virgulas e nos pontos. Cada respiracao
que ele nao conta empurra tudo o que vem a seguir, e o erro CRESCE ao longo da cena.
Nas legendas pequenas quase nao se via; nas palavras grandes ficou escancarado.

Este script mede. O `faster-whisper` corre na propria maquina, sem chave e sem rede,
e devolve o instante exato de cada palavra.

⚠️ ELE NAO TOCA NO ROBO DIARIO. E um script a parte: le os MP3 que ja existem e
imprime JSON. Quem o usa e o `alinhar-voz-local.mjs`, que reescreve o ficheiro de
tempos do video longo. O `tts-short.js`, que o robo corre todos os dias, fica intacto —
liga-lo la e decisao do dono, e ai ganha-o tambem o video curto.

Uso:  python scripts/transcrever-local.py <ficheiro.mp3> [mais.mp3 ...]
Saida: JSON {"ficheiro": [{"word": "...", "start": 0.0, "end": 0.4}, ...], ...}
"""

import json
import os
import sys

# O modelo. "small" e o ponto em que o portugues do Brasil sai bem sem exigir placa
# grafica; "base" e mais rapido e erra mais palavras compridas. int8 mantem o consumo
# de memoria baixo numa maquina sem GPU.
MODELO = os.environ.get("WHISPER_MODELO", "small")
COMPUTE = os.environ.get("WHISPER_COMPUTE", "int8")


def main(caminhos):
    from faster_whisper import WhisperModel

    modelo = WhisperModel(MODELO, device="cpu", compute_type=COMPUTE)
    saida = {}

    for caminho in caminhos:
        segmentos, _info = modelo.transcribe(
            caminho,
            language="pt",
            word_timestamps=True,
            # vad_filter corta silencios antes de transcrever. Aqui fica DESLIGADO de
            # proposito: ele desloca a linha do tempo, e o que se quer e exatamente a
            # posicao real de cada palavra dentro do ficheiro.
            vad_filter=False,
        )
        palavras = []
        for seg in segmentos:
            for w in (seg.words or []):
                palavras.append({
                    "word": w.word.strip(),
                    "start": round(float(w.start), 3),
                    "end": round(float(w.end), 3),
                })
        saida[os.path.basename(caminho)] = palavras
        print(f"  · {os.path.basename(caminho)}: {len(palavras)} palavras", file=sys.stderr)

    print(json.dumps(saida, ensure_ascii=False))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("uso: python scripts/transcrever-local.py <ficheiro.mp3> [...]", file=sys.stderr)
        sys.exit(2)
    main(sys.argv[1:])
