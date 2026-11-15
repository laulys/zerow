# Ilustración animada de «Nuevo gasto»

`../zerow-nuevo-gasto.mp4` (15,6 s en bucle, 800 × 1550, 60 fps) y `../zerow-nuevo-gasto-poster.png` no son grabaciones de la app. Son una recreación en React hecha con la skill **Stageshow** de [benjitaylor/skills](https://github.com/benjitaylor/skills) (licencia MIT, commit `299140f`), filmada con Chrome. Sirven como portada o tarjeta del portfolio; para enseñar la app de verdad están los vídeos del simulador en `../../video/`.

## Qué hay aquí

- `index.tsx` y `zerow.css`: la escena (teléfono, conversación, tarjeta «Por revisar» que pasa a «Sumado»).
- `fonts/`: Space Grotesk 400 y 500, con su licencia OFL.
- `record.mjs`: graba un bucle a vídeo paso a paso con el reloj virtual del kit. No viene con Stageshow; se escribió para esta prueba.

Esta carpeta no forma parte de la app ni se compila con ella.

## Cómo regenerarlo

1. Clona el repositorio de skills y entra en `stageshow/`; ejecuta `npm ci`.
2. Copia esta carpeta (sin este archivo) a `stageshow/examples/zerow-gasto/` y `record.mjs` a `stageshow/scripts/`.
3. Arranca el visor: `node node_modules/vite/bin/vite.js playground --config playground/vite.config.ts --port 5199 --strictPort`.
4. Comprueba: `node scripts/film.mjs "http://127.0.0.1:5199/?capture=zerow-gasto" --select '#example' --gate` (debe acabar en `rehearsal passed`).
5. Graba: `node scripts/record.mjs "http://127.0.0.1:5199/?capture=zerow-gasto" --from type --out zerow-nuevo-gasto.mp4`.

Necesita Node 20.19 o posterior, Google Chrome y ffmpeg.

## Diferencias conocidas con la app

- El degradado de la tarjeta es más plano (sin el grano del sombreador de la app).
- La bola de Zerow está quieta.
- Bajo la tarjeta confirmada no aparece el aviso «Sumado en Lisboa 2026 · Deshacer».
- La barra de escribir es más sencilla: el disco lima cambia de micro a flecha de enviar.
