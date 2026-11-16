# 05 · Rediseño: UPRIGHT centrado en urgencias

Escrito el sábado 14/11 por P1 con Claude Code. Es **solo diseño y arquitectura**: no cambia el motor (`src/domain/`), ni el contrato (`types.ts`), ni las pantallas actuales. Las pantallas las construye P4 en pen.dev a partir de la sección 4.

Los textos de interfaz van en inglés (regla del reto). Todo umbral numérico de este documento es **valor de prototipo** salvo los dos que se marcan como NASA.

---

## 1. Qué cambia y por qué

| | Hoy | Rediseño |
|---|---|---|
| Pregunta principal | "¿Con qué cuerpo voy a aterrizar?" (semanas) | **"¿Estoy bien ahora mismo?"** (segundos). El aterrizaje pasa a segundo plano. |
| De dónde salen los datos | El tripulante los escribe en el chequeo diario | **El reloj los mide solo, todo el tiempo.** El tripulante escribe solo lo que el reloj no puede medir. |
| Cómo empieza una alerta | Cuando el tripulante abre la app | **Cuando el reloj detecta algo raro**, aunque la app esté en segundo plano |
| Qué hace la alerta | Una tarjeta en "Findings" | **Una alarma** con sonido, el estado en vivo y el primer paso a seguir |
| Dispositivo | Tableta, PWA | **App de escritorio** (`UPRIGHT.exe`) que no usa la red; la PWA sigue funcionando |

Lo que **no** cambia: el ciclo Medir → Entender → Actuar → Verificar → Escalar, las fuentes en cada cifra, el dato viejo que nunca se pinta de verde, el modo demo "Sol 142" y el sistema visual de P4 (terracota Inti, Instrument Sans, 5 paletas de noche).

### Cómo responde al enunciado del reto

| El reto pide | Dónde queda en el rediseño |
|---|---|
| Reunir indicadores de salud | Reloj (6 señales continuas) + chequeo manual (presión, glucosa, temperatura, ánimo, síntomas) |
| Que el astronauta **evalúe** su estado | Pantalla *Now*: una frase de estado y cuatro signos en vivo |
| Que **actúe** | Alarma → respuesta guiada paso a paso → nueva medición para comprobar |
| Los seis indicadores sugeridos | FC y sueño salen del reloj; presión, glucosa, temperatura y ánimo, del chequeo |
| "Figura humana clicable" | Pantalla *Body*: 10 zonas, función, estado y qué la afecta en el espacio |
| "Avisar para tomar mediciones" | Tarjeta *Today's routine* en *Now*, con lo que toca medir y cuándo |
| Gráficos que cambian en el tiempo | *Watch data* y *Signal detail*: 1 h, 24 h, 7 días, misión |
| Código de color | OK / Watch / Act / Old data, siempre con icono y palabra |
| "No asuman que saben evaluarse" | Cada señal y cada paso tiene *How to measure* y *Why it matters* |
| Cuándo avisar a la tripulación o a Tierra | Pantalla *Escalate*: quién se entera, cuándo llega y cuándo puede responder |
| Distintos entornos | Las reglas se activan según entorno y fase (sección 3.4) |
| Gamificación | La banda tejida: un hilo por día cumplido. Sin puntos ni medallas |

### Tres cosas que este rediseño contradice y hay que decidir en equipo

1. **`AGENTS.md` define el producto alrededor de "Future Self".** El rediseño lo baja a la pantalla *Body*. Si el equipo lo acepta, P1 actualiza la sección "What we are building".
2. **`design/PEN_PROMPT.md`, principio 4, dice "sin sirenas ni pantallas rojas completas".** Una app de urgencias necesita una alarma. Propuesta: se permite **una sola** toma de pantalla, reservada al nivel *Emergency*; los otros dos niveles siguen siendo discretos. Nada parpadea a más de 1 vez por segundo.
3. **El congelamiento de funciones es el domingo a las 14:00.** Son 17 pantallas. Para la demo bastan las 7 marcadas **P0** en la sección 4; el resto se dibuja si sobra tiempo.

---

## 2. El reloj: qué mide y qué no

Un reloj de muñeca mide de forma continua seis señales. El resto sigue necesitando un instrumento o una pregunta.

| Señal del reloj | Id propuesto | Cómo la mide | Sirve para |
|---|---|---|---|
| Frecuencia cardíaca | `heart_rate` | Sensor óptico, cada segundo | Taquicardia o bradicardia en reposo, sobreesfuerzo |
| Variabilidad cardíaca | `hrv_rmssd` | Derivada del pulso | Estrés agudo, fatiga |
| Oxígeno en sangre | `spo2` | Sensor óptico rojo/infrarrojo | Hipoxia, problema de cabina |
| Frecuencia respiratoria | `resp_rate` | Derivada del pulso | Dificultad respiratoria |
| Temperatura de la piel | `skin_temp` | Termistor, comparada con la línea base personal | Posible fiebre (se confirma con termómetro) |
| Movimiento | `motion` | Acelerómetro | **Contexto de actividad**, sueño, golpes, inmovilidad |

**El contexto de actividad es lo que hace posible la alarma.** 130 latidos por minuto pedaleando es normal; 130 después de 20 minutos quieto no lo es. El reloj clasifica cada momento en `sleep`, `rest`, `active`, `exercise` o `eva`, y cada regla dice en qué contexto aplica.

**Lo que el reloj no mide** y se sigue pidiendo en el chequeo: presión arterial (brazalete), glucosa (punción), temperatura corporal (termómetro), ánimo y síntomas. La pantalla *Watch data* lo dice de forma explícita para que nadie crea que el reloj lo cubre todo.

