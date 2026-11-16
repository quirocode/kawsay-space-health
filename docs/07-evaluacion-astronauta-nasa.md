# 07 — Evaluación de UPRIGHT: astronauta + evaluador NASA

> Revisión hecha sobre `origin/main` @ `d2d02e1` y la demo publicada (`kawsay-ten.vercel.app/app/`), el 15-nov-2026.
> Escenario imaginado: **tránsito a Marte, día 142 de 180, tripulación de 4**, retraso de 14 min con la Tierra.
> Dos voces: 🧑‍🚀 *astronauta* (no soy médico, tengo < 3 min al día, quiero poder trabajar el día del aterrizaje) y 🛰️ *evaluador NASA* (¿esto aguanta una misión real?).

---

## 0. Resumen ejecutivo — lo que arreglaría primero

| # | Hallazgo | Por qué importa | Esfuerzo |
|---|---|---|---|
| 1 | **No existe la tripulación.** Un solo campo de texto `crew: "A. Quispe"`; las lecturas (`Reading`) no tienen `crewId`. | Con 4 astronautas en un mismo dispositivo, las líneas base, alertas y el informe se mezclan. Es el fallo más grave de cara a una misión real. | Medio (contrato `types.ts`, P1) |
| 2 | **"Why?" muestra enlaces, no una explicación.** Además, a bordo **no hay internet**: los enlaces a nasa.gov no abren. | La sección más importante para un no-médico está vacía justo cuando la necesita. | Bajo–medio |
| 3 | **Una presión de 200/100 solo pinta "Act" en una lista.** No abre protocolo, no pide re-medir, no escala. El reloj sí tiene protocolo completo. | Una crisis hipertensiva (≥180) puede pasar desapercibida si entra por el check manual. | Bajo |
| 4 | **No hay validación de valores imposibles** (acepta hasta 5 dígitos: 1200 mmHg, 0 °C…). | Un error de tecleo con guantes dispara falsas alarmas o esconde una real. | Bajo |
| 5 | **"Watch" significa dos cosas**: el estado amarillo y el reloj. "Stand up without fainting — Watch" no se entiende. | Ambigüedad en una etiqueta de seguridad. | Muy bajo (copy) |
| 6 | **El control "Demo" convive con los datos reales** en la barra superior. | En operación real, mezclar simulación y datos médicos es un error de seguridad clásico. | Bajo |
| 7 | **Faltan indicadores que salvan vidas y que nadie notaría solo**: dosis de radiación / tormenta solar, ritmo cardíaco (ECG), trombosis venosa yugular, test cognitivo, visión estructurada (SANS), anemia espacial. | Ver sección 4. | Variable |
| 8 | **"UPRIGHT alerta a la tripulación"… ¿cómo?** No hay red ni destinatarios. | Si estoy inconsciente, la promesa no se cumple. | Medio |
| 9 | **Alertas de cabina (CO₂) se tratan como individuales.** Si 3 de 4 tienen dolor de cabeza, es la nave, no la persona. | Regla de tripulación = detección temprana de fallos ambientales. | Bajo–medio |
| 10 | **Future Self sobreestimula**: dos cuerpos 3D, línea de tiempo, puntuación, 4 tareas, plan e historial en una pantalla. Rotar 3D con guantes en microgravedad no es práctico. | El usuario tiene < 3 min al día. | Medio (diseño) |

---

## 1. Evaluación sección por sección

### 1.1 Barra superior y navegación
- 🧑‍🚀 Entiendo "Day 142 of 180 · 38 days to landing" y el retraso con la Tierra: **excelente**, es lo que más me importa.
- 🧑‍🚀 Me desconcierta: **11 destinos en el menú** (Future Self, Guided mission, Daily check, Watch & alerts, Findings, Suit & phases, Earth brief, Connect, Mission, How it works, Project home). Yo uso 3: *mi check*, *mis alertas*, *mi aterrizaje*.
- 🧑‍🚀 "**Demo 07:45 ⌄**" con un punto brillante parece el reloj de la nave. No sé si estoy viendo datos reales o simulados.
- 🛰️ El menú de escenas demo, a ~800 px de ancho, se dibuja **detrás de la barra lateral** (queda cortado).
- 🛰️ "Project home" (portada de marketing) dentro de la app operacional no debería existir en vuelo.
- 🎨 **Mejora**: navegación de 3 pestañas para el astronauta (*Hoy · Alertas · Aterrizaje*) + un modo "Operaciones/CMO" separado. Mover Demo a un **modo Simulación** con banda de color permanente "SIM" (práctica estándar en NASA).

