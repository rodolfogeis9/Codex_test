export function parseISODate(input) {
  if (typeof input !== 'string') return null;
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, yearStr, monthStr, dayStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const day = Number(dayStr);
  const date = new Date(Date.UTC(year, month, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function addYears(date, years) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError('date debe ser una instancia válida de Date');
  }
  if (typeof years !== 'number' || !Number.isFinite(years)) {
    throw new TypeError('years debe ser un número finito');
  }
  const result = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  result.setUTCFullYear(result.getUTCFullYear() + years);
  // Ajustar si el mes cambió por una fecha no existente (p.ej. 29 feb)
  if (result.getUTCMonth() !== date.getUTCMonth()) {
    result.setUTCDate(0); // último día del mes anterior
  }
  return result;
}

export function monthsBetweenDates(start, end) {
  if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
    throw new TypeError('start debe ser una instancia válida de Date');
  }
  if (!(end instanceof Date) || Number.isNaN(end.getTime())) {
    throw new TypeError('end debe ser una instancia válida de Date');
  }
  const startUTC = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  );
  const endUTC = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  );
  if (endUTC <= startUTC) return 0;
  let months = 0;
  const cursor = new Date(startUTC);
  while (cursor < endUTC) {
    months += 1;
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

export function annualRateToMonthlyRate(annualRate) {
  if (typeof annualRate !== 'number' || !Number.isFinite(annualRate)) {
    throw new TypeError('annualRate debe ser un número finito');
  }
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

export function futureValueOfAnnuity(payment, monthlyRate, periods) {
  if (typeof payment !== 'number' || !Number.isFinite(payment)) {
    throw new TypeError('payment debe ser un número finito');
  }
  if (typeof monthlyRate !== 'number' || Number.isNaN(monthlyRate)) {
    throw new TypeError('monthlyRate debe ser un número');
  }
  if (typeof periods !== 'number' || !Number.isFinite(periods)) {
    throw new TypeError('periods debe ser un número finito');
  }
  if (periods <= 0) return 0;
  if (monthlyRate === 0) return payment * periods;
  return payment * ((Math.pow(1 + monthlyRate, periods) - 1) / monthlyRate);
}

export function calculateAgeInYears(referenceDate, birthDate) {
  if (!(referenceDate instanceof Date) || Number.isNaN(referenceDate.getTime())) {
    throw new TypeError('referenceDate debe ser una instancia válida de Date');
  }
  if (!(birthDate instanceof Date) || Number.isNaN(birthDate.getTime())) {
    throw new TypeError('birthDate debe ser una instancia válida de Date');
  }
  let age = referenceDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const referenceMonth = referenceDate.getUTCMonth();
  const birthMonth = birthDate.getUTCMonth();
  const referenceDay = referenceDate.getUTCDate();
  const birthDay = birthDate.getUTCDate();
  if (
    referenceMonth < birthMonth ||
    (referenceMonth === birthMonth && referenceDay < birthDay)
  ) {
    age -= 1;
  }
  return age;
}

export function retirementAgeFromYear(birthDate, retirementYear) {
  if (!(birthDate instanceof Date) || Number.isNaN(birthDate.getTime())) {
    throw new TypeError('birthDate debe ser una instancia válida de Date');
  }
  if (typeof retirementYear !== 'number' || !Number.isFinite(retirementYear)) {
    return null;
  }
  return retirementYear - birthDate.getUTCFullYear();
}

export function simulateRetirementPlan({
  birthDate,
  retirementAge,
  retirementYear,
  annualReturnRate,
  monthlyContributions,
  today = new Date(),
}) {
  if (!(birthDate instanceof Date) || Number.isNaN(birthDate.getTime())) {
    throw new TypeError('birthDate debe ser una instancia válida de Date');
  }
  if (typeof retirementAge !== 'number' || !Number.isFinite(retirementAge) || retirementAge <= 0) {
    throw new RangeError('La edad de jubilación debe ser un número mayor a 0.');
  }
  if (
    retirementYear != null &&
    (!Number.isInteger(retirementYear) || retirementYear < birthDate.getUTCFullYear())
  ) {
    throw new RangeError('El año de jubilación debe ser un entero válido posterior al año de nacimiento.');
  }
  if (typeof annualReturnRate !== 'number' || Number.isNaN(annualReturnRate)) {
    throw new TypeError('La rentabilidad anual debe ser un número.');
  }
  if (!Array.isArray(monthlyContributions) || monthlyContributions.length === 0) {
    throw new TypeError('Debe proporcionar al menos un escenario de ahorro mensual.');
  }
  const contributions = monthlyContributions.map((value, index) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new RangeError(`El escenario ${index + 1} debe ser un número mayor a 0.`);
    }
    return value;
  });

  const targetDate = addYears(birthDate, retirementAge);
  const monthsToRetirement = monthsBetweenDates(today, targetDate);
  if (monthsToRetirement <= 0) {
    throw new RangeError('La fecha de jubilación debe ser futura.');
  }

  const expectedRetirementYear = targetDate.getUTCFullYear();
  let yearMismatch = null;
  if (retirementYear != null && retirementYear !== expectedRetirementYear) {
    yearMismatch = {
      expected: expectedRetirementYear,
      provided: retirementYear,
    };
  }

  const monthlyRate = annualRateToMonthlyRate(annualReturnRate);
  const scenarios = contributions.map((monthlyContribution, index) => {
    const futureValue = futureValueOfAnnuity(
      monthlyContribution,
      monthlyRate,
      monthsToRetirement
    );
    const totalContributed = monthlyContribution * monthsToRetirement;
    return {
      id: index,
      monthlyContribution,
      futureValue,
      totalContributed,
      interestEarned: futureValue - totalContributed,
    };
  });

  const durationYears = Math.floor(monthsToRetirement / 12);
  const durationMonths = monthsToRetirement % 12;
  const currentAge = calculateAgeInYears(today, birthDate);

  return {
    targetDate,
    expectedRetirementYear,
    monthsToRetirement,
    duration: { years: durationYears, months: durationMonths },
    scenarios,
    monthlyRate,
    annualReturnRate,
    yearMismatch,
    currentAge,
    retirementAge,
  };
}