**Cuando el reloj no manda datos**, sus señales pasan a *Old data*: gris, rayado, con la antigüedad escrita. Tres causas con texto propio: *Off wrist*, *No signal · 4 min*, *Battery 8 %*.

**Los primeros 7 días** el reloj aprende la línea base de cada persona. Hasta entonces las reglas usan límites generales de adulto y la app lo avisa: *"Learning your normal: day 3 of 7"*.

Precedentes reales: el estudio **ARCHeR** de Artemis II usa actigrafía de muñeca (movimiento, sueño, luz), y la CSA desarrolló **Bio-Monitor**, una prenda con sensores para signos vitales en la EEI. UPRIGHT no es ninguno de los dos; son la prueba de que medir así en vuelo es realista.

En la demo los datos del reloj son una **serie simulada con semilla fija** (`origin: 'sensor_sim'`, que ya existe en el contrato). Conectar un reloj real queda para después (sección 6.3).

---

## 3. Urgencias a implementar

### 3.1 Tres niveles de alerta

| Nivel | Palabra | Cómo aparece | Sonido | Si nadie responde |
|---|---|---|---|---|
| **Emergency** | *Act now* | Toma toda la ventana | Tono que se repite hasta confirmar | A los 60 s avisa a la tripulación |
| **Warning** | *Act* | Hoja sobre la pantalla actual; hay que confirmar para cerrarla | Tres tonos; repite cada 2 min | A los 5 min sube a Emergency |
| **Caution** | *Watch* | Franja en *Now* y un nudo en el hilo del pulso | Ninguno | Queda en la lista |

Cada nivel lleva icono, palabra y color. El color solo nunca informa.

### 3.2 Lo que detecta el reloj (la alerta nace sola)

Investigado en la lista de condiciones médicas de NASA-STD-3001 (Apéndice E, tabla E.2-2) y en las fichas de riesgo de HRP. La columna "NASA" dice de qué riesgo oficial sale; los umbrales son nuestros.

| Id | Título en pantalla | Qué lo dispara (prototipo) | Nivel | Primer paso | Se vuelve a medir | Riesgo NASA |
|---|---|---|---|---|---|---|
| `resting_tachycardia` | Heart rate high while resting | FC ≥ 110 en `rest` por 5 min → Warning. FC ≥ 130 en `rest` por 2 min → Emergency | Warning / Emergency | "Stop. Hold on to a handrail." | FC a los 10 min | Cardiovascular (arritmias) |
| `resting_bradycardia` | Heart rate very low | FC < 40 despierto y en `rest` por 5 min | Warning | "Stay still and call a crewmate." | FC a los 10 min | Cardiovascular |
| `irregular_rhythm` | Heartbeat is irregular | Ritmo irregular en 3 lecturas seguidas | Warning | "Record your heart rhythm for 30 seconds." | ECG a los 15 min | Cardiovascular (fibrilación auricular en E.2-2) |
| `low_spo2` | Blood oxygen is low | SpO2 < 92 % por 3 min → Warning. < 88 % por 1 min → Emergency | Warning / Emergency | "Check the cabin air reading. Put on the oxygen mask if it is low too." | SpO2 a los 5 min | Hipoxia |
| `breathing_fast` | Breathing fast while resting | Respiración ≥ 25/min en `rest` por 5 min. Con SpO2 < 92 % → Emergency | Warning / Emergency | "Sit upright. Breathe out slowly." | Respiración a los 5 min | Hipoxia, descompresión |
| `possible_fever` | You may have a fever | Piel ≥ +1.5 °C sobre tu línea base por 30 min y FC en reposo +15 | Caution → Warning si el termómetro da ≥ 38.0 °C | "Take your temperature with the thermometer." | Temperatura a las 2 h | Inmune, microorganismos |
| `no_response` | Are you OK? | Golpe fuerte seguido de 30 s sin movimiento; o FC anómala + inmóvil + no confirma | Emergency | Dos botones: "I'm OK" / "I need help". 30 s | — (avisa a la tripulación) | EVA, sensoriomotor |
| `orthostatic` | You may faint if you stand | FC sube ≥ 30 en 3 min tras incorporarte. Solo en `pre_landing` y `surface` | Warning | "Sit down. Drink water. Put on the compression garment." | FC y presión a los 10 min | Cardiovascular (**medida oficial de NASA**: líquidos y prendas de compresión antes del aterrizaje) |
| `acute_stress` | Your body is under stress | FC alta y variabilidad muy baja en `rest` por 10 min, sin fiebre y con oxígeno normal | Caution | "Breathe with the pacer for 2 minutes." | Variabilidad a los 10 min | Conducta (ansiedad figura como común en E.2-2) |
| `overexertion` | Slow down | FC > 90 % de tu máximo por 10 min en `exercise` o `eva` | Warning | "Stop the task. Rest for 5 minutes." | FC a los 5 min | EVA, condición física |
| `sleep_debt` | Short sleep three nights in a row | Menos de 6 h por 3 noches. Menos de 4 h antes de EVA o aterrizaje → Warning | Caution / Warning | "Plan a 30-minute nap before your next critical task." | Sueño mañana | Sueño |
| `watch_stale` | No data from your watch | Sin muestras por 5 min | Caution | "Check the strap, then the battery." | — | Dato faltante se muestra como faltante |

### 3.3 Lo que el reloj no puede ver (lo reporta la persona)

Botón **Report a symptom**, siempre visible arriba. Ocho botones grandes; cada uno abre su respuesta guiada.

