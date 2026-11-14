# 02 · Roles, herramientas y flujo de trabajo (equipo de 5)

## Roles

| # | Rol | IA que usa | Es dueño de | Entrega |
|---|---|---|---|---|
| **P1** | **Líder técnico e integrador** | Claude Code | Repo, `main`, despliegue, `src/app/`, `src/domain/types.ts`, `src/features/future-self/` | Ejecuta el prompt maestro. Arma la base, revisa y fusiona los PR, mantiene la demo funcionando. Construye "Yo Futuro". |
| **P2** | **Experiencia del tripulante** | Claude Code | `src/features/` (menos `future-self/`), `src/components/` | Chequeo diario, figura humana clicable, alertas y ciclo de verificación, selector de entorno, resumen para el médico de vuelo. |
| **P3** | **Motor científico y datos** | DeepSeek (chat) | `src/domain/` (menos `types.ts`), `src/data/` | Catálogo de indicadores, reglas combinadas, modelos de proyección, generador de datos de la misión, pruebas. Todo en TypeScript puro, sin interfaz. |
| **P4** | **Diseño de producto** | pen.dev + IA gratuita | `design/` | Sistema visual, pantallas en pen.dev, figura humana en SVG, y el domingo el video o las diapositivas. |
| **P5** | **Ciencia, contenido y envío** | IA gratuita (Gemini, ChatGPT o Claude gratis) | `content/`, `docs/NASA_SOURCES.md`, `docs/AI_USAGE.md`, `docs/SUBMISSION.md` | Textos de la app en inglés (cómo medir, por qué importa, qué hacer), verificación de fuentes, prueba con usuarios, página del proyecto y guion del video. |

> Supuesto: el quinto integrante trabaja con IA gratuita. Si tiene otra herramienta, el rol no cambia.

## Por qué este reparto

- **Claude Code va donde hay muchos archivos conectados** (interfaz e integración).
- **DeepSeek va donde el trabajo cabe en un chat:** funciones puras con entrada y salida claras. Se copia el contrato de tipos, se pide una función y se pega el archivo. No necesita ver el resto del proyecto.
- **Quien "piensa por sí misma" valida la ciencia y cuenta la historia.** Ahí es donde una IA se equivoca más y donde los jueces ponen el mayor peso: la página escrita.

## Herramientas

| Para qué | Herramienta |
|---|---|
| Código | React + Vite + TypeScript + Tailwind + shadcn/ui (recomendado; Claude Code puede cambiarlo si lo justifica en `docs/DECISIONS.md`) |
| Datos en el navegador, sin servidor | Dexie (IndexedDB) |
| Gráficos y animación | Recharts y Motion |
| Diseño | pen.dev |
| Repositorio | GitHub |
| Publicación | Vercel (una vista previa por cada PR) |
| Coordinación | Un solo grupo de WhatsApp o Discord, y el tablero de Issues del repo |
| Video y diapositivas | CapCut o Canva |

## Flujo de trabajo en Git

1. Cada quien trabaja en **su rama**: `p1/…`, `p2/…`, `p3/…`, `p4/…`, `p5/…`.
2. **Solo se tocan los archivos del propio carril.** Si necesitas algo de otro carril, se lo pides a su dueño.
3. Se abre un PR pequeño cada 1 a 3 horas. P1 lo revisa y lo fusiona.
4. `src/domain/types.ts` es el contrato. **Solo P1 lo cambia**, y avisa al grupo.

### Si no usas terminal (P3, P4, P5)
1. Entra al repo en github.com y cambia a tu rama con el selector de ramas (créala la primera vez).
2. Ve a tu carpeta → **Add file → Upload files** (o el lápiz para editar).
3. Escribe qué cambiaste → **Commit changes**.
4. Pulsa **Compare & pull request** y avisa a P1.

## Puntos de control

| Cuándo | Qué debe estar listo |
|---|---|
| Sáb 12:00 | Repo, base de la app publicada en Vercel, contrato de tipos congelado, prompt de diseño generado |
| Sáb 15:00 | Catálogo de indicadores y datos de misión (P3). Sistema visual y pantalla principal en pen.dev (P4) |
| Sáb 19:00 | Chequeo diario + figura humana con datos reales del motor |
| Sáb 23:00 | Yo Futuro funcionando con el control de tiempo. Ciclo de alerta → acción → verificación |
| Dom 10:00 | Escena "Sol 142" completa de principio a fin. Prueba con 3 personas ajenas al equipo |
| **Dom 14:00** | **Se dejan de agregar funciones.** Solo correcciones |
| Dom 14:00–20:00 | Video o diapositivas, página del proyecto, lista de fuentes y uso de IA |
| **Dom 21:00** | **Envío.** Margen hasta las 23:59 |

## Reglas de Space Apps que no se negocian

- Todo el envío en **inglés**. La interfaz de la app también.
- Video de **máximo 30 s** con subtítulos en inglés, o **máximo 7 diapositivas**. Pasarse descalifica.
- Declarar **todo uso de IA** (`docs/AI_USAGE.md`) y **todo dato de NASA** (`docs/NASA_SOURCES.md`). Se anota en el momento, no al final.
- Imágenes o video hechos con IA llevan marca de agua visible. Nada de logos de NASA.
- Enlace del proyecto público. Una vez enviado, no se puede editar.
