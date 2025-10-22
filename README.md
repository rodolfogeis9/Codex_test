# CLI: Estimador de ahorro hacia hitos de edad

Pequeño script en Node.js puro (sin dependencias externas) que solicita la fecha de nacimiento y un aporte mensual en CLP, y estima el valor futuro al cumplir 50, 55, 60 y 65 años asumiendo 10% anual compuesto mensualmente.

Archivos:
- `index.js` : script principal (CLI)
- `package.json` : incluye script `start`

Cómo ejecutar:

1. Asegúrate de tener Node.js instalado (versión moderna, por ejemplo 14+).
2. En la carpeta del proyecto ejecuta:

```bash
npm start
```

Uso:
- Ingresa la fecha de nacimiento en formato `YYYY-MM-DD` (ej: `1980-05-21`).
- Ingresa el monto de ahorro mensual en CLP (ej: `50000`). Puedes usar puntos como separador de miles (ej: `50.000`) o coma decimal.

Salida:
Imprime una tabla con columnas: Edad objetivo, Meses restantes y Valor futuro estimado en CLP.

Notas:
- Las funciones principales están implementadas como funciones puras en `index.js`: `parseFecha`, `mesesHastaEdad`, `fvAnualidadMensual`, `leerLinea`.
- La tasa mensual se calcula como (1 + 0.10)^(1/12) - 1.
- Redondeo: meses a enteros y CLP a 0 decimales.
# Codex_test

Script interactivo para calcular los meses restantes hasta edades objetivo (50, 55, 60 y 65 años) y estimar el ahorro acumulado con una rentabilidad anual del 10%.

## Requisitos

- [Node.js](https://nodejs.org/) 16 o superior.

## Uso

Ejecuta el script y responde a las preguntas:

```bash
node retirement_calculator.js
```

El programa solicitará la fecha de nacimiento en formato `YYYY-MM-DD` y el monto de ahorro mensual. Luego mostrará los meses restantes para cada edad objetivo y el valor futuro estimado del ahorro asumiendo una rentabilidad anual del 10% (aproximada al rendimiento histórico del S&P 500).
