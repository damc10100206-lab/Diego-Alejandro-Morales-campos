# MENSAJE PARA PEGAR EN LA NUEVA SESIÓN DE CLAUDE CODE
# Copia TODO el texto desde "---INICIO---" hasta "---FIN---"

---INICIO---

Hola. Estoy continuando un proyecto que quedó a medias en otra sesión de Claude Code. 
Necesito que lo retomes exactamente desde donde quedó. Te doy TODO el contexto:

---

## PROYECTO: DotaciónPro

### ¿Qué es?
Una app web (React + TypeScript + Tailwind CSS) que construimos para que **Dotaciones El Manantial**, empresa familiar de dotación industrial en Bogotá, pueda conseguir clientes y enviar cotizaciones automáticamente en vez de ir puerta a puerta.

---

## DATOS DE LA EMPRESA

- **Nombre:** Dotaciones El Manantial
- **Dirección:** Carrera 34 # 2-62, Bogotá, Colombia
- **Productos que vende:** guantes industriales (nitrilo, cuero, PVC), cascos de seguridad, calzado con puntera de acero, overoles y ropa de trabajo, gafas de protección, tapabocas y respiradores, arneses para trabajo en alturas, chalecos reflectivos
- **Clientes objetivo:** empresas de plásticos, aluminios/metales, flores/agroindustria, manufactura, construcción, alimentos y logística en Bogotá
- **Pedidos típicos:** entre 10 y 50+ unidades por empresa cliente

---

## REPOSITORIO

- **Repo GitHub:** `damc10100206-lab/Diego-Alejandro-Morales-campos`
- **Branch de trabajo:** `claude/clever-noether-l5ga54`  ← SIEMPRE trabajar en este branch
- **Carpeta de la app:** `dotacion-app/` dentro del repo

---

## QUÉ ESTÁ CONSTRUIDO Y FUNCIONANDO (no tocar sin razón)

### Stack técnico
- React 19 + TypeScript
- Tailwind CSS 3 instalado LOCALMENTE (NO por CDN — esto fue un bug que se corrigió, si se vuelve a poner CDN se rompe)
- Vite 6 como bundler
- xlsx para importar/exportar Excel
- lucide-react para iconos

### Estructura de archivos
```
dotacion-app/
├── index.html
├── package.json
├── tailwind.config.js          ← content apunta a src/**/*.{ts,tsx}
├── postcss.config.js
├── vite.config.ts
├── tsconfig.json
├── CONTINUAR_AQUI.md           ← este mismo contexto en el repo
└── src/
    ├── main.tsx                ← importa index.css (IMPORTANTE)
    ├── index.css               ← @tailwind base/components/utilities
    ├── App.tsx                 ← lógica principal: lista de empresas, filtros, modales
    ├── types.ts                ← tipos: Company, Sector, colores, labels
    ├── components/
    │   ├── Dashboard.tsx       ← 4 tarjetas resumen (total, pendientes, enviados, respondidos)
    │   ├── CompanyTable.tsx    ← tabla con botones editar/eliminar/enviar por empresa
    │   ├── CompanyForm.tsx     ← modal agregar/editar empresa
    │   ├── SendModal.tsx       ← modal de campaña: email + WhatsApp, empresa por empresa
    │   └── SettingsModal.tsx   ← configurar nombre de la empresa
    └── services/
        ├── storage.ts          ← guarda/carga empresas en localStorage
        ├── emailTemplate.ts    ← genera texto del email y mensaje WhatsApp personalizados
        └── excelImport.ts      ← importar desde Excel y exportar a Excel
```

### Funcionalidades que YA funcionan
1. Dashboard con 4 métricas: total empresas, pendientes, enviadas, respondidas
2. Agregar empresa manualmente (formulario completo)
3. Editar y eliminar empresas
4. Importar empresas desde Excel (columnas: nombre, sector, email, telefono, contacto, direccion)
5. Exportar todas las empresas a Excel
6. Filtrar por texto, sector y estado
7. Botón "Enviar a X pendientes" → abre modal de campaña paso a paso
8. Modal de envío con dos tabs:
   - Tab Email: muestra asunto + cuerpo completo → botones "Abrir en Gmail" y "Abrir en correo"
   - Tab WhatsApp: muestra mensaje listo → botón "Abrir WhatsApp Web" con número pre-cargado
   - Botón "Marcar como enviado" + navegación anterior/siguiente empresa