### 1.2 Future Self (Yo futuro)
- 🧑‍🚀 La idea "¿con qué cuerpo voy a aterrizar?" **me engancha**. El "66 → 89 con tu plan" es motivador y accionable.
- 🧑‍🚀 No entiendo: "Standing tolerance −6.7 %", "Leg strength −3.3 %", "Bone density −1.6 %": ¿−6.7 % respecto a qué? ¿Es mucho? ¿Hoy o al aterrizar?
- 🧑‍🚀 "Stand up without fainting — **Watch**": ¿tengo que mirar el reloj? (en inglés "Watch" es el estado amarillo y también el dispositivo).
- 🧑‍🚀 **Sobreestimula**: dos modelos anatómicos 3D, selector Muscles/Organs, slider de día, historial, puntuación, 4 tareas y plan. "Loading 3D anatomy…" tarda.
- 🛰️ Rotar con arrastre / pellizcar no funciona con guantes ni anclado a un pasamanos; el WebGL consume batería y GPU en hardware de vuelo limitado.
- 🛰️ "Think" (*Run the landing checklist*) no tiene **ninguna medición cognitiva** detrás: es una predicción sin dato.
- 🎨 **Mejora**: primera vista = una frase + un número + una acción ("Si sigues así aterrizas con 66/100. 38 min más de ejercicio al día → 89"). El 3D detrás de un botón "Ver mi cuerpo". Las 4 tareas con icono + palabra "Vigilar/Actuar/OK", nunca "Watch".

### 1.3 Misión guiada
- 🧑‍🚀 Es un tutorial muy claro (Reportar → Revisar cabina → Comparar → Informar a Tierra).
- 🧑‍🚀 Me desconcierta que el botón principal de la home diga **"Start mission"**: suena a "iniciar la misión", no a "ver la demo guiada".
- 🛰️ Para el jurado es oro; para vuelo debe vivir dentro del modo Simulación/entrenamiento.

### 1.4 Daily check (check diario) — *la captura que enviaste*
- 🧑‍🚀 7 pasos, un dato por pantalla, teclado grande (88 px) para guantes: **muy bien**.
- 🧑‍🚀 En el resumen, el texto se repite: "Blood pressure (systolic) **200 mmHg**" y debajo "Blood pressure (systolic) 200 mmHg: 160 or more." No me dice **qué significa ni qué hacer**.
- 🧑‍🚀 "Why?" abre "Prototype — UPRIGHT prototype value…" y "NASA — Risk of Cardiovascular Adaptations". **Eso no es un por qué**, es una bibliografía. Y sin internet, los enlaces no abren.
- 🛰️ **200/100 no dispara nada.** El reloj, ante 135 lpm, abre una alarma a pantalla completa con protocolo de 4 pasos; el check manual, ante 200 mmHg, solo muestra una etiqueta roja. **Cualquier valor rojo debe entrar al mismo flujo Respond** (re-medir en 5 min → síntomas → acción → escalar).
- 🛰️ Solo hay dos niveles (amarillo/rojo). 165 y 200 son ambos "Act", pero 200 con dolor de cabeza o visión borrosa es una **urgencia** (regla compuesta faltante: PA ≥ 180 + cefalea/visión/confusión → rojo, escalar).
- 🛰️ Sin **validación de plausibilidad**: aceptar 1200 o 0 sin preguntar "¿Seguro? Mide otra vez".
- 🛰️ El check pide presión, glucosa y temperatura cada día: en la nave esto requiere tensiómetro, glucómetro y lancetas (consumibles limitados). Glucosa diaria con pinchazo no es realista para 4 personas × 180 días; semanal o por evento.
- 🎨 **Mejora**: cada fila con estructura *Qué significa → Por qué en tu caso → Qué hacer ahora → Cuándo re-medimos*, y las fuentes plegadas debajo como "Evidencia". Ver sección 5.