| Botón | Qué puede ser | Nivel | Primer paso |
|---|---|---|---|
| Chest pain or pressure | Angina, infarto | Emergency | "Stop. Call the crew medical officer now." |
| Trouble breathing | Hipoxia, descompresión, humo | Emergency | "Sit upright. Check your oxygen reading." |
| Fainted or about to faint | Presión baja tras cambio de gravedad | Warning | "Lie down and hold on. Raise your legs." |
| Face droop, weak arm or slurred speech | Accidente cerebrovascular; también síntoma de descompresión | Emergency | "Call a crewmate. Note the time it started." |
| Joint pain after an EVA | Enfermedad por descompresión | Emergency | "End the EVA and return to cabin pressure." (**medida oficial de NASA**) |
| Severe pain in your side | Cálculo renal (la pérdida ósea sube el calcio) | Warning | "Drink 500 ml of water. Rate the pain." |
| Sudden vision change | SANS, hipoxia | Warning | "Run the vision grid test." |
| I'm not OK | Crisis de ánimo. **Privado**: no avisa a la tripulación sin permiso | Warning | "Would you like to talk to someone, or try this first?" |

Completan la lista, con la misma plantilla y sin pantalla propia: hinchazón o dolor en pierna o cuello (trombosis venosa), herida o sangrado, quemadura, sarpullido o alergia.

### 3.4 Qué reglas se activan según dónde está la tripulación

| Entorno o fase | Cambia |
|---|---|
| Tránsito, EEI, Orión (ingravidez) | `no_response` usa "golpe + inmovilidad", no "caída". `orthostatic` apagada |
| Luna y Marte en superficie | `no_response` detecta caídas. `orthostatic` encendida los primeros 7 días |
| `pre_landing` | `orthostatic` y `sleep_debt` suben un nivel. Recordatorio de líquidos y compresión |
| `eva` | `overexertion` encendida. Dolor articular o falta de aire → "End the EVA" |
| `conjunction` (sin contacto) | *Escalate* no ofrece Tierra: decide el oficial médico de a bordo |

### 3.5 Fuera del alcance de UPRIGHT

Fuego, despresurización y atmósfera tóxica son alarmas **de la nave**, no de salud. UPRIGHT no las detecta ni las duplica. Lo que sí hace es vigilar el oxígeno de quien estuvo expuesto durante las horas siguientes. La dosis de radiación y el CO₂ de cabina llegan de sensores de la nave, no del reloj: se muestran en *Now* como contexto y entran en las reglas combinadas que ya existen.

### 3.6 Reglas combinadas

Una alerta del reloj no llega sola a la pantalla: el motor la cruza con lo demás para decir **qué es lo más probable**. Ejemplos para `resting_tachycardia`:

| Además de la taquicardia hay… | UPRIGHT dice | Rama |
|---|---|---|
| Poca agua hoy y sueño corto | "Likely: dehydration and fatigue" | Agua, respiración lenta, medir de nuevo |
| SpO2 baja o CO₂ de cabina alto | "Likely: low oxygen" | Revisar aire de cabina, mascarilla |
| Piel caliente | "Likely: fever" | Termómetro |
| Ritmo irregular en el ECG | "Possible rhythm problem" | Avisar al oficial médico y a Tierra |
| Dolor de pecho o desmayo | — | Emergency inmediata |

Esto lo decide el motor de reglas, con fuente en cada línea. Ningún modelo de lenguaje decide un estado.

---

## 4. Pantallas a construir en pen.dev

### 4.0 Reglas para todas las pantallas

- **Lienzo:** ventana de escritorio de **1440 × 900**. Debe seguir funcionando a 1194 × 834 (la tableta actual). Modo día y modo noche (paleta Mars).
- **Sistema visual:** el de `design/kawsay.pen`, sin colores nuevos. Los niveles de alerta usan los colores de estado que ya existen: *Act now* y *Act* → `red`, *Watch* → `yellow`, *Old data* → `stale`.
- **Tipografía:** Instrument Sans para todo. JetBrains Mono solo en cifras que cambian en vivo, para que no bailen al actualizarse.
- **Objetivos táctiles** de 56 px como mínimo; botón principal de 72 px de alto. Una decisión por pantalla, un solo botón principal.
- **Contenido de demo** (el mismo en todas): Sol 142 de 180, tránsito a Marte, retraso a Tierra 14 min, tripulante **A. Quispe**, oficial médico de a bordo **M. Huamán**, hora **14:32**.

**Marco común** (todas las pantallas menos la alarma):

- **Barra superior**, 64 px: marca UPRIGHT · "Sol 142 of 180 · Mars transit" · píldora "Earth delay 14 min" · a la derecha: píldora del reloj ("Watch · live · 82 %"), píldora "Demo", botón día/noche y botón **"Report a symptom"** con borde.
- **Carril izquierdo**, 96 px: *Now*, *Watch*, *Alerts* (con contador), *Body*, *Check-in*, *Brief*. Icono y palabra en cada uno.
- **Hilo del pulso**, 48 px, bajo la barra superior. Es el elemento propio del rediseño: los últimos 30 minutos de frecuencia cardíaca dibujados como **un solo hilo** sobre una franja tenue que marca el rango habitual de la persona. Cada alerta deja **un nudo** en el hilo, más grande cuanto más grave. A la derecha, el valor en vivo: "64 bpm · resting". Tocar el hilo abre *Watch*; tocar un nudo abre esa alerta. Sin datos, el hilo se corta donde se perdió la señal y sigue rayado con el texto "No signal · 4 min".

El nudo continúa la idea del tejido que ya usa la marca (un hilo por día) y remite al *khipu* andino, donde los nudos guardaban registros. Se usa en dos sitios y nada más: el hilo del pulso y el historial de *Alerts*.

### 4.1 Lista de pantallas

