"""Subida a Google Drive: una carpeta por video, agrupadas por fecha."""
from __future__ import annotations

import json
import mimetypes
import os
from pathlib import Path

SCOPES = ["https://www.googleapis.com/auth/drive"]
CARPETA_MIME = "application/vnd.google-apps.folder"


class DriveError(RuntimeError):
    pass


def _servicio():
    from googleapiclient.discovery import build

    sa = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
    if sa and Path(sa).exists():
        from google.oauth2 import service_account
        creds = service_account.Credentials.from_service_account_file(sa, scopes=SCOPES)
    elif os.environ.get("GOOGLE_OAUTH_REFRESH_TOKEN"):
        from google.oauth2.credentials import Credentials
        creds = Credentials(
            None,
            refresh_token=os.environ["GOOGLE_OAUTH_REFRESH_TOKEN"],
            client_id=os.environ["GOOGLE_OAUTH_CLIENT_ID"],
            client_secret=os.environ["GOOGLE_OAUTH_CLIENT_SECRET"],
            token_uri="https://oauth2.googleapis.com/token",
            scopes=SCOPES,
        )
    else:
        raise DriveError(
            "Sin credenciales de Drive. Define GOOGLE_SERVICE_ACCOUNT_JSON "
            "o el trío GOOGLE_OAUTH_*. Ver .env.example")
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def _buscar_o_crear_carpeta(svc, nombre: str, padre: str) -> str:
    q = (f"name = '{nombre}' and mimeType = '{CARPETA_MIME}' "
         f"and '{padre}' in parents and trashed = false")
    res = svc.files().list(q=q, fields="files(id)", pageSize=1,
                           supportsAllDrives=True,
                           includeItemsFromAllDrives=True).execute()
    if res.get("files"):
        return res["files"][0]["id"]
    meta = {"name": nombre, "mimeType": CARPETA_MIME, "parents": [padre]}
    return svc.files().create(body=meta, fields="id",
                              supportsAllDrives=True).execute()["id"]


def subir_archivo(svc, ruta: Path, carpeta_id: str) -> str:
    from googleapiclient.http import MediaFileUpload

    tipo = mimetypes.guess_type(ruta.name)[0] or "application/octet-stream"
    media = MediaFileUpload(str(ruta), mimetype=tipo, resumable=ruta.stat().st_size > 5_000_000)
    meta = {"name": ruta.name, "parents": [carpeta_id]}
    return svc.files().create(body=meta, media_body=media, fields="id",
                              supportsAllDrives=True).execute()["id"]


def subir_carpeta_video(local: Path, fecha: str, nombre_video: str,
                        raiz: str | None = None) -> dict:
    """Sube `local` a  RAIZ / fecha / nombre_video  conservando subcarpetas."""
    raiz = raiz or os.environ.get("DRIVE_ROOT_FOLDER_ID")
    if not raiz:
        raise DriveError("DRIVE_ROOT_FOLDER_ID no está definida")

    svc = _servicio()
    id_fecha = _buscar_o_crear_carpeta(svc, fecha, raiz)
    id_video = _buscar_o_crear_carpeta(svc, nombre_video, id_fecha)

    cache: dict[str, str] = {".": id_video}
    subidos = 0
    for archivo in sorted(p for p in local.rglob("*") if p.is_file()):
        rel = archivo.parent.relative_to(local).as_posix()
        if rel not in cache:
            padre = id_video
            acumulado = []
            for tramo in rel.split("/"):
                acumulado.append(tramo)
                clave = "/".join(acumulado)
                if clave not in cache:
                    cache[clave] = _buscar_o_crear_carpeta(svc, tramo, padre)
                padre = cache[clave]
            cache[rel] = padre
        subir_archivo(svc, archivo, cache[rel])
        subidos += 1

    return {"carpeta_id": id_video, "archivos": subidos,
            "url": f"https://drive.google.com/drive/folders/{id_video}"}


def escribir_manifiesto(local: Path, datos: dict) -> Path:
    ruta = local / "manifiesto.json"
    ruta.write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")
    return ruta
