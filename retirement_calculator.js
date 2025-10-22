const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function parseBirthDate(input) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function monthsUntilAge(birthDate, age) {
  const milestoneDate = new Date(birthDate);
  milestoneDate.setFullYear(milestoneDate.getFullYear() + age);

  const now = new Date();

  let totalMonths = (milestoneDate.getFullYear() - now.getFullYear()) * 12 +
    (milestoneDate.getMonth() - now.getMonth());

  if (milestoneDate.getDate() < now.getDate()) {
    totalMonths -= 1;
  }

  return totalMonths;
}

function futureValue(monthlyContribution, months, annualRate = 0.1) {
  if (months <= 0) {
    return 0;
  }
  const monthlyRate = annualRate / 12;
  return monthlyContribution * (((1 + monthlyRate) ** months - 1) / monthlyRate);
}

async function main() {
  try {
    const birthInput = await askQuestion('Ingresa tu fecha de nacimiento (YYYY-MM-DD): ');
    const birthDate = parseBirthDate(birthInput);

    if (!birthDate) {
      console.error('Fecha inválida. Asegúrate de usar el formato YYYY-MM-DD.');
      rl.close();
      return;
    }

    const contributionInput = await askQuestion('Ingresa el monto de ahorro mensual (por ejemplo 500): ');
    const monthlyContribution = Number(contributionInput.replace(',', '.'));

    if (Number.isNaN(monthlyContribution) || monthlyContribution < 0) {
      console.error('Monto de ahorro mensual inválido.');
      rl.close();
      return;
    }

    const milestones = [50, 55, 60, 65];
    console.log('\nResultados:');

    const now = new Date();

    milestones.forEach((age) => {
      const monthsRemaining = monthsUntilAge(birthDate, age);
      if (monthsRemaining <= 0) {
        const milestoneDate = new Date(birthDate);
        milestoneDate.setFullYear(milestoneDate.getFullYear() + age);
        if (now >= milestoneDate) {
          console.log(`- Ya cumpliste ${age} años.`);
        } else {
          console.log(`- Cumples ${age} años este mes.`);
        }
        return;
      }

      const value = futureValue(monthlyContribution, monthsRemaining);
      console.log(`- Faltan ${monthsRemaining} meses para cumplir ${age} años. ` +
        `Ahorro estimado con 10% de rentabilidad anual: $${value.toFixed(2)}`);
    });
  } catch (error) {
    console.error('Ocurrió un error inesperado:', error);
  } finally {
    rl.close();
  }
}

main();