| # | Pantalla | Ruta | Prioridad | Decisión única |
|---|---|---|---|---|
| 00 | Componentes y estados | — | P0 | — |
| 01 | Now | `#/` | **P0** | ¿Necesito hacer algo? |
| 02 | Alarm | `#/alarm/:id` | **P0** | Confirmar que estoy aquí |
| 03 | Respond | `#/respond/:id` | **P0** | Hacer el paso actual |
| 04 | Recheck | `#/recheck/:id` | **P0** | ¿Funcionó? |
| 05 | Escalate | `#/escalate/:id` | **P0** | Avisar |
| 06 | Watch data | `#/watch` | **P0** | Ver qué mide el reloj |
| 07 | Signal detail | `#/watch/:signal` | P1 | Entender una señal |
| 08 | Alerts | `#/alerts` | **P0** | Abrir una alerta |
| 09 | Alert report | `#/alerts/:id` | P1 | Añadir al informe |
| 10 | Body | `#/body` | P1 | Tocar una zona |
| 11 | Check-in | `#/check` | P1 | Responder la pregunta |
| 12 | Report a symptom | `#/sos` | P1 | Elegir el síntoma |
| 13 | Brief | `#/brief` | P1 | Enviar a Tierra |
| 14 | Are you OK? | `#/alarm/:id` (variante) | P2 | "I'm OK" o "I need help" |
| 15 | Watch setup | `#/setup` | P2 | Emparejar el reloj |
| 16 | Settings | hoja sobre cualquier pantalla | P2 | — |

### 00 · Componentes y estados

Una lámina con todo lo reutilizable, cada pieza en sus estados:

- **Etiqueta de nivel:** *Act now*, *Act*, *Watch*, *OK*, *Old data* (icono + palabra + color).
- **Ficha de señal** (la pieza más repetida): nombre, valor grande, unidad, etiqueta de estado, minigráfico de 1 h con la franja "your usual", contexto ("resting · 22 min"), hora de la última lectura. Estados: OK, Watch, Act, Old data (rayada, con antigüedad), Learning (sin franja todavía).
- **Píldora del reloj:** *Live*, *Syncing*, *Off wrist*, *No signal · 4 min*, *Battery 8 %*.
- **Hilo del pulso:** tranquilo, subiendo, con nudo, cortado.
- **Nudo:** tres tamaños, uno por nivel.
- **Franja de aviso** (Caution) y **hoja de aviso** (Warning).
- **Paso de respuesta:** instrucción, pregunta con opciones, medición con teclado numérico, temporizador.
- **Etiquetas de fuente:** `NASA` y `Prototype`, y el enlace "Why?".
- **Pista de retraso:** línea con tres marcas: enviado, llega, primera respuesta posible.
- Botones principal y secundario, carril de navegación, barra superior.

### 01 · Now — `#/` (P0)

Pantalla de inicio. Responde "¿estoy bien ahora?" en dos segundos.

- **Frase de estado**, a 56 px, alineada a la izquierda: "You are OK. Nothing needs your attention." con su etiqueta *OK*. Debajo, en texto secundario: "Resting for 22 min · last reading 2 s ago".
- **Cuatro fichas de señal** en fila: Heart rate **64 bpm** · Blood oxygen **97 %** · Breathing **14 /min** · Skin temperature **+0.1 °C** vs your usual.
- **Columna derecha**, tres tarjetas:
  - *Today's routine*: "3 of 5 done". Pendientes: "Blood pressure · due now · 2 min", "Evening exercise · 38 min left of 90" (etiqueta `NASA` en el 90). Botón principal **"Measure blood pressure"**.
  - *Last alert*: "Yesterday 21:10 · Blood oxygen low while sleeping · resolved on board in 6 min".
  - *Cabin*: "CO₂ 2.1 mmHg · OK" (`NASA`, límite 3) y "Radiation · normal".
- **Figura pequeña** del cuerpo de hoy, con las 10 zonas teñidas; lleva a *Body*.
- **Banda tejida** al pie: 142 hilos, uno por día; hoy resaltado.

Estados que también hay que dibujar:

- **Caution:** franja ámbar sobre la frase: "Your heart rate is rising while you rest · 112 bpm" con "See why". La ficha de frecuencia cardíaca pasa a *Watch* y el hilo sube.
- **Reloj sin datos:** las cuatro fichas en *Old data* y la frase cambia a "No data from your watch for 4 min." con el botón "Check the watch". Nunca dice "You are OK" sin datos.

### 02 · Alarm — `#/alarm/:id` (P0)

La única pantalla que ocupa toda la ventana, sin carril ni barra. Aparece sola cuando el motor levanta una alerta *Emergency*.

- Borde rojo de 8 px en todo el contorno, con un pulso lento (1 por segundo; fijo con movimiento reducido). Fondo normal, no rojo: el texto tiene que seguir leyéndose.
- Etiqueta *Act now* y hora: "14:32:10".
- **Titular** a 56 px: "Your heart rate is 134 bpm and you are resting."
- Debajo: "Above 130 for 2 minutes. Your usual resting rate is 56 to 68." con etiqueta `Prototype`.
- **Panel "Your state now"**, en vivo:
  - Heart rate **134 bpm** · *Act* · trazo de los últimos 10 min con la subida visible
  - Blood oxygen **96 %** · *OK*
  - Breathing **19 /min** · *Watch*
  - Skin temperature **+0.2 °C** · *OK*
  - Movement: "Still for 22 min"
- **Primer paso**, en una caja destacada: "Stop what you are doing. Hold on to a handrail."
- Botón principal, 72 px: **"I'm here. Start the check"**. Al tocarlo se calla el tono.
- Botón secundario: "Call a crewmate now".
- Cuenta atrás con barra fina: "No answer in 0:48 and UPRIGHT alerts the crew."
- Botón pequeño "Silence" con icono de altavoz.

Variante **Warning**: el mismo contenido en una hoja centrada de 720 px sobre la pantalla en la que estaba la persona, con fondo atenuado, sin cuenta atrás.

