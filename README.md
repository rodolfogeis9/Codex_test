# Simulador de jubilación

Aplicación que permite simular el ahorro para la jubilación ingresando:

- Nombre y fecha de nacimiento.
- Edad objetivo y año deseado de jubilación.
- Rentabilidad promedio anual esperada.
- Tres escenarios de aportes mensuales en dólares.

Incluye:

- **Front-end en React + Vite** (`npm start` / `npm run dev`).
- **CLI en Node.js** (`npm run cli`) para generar la misma simulación desde la terminal.

## Requisitos

- Node.js 18 o superior.

## Instalación

```bash
npm install
```

## Ejecutar el front-end

```bash
npm start
```

Esto inicia el servidor de desarrollo de Vite (puedes usar también `npm run dev`). Abre el navegador en [http://localhost:5173](http://localhost:5173) y completa el formulario para ver los resultados.

## Ejecutar el CLI

```bash
npm run cli
```

El asistente pedirá la información paso a paso y mostrará una tabla con el capital estimado, total aportado e interés generado para cada escenario.

## Scripts adicionales

- `npm run build`: genera la versión optimizada del front-end en la carpeta `dist/`.
- `npm run preview`: sirve la compilación de producción localmente.

## Estructura relevante

- `src/utils/finance.js`: funciones puras para cálculo de edades, meses y valor futuro.
- `src/cli/index.js`: implementa la experiencia de consola.
- `src/App.jsx`: interfaz en React para capturar datos y presentar resultados.

# Codex_test
Test with codex
