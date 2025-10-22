#!/usr/bin/env node
/*
  CLI para estimar valor futuro de ahorros mensuales hacia hitos de edad.
  Requisitos:
  - Pedir fecha de nacimiento YYYY-MM-DD
  - Calcular meses restantes para 50,55,60,65 años
  - Pedir ahorro mensual en CLP
  - Calcular FV con 10% anual compuesto mensualmente
  - Validaciones y funciones puras: mesesHastaEdad, fvAnualidadMensual, parseFecha, leerLinea
*/

const readline = require('readline');

// Interfaz readline compartida; se cerrará al final
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// --- Funciones puras ---

/**
 * parseFecha: recibe 'YYYY-MM-DD' y devuelve un objeto Date (UTC) o null si inválido
 * No lanza excepciones; funciona como función pura.
 */
function parseFecha(iso) {
  if (typeof iso !== 'string') return null;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [_, y, m, d] = match;
  const year = Number(y);
  const month = Number(m) - 1; // meses 0-11
  const day = Number(d);
  const date = new Date(Date.UTC(year, month, day));
  // Validar que los componentes coinciden (evita 2023-02-31 -> mar)
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

/**
 * mesesHastaEdad: calcula meses enteros (redondeo hacia arriba) entre hoy y la fecha en que
 * la persona cumple `edadObjetivo` años. Si ya alcanzado, devuelve 0.
 * Entrada: fechaNacimiento (Date UTC), edadObjetivo (número entero)
 * Salida: número entero de meses (>=0)
 */
function mesesHastaEdad(fechaNacimiento, edadObjetivo, hoy = new Date()) {
  if (!(fechaNacimiento instanceof Date) || isNaN(fechaNacimiento)) throw new TypeError('fechaNacimiento debe ser Date válida');
  if (typeof edadObjetivo !== 'number' || edadObjetivo <= 0) throw new TypeError('edadObjetivo debe ser número positivo');

  // Fecha objetivo: cumpleaños número `edadObjetivo`
  const anioObjetivo = fechaNacimiento.getUTCFullYear() + edadObjetivo;
  const mes = fechaNacimiento.getUTCMonth();
  const dia = fechaNacimiento.getUTCDate();
  const fechaObjetivo = new Date(Date.UTC(anioObjetivo, mes, dia));

  // Convertir 'hoy' a UTC (sin hora) para comparar correctamente
  const hoyUTC = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));

  if (fechaObjetivo <= hoyUTC) return 0;

  // Calcular diferencia en meses con redondeo hacia arriba si hay días restantes
  let yearsDiff = fechaObjetivo.getUTCFullYear() - hoyUTC.getUTCFullYear();
  let monthsDiff = fechaObjetivo.getUTCMonth() - hoyUTC.getUTCMonth();
  let totalMonths = yearsDiff * 12 + monthsDiff;

  // Si el día del mes objetivo es mayor que el día actual, queda parte de mes -> contarlo como mes completo
  if (fechaObjetivo.getUTCDate() > hoyUTC.getUTCDate()) {
    totalMonths -= 1; // aún no completamos el último mes, ajustamos abajo
    totalMonths = totalMonths + 1; // contar el mes parcial como mes completo
  }

  // Asegurar entero no negativo
  totalMonths = Math.max(0, Math.ceil(totalMonths));
  return totalMonths;
}

/**
 * fvAnualidadMensual: calcula el valor futuro de una serie de aportes mensuales A
 * con tasa mensual r y n meses.
 * FV = A * [((1 + r)^n - 1) / r]
 * Si n === 0 devuelve 0.
 */
function fvAnualidadMensual(A, r, n) {
  if (n <= 0) return 0;
  if (r === 0) return A * n; // caso r=0 (teórico)
  return A * ((Math.pow(1 + r, n) - 1) / r);
}

/**
 * leerLinea: prompt usando readline pero devuelve una promesa. Función pura en el sentido
 * de no alterar estado global (excepto usar rl). Devuelve string trimmed.
 */
function leerLinea(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (ans) => {
      resolve(String(ans).trim());
    });
  });
}

// --- Lógica interaccional ---

async function main() {
  try {
    // Pedir fecha de nacimiento y validar
    let fechaNacimiento;
    while (true) {
      const entrada = await leerLinea('Ingrese su fecha de nacimiento (YYYY-MM-DD): ');
      const parsed = parseFecha(entrada);
      if (!parsed) {
        console.log('Formato inválido o fecha inexistente. Intente nuevamente.');
        continue;
      }
      const ahora = new Date();
      // comparar en UTC: parsed es UTC a medianoche
      const hoyUTC = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
      if (parsed > hoyUTC) {
        console.log('La fecha no puede ser futura. Intente con una fecha pasada.');
        continue;
      }
      fechaNacimiento = parsed;
      break;
    }

    // Pedir ahorro mensual y validar
    let ahorroMensual;
    while (true) {
      const entrada = await leerLinea('Ingrese su ahorro mensual en CLP (número mayor a 0): ');
      // Aceptar separadores de miles opcionales y coma como decimal
      const normalizado = entrada.replace(/\./g, '').replace(',', '.');
      const num = Number(normalizado);
      if (!isFinite(num) || num <= 0) {
        console.log('Monto inválido. Ingrese un número positivo (ej: 50000).');
        continue;
      }
      ahorroMensual = num;
      break;
    }

    // Hitos de edad
    const objetivos = [50, 55, 60, 65];

    // tasa mensual a partir de 10% anual compuesto mensualmente
    const tasaAnual = 0.10;
    const tasaMensual = Math.pow(1 + tasaAnual, 1 / 12) - 1;

    // Calcular resultados
    const ahora = new Date();
    const rows = objetivos.map((edad) => {
      const meses = mesesHastaEdad(fechaNacimiento, edad, ahora);
      const fv = fvAnualidadMensual(ahorroMensual, tasaMensual, meses);
      return {
        edad,
        meses: Math.round(meses), // meses enteros
        fv: Math.round(fv), // CLP sin decimales
        alcanzado: meses === 0,
      };
    });

    // Imprimir tabla ordenada
    console.log('\nResultados estimados:\n');
    // Encabezado
    const col1 = 'Edad objetivo';
    const col2 = 'Meses restantes';
    const col3 = 'Valor futuro (CLP)';
    const widths = [15, 17, 20];
    function pad(s, w) {
      s = String(s);
      if (s.length >= w) return s;
      return s + ' '.repeat(w - s.length);
    }

    console.log(pad(col1, widths[0]) + '  ' + pad(col2, widths[1]) + '  ' + pad(col3, widths[2]));
    console.log('-'.repeat(widths[0]) + '  ' + '-'.repeat(widths[1]) + '  ' + '-'.repeat(widths[2]));

    rows.forEach((r) => {
      const ageLabel = String(r.edad) + ' años';
      const mesesLabel = r.alcanzado ? '0 (ya alcanzado)' : String(r.meses);
      // Formatear CLP con separador de miles
      const fvLabel = r.fv.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      console.log(pad(ageLabel, widths[0]) + '  ' + pad(mesesLabel, widths[1]) + '  ' + pad(fvLabel, widths[2]));
    });

  } catch (err) {
    console.error('Ocurrió un error:', err && err.message ? err.message : err);
  } finally {
    // Cerrar readline correctamente
    rl.close();
  }
}

// Ejecutar main si se llama directamente
if (require.main === module) {
  main();
}

// Exportar funciones para pruebas o reutilización
module.exports = {
  parseFecha,
  mesesHastaEdad,
  fvAnualidadMensual,
  leerLinea,
};
