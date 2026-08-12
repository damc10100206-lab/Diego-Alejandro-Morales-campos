"""Ensamble con ffmpeg: clips + narración + ambiente + subtítulos + máster.

Decisiones de mezcla que sostienen el realismo:
  · El ambiente NO se sintetiza: se reusa el audio nativo de los clips de Veo,
    filtrado y bajado de nivel. Es sonido del mismo mundo que la imagen.
  · La voz nunca se pega sobre silencio digital: siempre hay cama ambiental.
  · Ducking real por sidechain, no automatización a ojo.
  · Máster a -14 LUFS / -1 dBTP, el punto donde las plataformas dejan de
    recomprimir y el audio deja de sonar "procesado".
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

FFMPEG = "ffmpeg"
FFPROBE = "ffprobe"


class EnsambleError(RuntimeError):
    pass


def _run(cmd: list[str]) -> str:
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        raise EnsambleError(f"ffmpeg falló:\n{' '.join(cmd[:8])}…\n{p.stderr[-2500:]}")
    return p.stderr + p.stdout


def duracion(ruta: Path) -> float:
    out = subprocess.run(
        [FFPROBE, "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(ruta)],
        capture_output=True, text=True)
    try:
        return float(out.stdout.strip())
    except ValueError:
        raise EnsambleError(f"No pude leer la duración de {ruta}")


def concatenar_clips(clips: list[Path], destino: Path, fps: int = 30,
                     resolucion: str = "1080x1920") -> Path:
    """Une los clips normalizando formato. Corte seco: en terror el corte
    duro asusta más que el fundido, y además no delata el empalme."""
    if not clips:
        raise EnsambleError("No hay clips para concatenar")
    w, h = resolucion.split("x")
    partes, filtros = [], []
    for i, c in enumerate(clips):
        partes += ["-i", str(c)]
        filtros.append(
            f"[{i}:v]scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h},fps={fps},setsar=1[v{i}];"
            f"[{i}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[a{i}];")
    cadena = "".join(filtros)
    mapa = "".join(f"[v{i}][a{i}]" for i in range(len(clips)))
    cadena += f"{mapa}concat=n={len(clips)}:v=1:a=1[v][a]"
    destino.parent.mkdir(parents=True, exist_ok=True)
    _run([FFMPEG, "-y", *partes, "-filter_complex", cadena,
          "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "medium",
          "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
          str(destino)])
    return destino


def unir_narracion(segmentos: list[dict], destino: Path) -> Path:
    """Concatena los wav de línea y pausa en una sola pista de voz,
    aplicando la variación de velocidad que rompe el ritmo de metrónomo."""
    if not segmentos:
        raise EnsambleError("No hay segmentos de narración")
    entradas, filtros = [], []
    for i, s in enumerate(segmentos):
        entradas += ["-i", s["ruta"]]
        vel = float(s.get("velocidad", 1.0) or 1.0)
        f = f"[{i}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=mono"
        if abs(vel - 1.0) > 0.01:
            # atempo cambia la velocidad sin alterar el tono
            f += f",atempo={min(max(vel, 0.5), 2.0):.3f}"
        f += f"[s{i}];"
        filtros.append(f)
    cadena = "".join(filtros) + "".join(f"[s{i}]" for i in range(len(segmentos)))
    cadena += f"concat=n={len(segmentos)}:v=0:a=1[voz]"
    destino.parent.mkdir(parents=True, exist_ok=True)
    _run([FFMPEG, "-y", *entradas, "-filter_complex", cadena, "-map", "[voz]",
          "-c:a", "pcm_s16le", str(destino)])
    return destino


def mezclar(video: Path, voz: Path, destino: Path, *,
            ambiente_db: int = -32, lufs: float = -14.0,
            tp: float = -1.0, ducking: bool = True) -> Path:
    """Mezcla final: voz al frente, audio nativo del video como ambiente."""
    amb_gain = 10 ** (ambiente_db / 20)
    if ducking:
        # El ambiente se comprime con la voz como cadena lateral: baja solo
        # cuando hay palabra, y vuelve a subir en los silencios.
        cadena = (
            f"[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,"
            f"highpass=f=60,volume={amb_gain:.5f}[amb];"
            f"[1:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,"
            f"highpass=f=90,acompressor=threshold=0.09:ratio=2:attack=8:release=180,"
            f"equalizer=f=3200:t=q:w=1.4:g=1.5,equalizer=f=7500:t=q:w=2:g=-3[vozp];"
            f"[vozp]asplit=2[vozmix][vozsc];"
            f"[amb][vozsc]sidechaincompress=threshold=0.05:ratio=6:attack=15:release=350[ambd];"
            f"[vozmix][ambd]amix=inputs=2:duration=longest:weights=1 0.9:normalize=0,"
            f"loudnorm=I={lufs}:TP={tp}:LRA=9,alimiter=limit={10 ** (tp / 20):.4f}[out]"
        )
    else:
        cadena = (
            f"[0:a]volume={amb_gain:.5f}[amb];"
            f"[amb][1:a]amix=inputs=2:duration=longest:normalize=0,"
            f"loudnorm=I={lufs}:TP={tp}:LRA=9[out]")

    destino.parent.mkdir(parents=True, exist_ok=True)
    _run([FFMPEG, "-y", "-i", str(video), "-i", str(voz),
          "-filter_complex", cadena, "-map", "0:v", "-map", "[out]",
          "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
          str(destino)])
    return destino


def escribir_srt(enunciados: list[dict], destino: Path) -> Path:
    """Subtítulos quemables. Muchísima gente ve en silencio: sin subtítulos
    el gancho se pierde."""
    def ts(s: float) -> str:
        h, r = divmod(max(0.0, s), 3600)
        m, sec = divmod(r, 60)
        return f"{int(h):02d}:{int(m):02d}:{int(sec):02d},{int((sec % 1) * 1000):03d}"

    lineas = []
    for n, e in enumerate(enunciados, 1):
        lineas.append(f"{n}\n{ts(e['t_ini'])} --> {ts(e['t_fin'])}\n{e['texto']}\n")
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text("\n".join(lineas), encoding="utf-8")
    return destino


def quemar_subtitulos(video: Path, srt: Path, destino: Path) -> Path:
    estilo = ("FontName=Arial,FontSize=15,Bold=1,PrimaryColour=&H00FFFFFF,"
              "OutlineColour=&H00000000,BorderStyle=1,Outline=2.5,Shadow=0,"
              "Alignment=2,MarginV=190")
    _run([FFMPEG, "-y", "-i", str(video),
          "-vf", f"subtitles={srt}:force_style='{estilo}'",
          "-c:v", "libx264", "-preset", "medium", "-crf", "19",
          "-pix_fmt", "yuv420p", "-c:a", "copy", str(destino)])
    return destino


def ensamblar_parte(carpeta: Path, clips: list[Path], segmentos: list[dict],
                    guion: dict, cfg: dict) -> dict:
    """Orquesta el ensamble completo de una parte y devuelve rutas."""
    aud = cfg.get("audio", {})
    vid = cfg.get("produccion", {})
    bruto = concatenar_clips(clips, carpeta / "intermedios" / "video_sin_audio.mp4",
                             fps=vid.get("fps", 30),
                             resolucion=vid.get("formato", "1080x1920"))
    voz = unir_narracion(segmentos, carpeta / "intermedios" / "narracion.wav")
    mezcla = mezclar(bruto, voz, carpeta / "intermedios" / "mezclado.mp4",
                     ambiente_db=aud.get("ambiente_db", -32),
                     lufs=aud.get("loudness_objetivo_lufs", -14.0),
                     tp=aud.get("true_peak_max_dbtp", -1.0),
                     ducking=aud.get("ducking", True))
    srt = escribir_srt(guion["enunciados"], carpeta / "subtitulos.srt")
    final = quemar_subtitulos(mezcla, srt, carpeta / "video_final.mp4")
    rutas = {"video_final": str(final), "subtitulos": str(srt),
             "narracion": str(voz), "duracion_seg": round(duracion(final), 2)}
    (carpeta / "rutas.json").write_text(
        json.dumps(rutas, ensure_ascii=False, indent=2), encoding="utf-8")
    return rutas