### 1.5 Watch & alerts (reloj y alertas)
- 🧑‍🚀 "Your usual 56–68" junto al valor: **perfecto**, me compara conmigo mismo.
- 🧑‍🚀 La alarma de 135 lpm es la mejor pantalla de la app: titular gigante, "Haz esto primero", un botón grande. Bien.
- 🧑‍🚀 Ruido: la etiqueta "Simulated sensor" se repite en cada tarjeta (6 veces).
- 🛰️ **Inconsistencia**: en la alarma "Breathing 19/min" es **Watch** (amarillo); en la pantalla del reloj, al mismo tiempo, el mismo 19/min es **OK**.
- 🛰️ La HRV cae de 40 a 18 ms y sigue en **OK**: la HRV no tiene umbrales ni compara con la línea base.
- 🛰️ "Not ruled out: a rhythm problem" — correcto, pero la app **no puede** descartarlo: falta ECG (ver 4).
- 🛰️ "No answer in 9:52 and UPRIGHT alerts the crew": no hay mecanismo para avisar a otro dispositivo, al CMO ni a otro reloj.

### 1.6 Respond (protocolo tras la alarma)
- 🧑‍🚀 "**What UPRIGHT thinks — Likely: dehydration and fatigue. Low water today 1.1 L of 2.5 L. Short sleep 5.2 h…**". **Esto es exactamente lo que quiero ver en cada "Why?"**. Es la prueba de que el motor ya sabe explicar; solo falta usarlo en todas partes.
- 🛰️ "Chest pain or pressure" → escalar. Bien. Falta "¿Quién responde?": si estoy incapacitado, un compañero debe poder responder **en mi nombre** ("Respondiendo por A. Quispe").

### 1.7 Findings (hallazgos compuestos)
- 🧑‍🚀 "Low water + bone loss: kidney stone risk" → "Drink to 2.5 L today" → "Resolved on board". Claro y corto.
- 🛰️ Solo 6 reglas compuestas. Faltan: hipertensión + síntomas neurológicos, SANS (visión + cefalea), mareo espacial (náusea + vértigo tras transición de gravedad), infección (fiebre + lesión de piel + contacto con otro tripulante), **reglas de tripulación** (≥ 2 personas con el mismo síntoma = causa ambiental).

### 1.8 Suit & phases (traje y fases)
- 🧑‍🚀 Explica muy bien qué cambia en cada fase (lanzamiento, EVA, reentrada, primeras horas en suelo).
- 🧑‍🚀 Me desconcierta tener que **elegir "All nominal / Something to watch / Act now"**: eso es un simulador, no un monitor.
- 🛰️ Durante una EVA nadie mira una tableta. Esta parte debe vivir en el **display del traje (DCM / HUD) y en audio**: una línea, un tono, una acción.

### 1.9 Earth brief (informe a Tierra)
- 🛰️ Concepto excelente: "Arrives on Earth in 14 min · Reply earliest 08:13" es justo lo que un flight surgeon quiere.
- 🛰️ Faltan: (a) **la vuelta** — no hay forma de recibir/registrar la respuesta del médico en Tierra, el lazo no se cierra; (b) **privacidad** — en NASA los datos médicos van en *Private Medical Conference*, no a la vista del resto; (c) **informe de tripulación** (4 filas, una por persona) además del individual.

### 1.10 Connect (conectar banda)
- 🧑‍🚀 No entiendo: "Standard 0x180D · No Key", "Proprietary 0xFEE0 · 32-hex Key", "Saved in the local database (**db.ts**)". Es jerga de desarrollador.
- 🛰️ **Mezcla de idiomas** en la UI en inglés: "BLE Estándar (Sin Key)", "Requiere Auth Key", "Biomonitor Simulado", "Ajustes → Transmisión de frecuencia cardíaca".
- 🛰️ Huawei/Xiaomi son buen prototipo terrestre; preséntalo como "análogo terrestre" y nombra el equivalente de vuelo (Bio-Monitor/Astroskin de la CSA, ver sección 6).

