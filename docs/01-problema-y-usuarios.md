# 01 · Problema, usuarios y concepto

## El problema en una frase

En una misión larga, el astronauta es su propio primer médico, pero el daño del espacio es **lento, silencioso y acumulativo**, él no es médico, y la Tierra está a 20 minutos de distancia, o en silencio durante semanas.

## Por qué es difícil (según los recursos de NASA)

| Lo que dice NASA | Lo que significa para quien vive ahí |
|---|---|
| El hueso pierde 1–1.5 % de densidad **por mes**. La condición física cae 10–12 %. | Ningún día se siente distinto al anterior. El daño no es un evento, es una **pendiente**. |
| La radiación "no se ve ni se siente". El ~70 % tiene inflamación ocular (SANS) sin notarlo al inicio. | Los riesgos más serios **no dan síntomas** hasta que es tarde. |
| Los 5 peligros "se potencian entre sí". | Un dolor de cabeza puede ser sueño, CO2, hipoxia o presión en el ojo. Mirar un indicador a la vez no alcanza. |
| Retraso de hasta 20 min a Marte. Emergencias "con ayuda mínima de la Tierra". | No hay a quién preguntarle en el momento. |
| Tras una transición de gravedad hay desmayos, desorientación y hace falta "tiempo antes de tareas críticas". | El momento de mayor exigencia (el aterrizaje) llega cuando el cuerpo está **en su peor estado**. |
| "No asuman que los astronautas saben evaluar su salud" (enunciado del reto). | Necesita instrucciones simples, no un tablero clínico. |

## Para quién construimos

### Usuario principal: tripulante en misión de larga duración
- No es médico. Es ingeniero, piloto o científico, con entrenamiento médico básico.
- Su tiempo es el recurso más escaso de la misión. **El chequeo diario debe tomar menos de 3 minutos.**
- No le motiva "la salud" en abstracto. Le motiva **poder hacer su trabajo el día que aterriza**.
- Sus cuatro preguntas, en orden: **¿Estoy bien? ¿Qué hago ahora? ¿Funcionó? ¿Tengo que avisar?**

### Usuario secundario: médico de vuelo en Tierra (flight surgeon)
- Recibe la información con retraso, así que no puede vigilar en vivo.
- Necesita un **resumen de una pantalla**: qué cambió, qué hizo el tripulante, qué decisión se le pide.
- En el MVP es una sola vista: el "Flight Surgeon Brief".

### Fuera del alcance del fin de semana
- Oficial médico de la tripulación (vista de todo el equipo): solo si sobra tiempo.
- Entrenadores antes del vuelo: se menciona como trabajo futuro.

### Quién decide si ganamos: los jueces
No son usuarios, pero son quienes **ven** el producto. Jueces locales en Lima primero, expertos de NASA después. Ven un video de 30 segundos o 7 diapositivas, la página del proyecto y el enlace de demo. Evalúan Impacto, Creatividad, Validez, Relevancia y Presentación.
**Consecuencia de diseño: la innovación tiene que entenderse en 10 segundos de pantalla, sin explicación.**

## La idea disruptiva

Hay decenas de equipos haciendo lo mismo: un tablero que dice **cómo estás hoy**. Pero en el espacio "hoy" casi siempre se ve bien. La pregunta que importa es otra:

> **¿Con qué cuerpo vas a llegar?**

### UPRIGHT: el copiloto que te muestra tu yo del día del aterrizaje

*(El nombre viene de la primera tarea del día de llegada: ponerte de pie sin desmayarte. El repositorio y la URL del demo conservan el identificador anterior hasta que se renombre el despliegue.)*

**1. Yo Futuro (trayectoria, no estado).**
La pantalla principal muestra dos cuerpos: el de **hoy** y el del **día de llegada**, proyectado a partir de lo que el tripulante hace y mide. Cada acción (ejercicio, agua, sueño) mueve esa proyección a la vista. El número principal es la **Preparación para el aterrizaje**: ¿vas a poder pararte, ver, moverte y pensar ese día?
Los modelos son simples y se declaran como ilustrativos: usan las tasas que NASA publica (1–1.5 %/mes de hueso, 10–12 % de condición física, 1.5 h/día de ejercicio).

**2. Motor de riesgos combinados.**
Reglas explicables que cruzan indicadores, porque los peligros se potencian. Ejemplos: dolor de cabeza + mal sueño + confusión → revisar CO2 y oxígeno de la cabina. Poca agua + pérdida ósea → riesgo de cálculos renales. Cada regla enlaza a la página de NASA que la respalda.

**3. Ciclo autónomo sin la Tierra.**
Medir → Entender → Actuar → **Verificar** → Escalar. Tras cada alerta la app propone una acción y programa una nueva medición para comprobar que funcionó. Si hay que avisar, arma el resumen para el médico de vuelo y muestra cuándo llegará la respuesta según el retraso real (EEI, Luna, Marte, conjunción).

### Por qué esto gana
| Criterio | Cómo lo cubrimos |
|---|---|
| Creatividad | "Yo Futuro" cambia la pregunta de *cómo estoy* a *cómo voy a llegar*. La gamificación deja de ser puntos: es proteger a tu yo futuro. |
| Validez | Cada umbral y cada modelo muestra su fuente y dice si es dato de NASA o valor de prototipo. |
| Relevancia | Responde las 5 preguntas del enunciado y usa la figura humana clicable que el propio reto sugiere. |
| Impacto | El mismo enfoque sirve en comunidades remotas y de altura del Perú, donde el médico también está lejos. |
| Presentación | Demo de 30 s: el tripulante se salta el ejercicio una semana → su yo del aterrizaje se deteriora en pantalla → retoma → se recupera. |

### Escena de demo: "Sol 142"
Tránsito a Marte, día 142 de 180. Retraso de comunicación: 14 minutos.
1. Chequeo de la mañana en 2 minutos. Todo verde hoy.
2. El Yo Futuro está en amarillo: la proyección de piernas y hueso cayó por 6 días de ejercicio incompleto.
3. El tripulante reporta dolor de cabeza. El motor lo cruza con mal sueño y CO2 alto y propone una acción, con nueva medición en 30 minutos.
4. La medición confirma la mejora. Se genera el resumen para el médico de vuelo: "Llega en 14 min".
5. Se mueve el control de tiempo al día 180 y se activa "Con mi plan": la Preparación para el aterrizaje sube de 66 a 89. Tres de las cuatro tareas del día de llegada pasan a OK; "Salir y caminar" sigue en Watch porque el hueso no se recupera en 38 días (mensaje honesto: empezar antes).