9. Los datos se guardan en localStorage (no se pierden al cerrar)
10. Configuración del nombre de empresa desde ⚙️

### Lo que incluyen los mensajes generados
El archivo `src/services/emailTemplate.ts` genera automáticamente:
- Saludo personalizado con nombre del contacto
- Nombre empresa: "Dotaciones El Manantial"
- Dirección: "Carrera 34 # 2-62, Bogotá, Colombia"
- Lista completa de productos con emojis
- Descuentos: 5% desde 10 uds, 10% desde 26 uds, personalizado +50 uds
- PENDIENTE: tiene dos placeholders `[NÚMERO DE CONTACTO]` y `[CORREO ELECTRÓNICO]` que hay que reemplazar con los datos reales

---

## CÓMO CORRER EL PROYECTO LOCALMENTE

```bash
cd dotacion-app
npm install
npm run dev
# Se abre en http://localhost:5173
```

Para compilar para producción:
```bash
cd dotacion-app
npm run build
# Archivos listos en dotacion-app/dist/
```

---

## TAREAS PENDIENTES (en orden de prioridad)

### 🔴 ALTA PRIORIDAD

1. **Completar datos de contacto en la plantilla**
   - Archivo: `dotacion-app/src/services/emailTemplate.ts`
   - Reemplazar `[NÚMERO DE CONTACTO]` con el celular real
   - Reemplazar `[CORREO ELECTRÓNICO]` con el correo real
   - Necesito que el usuario me dé estos datos

2. **Desplegar en Vercel (gratis)** para que el papá use la app desde el celular sin instalar nada
   - La app ya compila con `npm run build`
   - Solo hay que conectar el repo a Vercel apuntando a la carpeta `dotacion-app/`
   - Comando de build: `npm run build`
   - Directorio de salida: `dist`

3. **Generar PDF de cotización dentro de la app** (con jsPDF)
   - Actualmente el usuario adjunta el PDF manualmente en Gmail
   - Sería mejor que la app genere el PDF y permita descargarlo para adjuntarlo
   - Ya tienen jsPDF como dependencia disponible en el repo padre

### 🟡 PRIORIDAD MEDIA

4. **Botón para descargar plantilla Excel**
   - Un Excel vacío con las columnas correctas: nombre, sector, email, telefono, contacto, direccion
   - Para que el papá pueda llenarlo y luego importarlo

5. **Búsqueda automática de empresas por Google Maps**
   - Usar Google Maps Places API
   - El usuario escribe "plásticos Bogotá" → la app trae empresas con dirección y teléfono
   - Requiere API key de Google (el usuario la debe proporcionar)

6. **Recordatorio de seguimiento**
   - Marcar empresa "hacer seguimiento en X días"
   - Mostrar alerta visual cuando toca hacer seguimiento

7. **Estadísticas de conversión**
   - Cuántos enviados terminaron en venta
   - Tasa de respuesta por sector

### 🟢 PRIORIDAD BAJA

8. **Vista móvil mejorada** — la tabla se ve mal en celular, convertir a tarjetas
9. **Integración con Brevo API** — envío masivo real sin abrir Gmail manualmente

---

## CONTEXTO DE NEGOCIO (para entender el por qué)

El papá del usuario vende dotación industrial (EPP) en Bogotá. El problema actual:
- Va empresa por empresa dejando hoja de vida → muy desgastante y lento
- Busca correos en internet y envía cotizaciones una por una manualmente

Sus mejores clientes son manufactura (plásticos, aluminios, flores) porque hacen pedidos grandes.
La app resuelve esto: lista de empresas + mensaje automático + Gmail/WhatsApp con un clic + control de seguimiento.

---

## INSTRUCCIÓN PARA EMPEZAR

1. Lee el archivo `dotacion-app/CONTINUAR_AQUI.md` del repo para confirmar que tienes el contexto
2. Corre `cd dotacion-app && npm install && npm run build` para verificar que compila
3. Pregúntame cuál tarea quiero hacer primero
4. TODO cambio va al branch `claude/clever-noether-l5ga54` con commit y push

---FIN---