### 1.11 Mission (entorno)
- 🛰️ "Crew member" es **un campo de texto libre**. Aquí es donde falta la tripulación.
- 🛰️ El astronauta puede cambiar el día de misión y el día de aterrizaje: eso debería ser configuración de misión (Tierra/CMO), no algo editable en el check diario.
- 🛰️ Se llama "Sol 142" en la demo, pero en tránsito no hay soles (un *sol* es un día marciano). Usar "Día 142" en tránsito y "Sol N" solo en superficie.

### 1.12 How it works
- 🧑‍🚀 Clarísimo: el lazo, los colores, NASA vs Prototype, "No AI model decides your status". Esta página convence al jurado.

---

## 2. Qué me sobreestimula o desconcierta (resumen del astronauta)

1. Demasiados destinos en el menú y demasiados bloques en la home.
2. Etiquetas repetidas ("Simulated sensor" × 6, "Prototype" en cada fila).
3. Animaciones/3D que cargan cuando solo quiero saber "¿estoy bien?".
4. "Watch" con doble significado; "Start mission" que no inicia nada; "Sol" en tránsito.
5. Números sin referencia ("−6.7 %").
6. "Why?" que me lleva a una bibliografía.
7. No sé si lo que veo es demo o real.

---

## 3. Problemas con 4 astronautas

| Problema | Qué pasa hoy | Propuesta |
|---|---|---|
| **Sin perfiles** | `mission.crew` es un string; `Reading` no tiene `crewId`. | Contrato v3 en `types.ts` (P1): `CrewMember { id, name, role, isCMO, preflightBaseline, conditions[], meds[], allergies[] }` y `crewId` en `Reading`, `WatchSample`, `Finding`, `WatchAlert`, `FlightSurgeonBrief`. |
| **Sin selector de persona** | Nadie elige quién usa el dispositivo. | Pantalla de inicio con 4 retratos grandes (aptos para guantes) + PIN opcional de 4 dígitos. Sin login de red (respeta "no login"). En dispositivos personales, se fija una vez. |
| **"Tu" ritmo cardíaco** en un dispositivo compartido | La alarma dice "Your heart rate is 135" aunque quien mire sea otra persona. | La alarma siempre nombra a la persona: "**A. Quispe** — ritmo 135 en reposo". |
| **Vista de tripulación para el CMO** | No existe. | Panel con 4 tarjetas (estado, última lectura, datos viejos en gris, alerta activa). El CMO también puede ser paciente → CMO suplente. |
| **Responder por otro** | Solo responde el portador. | "Respondo por A. Quispe" con registro de quién respondió. |
| **Alertas a la tripulación** | Promesa sin mecanismo. | Red local de la nave (o al menos BroadcastChannel/LAN en el demo) + vibración en el reloj de los demás + sonido en el panel común. |
| **Líneas base mezcladas** | Una sola línea base para todos. | Línea base y umbrales personales por astronauta (antecedentes: HTA, asma, migraña, diabetes tipo 2 controlada, etc.). |
| **Riesgos de tripulación** | CO₂, radiación, infección se evalúan por persona. | Reglas de nivel tripulación: ≥ 2 con cefalea → revisar CO₂/scrubber; fiebre en 1 → vigilar contactos; tormenta solar → todos al refugio. |
| **Recursos compartidos** | No se modelan. | 1 cinta/bicicleta/ARED para 4 personas × 90 min = 6 h/día: el plan de ejercicio debe ser un **horario de tripulación**. Botiquín compartido con inventario y caducidad (los fármacos se degradan con la radiación). |
| **Privacidad** | Todo visible para todos. | Cada uno ve lo suyo; el CMO ve estados (no detalle) salvo emergencia; detalle médico solo al flight surgeon. Consentimiento explícito. |
| **Conflicto y aislamiento** | Solo "mood" individual. | Check semanal breve y anónimo de cohesión del equipo/carga de trabajo (riesgo conductual es de equipo, no solo individual). |

---

## 4. Indicadores de salud que faltan

Prioridad = cuánto puede salvar una vida que **de otra forma jamás notarías**.

