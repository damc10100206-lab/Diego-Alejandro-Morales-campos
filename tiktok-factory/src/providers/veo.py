"""Generación de clips de video con Google Veo (audio nativo incluido).

Veo es el único modelo de la generación actual que entrega diálogo y ambiente
sincronizados en el mismo archivo, lo que elimina un paso entero de doblaje y
es la razón por la que el sonido queda "real" sin librería de efectos.
"""
from __future__ import annotations

import os
import time
from pathlib import Path

POLL_SEG = 10
TIMEOUT_SEG = 900


class VeoError(RuntimeError):
    pass


def _client():
    try:
        from google import genai
    except ImportError as e:  # pragma: no cover
        raise VeoError("Falta google-genai: pip install -r requirements.txt") from e
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise VeoError("GEMINI_API_KEY no está definida (ver .env.example)")
    return genai.Client(api_key=key)


def generar_clip(prompt: str, destino: Path, *, negativos: str = "",
                 modelo: str | None = None, aspecto: str = "9:16",
                 resolucion: str = "1080p", intento: int = 1) -> Path:
    """Genera un clip y lo escribe en `destino`. Bloquea hasta terminar."""
    from google.genai import types

    cli = _client()
    modelo = modelo or os.environ.get("VEO_MODEL", "veo-3.1-generate-preview")

    cfg = types.GenerateVideosConfig(
        aspect_ratio=aspecto,
        resolution=resolucion,
        negative_prompt=negativos or None,
        number_of_videos=1,
    )
    op = cli.models.generate_videos(model=modelo, prompt=prompt, config=cfg)

    t0 = time.time()
    while not op.done:
        if time.time() - t0 > TIMEOUT_SEG:
            raise VeoError(f"Timeout esperando el clip (intento {intento})")
        time.sleep(POLL_SEG)
        op = cli.operations.get(op)

    if getattr(op, "error", None):
        raise VeoError(f"Veo devolvió error: {op.error}")

    videos = getattr(op.response, "generated_videos", None) or []
    if not videos:
        raise VeoError("Veo no devolvió video (¿prompt bloqueado por filtros?)")

    destino.parent.mkdir(parents=True, exist_ok=True)
    cli.files.download(file=videos[0].video, config={"download_path": str(destino)})
    if not destino.exists() or destino.stat().st_size == 0:
        raise VeoError(f"El clip quedó vacío: {destino}")
    return destino
