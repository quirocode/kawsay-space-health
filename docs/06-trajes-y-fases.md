# 06 — Trajes, fases de vuelo e investigación de medidores de salud

Respuesta al feedback de mentores (15/11/2026): *"la app está bien, pero tomen en cuenta cuando el astronauta tiene el traje puesto"*. La banda inteligente cubre el crucero; los minutos más riesgosos ocurren dentro de un traje.

## 1. Qué medidores de salud usan realmente los astronautas

| Fase | Qué llevan | Qué se mide hoy | Fuente |
|---|---|---|---|
| **Lanzamiento / ascenso** | Traje presurizado de lanzamiento y reentrada (p. ej. OCSS en Orion), arneses | ECG/pulso telemetrado, presión y temperatura del traje, fuerzas g de la cápsula | NASA HRP — riesgo cardiovascular; riesgo de cargas dinámicas |
| **Crucero / vida en la estación** | Ropa normal | Examen periódico (presión, ECG, ultrasonido, sangre/orina), ejercicio registrado (90 min/día), autoevaluaciones de forma física, dosímetros de radiación, CO₂ de cabina | `docs/04-recursos-nasa.md` |
| **Caminata espacial (EVA)** | Traje EVA (EMU) a **~4,3 psi (30 kPa)** con oxígeno y enfriamiento propios | **ECG de pecho** telemetrado, **gasto metabólico calculado del consumo de O₂**, **CO₂ en el circuito del casco**, presión del traje, O₂ restante, temperatura del agua de enfriamiento; checklist de **preoxigenación** | NTRS 20120003917 (CO₂ washout, 4.3 psi); NTRS 20140004412 (monitoreo metabólico); NASA — riesgo EVA y descompresión |
| **Reentrada y aterrizaje** | Traje de reentrada + **prenda de compresión**; **sal + agua** antes (fluid loading) | Pulso, g de reentrada, checklist de contramedidas | NASA — riesgo cardiovascular (intolerancia ortostática) |
| **Primeras horas en tierra** | Sin traje, prenda de compresión puesta varios días | **Prueba de pie** (pulso y presión acostado vs de pie), evaluación de equilibrio/desorientación justo al aterrizar | NASA — riesgo cardiovascular y sensoriomotor |

Datos clave verificados:
- La presión nominal del EMU es **30 kPa (4,3 psia)** — oficial.
- En pruebas con traje en JSC se mantiene el pulso **por debajo del 85 % del máximo predicho por edad** (corte de pruebas, no límite de vuelo → lo marcamos *prototype*).
- A presión de traje el mismo CO₂ (10 mmHg) es ~4,5 % del aire vs ~1,3 % en cabina: el CO₂ del casco importa más.
- El pulso solo **no basta** para estimar el esfuerzo (NASA): por eso mostramos también el gasto metabólico.
- Síntomas de presíncope al aterrizar: ~20 % en vuelos cortos y **>60 % en vuelos largos** (estudio vinculado a NASA, 2015). Contramedidas: líquidos con sal 1–3 h antes, enfriamiento y compresión.
- Descompresión: el tratamiento es **terminar la EVA y volver a presión** (ya en `04-recursos-nasa.md`).

## 2. Lo que se implementó (rama `p1/suit-and-phases`)

- **Pantalla "Traje y fases" (`/suit`)**: línea de tiempo de 5 fases (lanzamiento → crucero → EVA → reentrada → en tierra). Para cada una muestra *qué llevas puesto, qué le pasa al cuerpo y qué se mide*. Eliges una situación de demo (normal / vigilar / actuar), pulsas **Hacer chequeo** y se simula la medición con un generador con semilla (determinista para la demo).
- **Motor puro `src/domain/suit.ts`** (+ 11 pruebas): 17 señales con umbrales y fuentes, reglas por fase y pasos ordenados por urgencia (máx. 5). Ejemplos: síntomas de descompresión → "termina la EVA y vuelve a presión"; sin sal+agua antes de la reentrada → tomarlas; prueba de pie en rojo → acostarse, nada de tareas críticas.
- **Explicabilidad**: cada lectura muestra una regla visual (franjas bien/vigilar/actuar con marcador) y la traza *Medido → Comparado con → Entonces*, más *cómo se mide en el traje* y *por qué importa en esta fase*, con etiquetas NASA / Prototipo. Cada paso dice *porque:* qué lecturas lo activaron.
- **Pantalla "Cómo funciona" (`/how`)**, botón **?** en la barra superior: el ciclo Medir → Entender → Actuar → Verificar → Escalar, qué significa cada color, de dónde salen los números y lo que UPRIGHT no hace.

Todo el texto está en `content/suit.json` y `content/how.json` (EN + ES).

## 3. Funcionalidades que ayudarían más (priorizadas)

**Alta prioridad — refuerzan la historia del jurado**
1. **Escena de demo "EVA" en el menú Demo** que salte directo a `/suit` con EVA + "actuar ya" (CO₂ alto en el casco).
2. **Enviar el chequeo de traje al informe del cirujano de vuelo**: hoy la pantalla dice que se escala, pero aún no crea el caso en el store.
3. **Cuenta regresiva a la reentrada** en Future Self: "faltan X días; recuerda sal + agua y compresión" ligada a `arrivalDay`.
4. **Prueba de pie guiada real** (cronómetro 1 min acostado / 3 min de pie, ingresar pulso y presión) usando el teclado grande existente.

**Media**
5. **Preoxigenación con temporizador** y bloqueo de "salir de la esclusa" hasta completarla.
6. **Presupuesto de consumibles del traje**: O₂ restante vs distancia a la esclusa → "tiempo de retorno seguro".
7. **Modo "manos con guantes"**: botones aún más grandes y control por voz simple para EVA.
8. **Gravedad parcial** (Luna 1/6 g, Marte 3/8 g): ajustar la proyección de Future Self y la prueba de pie al llegar a superficie.
9. **Dosis de radiación acumulada** por fase (EVA y tormentas solares suben la dosis).

**Baja / futuro**
10. Integración real con telemetría del traje y ECG (hoy simulada).
11. Resumen de adaptación post-vuelo de 45 días (rehabilitación).

## 4. Pendiente de coordinación de carriles

Según `AGENTS.md`, `src/features/suit` y `src/features/how` son del carril P2, `src/domain/suit.ts` del P3 y `content/*.json` del P5. Se hicieron desde P1 por pedido directo; los dueños deben revisar el PR antes de fusionar. Los umbrales numéricos son **valores de prototipo** salvo 4,3 psi y las contramedidas.