### Prioridad alta (silenciosos y potencialmente mortales)
| Indicador | Por qué | Fuente/medición |
|---|---|---|
| **Dosis de radiación personal** (acumulada vs límite de carrera 600 mSv, NASA-STD-3001) + **alerta de evento de partículas solares** | En tránsito a Marte es el riesgo nº 1 a largo plazo; una tormenta solar exige ir al refugio en minutos y afecta a los 4. | Dosímetro personal + monitor de la nave. Alerta de **tripulación**, no individual. |
| **Ritmo cardíaco (ECG de 1 derivación)** | Hay casos de arritmias en vuelo; el reloj solo ve frecuencia. "Not ruled out: a rhythm problem" necesita un dato. | ECG en camiseta biométrica o parche. |
| **Trombosis de la vena yugular** | Estudio en la ISS (11 astronautas): flujo estancado/invertido en 7 y un trombo oclusivo, descubierto solo por una ecografía de investigación. Asintomático. | Pregunta semanal (dolor/hinchazón en cuello, cara) + ecografía guiada periódica. |
| **Visión estructurada (SANS)** | "Blurred vision sí/no" es pobre; el SANS progresa sin síntomas. | Rejilla de Amsler + carta de agudeza cercana en pantalla (semanal), cefalea, OCT/fondo de ojo cuando esté disponible. |
| **Rendimiento cognitivo** | La tarea "Think" de aterrizaje no tiene ningún dato. | Test breve tipo vigilancia psicomotora (PVT, 3 min) semanal y antes de tareas críticas. |
| **Hemoglobina / anemia espacial** | El cuerpo destruye más glóbulos rojos en el espacio; afecta a la tolerancia al ejercicio y al aterrizaje. | Analizador portátil de sangre (mensual) o síntomas (fatiga, palidez, disnea al esfuerzo). |

### Prioridad media (frecuentes en vuelo, hoy ausentes)
- **Náusea/vómito, mareo espacial** (primeros días y tras cada cambio de gravedad: llegada a Marte/Luna).
- **Dolor lumbar** (elongación de columna; mayor riesgo de hernia discal tras el vuelo).
- **Congestión nasal/sinusitis** (por el desplazamiento de fluidos; muy común).
- **Orina**: color/volumen, retención urinaria, **dolor en flanco** (el "kidney stone risk" no pregunta por el síntoma de cálculo).
- **Tránsito intestinal** y **apetito**; **masa corporal** semanal (pérdida de peso = déficit calórico).
- **Calidad del sueño** (no solo horas), uso de somníferos/cafeína, exposición a luz.
- **Medicación tomada** (dosis, hora) y **alergias**.
- **Lesiones**: cortes, cuerpos extraños en el ojo, dolor dental (una urgencia dental en Marte no tiene dentista).
- **Audición** (ruido continuo de la nave).
- **Estrés/carga de trabajo/soledad** con escala validada corta, no solo "mood 1–5".

### Para Luna y superficie de Marte
- **Polvo regolítico**: irritación ocular, tos, disnea tras EVA (el polvo lunar es tóxico y abrasivo).
- **Lesiones de mano/hombro por guantes** en EVAs repetidas.
- **Carga de EVA acumulada** y tiempo de prebreathe (riesgo de descompresión).
- **Ambiente de cabina** como indicadores de tripulación: O₂, presión total, temperatura, humedad, amoníaco/contaminantes, ruido.
- **Atmósferas de exploración**: si el hábitat usa presión reducida con O₂ enriquecido, los umbrales de SpO₂ a nivel del mar no aplican igual; los umbrales deben depender del entorno.

---

## 5. "Why?" con IA local: diseño propuesto

### El problema
Hoy `SourceList` (`src/components/ui.tsx`) pinta "Why?" como una lista de enlaces. Para un astronauta no-médico **no explica nada**, y en vuelo **los enlaces no abren** (la app es offline). Pero la pantalla *Respond* ya demuestra que el motor sabe explicar ("What UPRIGHT thinks…").

### Estructura del nuevo "Why?" (siempre igual, en este orden)
1. **Qué significa** — una frase sin jerga.
2. **Por qué en tu caso** — tu valor vs el umbral vs tu línea base, con tendencia (↑↓) y los factores que lo empujan (sueño, agua, CO₂…).
3. **Qué hacer ahora** — un paso, el más urgente.
4. **Cuándo lo revisamos** — re-medición y qué pasa si no mejora (escalar).
5. **Evidencia** (plegado) — fuentes NASA/Prototype para el jurado y el flight surgeon.