### 03 · Respond — `#/respond/:id` (P0)

Respuesta guiada: un paso por pantalla, con el estado en vivo siempre a la vista.

- **Izquierda (60 %)**: progreso "Step 2 of 5" y el paso actual. Los cinco pasos de `resting_tachycardia`:
  1. Pregunta: "Do you have any of these right now?" Opciones grandes, se pueden marcar varias: "Chest pain or pressure", "Trouble breathing", "Dizzy or about to faint", "Heart pounding or skipping", "None of these". Las tres primeras saltan directo a *Escalate*.
  2. Medición con el reloj: "Record your heart rhythm." "Rest your arm. Touch the crown with a finger of your other hand." Anillo de 30 s. Resultado: "Rhythm regular · 131 bpm".
  3. Medición manual: "Measure your blood pressure." Tres instrucciones cortas y teclado numérico: **104 / 68 mmHg**.
  4. Temporizador: "Breathe slowly for 2 minutes." Guía que crece 4 s y se encoge 6 s, con la frecuencia cardíaca en vivo al lado.
  5. Acción: "Drink 250 ml of water." con "Today you logged 1.1 L of 2.5 L".
- Botón principal según el paso: "Next", "Start recording", "Save reading", "Done".
- **Derecha (40 %)**, fija:
  - *Your state now*: las mismas cuatro señales, compactas.
  - *What UPRIGHT thinks*: "Likely: dehydration and fatigue." Motivos, cada uno con su etiqueta de fuente: "Low water today: 1.1 L of 2.5 L", "Short sleep: 5.2 h average over 3 nights", "No fever, oxygen normal". Y una línea aparte: "Not ruled out: a rhythm problem. That is why we record it."
  - Enlace "Why?" con las reglas y sus fuentes.
- Siempre visible abajo: "Call a crewmate now".

### 04 · Recheck — `#/recheck/:id` (P0)

Comprueba si lo que hizo la persona funcionó.

- **Esperando:** "Checking again in 10:00" con anillo. Trazo en vivo de la frecuencia cardíaca con una marca en "134 at 14:32". Texto: "Stay resting. Keep the watch on." Se puede salir de la pantalla: la cuenta sigue en la barra superior.
- **Improved:** "134 → 88 bpm. Back in your usual range after 9 minutes." Etiqueta *OK*. Botón principal **"Close and log"**. Secundario: "Tell Earth anyway".
- **Unchanged:** "Still 126 bpm after 10 minutes." Etiqueta *Act*. Botón principal **"Tell the crew and Earth"**.
- **Worse:** pasa sola a *Escalate*.

### 05 · Escalate — `#/escalate/:id` (P0)

Quién se entera y cuándo puede contestar.

- Titular: "This needs another person."
- **On board, now:** tarjeta "M. Huamán · crew medical officer" con "Alert sent 14:44 · seen 14:45".
- **Earth:** pista de retraso con tres marcas: "Sent 14:44", "Arrives 14:58", "Earliest answer 15:12". Debajo: "Earth is 14 minutes away. Do not wait for the answer to act."
- **Vista previa del informe**: titular, qué cambió, qué se hizo y con qué resultado, y la decisión que se pide: "Should A. Quispe stay off exercise and EVA prep for 24 hours?"
- **While you wait:** "Stay resting", "Keep the watch on", "UPRIGHT checks again every 10 minutes", "No exercise or EVA prep".
- Botón principal **"Send brief"**; al enviarse pasa a "Brief sent · 14:44".
- Estado **conjunción**: sin pista de retraso. "No contact with Earth for 9 days. The crew medical officer decides."

### 06 · Watch data — `#/watch` (P0)

La sección que muestra todo lo que recoge el reloj.

- **Tarjeta del dispositivo:** "Watch · on wrist · live" · "Battery 82 %" · "Last reading 2 s ago" · "Signal quality: good".
- **Seis fichas de señal** en cuadrícula de 3 × 2: Heart rate 64 bpm · Blood oxygen 97 % · Breathing 14 /min · Skin temperature 33.7 °C (+0.1) · Heart rate variability 42 ms · Activity "Resting · 22 min". Cada una abre su detalle.
- **Today**, a todo el ancho: una línea de 24 h. Arriba, el carril de actividad en bloques (sleep, rest, active, exercise). Debajo, el trazo de frecuencia cardíaca alineado con el carril. Los nudos marcan las alertas.
- **Dos resúmenes:** "Sleep last night: 5 h 10 min" (*Watch*) y "Exercise today: 52 of 90 min" (`NASA`).
- **Columna derecha, "The watch cannot measure these":** Blood pressure "118/76 · 7 h ago", Blood sugar "92 mg/dL · 7 h ago", Body temperature "36.7 °C · 7 h ago", Mood "3 of 5 · 7 h ago". Lo vencido aparece como *Old data*. Botón **"Start check-in"**.

### 07 · Signal detail — `#/watch/:signal` (P1)

Ejemplo: frecuencia cardíaca.

- Selector de rango: "1 h", "24 h", "7 days", "Mission".
- **Gráfico grande:** trazo, franja "your usual", líneas de umbral rotuladas ("Alert while resting: 110" con `Prototype`), carril de actividad debajo y nudos en las alertas.
- Tres bloques de texto: **How it is measured** ("A light sensor on the back of the watch. Keep the strap snug, one finger above the wrist bone."), **Why it matters in space** (el corazón se adapta a la ingravidez; con enlace a NASA) y **When UPRIGHT alerts** (tabla con las reglas de esa señal y su fuente).
- Nota de calidad: "Readings during fast movement are less reliable."

### 08 · Alerts — `#/alerts` (P0)

