"""QA objetivo con ffmpeg: lo que se puede medir, se mide.

Este módulo NO juzga si la historia es buena ni si la voz suena humana — eso lo
hacen los agentes (prompts 06/07/08). Aquí se verifican los hechos duros que un
agente no puede "opinar": duración, loudness, silencios, resolución, negros.
Un video que falla aquí no llega ni a evaluación creativa.
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

FFMPEG = "ffmpeg"
FFPROBE = "ffprobe"


def _ffmpeg_stderr(args: list[str]) -> str:
    return subprocess.run([FFMPEG, "-hide_banner", *args, "-f", "null", "-"],
                          capture_output=True, text=True).stderr


def sondear(ruta: Path) -> dict:
    out = subprocess.run(
        [FFPROBE, "-v", "error", "-print_format", "json",
         "-show_format", "-show_streams", str(ruta)],
        capture_output=True, text=True)
    return json.loads(out.stdout or "{}")


def medir_loudness(ruta: Path) -> dict:
    err = _ffmpeg_stderr(["-i", str(ruta), "-af", "ebur128=peak=true"])
    def buscar(patron: str) -> float | None:
        m = re.findall(patron, err)
        try:
            return float(m[-1])
        except (IndexError, ValueError):
            return None
    return {
        "lufs_integrado": buscar(r"I:\s*(-?\d+\.?\d*)\s*LUFS"),
        "true_peak_dbtp": buscar(r"Peak:\s*(-?\d+\.?\d*)\s*dBFS"),
        "rango_lra": buscar(r"LRA:\s*(-?\d+\.?\d*)\s*LU"),
    }


def detectar_silencios(ruta: Path, umbral_db: int = -50,
                       minimo_seg: float = 0.8) -> list[dict]:
    err = _ffmpeg_stderr(["-i", str(ruta),
                          "-af", f"silencedetect=noise={umbral_db}dB:d={minimo_seg}"])
    inicios = [float(x) for x in re.findall(r"silence_start:\s*(-?\d+\.?\d*)", err)]
    duraciones = [float(x) for x in re.findall(r"silence_duration:\s*(\d+\.?\d*)", err)]
    return [{"inicio": i, "duracion": d} for i, d in zip(inicios, duraciones)]


def detectar_negros(ruta: Path, minimo_seg: float = 0.5) -> list[dict]:
    err = _ffmpeg_stderr(["-i", str(ruta), "-vf", f"blackdetect=d={minimo_seg}:pic_th=0.98"])
    return [{"inicio": float(a), "fin": float(b)} for a, b in
            re.findall(r"black_start:(\d+\.?\d*)\s+black_end:(\d+\.?\d*)", err)]


def auditar(ruta: Path, cfg: dict, guion: dict | None = None,
            simular: bool = False) -> dict:
    """Devuelve un informe con veredicto duro. `fallas` vacío = pasa la puerta."""
    prod, aud = cfg.get("produccion", {}), cfg.get("audio", {})
    info = sondear(ruta)
    v = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), {})
    a = next((s for s in info.get("streams", []) if s.get("codec_type") == "audio"), {})
    dur = float(info.get("format", {}).get("duration", 0) or 0)

    fallas: list[str] = []
    avisos: list[str] = []

    dmin = prod.get("duracion_min_seg", 48)
    dmax = prod.get("duracion_max_seg", 75)
    if not dmin <= dur <= dmax:
        fallas.append(f"duración {dur:.1f}s fuera del rango {dmin}–{dmax}s")

    ancho, alto = v.get("width"), v.get("height")
    esperado = prod.get("formato", "1080x1920")
    if f"{ancho}x{alto}" != esperado:
        fallas.append(f"resolución {ancho}x{alto}, se esperaba {esperado}")

    if not a:
        fallas.append("el archivo no tiene pista de audio")
    else:
        if int(a.get("sample_rate", 0)) < 44100:
            fallas.append(f"sample rate bajo: {a.get('sample_rate')} Hz")

        loud = medir_loudness(ruta)
        objetivo = aud.get("loudness_objetivo_lufs", -14.0)
        tol = aud.get("tolerancia_lufs", 1.5)
        li = loud.get("lufs_integrado")
        if li is None:
            avisos.append("no pude medir loudness")
        elif abs(li - objetivo) > tol:
            fallas.append(f"loudness {li} LUFS, objetivo {objetivo} ±{tol}")
        tp = loud.get("true_peak_dbtp")
        if tp is not None and tp > aud.get("true_peak_max_dbtp", -1.0):
            fallas.append(f"true peak {tp} dBTP sobre el máximo permitido")
        if loud.get("rango_lra") is not None and loud["rango_lra"] < 3.0:
            # Rango dinámico plano = mezcla aplastada = suena a locución de IA.
            # En simulación la voz es un tono constante, así que no aplica.
            msj = (f"rango dinámico plano (LRA {loud['rango_lra']} LU): "
                   f"la narración quedó sin dinámica")
            (avisos if simular else fallas).append(msj)

        silmax = aud.get("silencio_max_seg", 1.2)
        largos = [s for s in detectar_silencios(ruta, minimo_seg=silmax)]
        if largos:
            fallas.append(f"{len(largos)} silencio(s) sobre {silmax}s "
                          f"(primero en {largos[0]['inicio']:.1f}s): falta room tone")

    negros = detectar_negros(ruta)
    if negros:
        fallas.append(f"{len(negros)} tramo(s) en negro, primero en {negros[0]['inicio']:.1f}s")

    if guion:
        palabras = sum(len(e["texto"].split()) for e in guion.get("enunciados", []))
        if dur > 0:
            ritmo = palabras / dur
            if not 2.0 <= ritmo <= 3.2:
                avisos.append(f"ritmo de habla {ritmo:.2f} palabras/s "
                              f"(cómodo: 2.0–3.2)")

    return {
        "archivo": str(ruta),
        "veredicto": "APROBADO" if not fallas else "RECHAZADO",
        "duracion_seg": round(dur, 2),
        "resolucion": f"{ancho}x{alto}",
        "fps": v.get("r_frame_rate"),
        "loudness": medir_loudness(ruta) if a else None,
        "fallas": fallas,
        "avisos": avisos,
    }


def escribir_informe(informe: dict, carpeta: Path) -> Path:
    ruta = carpeta / "qa_tecnico.json"
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(json.dumps(informe, ensure_ascii=False, indent=2), encoding="utf-8")
    return ruta


if __name__ == "__main__":
    import sys
    import yaml
    cfg = yaml.safe_load(Path(sys.argv[2]).read_text(encoding="utf-8")) \
        if len(sys.argv) > 2 else {}
    print(json.dumps(auditar(Path(sys.argv[1]), cfg), ensure_ascii=False, indent=2))
