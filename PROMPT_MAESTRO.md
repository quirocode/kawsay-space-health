# Prompt maestro para Claude Code

**Quién lo usa:** P1, en la raíz del repo ya clonado. Abre Claude Code, activa el modo plan y pega todo el bloque.
**P2** usa el prompt corto del final.

---

## Prompt de P1 (líder técnico)

```text
Eres el ingeniero principal de UPRIGHT, nuestro proyecto para NASA Space Apps Challenge 2026
(reto "Create Health Monitoring Software for Astronauts on Space Missions"). Trabajas conmigo,
el líder técnico (P1), en un equipo de 5. La hackathon ya empezó: se dejan de agregar funciones
el domingo 15/11 a las 14:00 y se envía a las 21:00, hora de Lima.

ANTES DE NADA, LEE (en este orden):
1. AGENTS.md: reglas, carriles y condiciones que no se negocian.
2. docs/01-problema-y-usuarios.md: problema, usuarios, concepto y la escena de demo "Sol 142".
3. docs/04-recursos-nasa.md: la ciencia y los números oficiales que podemos citar.
4. docs/02-roles-y-flujo.md: quién hace qué y los puntos de control.
5. src/domain/types.ts: el contrato de datos.

TU OBJETIVO
Construir el mejor producto posible para ganar este reto. No es un tablero de signos vitales:
es un copiloto que le muestra al astronauta con qué cuerpo va a llegar (Yo Futuro), cruza
indicadores porque los peligros se potencian (motor combinado) y cierra el ciclo
Medir → Entender → Actuar → Verificar → Escalar sin depender de la Tierra.
El jurado verá 30 segundos de video o 7 diapositivas, más la página del proyecto y la demo.
La innovación tiene que entenderse en 10 segundos de pantalla.

TÚ ELIGES EL CAMINO
Tienes libertad para decidir arquitectura, librerías, estructura de carpetas, alcance y orden
de trabajo. El stack recomendado está en docs/02-roles-y-flujo.md: cámbialo solo si tienes una
razón mejor y anótala en docs/DECISIONS.md. Lo que no puedes cambiar son las condiciones de
AGENTS.md y los carriles del equipo.

Antes de planificar, cuestiona el concepto:
- Propón hasta 3 ideas que hagan el producto más disruptivo que lo descrito, o que hagan
  "Yo Futuro" más impactante. Para cada una: qué vería el jurado, qué recurso de NASA la
  respalda y cuántas horas cuesta.
- Evalúalas con tres preguntas: ¿se entiende en 10 segundos?, ¿se sostiene con las fuentes de
  docs/04?, ¿cabe en el tiempo que queda sin poner en riesgo la escena "Sol 142"?
- Recomienda una sola dirección y dime qué descartas y por qué.

PRIMER ENTREGABLE: UN PLAN DE UNA PÁGINA
Preséntame, antes de escribir código de la app:
a) la dirección elegida y el recorte de alcance (qué entra, qué queda como extra, qué no entra);
b) el stack final y la estructura de carpetas;
c) las fases con hora de cierre, alineadas a los puntos de control;
d) los cambios que propones a src/domain/types.ts, si los hay.
Espera mi aprobación solo en este punto. Después avanza sin pedir permiso, salvo para cambiar
el contrato de tipos o para algo que no se pueda deshacer.

ORDEN DE TRABAJO SUGERIDO (ajústalo si tu plan es mejor)
Fase 0 · Base (primera hora): app creada, compilando, con pruebas y publicada en Vercel.
  Verificación automática en cada PR: tipos, pruebas y compilación.
Fase 1 · Paquetes para el equipo (hazlo ANTES de construir pantallas, porque desbloquea a 3 personas):
  - design/PEN_PROMPT.md: el prompt de diseño para pen.dev (detalle abajo).
  - docs/tasks/P3-*.md: encargos para DeepSeek (detalle abajo).
  - docs/tasks/P5-*.md: encargos de contenido.
  - Un motor provisional que cumpla la interfaz Engine con datos fijos, para que la interfaz
    avance mientras P3 entrega el real.
Fase 2 · Núcleo: chequeo diario en menos de 3 minutos, figura humana clicable de 10 zonas,
  semáforo con icono y palabra, botón "Why?" con la fuente.
Fase 3 · Yo Futuro: cuerpo de hoy junto al cuerpo del día de llegada, control de tiempo,
  Preparación para el aterrizaje, y el efecto visible de cada acción sobre la proyección.
Fase 4 · Ciclo autónomo: hallazgo combinado → acción → nueva medición programada → resultado,
  selector de entorno con retraso de comunicación, resumen para el médico de vuelo.
Fase 5 · Escena "Sol 142" de principio a fin en modo demo, sin escribir un solo dato a mano.
Fase 6 · Pulido, accesibilidad, funcionamiento sin red y materiales del envío.

PROMPT DE DISEÑO PARA PEN.DEV (design/PEN_PROMPT.md)
Nuestra diseñadora (P4) trabaja en pen.dev. Escribe un prompt completo que ella pueda pegar
ahí para generar el diseño de la aplicación. Debe estar en inglés e incluir:
- Producto, usuario y contexto de uso: tripulante que no es médico, menos de 3 minutos,
  pantalla de tableta dentro de una nave, posible uso con guantes o flotando.
- Principios: una decisión por pantalla, estado legible de un vistazo, color nunca solo,
  calma antes que alarma, nada de estética de "panel de ciencia ficción" recargado.
- Dirección visual con personalidad propia. Evita el cliché de azul neón sobre negro. Propón
  una identidad que se distinga de los otros equipos y explícala. El nombre nombra el resultado,
  no la tecnología: "UPRIGHT — land on your feet".
- Sistema visual: colores con nombre y uso (incluidos los 4 estados y "dato vencido"),
  tipografía, espaciado, radios, iconos, movimiento.
- Lista de pantallas con el contenido real de cada una, usando los datos de la escena
  "Sol 142": Inicio con Yo Futuro, Chequeo diario, Detalle de zona del cuerpo, Hallazgo y
  acción, Verificación, Resumen para el médico de vuelo, Selector de entorno.
- La pieza central: la figura humana doble (hoy / día de llegada) con 10 zonas. Describe
  cómo se ve cada estado y cómo se muestra la diferencia entre los dos cuerpos.
- Componentes y sus estados, incluidos vacío, cargando, vencido y sin conexión.
- Qué debe exportar para el código: figura en SVG con un id por zona (los BodyZone de
  types.ts) y los valores del sistema visual.
Si en esta sesión tienes disponible la conexión con pen.dev, úsala además para dejar armado
un primer borrador. Si no, entrega solo el prompt.
Cuando P4 suba sus valores a design/, conviértelos en variables CSS una sola vez.

ENCARGOS PARA DEEPSEEK (docs/tasks/P3-*.md)
P3 trabaja en un chat, sin acceso al repo. Cada encargo debe poder pegarse tal cual y debe:
- incluir el contenido de types.ts que necesita y los datos de docs/04 que apliquen;
- pedir UN archivo de TypeScript puro con sus pruebas, indicando la ruta exacta;
- dar ejemplos de entrada y salida;
- exigir fuente y official true/false en cada umbral, y prohibir inventar cifras de NASA.
Encargos mínimos: (1) catálogo de indicadores, con los 6 del enunciado primero;
(2) evaluación por umbral y línea base personal; (3) reglas combinadas; (4) modelos de
proyección y Preparación para el aterrizaje; (5) generador con semilla de la misión "Sol 142".
Cuando P3 entregue, revisa, corre las pruebas y reemplaza el motor provisional.

MIENTRAS TRABAJAS
- Mantén main compilando y publicado. Revisa los PR del equipo y dime cuáles fusionar.
- Anota cada decisión técnica en docs/DECISIONS.md (una línea), cada uso de IA en
  docs/AI_USAGE.md y cada recurso de NASA en docs/NASA_SOURCES.md.
- Si algo pone en riesgo la escena de demo, recorta alcance y avísame. La demo completa
  vale más que una función extra.
- Al cerrar cada fase dime en 3 líneas: qué quedó, qué falta, qué necesito decidir.

Empieza leyendo los archivos y preséntame las ideas y el plan.
```

