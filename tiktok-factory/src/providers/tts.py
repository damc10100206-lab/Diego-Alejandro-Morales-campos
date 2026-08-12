"""Narración: un archivo de audio por enunciado, no un bloque.

Generar el guion completo de una sola vez es la causa número uno de la
"voz de robot": el modelo impone un ritmo constante. Aquí cada frase se
genera con su propia instrucción actoral, velocidad y pausa.
"""
from __future__ import annotations

import os
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 24000  # Gemini TTS entrega PCM 16-bit mono a 24 kHz


class TTSError(RuntimeError):
    pass


def _pcm_a_wav(pcm: bytes, destino: Path, sr: int = SAMPLE_RATE) -> Path:
    destino.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(destino), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm)
    return destino


def silencio_wav(segundos: float, destino: Path, sr: int = SAMPLE_RATE) -> Path:
    """Pausa con ceros. En la mezcla final se rellena con room tone."""
    n = max(1, int(segundos * sr))
    return _pcm_a_wav(struct.pack(f"<{n}h", *([0] * n)), destino, sr)


def _texto_dirigido(linea: dict) -> str:
    """Gemini TTS obedece instrucciones en lenguaje natural antes del texto."""
    partes = []
    instr = linea.get("instruccion", "").strip()
    if instr:
        partes.append(instr.rstrip(".") + ".")
    if linea.get("respira_antes"):
        partes.append("Toma aire audiblemente antes de empezar.")
    if linea.get("titubeo"):
        partes.append(f"Titubea así: {linea['titubeo']}.")
    prefijo = " ".join(partes)
    return f"{prefijo}\nDi exactamente esto: {linea['texto']}" if prefijo else linea["texto"]


def generar_linea_gemini(linea: dict, voz: str, destino: Path,
                         modelo: str | None = None) -> Path:
    from google import genai
    from google.genai import types

    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise TTSError("GEMINI_API_KEY no está definida")
    cli = genai.Client(api_key=key)
    modelo = modelo or os.environ.get("TTS_MODEL", "gemini-2.5-flash-preview-tts")

    resp = cli.models.generate_content(
        model=modelo,
        contents=_texto_dirigido(linea),
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voz)
                )
            ),
        ),
    )
    try:
        pcm = resp.candidates[0].content.parts[0].inline_data.data
    except (AttributeError, IndexError, TypeError) as e:
        raise TTSError(f"El TTS no devolvió audio para la línea {linea.get('i')}") from e
    return _pcm_a_wav(pcm, destino)


def generar_linea_elevenlabs(linea: dict, voice_id: str, destino: Path) -> Path:
    """Alternativa premium. Requiere que la red del entorno permita
    api.elevenlabs.io (por defecto está bloqueada — ver README)."""
    import json
    import urllib.request

    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        raise TTSError("ELEVENLABS_API_KEY no está definida")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    cuerpo = json.dumps({
        "text": linea["texto"],
        "model_id": "eleven_v3",
        "voice_settings": {
            "stability": 0.35,        # bajo = más variación humana
            "similarity_boost": 0.75,
            "style": 0.45,
            "use_speaker_boost": True,
        },
    }).encode()
    req = urllib.request.Request(
        url, data=cuerpo,
        headers={"xi-api-key": key, "Content-Type": "application/json",
                 "Accept": "audio/mpeg"})
    with urllib.request.urlopen(req, timeout=120) as r:
        audio = r.read()
    destino = destino.with_suffix(".mp3")
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(audio)
    return destino


def generar_narracion(direccion: dict, carpeta: Path, proveedor: str,
                      voz: str) -> list[dict]:
    """Genera un wav por línea + pausas. Devuelve la lista de segmentos."""
    carpeta.mkdir(parents=True, exist_ok=True)
    segmentos: list[dict] = []
    for linea in direccion["lineas"]:
        i = linea["i"]
        destino = carpeta / f"linea_{i:03d}.wav"
        if proveedor == "elevenlabs":
            ruta = generar_linea_elevenlabs(linea, voz, destino)
        else:
            ruta = generar_linea_gemini(linea, voz, destino)
        segmentos.append({"i": i, "ruta": str(ruta), "tipo": "voz",
                          "velocidad": linea.get("velocidad", 1.0)})
        pausa = float(linea.get("pausa_despues_seg", 0.25))
        if pausa > 0:
            p = silencio_wav(pausa, carpeta / f"pausa_{i:03d}.wav")
            segmentos.append({"i": i, "ruta": str(p), "tipo": "pausa",
                              "duracion": pausa})
    return segmentos
