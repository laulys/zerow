# Zerow · caso de estudio

Texto para el portfolio (Behance o web). Cada bloque va con la lámina que se indica; las láminas están en Figma, página «Zerow · v3 · Presentación».

---

## Titular

**Zerow: repartir un viaje entre amigos diciendo lo que pagaste**

App para iPhone · Diseño de producto, sistema visual y prototipo funcional · 2026

*Lámina: portada (D08 · Portada de Behance, o «01 · Cuentas claras entre amigos»).*

## El problema

En un viaje de cuatro amigos hay decenas de gastos pequeños, a veces en dos monedas, y casi siempre se apuntan tarde y mal: en el taxi tienes una mano ocupada y ninguna gana de rellenar un formulario. Al volver, alguien tiene que hacer cuentas y nadie se fía del todo del resultado.

Las apps que ya existen resuelven el cálculo, pero piden lo mismo que una hoja de cálculo: elegir quién pagó, entre quiénes, cuánto y en qué moneda, campo a campo.

## La idea

**Decirlo en vez de rellenarlo.** Escribes o dictas «pagué el taxi, 45 dólares, para Ana y para mí» y Zerow lo convierte en una tarjeta de gasto.

Tres reglas sostienen todo el diseño:

1. **La IA propone, las personas deciden.** Zerow solo crea borradores. Nada cuenta hasta que alguien lo confirma con un toque.
2. **Nunca se inventa un número.** Si no dijiste cuánto fue, pregunta. Lo garantiza el código, no solo la instrucción al modelo.
3. **Una pregunta cada vez.** En pantalla hay una sola decisión: sumar este gasto, marcar este pago.

*Lámina: «02 · Cuéntaselo como hablas».*

## Mi papel

Proyecto personal de principio a fin: investigación del problema, arquitectura de la información, diseño visual y de interacción en Figma, prototipo en React Native (Expo) y el motor en Python que interpreta los gastos. Trabajé con un asistente de IA como par de programación y de revisión de diseño; las decisiones de producto y de diseño son mías.

## Proceso

**Del agente a la app.** El proyecto empezó por detrás: un agente que llama a herramientas de cálculo, escrito desde cero para entender qué hace un framework por dentro. Probándolo salieron las reglas del producto: con un modelo pequeño, «pagué el almuerzo» se convertía en «25 € más un 10 % de propina» que nadie había dicho. De ahí la regla de no inventar importes y la tarjeta que siempre se confirma.

**Tres direcciones visuales.** Exploré tres caminos (Tinta, Esmalte y Aurora) sobre las mismas pantallas y elegí Aurora: una página de grafito con el verde lima y el menta de la marca como luz ambiente, tarjetas translúcidas y el lima reservado para lo que te toca hacer a ti.

**Auditoría antes de dar nada por terminado.** Revisé la app con criterios de accesibilidad, de plataforma y de redacción. Salieron fallos reales: la hora ilegible sobre fondo oscuro en algunas pantallas, saldos que se contradecían después de saldar, textos que se cortaban con letra grande y avisos que VoiceOver no leía. Están corregidos y la auditoría forma parte del caso, porque es donde más cambió el diseño.

*Lámina: «03 · Nada cuenta hasta que alguien lo suma».*

## Decisiones de diseño

- **El lima es tuyo.** En Saldar, un pago entre otras dos personas lleva un botón discreto; solo el paso que te corresponde va en lima. Así el color dice «esto es lo tuyo» en lugar de «esto es importante».
- **Saldar es una lista de tareas.** Zerow calcula el menor número de pagos; tú los vas marcando. Con el último, la tarjeta «A cero» sube en el mismo sitio donde estaban los pendientes, sin pantalla de celebración aparte.
- **El recibo sale de una ranura.** Pagar termina en un comprobante que se imprime en pantalla y se puede compartir: da cierre a algo que, de otro modo, es solo un número que cambia.
- **Entrar es un correo y un código.** Sin contraseñas, y una sola pantalla para quien vuelve y para quien es nuevo.
- **Movimiento como en iOS.** Las pantallas que abres muchas veces al día no hacen entradas; solo se mueve lo que cambia. Las animaciones «de autor» quedan para los momentos raros: la bienvenida, la invitación, el pago.
- **Los estados también se diseñan.** Carga, primer uso, sin conexión y enlace caducado tienen su pantalla, con el siguiente paso a la vista.

*Láminas: «04 · Saldar sin hacer cuentas», «05 · Pagar y guardar el comprobante», «06 · Entrar es un correo y un código», «08 · Cuando no hay nada, o no hay red».*

## Accesibilidad

- Texto que crece con el tamaño de letra del sistema sin cortarse: lo que se lee llega al doble y los títulos, que ya son grandes, crecen menos.
- Etiquetas y anuncios para VoiceOver, y más tiempo para «Deshacer» cuando hay lector de pantalla.
- Contraste comprobado con números, no a ojo.
- Con «Reducir movimiento» se quedan los fundidos y desaparecen los desplazamientos.

## Resultado

- **61 pantallas** de iPhone en Figma, más las versiones para un teléfono plegable, con prototipo navegable.
- **App en React Native** con todos los flujos funcionando: contar un gasto, revisarlo, saldar, pagar, invitar.
- **Motor en Python** con más de cien pruebas automáticas: el agente, el libro de gastos del viaje y la API.

Código: github.com/laulys/zerow

*Lámina: «07 · Invitar con un enlace» y el vídeo de «Nuevo gasto».*

## Qué aprendí

- **Los permisos de la IA se diseñan como una función más.** Borrador más confirmación convierte «una IA maneja tu dinero» en «una IA te rellena el formulario».
- **Un color con un solo significado vale más que tres.** Quitar lima fue lo que más ordenó la app.
- **Auditar es diseñar.** Los fallos más serios no se veían en Figma: aparecieron al usar la app con letra grande y al comprobar que las cifras cuadraban entre pantallas.

## Qué haría después

Probarlo con un grupo real durante un viaje, añadir el reconocimiento de voz de verdad (hoy el dictado es una simulación) y guardar los pagos de Saldar en el servidor.

---

### Textos cortos

**Una línea:** Zerow reparte los gastos de un viaje: dices lo que pagaste y te dice quién paga a quién.

**Tres líneas:** App para iPhone que convierte «pagué el taxi, 45 dólares, para Ana y para mí» en una tarjeta de gasto que una persona confirma. Diseño de producto, sistema visual «Aurora», prototipo funcional en React Native y un agente de IA escrito desde cero que nunca se inventa un importe.

**Etiquetas:** diseño de producto · UX/UI · iOS · React Native · IA · fintech · accesibilidad