- **Activas**, arriba, como tarjetas: nivel, título, "resting · started 14:32", estado ("Checking again in 6:40") y botón "Continue".
- **El cordón de la misión:** una línea horizontal con un tramo por día y nudos donde hubo alertas. Tocar un nudo filtra la lista.
- **Historial**, como lista: hora, nivel, título, contexto, resultado ("Resolved on board in 9 min", "Sent to Earth", "Open"). Filtros: "All", "Act now", "Act", "Watch", y por zona del cuerpo.
- **Vacío:** "No alerts so far. Your watch is checking every second."

### 09 · Alert report — `#/alerts/:id` (P1)

El registro de un evento, para leerlo después o enviarlo.

- **Línea de tiempo:** "14:32:10 Detected" → "14:32:31 Confirmed (21 s)" → "Symptoms: heart pounding" → "Rhythm regular" → "Blood pressure 104/68" → "Breathing, 2 min" → "14:44 Checked again: 88 bpm, improved" → "Closed".
- Gráfico de la señal durante el evento, con las marcas de cada paso.
- Causas probables con sus fuentes.
- Interruptor "Include in the next brief" y botón "Export report" (guarda un archivo en el equipo).

### 10 · Body — `#/body` (P1)

La figura humana clicable que sugiere el reto. Aquí vive ahora "Future Self".

- **Figura de hoy** a la izquierda, 10 zonas teñidas por estado. Durante una alerta cardíaca, el corazón aparece en *Act*.
- **Panel de zona** a la derecha al tocar una (ejemplo: Heart): **What it does**, estado, **What feeds it** ("Heart rate 64 bpm · watch · 2 s ago", "Blood pressure 118/76 · check-in · 7 h ago"), **How space affects it** (peligros de NASA con enlace) y **What you can do**.
- Selector "Today / Arrival · Sol 180": en *Arrival* aparece la figura proyectada, el número de *Landing readiness* (66, "with your plan: 89") y las cuatro tareas del día del aterrizaje. Es la pantalla actual, en menos espacio.

### 11 · Check-in — `#/check` (P1)

Lo que el reloj no mide, en menos de dos minutos.

- Primera pantalla, **"From your watch"**: "Sleep 5 h 10 min" y "Resting heart rate 62 bpm", de solo lectura. Botón "Looks right".
- Luego un paso por pantalla: presión, glucosa, temperatura, ánimo (escala 1 a 5), síntomas (dolor de cabeza, mareo, visión borrosa, confusión, dolor articular, lesión en la piel) y agua.
- Cada paso lleva **How to measure** en tres líneas y **Why it matters** en una.
- Cierre: "Done in 1 min 40 s." y un hilo nuevo en la banda tejida.

### 12 · Report a symptom — `#/sos` (P1)

- Titular: "What is happening?"
- Cuadrícula de 4 × 2 con los ocho botones de la sección 3.3, cada uno con icono.
- Debajo: "Something else" abre la figura para señalar dónde.
- Al pie: "Call a crewmate now".

### 13 · Brief — `#/brief` (P1)

El informe de una pantalla para el médico de vuelo. Es el actual, más un bloque **"Watch events since the last brief"** con cada alerta, su resultado y un minigráfico.

### 14 · Are you OK? — variante de la alarma (P2)

Para `no_response`. Dos partes:

- **En el equipo de la persona:** "Are you OK, Quispe?" Dos botones que ocupan media ventana cada uno: **"I'm OK"** y **"I need help"**. Cuenta atrás de 30 s.
- **Lo que ve la tripulación** si no hay respuesta: "A. Quispe needs help." "Hab module · heart rate 148 · no movement for 40 s." Botón **"I'm going"**.

### 15 · Watch setup — `#/setup` (P2)

Tres pasos: "Put the watch on", "Pair it", "UPRIGHT learns your normal". El tercero explica: "For 7 days, alerts use general adult limits. After that they use yours."

### 16 · Settings — hoja (P2)

Entorno y fase de misión, retraso a Tierra, "Play the alarm sound" y volumen, paleta de noche, horario de recordatorios, "Reset the demo", "Export my data" y la lista completa de fuentes con el aviso de que no es un dispositivo médico.

### 4.2 La escena de demo

Sol 142, 14:28. Quispe descansa después de almorzar. Durmió 5 h 10 min y lleva 1.1 L de agua.

1. **14:28** · *Now*, todo en OK. El hilo del pulso empieza a subir. Franja ámbar: 112 bpm en reposo.
2. **14:32** · 134 bpm. **Alarma**. Tono. Quispe toca "I'm here. Start the check".
3. **14:33** · *Respond*: sin dolor de pecho, ritmo regular, presión 104/68, dos minutos de respiración, agua. UPRIGHT: "Likely: dehydration and fatigue."
4. **14:44** · *Recheck*: 88 bpm. "Improved". Se cierra a bordo, sin esperar a Tierra.
5. Variante para el video: si sigue en 126, *Escalate*. El informe llega a Tierra a las 14:58.

La serie del reloj es determinista, así que la escena se reproduce igual cada vez, sin escribir nada.

---

## 5. Stack

### 5.1 Lo que ya hay y se queda

React 19 · Vite 8 · TypeScript estricto · Tailwind 4 · zustand (estado guardado en el equipo) · wouter con rutas por hash · Motion · PWA con service worker. Sin servidor y sin inicio de sesión.

### 5.2 Lo que se añade

