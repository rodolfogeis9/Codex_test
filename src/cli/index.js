#!/usr/bin/env node
import readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import {
  parseISODate,
  simulateRetirementPlan,
  retirementAgeFromYear,
  addYears,
  calculateAgeInYears,
} from '../utils/finance.js';

const rl = readline.createInterface({ input, output });

function ask(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.trim()));
  });
}

function parsePositiveNumber(raw, { allowZero = false } = {}) {
  const normalized = raw.replace(/\s+/g, '').replace(/,/g, '.');
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  if (allowZero ? value < 0 : value <= 0) return null;
  return value;
}

async function askName() {
  while (true) {
    const answer = await ask('Nombre: ');
    if (answer.length === 0) {
      console.log('El nombre no puede estar vacío.');
      continue;
    }
    return answer;
  }
}

async function askBirthDate() {
  while (true) {
    const answer = await ask('Fecha de nacimiento (YYYY-MM-DD): ');
    const date = parseISODate(answer);
    if (!date) {
      console.log('Formato inválido. Prueba nuevamente.');
      continue;
    }
    const today = new Date();
    const todayUTC = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );
    if (date > todayUTC) {
      console.log('La fecha de nacimiento no puede ser futura.');
      continue;
    }
    return date;
  }
}

async function askRetirementAge(birthDate) {
  const currentAge = calculateAgeInYears(new Date(), birthDate);
  while (true) {
    const answer = await ask('¿A qué edad deseas jubilarte? (en años): ');
    const value = parseInt(answer, 10);
    if (!Number.isFinite(value) || value <= 0) {
      console.log('Ingresa un número entero positivo.');
      continue;
    }
    if (value <= currentAge) {
      console.log('La edad de jubilación debe ser mayor a tu edad actual.');
      continue;
    }
    return value;
  }
}

async function askRetirementYear(birthDate, retirementAge) {
  const suggestedYear = addYears(birthDate, retirementAge).getUTCFullYear();
  while (true) {
    const answer = await ask(
      `¿En qué año deseas jubilarte? (sugerido ${suggestedYear}): `
    );
    if (answer.trim() === '') {
      return suggestedYear;
    }
    const year = Number(answer);
    if (!Number.isInteger(year)) {
      console.log('Ingresa un año válido (por ejemplo 2045).');
      continue;
    }
    if (year < new Date().getUTCFullYear()) {
      console.log('El año debe ser igual o posterior al año actual.');
      continue;
    }
    const derivedAge = retirementAgeFromYear(birthDate, year);
    if (derivedAge != null && derivedAge < retirementAge) {
      console.log(
        'Advertencia: ese año implica una edad menor a la deseada. Ajusta la edad o el año.'
      );
    }
    return year;
  }
}

async function askAverageReturn() {
  while (true) {
    const answer = await ask('Rentabilidad promedio anual esperada (en %): ');
    const value = parsePositiveNumber(answer, { allowZero: true });
    if (value === null) {
      console.log('Ingresa un número válido, por ejemplo 6.5');
      continue;
    }
    return value;
  }
}

async function askScenarios() {
  const scenarios = [];
  for (let i = 0; i < 3; i += 1) {
    while (true) {
      const answer = await ask(
        `Ahorro mensual escenario ${i + 1} (USD, solo números): `
      );
      const value = parsePositiveNumber(answer);
      if (value === null) {
        console.log('Ingresa un número mayor a 0, por ejemplo 350.');
        continue;
      }
      scenarios.push(value);
      break;
    }
  }
  return scenarios;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

async function main() {
  try {
    console.log('=== Simulador de jubilación (USD) ===');
    const name = await askName();
    const birthDate = await askBirthDate();
    const retirementAge = await askRetirementAge(birthDate);
    const retirementYear = await askRetirementYear(birthDate, retirementAge);
    const averageReturnPercent = await askAverageReturn();
    const monthlyContributions = await askScenarios();

    const plan = simulateRetirementPlan({
      birthDate,
      retirementAge,
      retirementYear,
      annualReturnRate: averageReturnPercent / 100,
      monthlyContributions,
    });

    console.log('\n--- Resumen ---');
    console.log(`Nombre: ${name}`);
    console.log(`Edad actual estimada: ${plan.currentAge} años`);
    console.log(`Edad objetivo: ${plan.retirementAge} años`);
    console.log(
      `Fecha estimada de jubilación: ${formatDate(plan.targetDate)} (año ${plan.expectedRetirementYear})`
    );
    console.log(
      `Tiempo restante: ${plan.duration.years} años y ${plan.duration.months} meses (${plan.monthsToRetirement} meses en total)`
    );
    console.log(
      `Rentabilidad anual simulada: ${averageReturnPercent.toFixed(2)}% (tasa mensual ${(plan.monthlyRate * 100).toFixed(3)}%)`
    );
    if (plan.yearMismatch) {
      console.log(
        `Nota: el año indicado (${plan.yearMismatch.provided}) no coincide con la edad deseada (año esperado ${plan.yearMismatch.expected}).`
      );
    }

    const headers = ['Escenario', 'Ahorro mensual', 'Total aportado', 'Capital estimado', 'Interés generado'];
    const rows = plan.scenarios.map((scenario, index) => [
      `Escenario ${index + 1}`,
      formatCurrency(scenario.monthlyContribution),
      formatCurrency(scenario.totalContributed),
      formatCurrency(scenario.futureValue),
      formatCurrency(scenario.interestEarned),
    ]);

    const widths = headers.map((header, index) => {
      const columnValues = rows.map((row) => row[index]);
      return Math.max(header.length, ...columnValues.map((value) => value.length));
    });

    const pad = (value, width) => {
      const text = String(value);
      if (text.length >= width) return text;
      return text + ' '.repeat(width - text.length);
    };

    console.log('\n--- Escenarios de ahorro (USD) ---');
    console.log(
      headers
        .map((header, index) => pad(header, widths[index]))
        .join('  ')
    );
    console.log(
      widths
        .map((width) => '-'.repeat(width))
        .join('  ')
    );
    rows.forEach((row) => {
      console.log(
        row
          .map((value, index) => pad(value, widths[index]))
          .join('  ')
      );
    });

    console.log('\nGracias por usar el simulador.');
  } catch (error) {
    console.error('\nOcurrió un error inesperado:', error.message ?? error);
  } finally {
    rl.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