**Ejemplo con la captura (200/100 mmHg):**
> **Qué significa:** tu presión está muy por encima de lo normal (200/100). A este nivel el corazón y los vasos trabajan con mucha carga.
> **Por qué en tu caso:** tu media de los últimos días es 118/76; esto es un salto brusco, así que primero descartemos un error de medición.
> **Qué hacer ahora:** quédate sentado 5 min, brazo a la altura del corazón, y mide otra vez.
> **Si sigue ≥ 180** o tienes dolor de cabeza, visión borrosa o confusión: avisa al CMO ahora; UPRIGHT prepara el informe para Tierra.
> ▸ Evidencia: NASA — Risk of Cardiovascular Adaptations · Umbral 160: valor prototipo.

### Cómo se genera (respetando AGENTS.md: las reglas deciden, la IA solo redacta)
1. **Capa determinista (obligatoria, siempre funciona):** una función pura en `src/domain/` (P3) `explain(evaluation, readings, baseline, findings) → { meaning, yourCase[], doNow, recheck, sources }` con plantillas en `content/` (P5). Es la que ya existe parcialmente en `watch.likely()`.
2. **Capa IA local (opcional, solo reescribe):** el modelo recibe **solo** el JSON del paso 1 y devuelve el mismo contenido en lenguaje más natural (o en el idioma del astronauta).
   - Navegador/PWA: **WebLLM** (WebGPU) o **Transformers.js** con un modelo pequeño cuantizado (≈ 0,5–1,5 B parámetros, q4).
   - Escritorio (`desktop/`, Electron): **llama.cpp** embebido. El modelo viaja **dentro del paquete**: nada se descarga en vuelo.
3. **Guardarraíles:** se rechaza la salida del modelo (y se usa la plantilla) si añade números que no estaban en la entrada, cambia el estado, usa palabras de diagnóstico ("tienes hipertensión"), supera N palabras o tarda > 2 s. El modelo nunca ve otros tripulantes.
4. **Alternativa más segura y barata:** como las reglas son finitas, se pueden **pre-generar en Tierra todas las explicaciones**, que un médico las revise, y a bordo solo rellenar los números. La IA local queda para preguntas libres ("¿por qué me duele la cabeza?") con las mismas reglas.
5. **Voz:** leer el "Why?" en voz alta (síntesis del sistema, funciona offline) para cuando las manos están ocupadas.

> Carriles: `explain()` es de P3 (`src/domain/`), el componente "Why?" de P2 (`src/components/`), las plantillas de P5 (`content/`), el empaquetado del modelo y `types.ts` de P1.

---

## 6. ¿En qué dispositivos debería vivir UPRIGHT?

Lo que hoy usan los astronautas (referencias públicas): **portátiles a bordo de la ISS** para procedimientos y datos, **tabletas comerciales** (iPad) para procedimientos y fotos, **wearables biomédicos** como el **Bio-Monitor de la CSA** (camiseta Astroskin: ECG, respiración, SpO₂, temperatura, actividad) y relojes de actigrafía para estudios de sueño, **asistentes de voz** experimentales (CIMON en la ISS, Callisto en Artemis I) y, en EVA, el **display y alertas sonoras del traje**.

Arquitectura recomendada para 4 astronautas:

| Capa | Dispositivo | Qué hace UPRIGHT ahí |
|---|---|---|
| **Sensores pasivos (24/7)** | Camiseta biométrica tipo Bio-Monitor + reloj/banda por persona | Ritmo, ECG, respiración, SpO₂, temperatura, sueño, actividad. Sin pantalla. |
| **Alerta personal** | Reloj en la muñeca | Vibración + 1 línea + 1 acción. Avisa también cuando otro tripulante tiene una emergencia. |
| **Check diario (2 min)** | **Tableta personal robusta** (una por astronauta) | Check, Future Self simplificado, "Why?". Teclado grande para guantes, modo noche. |
| **Panel de tripulación / CMO** | Portátil o pantalla fija del hábitat (la app de escritorio `.exe` ya existe) | Vista de 4 tarjetas, ambiente de cabina, inventario médico, informe a Tierra. |
| **Traje (EVA, lanzamiento, reentrada)** | Display del traje / HUD + audio | Solo alertas críticas y una acción ("Termina la EVA, vuelve a presión"). Nada de navegar. |
| **Voz** | Altavoz/micrófono del módulo | "UPRIGHT, ¿cómo estoy?" — respuesta corta generada por las reglas; manos libres. |
| **Tierra** | Consola del flight surgeon | Recibe el informe con retraso, responde, y la respuesta vuelve al lazo. |