| Necesidad | Elección | Por qué |
|---|---|---|
| App de escritorio sin red | **Electron 45** | Ver 5.3 |
| Sonido de alarma | **Web Audio** (oscilador) | Sin archivos de audio que empaquetar; funciona igual en PWA y escritorio |
| Que la alarma se vea con la app en segundo plano | Electron: traer la ventana al frente y parpadeo en la barra de tareas | Solo en escritorio; en la PWA, notificación del sistema |
| Gráficos de series | SVG propio en las fichas; **uPlot** en el detalle de 24 h | Un día a 1 muestra por segundo son 86 400 puntos; uPlot los dibuja sin trabarse y pesa poco |
| Historial del reloj | **Dexie (IndexedDB)** | Ya estaba previsto en `docs/02`. Crudo solo de las últimas 24 h; lo anterior, promedios por minuto |
| Reloj real (después) | **Web Bluetooth**, servicio estándar de frecuencia cardíaca | Electron trae Chromium, así que funciona sin red y sin controladores |

### 5.3 La app de escritorio (ya está en esta rama)

**Electron frente a Tauri.** Tauri da un ejecutable más pequeño, pero exige instalar Rust en cada máquina y usa el navegador del sistema, que no trae Web Bluetooth. Electron incluye Chromium: la app se ve igual en todos lados, hay Bluetooth para el reloj y no hay nada más que instalar. El costo es el tamaño: la carpeta pesa 358 MB.

**Cómo funciona sin internet:**

- No hay servidor. Electron registra un esquema propio, `kawsay://app`, y responde cada petición leyendo `dist/` del disco.
- Todo lo demás se **cancela**: cualquier petición que no sea `kawsay:`, `data:` o `blob:` no sale. El modo sin red no depende de que alguien se acuerde de no llamar a internet.
- Los enlaces a nasa.gov se abren en el navegador del sistema, nunca dentro de la app.
- En escritorio no se registra el service worker (no hace falta: ya se lee del disco). En la PWA sigue igual.

**Comandos:**

```bash
npm run desktop:build
```

Genera `release/UPRIGHT-win32-x64/UPRIGHT.exe`. Se copia **la carpeta entera**, no solo el `.exe`. Necesita red una vez, para bajar Electron; el resultado ya no la usa.

```bash
npm run desktop:dev
```

Abre la app de escritorio sin empaquetar (hace falta `npm run build` antes).

**Comprobado el 14/11:** el ejecutable arranca, carga la app desde `kawsay://app`, muestra las 5 pestañas actuales y no intenta ninguna petición de red (0 bloqueadas). `UPRIGHT.exe --smoke captura.png` repite esa prueba.

**Pendiente:** icono propio (ahora sale el de Electron), instalador de un solo archivo y firma del ejecutable (Windows avisa de "editor desconocido").

---

## 6. Conexión entre la interfaz y el motor, sin internet

### 6.1 No hay "backend" de red

En UPRIGHT el backend es el **motor de reglas** (`src/domain/`, de P3), que corre dentro de la misma app. La interfaz no hace peticiones HTTP: llama funciones. No hay direcciones de API, y por eso no hay nada que falle sin red.

```
 Reloj (simulado hoy, Bluetooth después)
        │  muestras, 1 por segundo
        ▼
 SensorSource ──► store (zustand + Dexie) ──► Engine.detect() ──► alertas
                        ▲                          │
                        │                          ▼
                  Chequeo manual            la interfaz navega a
                                            #/alarm/:id y suena
```

### 6.2 Revisión de lo que hay en el repo

| Qué | Estado | Dónde |
|---|---|---|
| Rutas por hash (`#/…`) | Correcto: no necesitan servidor ni reescrituras; funcionan en PWA y en `kawsay://` | `src/app/App.tsx` |
| Llamadas de red en el código | Ninguna (`fetch`, URLs remotas, CDN) | todo `src/` |
| Tipografías | Empaquetadas con `@fontsource`, no vienen de Google Fonts | `src/app/styles.css` |
| Estado | Guardado en el equipo con zustand `persist` | `src/app/store.ts` |
| Acceso al motor | Un solo punto, tras la interfaz `Engine` | `src/app/engine/index.ts` |
| Service worker | Guarda en caché los 35 archivos de la app | `vite.config.ts` |
| Enlaces a fuentes | Son a nasa.gov: sin red no abren. La etiqueta y el texto del "Why?" deben bastar por sí solos | `src/domain/indicators.ts` |

### 6.3 Rutas: de las actuales a las nuevas

| Ruta actual | Pasa a | Nota |
|---|---|---|
| `#/` (Future Self) | `#/body` | `#/` queda para *Now* |
| `#/check` | `#/check` | Igual; pierde lo que ahora mide el reloj |
| `#/loop` (Findings) | `#/alerts`, `#/respond/:id`, `#/recheck/:id` | Se divide en tres |
| `#/brief` | `#/brief` | Igual, con los eventos del reloj |
| `#/environment` | hoja *Settings* | Deja de ser una pestaña |
| — | `#/alarm/:id`, `#/escalate/:id`, `#/watch`, `#/watch/:signal`, `#/alerts/:id`, `#/sos`, `#/setup` | Nuevas |

La alarma no se abre desde el menú: cuando el motor devuelve una alerta *Emergency*, la interfaz navega sola a `#/alarm/:id` desde donde esté.

### 6.4 Cambios al contrato que hará falta pedir (propuesta, sin aplicar)

`src/domain/types.ts` solo lo cambia P1 y con aviso. Para el rediseño hacen falta estas piezas:

```ts
type ActivityState = 'sleep' | 'rest' | 'active' | 'exercise' | 'eva' | 'unknown';
type SignalId = 'heart_rate' | 'hrv_rmssd' | 'spo2' | 'resp_rate' | 'skin_temp' | 'motion';

interface SensorSample {
  signalId: SignalId;
  value: number;
  ts: number;
  activity: ActivityState;
  quality: 'good' | 'poor' | 'off_wrist';
}

type AlertLevel = 'emergency' | 'warning' | 'caution';
type AlertState = 'active' | 'acknowledged' | 'responding' | 'rechecking' | 'resolved' | 'escalated';

interface Alert {
  id: string;
  ruleId: string;               // 'resting_tachycardia', ...
  level: AlertLevel;
  title: string;
  detectedTs: number;
  activity: ActivityState;      // contexto en el momento de detectar
  because: string[];            // lecturas que la dispararon, en lenguaje llano
  likely: string[];             // causas probables según las reglas combinadas
  zones: BodyZone[];
  risks: RiskId[];
  hazards: HazardId[];
  protocolId: string;
  sources: Source[];
  state: AlertState;
}

interface ProtocolStep {
  id: string;
  kind: 'instruction' | 'question' | 'measure' | 'timer';
  text: string;
  options?: { id: string; label: string; escalate: boolean }[];
  indicatorId?: string;
  durationSec?: number;
}

interface Engine {
  // …lo que ya existe, más:
  detect(window: SensorSample[], baselines: Baseline[], ctx: MissionContext, nowTs: number): Alert[];
  protocol(alert: Alert): ProtocolStep[];
}
```

`detect()` es una función pura: recibe una ventana de muestras y devuelve alertas. Sin relojes del sistema, sin aleatoriedad sin semilla y con una prueba por regla, como el resto de `src/domain/`.

Y una pieza fuera del dominio, del lado de la app, para que cambiar el reloj simulado por uno real no toque nada más:

```ts
interface SensorSource {
  start(onSample: (s: SensorSample) => void): void;
  stop(): void;
  status(): 'live' | 'syncing' | 'off_wrist' | 'no_signal' | 'low_battery';
}
```

Hoy: `SimulatedWatch` (serie con semilla, escena Sol 142). Después: `BluetoothWatch`.

---

## 7. Quién hace qué

| Carril | Tarea | Depende de |
|---|---|---|
| **P4** | Pantallas 00 a 06 y 08 en pen.dev (P0). Luego 07, 09 a 13 | Este documento |
| **P1** | Acordar el cambio de rumbo, actualizar `AGENTS.md` y el contrato (6.4), rutas nuevas, sonido de alarma | Acuerdo del equipo |
| **P3** | `detect()` con las reglas de 3.2 y la serie simulada del reloj para Sol 142 | Contrato nuevo |
| **P2** | *Now*, *Alarm*, *Respond*, *Recheck*, *Watch data*, *Alerts* | Exportación de P4 y contrato |
| **P5** | Textos de cada alerta y cada paso en `content/`; verificar las fuentes nuevas | Sección 3 |

---

## 8. Fuentes y registros pendientes

### Fuentes usadas en este documento

| Fuente | Para qué | Oficial |
|---|---|---|
| NASA-STD-3001, Apéndice E, tabla E.2-2 — https://www.nasa.gov/reference/appendix-e-health-and-medical-care-technical-requirements/ | Lista de condiciones médicas de alta probabilidad o alta consecuencia | Sí. **P5 debe leer la tabla y confirmar cada condición citada antes de mostrarla en la app** |
| NASA HRP — Risk of Cardiovascular Adaptations | Arritmias, presión baja al aterrizar, líquidos y compresión | Sí (ya en `indicators.ts`) |
| NASA HRP — Risk of Hypoxia, Risk of Decompression Sickness, Risk of Inadequate Sleep, Risk of Behavioral Conditions, EVA | Síntomas y contramedidas | Sí (ya en `indicators.ts`) |
| NASA HRP — ARCHeR (Artemis II) | Precedente de actigrafía de muñeca | Sí (ya en `docs/04`, 2.4) |
| CSA — Bio-Monitor | Precedente de sensores vestibles en la EEI | Sí. **Falta que P5 añada el enlace oficial de la CSA** |
| Umbrales de 3.2 y 3.3 | Referencia clínica general de adulto | **No. Valores de prototipo** |

Este documento no añade ninguna cifra de NASA a la app. Los únicos números oficiales que aparecen en las pantallas son los que ya estaban: CO₂ ≤ 3 mmHg y ejercicio de 90 min al día.

### Líneas listas para pegar en los registros

No se editaron `docs/DECISIONS.md`, `docs/AI_USAGE.md` ni `docs/NASA_SOURCES.md` en esta rama porque los tres tienen cambios sin confirmar en la copia de trabajo de P1 y habrían chocado.

`docs/DECISIONS.md`:

```
- Sat 15:30 · Desktop build with Electron 45 over a custom offline scheme (kawsay://app); every other request is cancelled · the brief asks for an executable that works with no network; Electron ships Chromium, so Web Bluetooth is available for a real watch later. Tauri rejected: needs Rust on every machine and has no Web Bluetooth.
- Sat 15:30 · Electron is not a dependency; only @electron/packager is, and the runtime is downloaded when packaging · keeps `npm ci` on CI and Vercel as fast as before.
- Sat 15:30 · Service worker registered only on http(s) · the desktop shell reads from disk and needs none.
- Sat 15:30 · Redesign proposal in docs/05: emergencies first, data from a wrist watch, three alert levels, one full-window alarm · pending team agreement; it changes the product statement in AGENTS.md and principle 4 of PEN_PROMPT.
- Sat 15:10 · `src/domain/indicators.ts` restored to 7283d2b after two direct edits on main broke typecheck · same failure as Sat 12:40; P3's values stay in history for a PR against the contract.
```

`docs/AI_USAGE.md`: Claude Code (P1) · análisis del reto, investigación de urgencias, especificación de pantallas (`docs/05`), contenedor de escritorio (`desktop/`, `scripts/desktop-build.mjs`) y diagnóstico del fallo de CI.

`docs/NASA_SOURCES.md`: NASA-STD-3001 Apéndice E (tabla E.2-2) y CSA Bio-Monitor, con la nota de verificación de arriba.
