# DotaciónPro — Contexto completo para continuar el proyecto

## ¿Qué es esto?

App web (React + TypeScript + Tailwind CSS) para que **Dotaciones El Manantial** (empresa de dotación industrial y EPP en Bogotá) pueda conseguir clientes y enviar cotizaciones de forma automática, en vez de ir puerta a puerta.

---

## Datos de la empresa

| Campo | Valor |
|---|---|
| Nombre | Dotaciones El Manantial |
| Dirección | Carrera 34 # 2-62, Bogotá, Colombia |
| Ciudad | Bogotá |
| Productos | Dotación industrial, EPP (guantes, cascos, calzado de seguridad, overoles, gafas, tapabocas, arneses, chalecos reflectivos) |
| Clientes objetivo | Empresas de plásticos, aluminios/metales, flores/agroindustria, manufactura, construcción, alimentos, logística en Bogotá |
| Ticket típico | Pedidos de 10 a 50+ unidades por empresa |

---

## Lo que ya está construido y funcionando ✅

### Stack técnico
- **React 19 + TypeScript**
- **Tailwind CSS 3** (instalado localmente, NO por CDN — esto es importante, fue el bug que se corrigió)
- **Vite 6** como bundler
- **xlsx** para importar/exportar Excel
- **lucide-react** para iconos

### Archivos del proyecto (`dotacion-app/`)
```
dotacion-app/
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx              ← entrada, importa index.css
    ├── index.css             ← @tailwind base/components/utilities
    ├── App.tsx               ← componente raíz, toda la lógica de estado
    ├── types.ts              ← tipos Company, Sector, colores, labels
    ├── components/
    │   ├── Dashboard.tsx     ← 4 tarjetas: total, pendientes, enviados, respondidos
    │   ├── CompanyTable.tsx  ← tabla con acciones editar/eliminar/enviar
    │   ├── CompanyForm.tsx   ← modal para agregar/editar empresa
    │   ├── SendModal.tsx     ← modal de envío (email + WhatsApp, empresa por empresa)
    │   └── SettingsModal.tsx ← configurar nombre de la empresa
    └── services/
        ├── storage.ts        ← localStorage (guardar/cargar empresas)
        ├── emailTemplate.ts  ← genera texto del email y mensaje WhatsApp
        └── excelImport.ts    ← importar Excel y exportar Excel
```

### Funcionalidades activas
1. **Dashboard de métricas** — total, pendientes, enviados, respondidos
2. **Agregar empresa** — formulario con nombre, sector, email, teléfono, contacto, dirección, estado
3. **Importar desde Excel** — columnas: `nombre`, `sector`, `email`, `telefono`, `contacto`, `direccion`
4. **Exportar a Excel** — descarga el listado completo con todos los datos
5. **Filtros** — buscar por texto, filtrar por sector y por estado
6. **Campaña de envío** — botón "Enviar a X pendientes" que abre un modal paso a paso
7. **Modal de envío** por cada empresa:
   - Tab **Email**: muestra asunto + cuerpo personalizado, botones "Abrir en Gmail" y "Abrir en correo"
   - Tab **WhatsApp**: muestra mensaje listo, botón "Abrir WhatsApp Web"
   - Botón "Marcar como enviado" + navegación siguiente/anterior
8. **Persistencia en localStorage** — los datos no se pierden al cerrar el navegador
9. **Configuración** — cambiar el nombre de la empresa desde ⚙️

### Plantillas de mensaje (en `emailTemplate.ts`)
Los mensajes ya incluyen:
- Nombre de la empresa: **Dotaciones El Manantial**
- Dirección: **Carrera 34 # 2-62, Bogotá, Colombia**
- Lista de productos con emojis
- Descuentos por volumen (5% desde 10 uds, 10% desde 26 uds)
- Placeholders `[NÚMERO DE CONTACTO]` y `[CORREO ELECTRÓNICO]` para completar

---

## Cómo correr el proyecto

```bash
cd dotacion-app
npm install
npm run dev
# Abre http://localhost:5173
```

Para producción:
```bash
npm run build
# Archivos listos en dotacion-app/dist/
```

---

## Lo que FALTA por hacer 🚧 (tareas pendientes)

### Prioridad ALTA
- [ ] **Completar placeholders en la plantilla** — reemplazar `[NÚMERO DE CONTACTO]` y `[CORREO ELECTRÓNICO]` con los datos reales de Dotaciones El Manantial
- [ ] **Subir a internet** — hospedar la app en Vercel/Netlify para que el papá la use desde el celular sin instalar nada. Solo entrar a una URL.
- [ ] **Adjuntar PDF automáticamente** — actualmente el PDF de cotización hay que adjuntarlo manualmente en Gmail. Considerar integrar la generación del PDF dentro de la app con `jsPDF` para no depender de un archivo externo.

### Prioridad MEDIA
- [ ] **Búsqueda automática de empresas en Google Maps** — usar la Google Maps Places API para buscar empresas por sector en Bogotá (requiere API key de Google). El flujo sería: el usuario escribe "plásticos Bogotá" → la app trae 20 empresas con dirección y teléfono → se agregan a la lista.
- [ ] **Template del Excel de importación** — botón para descargar un Excel vacío con las columnas correctas para que el papá lo llene fácil.
- [ ] **Recordatorio de seguimiento** — marcar empresas para hacer seguimiento en X días y mostrar alerta.
- [ ] **Estadísticas de conversión** — ver cuántos de los enviados terminaron en venta.

### Prioridad BAJA
- [ ] **Modo móvil mejorado** — la tabla no es ideal en pantalla pequeña, convertir a tarjetas en mobile.
- [ ] **Importar contactos de WhatsApp** — si el papá ya tiene números guardados.
- [ ] **Integración con Brevo/Mailchimp** — envío masivo real por API en vez de abrir Gmail manualmente.

---

## Repositorio GitHub

- **Repo:** `damc10100206-lab/Diego-Alejandro-Morales-campos`
- **Branch de trabajo:** `claude/clever-noether-l5ga54`
- La app está en la subcarpeta `dotacion-app/`

---

## Contexto de negocio

El papá del usuario vende dotación industrial (EPP) en Bogotá. Actualmente consigue clientes:
- Yendo empresa por empresa a dejar hoja de vida (muy desgastante)
- Buscando correos en internet y enviando cotización manualmente

Sus clientes más fuertes son empresas de manufactura (plásticos, aluminios, flores) que hacen pedidos grandes (10-50 unidades). El objetivo de la app es reemplazar el proceso manual con una herramienta que:
1. Tenga la lista de empresas a contactar
2. Genere el mensaje personalizado automáticamente
3. Abra Gmail/WhatsApp con un clic
4. Lleve el control de quién recibió la cotización y quién respondió

---

## Próximo paso recomendado

**Desplegar en Vercel (gratis):**
```bash
# Desde la carpeta dotacion-app/
npm install -g vercel
vercel
# Seguir los pasos → la app queda en una URL pública
```

Esto le permite al papá usar la app desde cualquier dispositivo sin instalar nada.
