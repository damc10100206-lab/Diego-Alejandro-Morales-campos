#!/usr/bin/env python3
"""Orquestador de producción.

    python src/pipeline.py --serie ruta-12 --parte 1            # producción real
    python src/pipeline.py --serie ruta-12 --parte 1 --simular   # sin APIs ni costo
    python src/pipeline.py --dia                                 # las 2 del día

Modo --simular: reemplaza Veo y el TTS por generadores locales de ffmpeg. Sirve
para verificar el ensamble, la mezcla, los subtítulos y el QA técnico sin gastar
un peso. Es el modo con el que se prueba cualquier cambio antes de correr en real.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).parent))

import yaml  # noqa: E402

import assemble  # noqa: E402
import qa  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
CFG = RAIZ / "config" / "pipeline.yaml"
SERIES = RAIZ / "series"
OUTPUT = RAIZ / "output"


def cargar_cfg() -> dict:
    return yaml.safe_load(CFG.read_text(encoding="utf-8"))


def cargar_voces() -> dict:
    return yaml.safe_load((RAIZ / "config" / "voces.yaml").read_text(encoding="utf-8"))


def hoy(cfg: dict) -> str:
    tz = os.environ.get("TZ") or cfg.get("produccion", {}).get("tz", "America/Bogota")
    try:
        return datetime.now(ZoneInfo(tz)).strftime("%Y-%m-%d")
    except Exception:
        return datetime.now().strftime("%Y-%m-%d")


def cargar_parte(serie: str, parte: int) -> tuple[dict, dict, dict, dict]:
    base = SERIES / serie / f"parte-{parte:02d}"
    def leer(nombre: str) -> dict:
        ruta = base / nombre
        if not ruta.exists():
            raise SystemExit(
                f"Falta {ruta}. Genera el paquete de la parte con los agentes "
                f"(prompts/01..05) antes de producir.")
        return json.loads(ruta.read_text(encoding="utf-8"))
    return leer("guion.json"), leer("planos.json"), leer("voz.json"), leer("sonido.json")


# ───────────────────────────── simulación ─────────────────────────────

def _clip_simulado(destino: Path, segundos: float, n: int) -> Path:
    """Clip de prueba con video y audio reales (ruido + tono) para que el
    ensamble, la mezcla y el QA se ejerciten de verdad."""
    destino.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
         "-f", "lavfi", "-i", f"testsrc2=size=1080x1920:rate=30:duration={segundos}",
         "-f", "lavfi", "-i", f"anoisesrc=d={segundos}:c=pink:a=0.08",
         "-vf", f"drawtext=text='PLANO {n}':fontsize=90:fontcolor=white:x=(w-tw)/2:y=(h-th)/2",
         "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k",
         "-t", str(segundos), str(destino)], check=True)
    return destino


def _voz_simulada(direccion: dict, carpeta: Path) -> list[dict]:
    """Un wav por línea con la duración que tendría la locución real
    (2.6 palabras/s), para validar sincronía de subtítulos y duración total."""
    carpeta.mkdir(parents=True, exist_ok=True)
    segmentos = []
    for linea in direccion["lineas"]:
        palabras = max(1, len(linea["texto"].split()))
        dur = max(0.6, palabras / 2.6 / max(0.5, float(linea.get("velocidad", 1.0))))
        ruta = carpeta / f"linea_{linea['i']:03d}.wav"
        subprocess.run(
            ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
             "-f", "lavfi", "-i", f"sine=frequency=180:duration={dur:.2f}",
             "-af", "volume=0.25,tremolo=f=5:d=0.6",
             "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", str(ruta)], check=True)
        segmentos.append({"i": linea["i"], "ruta": str(ruta), "tipo": "voz",
                          "velocidad": 1.0})
        pausa = float(linea.get("pausa_despues_seg", 0.25))
        if pausa > 0:
            p = carpeta / f"pausa_{linea['i']:03d}.wav"
            subprocess.run(
                ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                 "-f", "lavfi", "-i", f"anullsrc=r=48000:cl=mono:d={pausa}",
                 "-c:a", "pcm_s16le", str(p)], check=True)
            segmentos.append({"i": linea["i"], "ruta": str(p), "tipo": "pausa"})
    return segmentos


# ───────────────────────────── producción ─────────────────────────────

def producir_parte(serie: str, parte: int, *, simular: bool = False,
                   subir: bool = True) -> dict:
    cfg = cargar_cfg()
    guion, planos, voz, sonido = cargar_parte(serie, parte)
    fecha = hoy(cfg)
    nombre = f"{serie}-parte-{parte:02d}"
    carpeta = OUTPUT / fecha / nombre
    (carpeta / "intermedios").mkdir(parents=True, exist_ok=True)

    # 1) Clips
    clips: list[Path] = []
    reintentos = cfg["video"].get("reintentos_por_clip", 3)
    for plano in planos["planos"]:
        destino = carpeta / "intermedios" / f"plano_{plano['n']:02d}.mp4"
        segundos = float(plano.get("t_fin", 8) - plano.get("t_ini", 0)) or 8.0
        if simular:
            clips.append(_clip_simulado(destino, segundos, plano["n"]))
            continue
        from providers import veo
        ultimo = None
        for intento in range(1, reintentos + 1):
            try:
                clips.append(veo.generar_clip(
                    plano["prompt"], destino,
                    negativos=plano.get("negativos", ""),
                    modelo=os.environ.get("VEO_MODEL"), intento=intento))
                break
            except Exception as e:      # noqa: BLE001 — se reintenta y se reporta
                ultimo = e
                print(f"  ! plano {plano['n']} intento {intento}: {e}", file=sys.stderr)
        else:
            raise SystemExit(f"El plano {plano['n']} falló {reintentos} veces: {ultimo}")

    # 2) Narración
    if simular:
        segmentos = _voz_simulada(voz, carpeta / "intermedios" / "voz")
    else:
        from providers import tts
        perfil = cargar_voces()["perfiles"][voz.get("perfil_voz")]
        proveedor = cfg["voz"]["proveedor"]
        nombre_voz = (perfil.get("elevenlabs_voice_id") if proveedor == "elevenlabs"
                      else perfil.get("gemini_tts_voice"))
        segmentos = tts.generar_narracion(voz, carpeta / "intermedios" / "voz",
                                          proveedor, nombre_voz)

    # 3) Ensamble
    rutas = assemble.ensamblar_parte(carpeta, clips, segmentos, guion, cfg)

    # 4) QA técnico — puerta dura
    informe = qa.auditar(Path(rutas["video_final"]), cfg, guion, simular=simular)
    qa.escribir_informe(informe, carpeta)

    # 5) Paquete de publicación
    (carpeta / "guion.txt").write_text(
        "\n".join(f"[{e['t_ini']:>5.1f}s] {e['texto']}" for e in guion["enunciados"]),
        encoding="utf-8")
    publicacion = {
        "serie": serie, "parte": parte, "titulo": guion.get("titulo_parte"),
        "descripcion": guion.get("descripcion_tiktok"),
        "hashtags": guion.get("hashtags", []),
        "cliffhanger": guion.get("cliffhanger_texto"),
        "duracion_seg": rutas["duracion_seg"],
        "qa_tecnico": informe["veredicto"],
        "pendiente_qa_agentes": ["06_realismo", "07_audio_y_voz", "08_gancho"],
        "modo": "simulado" if simular else "real",
        "generado": fecha,
    }
    (carpeta / "publicacion.json").write_text(
        json.dumps(publicacion, ensure_ascii=False, indent=2), encoding="utf-8")
    for src, dst in (("planos.json", "planos.json"), ("sonido.json", "sonido.json")):
        (carpeta / dst).write_text(
            json.dumps(planos if "planos" in src else sonido,
                       ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"{'✔' if informe['veredicto'] == 'APROBADO' else '✘'} {nombre}: "
          f"{informe['veredicto']} · {rutas['duracion_seg']}s")
    for f in informe["fallas"]:
        print(f"    falla: {f}")
    for a in informe["avisos"]:
        print(f"    aviso: {a}")

    # 6) Drive — solo lo aprobado se sube al canal
    if subir and informe["veredicto"] == "APROBADO" and not simular:
        try:
            from providers import drive
            drive.escribir_manifiesto(carpeta, publicacion)
            res = drive.subir_carpeta_video(carpeta, fecha, nombre)
            publicacion["drive"] = res
            (carpeta / "publicacion.json").write_text(
                json.dumps(publicacion, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"    Drive: {res['url']} ({res['archivos']} archivos)")
        except Exception as e:  # noqa: BLE001
            print(f"    ! Drive falló: {e}", file=sys.stderr)

    return publicacion


def siguientes_pendientes(cfg: dict) -> list[tuple[str, int]]:
    """Próximas partes por producir, repartidas entre series (round-robin).

    Se avanza una parte por serie antes de tomar la segunda de la misma: así el
    canal publica dos historias distintas el mismo día en vez de dos capítulos
    seguidos de una sola, que compiten entre ellos por la misma audiencia.
    """
    n = cfg["produccion"].get("videos_por_dia", 2)
    pendientes: list[list[tuple[str, int]]] = []
    for estado_path in sorted(SERIES.glob("*/estado.json")):
        estado = json.loads(estado_path.read_text(encoding="utf-8"))
        serie = estado_path.parent.name
        total = estado.get("partes_totales", cfg["produccion"]["partes_por_serie"])
        pendientes.append([(serie, p) for p in
                           range(estado.get("ultima_producida", 0) + 1, total + 1)])

    cola: list[tuple[str, int]] = []
    vuelta = 0
    while len(cola) < n and any(len(s) > vuelta for s in pendientes):
        for serie_partes in pendientes:
            if len(serie_partes) > vuelta:
                cola.append(serie_partes[vuelta])
                if len(cola) >= n:
                    return cola
        vuelta += 1
    return cola


def marcar_producida(serie: str, parte: int) -> None:
    ruta = SERIES / serie / "estado.json"
    estado = json.loads(ruta.read_text(encoding="utf-8"))
    estado["ultima_producida"] = max(estado.get("ultima_producida", 0), parte)
    estado["actualizado"] = datetime.now().isoformat(timespec="seconds")
    ruta.write_text(json.dumps(estado, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="Fábrica de videos de TikTok")
    ap.add_argument("--serie")
    ap.add_argument("--parte", type=int)
    ap.add_argument("--dia", action="store_true",
                    help="produce la cuota diaria según series/*/estado.json")
    ap.add_argument("--simular", action="store_true",
                    help="sin llamadas a APIs: valida ensamble, mezcla y QA")
    ap.add_argument("--no-subir", action="store_true")
    args = ap.parse_args()

    cfg = cargar_cfg()
    trabajos = ([(args.serie, args.parte)] if args.serie and args.parte
                else siguientes_pendientes(cfg) if args.dia else [])
    if not trabajos:
        ap.error("usa --serie X --parte N, o --dia")

    fallidos = 0
    for serie, parte in trabajos:
        try:
            res = producir_parte(serie, parte, simular=args.simular,
                                 subir=not args.no_subir)
            if res["qa_tecnico"] == "APROBADO" and not args.simular:
                marcar_producida(serie, parte)
            elif res["qa_tecnico"] != "APROBADO":
                fallidos += 1
        except SystemExit as e:
            print(f"✘ {serie} parte {parte}: {e}", file=sys.stderr)
            fallidos += 1
    return 1 if fallidos else 0


if __name__ == "__main__":
    raise SystemExit(main())