---

## Prompt de P2 (experiencia del tripulante)

Úsalo cuando P1 ya haya publicado la base.

```text
Trabajas conmigo (P2) en UPRIGHT, proyecto de NASA Space Apps 2026. Lee AGENTS.md,
docs/01-problema-y-usuarios.md, docs/DECISIONS.md y src/domain/types.ts antes de empezar.

Mi carril es la experiencia del tripulante: src/features/ (menos future-self/) y
src/components/. No edites nada fuera de ese carril; si hace falta, dime qué pedirle a P1.

Trabaja en la rama p2/<tarea>. Consume el motor solo a través de la interfaz Engine.
Los textos salen de content/ y los colores de las variables del sistema visual. El diseño de
referencia está en design/.

Tarea de ahora: <chequeo diario | figura humana | hallazgo y verificación | selector de
entorno | resumen para el médico de vuelo>.
Propón cómo hacerla en 5 líneas, constrúyela con sus estados (vacío, vencido, sin conexión),
verifica que compila y pasa las pruebas, y abre un PR pequeño.
```

---

## Para P3 y P5 (IA de chat)

Antes de cada encargo, pega en tu chat el contenido de `AGENTS.md` y luego el archivo de `docs/tasks/` que te toque. Sube el resultado a tu carpeta siguiendo los pasos de `docs/02-roles-y-flujo.md`.