Requisitos de hardware de vuelo: funcionar sin red, sincronizar entre dispositivos por la red local de la nave, **copias de seguridad** (hoy todo vive en el almacenamiento del navegador de un solo equipo y se pierde si se borra), registro de auditoría, tolerancia a reinicios y a errores de memoria por radiación, consumo bajo (evitar 3D permanente).

---

## 7. Debilidades frente a un entorno real

| Entorno | Debilidad de UPRIGHT hoy |
|---|---|
| **ISS (LEO)** | El valor diferencial baja: la Tierra está a segundos. Aun así, la falta de perfiles y privacidad lo bloquea. |
| **Luna (Artemis)** | Retraso ~1,3 s pero EVAs frecuentes: el traje y el polvo importan más que el check diario. Faltan carga de EVA, polvo y lesiones de mano. |
| **Tránsito a Marte** | El mejor caso de uso. Faltan radiación/tormentas solares, **conjunción solar** (~2 semanas sin contacto: la app debe decidir sola el escalado al CMO), y la respuesta de Tierra. |
| **Superficie de Marte** | Aterrizar tras 6–9 meses sin equipo médico en tierra que te ayude: Landing Readiness es clave, pero "Think" no tiene dato y no hay plan de readaptación post-aterrizaje (mareo, ortostatismo en 3/8 g). |

Debilidades transversales:
1. Un solo usuario, un solo dispositivo, sin sincronización ni copia de seguridad.
2. Simulación mezclada con operación.
3. Alertas que prometen avisar a la tripulación sin canal para hacerlo.
4. Umbrales de adulto en Tierra (señalados como prototipo, bien) sin ajuste por entorno ni por persona.
5. Acciones que asumen equipo que quizá no hay a bordo ("oxygen mask", "compression garment", "light therapy"): deben enlazarse al inventario real del vehículo.
6. Sin cierre del lazo con Tierra.
7. Datos médicos sin control de privacidad.

---

## 8. Mejoras de diseño por sección (resumen para P4/P2)

| Sección | Mejora |
|---|---|
| Global | 3 pestañas para el astronauta; modo CMO y modo SIM separados; selector de tripulante. |
| Estados | Sustituir "Watch" por **"Vigilar / Check"**; mismos estados en todas las pantallas para el mismo valor. |
| Future Self | Una frase + un número + una acción arriba; 3D bajo demanda; explicar cada % ("a 6,7 % de tu tolerancia antes del vuelo"). |
| Daily check | Validación de rango, re-medición automática de valores rojos, "Why?" de 4 partes, sin texto duplicado. |
| Watch | Una sola etiqueta "Simulado" en la cabecera, no en cada tarjeta; umbral y línea base para HRV. |
| Respond | Nombre del paciente siempre visible; "responder por otro". |
| Suit | Mostrar como vista previa del HUD del traje (1 línea + tono), no como formulario. |
| Brief | Informe de tripulación + bandeja de respuestas de Tierra + marca de privacidad. |
| Connect | Sin jerga (0x180D, db.ts), todo en el idioma seleccionado, "análogo terrestre" vs "equipo de vuelo". |
| Mission | Lista de tripulantes con rol (CMO, suplente) en lugar de un campo de texto. |

---

## 9. Lo que ya está muy bien (no tocar)
- La pregunta central "¿con qué cuerpo aterrizarás?" y el "66 → 89 con tu plan".
- La alarma del reloj y el flujo *Respond* con "What UPRIGHT thinks".
- Datos viejos nunca en verde; NASA vs Prototype en cada valor.
- Informe a Tierra con hora de llegada y de respuesta.
- Offline real, modo noche, teclado para guantes, bilingüe.
- "How it works": transparente y convincente para el jurado.
