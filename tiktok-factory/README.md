# tiktok-factory · fábrica diaria de historias

Sistema para producir **2 videos de ~60 s al día** para TikTok, en series de 8
partes, género terror realista / historias turbias, con QA obligatorio antes de
empaquetar y entrega a una carpeta de Google Drive (una carpeta por video).

---

## 1. Estado real: qué funciona hoy y qué falta

| Etapa | Estado | Qué falta |
|---|---|---|
| Guiones (arco de 8 partes, locución cronometrada, hooks, cliffhangers) | ✅ **funciona** | nada |
| Prompts de video plano por plano | ✅ **funciona** | nada |
| Dirección de voz (anti robot) y diseño sonoro | ✅ **funciona** | nada |
| Ensamble ffmpeg: concatenado, mezcla, ducking, subtítulos, máster −14 LUFS | ✅ **probado** | nada |
| QA técnico automático (duración, loudness, silencios, negros, resolución) | ✅ **probado** | nada |
| QA creativo por agentes (realismo, voz, gancho) | ✅ prompts listos | corren dentro de la rutina |
| Generación de video con Veo | ⚠️ código listo | `GEMINI_API_KEY` |
| Narración con Gemini TTS | ⚠️ código listo | `GEMINI_API_KEY` |
| Subida a Drive | ⚠️ código listo | credenciales + `DRIVE_ROOT_FOLDER_ID` |
| ElevenLabs (voz premium) | ⛔ bloqueado | la red de este entorno no permite `api.elevenlabs.io` |

Verificado el 2026-08-12 en modo simulación: los dos videos del día se
generaron completos, 1080×1920, 30 fps, −13.1 LUFS, subtítulos quemados,
QA en APROBADO, una carpeta por video.

### Sobre la red de este entorno
El proxy de salida permite Google (`generativelanguage.googleapis.com`,
`googleapis.com`) y **bloquea** `api.elevenlabs.io` y `fal.run`. Por eso el
stack por defecto es 100 % Google: una sola llave cubre video y voz. Si quiere
usar ElevenLabs, hay que ampliar la política de red del entorno en la
configuración de Claude Code on the web.

---

## 2. Costo real (esto hay que decidirlo antes de encender la rutina)

Precios de referencia de agosto 2026, por video de ~64 s (8 planos de 8 s):

| Configuración | Costo por video | 2/día | Al mes |
|---|---|---|---|
| Veo 3.1 estándar **con audio nativo** (~$0.75/s) | ~$48 | ~$96 | ~**$2.900** |
| Veo 3.1 **Fast** (~$0.15/s) | ~$9.6 | ~$19 | ~**$580** |
| Veo 3.1 Lite sin audio (~$0.05/s) + TTS | ~$3.2 | ~$6.4 | ~**$195** |
| **Modo económico** (3 planos generados + 5 planos de imagen fija con paneo) | ~$1.2 | ~$2.4 | ~**$72** |

Recomendación: **arranque en Veo Fast**, y solo suba a estándar en la parte 1
de cada serie (la que decide si la serie prende). Las partes 2 a 8 las ve gente
que ya está engancha­da y toleran visual más simple.

El modo económico es el que usa la mayoría de las cuentas grandes de este
género: la retención la sostiene la voz y el guion, no la imagen.

---

## 3. Instalación

```bash
cd tiktok-factory
pip install -r requirements.txt
sudo apt-get install -y ffmpeg          # obligatorio
cp .env.example .env                    # y llenar las llaves
```

### Llaves
1. **Gemini** — `https://aistudio.google.com/apikey` → `GEMINI_API_KEY`.
   Cubre Veo (video) y Gemini TTS (voz).
2. **Drive** — cuenta de servicio en Google Cloud, descargar el JSON,
   y **compartir la carpeta de Drive con el correo de la cuenta de servicio**
   como Editor. Luego `DRIVE_ROOT_FOLDER_ID` = el id que sale en el URL de la
   carpeta.

> Los nombres de modelo (`VEO_MODEL`, `TTS_MODEL`) cambian seguido. Verifíquelos
> en AI Studio antes del primer corrido real.

---

## 4. Uso

```bash
# Probar todo sin gastar un peso (recomendado tras cualquier cambio)
python src/pipeline.py --dia --simular --no-subir

# Producir una parte específica de verdad
python src/pipeline.py --serie ruta-12 --parte 1

# La cuota del día (2 videos, una parte por serie, round-robin)
python src/pipeline.py --dia
```

Solo lo que pasa el QA técnico se sube a Drive y solo entonces la parte se marca
como producida en `series/<serie>/estado.json`. Un video rechazado se queda en
`output/` con su informe de fallas.

---

## 5. Cómo está armado

```
config/pipeline.yaml     umbrales de producción, audio y QA (la puerta de calidad)
config/voces.yaml        perfiles de voz; una serie = una voz, para siempre
prompts/01..05           agentes que crean: historia, guion, planos, voz, sonido
prompts/06..08           agentes que evalúan: realismo, audio/voz, gancho
src/pipeline.py          orquestador (incluye modo --simular)
src/assemble.py          ffmpeg: concatenado, mezcla con ducking, subtítulos, máster
src/qa.py                QA objetivo medible con ffmpeg
src/providers/veo.py     video con audio nativo
src/providers/tts.py     narración enunciado por enunciado
src/providers/drive.py   subida, una carpeta por video
series/<slug>/           serie.json, guiones.md, estado.json, parte-NN/*.json
output/YYYY-MM-DD/       resultado, una carpeta por video
```

### Las decisiones que sostienen el realismo
- **La voz nunca se genera en un bloque.** Cada enunciado sale por separado con
  su propia instrucción actoral, velocidad y pausa. El ritmo de metrónomo es el
  delator número uno del TTS, y así se rompe.
- **El ambiente no se sintetiza.** Se reusa el audio nativo de los clips de Veo,
  filtrado y bajado a −32 dB. Es sonido del mismo mundo que la imagen.
- **Ducking por cadena lateral**, no automatización a ojo: el ambiente baja solo
  cuando hay palabra y vuelve a subir en los silencios.
- **Estética de material imperfecto**: celular viejo, luz disponible, grano,
  encuadre torcido. Pedirle "cine" al modelo es lo que lo delata.
- **Nunca caras hablando de frente.** La boca es donde más falla el modelo. Se
  usan nucas, manos, reflejos, siluetas, ventanas, objetos.
- **Rango dinámico mínimo (LRA ≥ 3)** como falla dura: una mezcla aplastada
  suena a locución de IA aunque la voz sea buena.
- **Silencio digital prohibido.** Todo hueco se rellena con room tone.

---

## 6. Series listas

| Serie | Partes | Estado |
|---|---|---|
| `ruta-12` — el chofer del bus le disparó a mi papá | 8 guiones completos | paquete de producción de la parte 1 listo |
| `arriendo-barato` — casa de 3 pisos por $400.000 | 8 guiones completos | paquete de producción de la parte 1 listo |

Los guiones completos están en `series/<slug>/guiones.md`. Los paquetes de
producción de las partes 2 a 8 los genera la rutina diaria con los agentes
01–05 sobre esos guiones.

---

## 7. Nota sobre el rótulo de ficción

Las historias se narran en primera persona porque así funciona el formato, y en
la descripción van rotuladas como relato de ficción. Es lo que conviene, no solo
por política de la plataforma: una cuenta de storytime que se presenta como
testimonio real de hechos criminales queda expuesta a que la reporten y a
perder la monetización. Rotulada como ficción, el género funciona igual —
r/nosleep se construyó entero así.
