import { useEffect, useMemo, useState } from 'react';
import {
  parseISODate,
  addYears,
  retirementAgeFromYear,
  simulateRetirementPlan,
  calculateAgeInYears,
} from './utils/finance.js';
import ScenarioChart from './components/ScenarioChart.jsx';

const defaultForm = {
  name: '',
  birthDate: '',
  retirementAge: '',
  retirementYear: '',
  averageReturn: '6',
  currentSavings: '0',
  contributions: ['300', '500', '800'],
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function parseMoneyInput(value) {
  if (typeof value !== 'string') return NaN;
  const trimmed = value.trim();
  if (trimmed === '') return NaN;
  const normalized = trimmed.replace(/\s+/g, '').replace(/,/g, '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : NaN;
}

export default function App() {
  const [form, setForm] = useState(() => ({ ...defaultForm }));
  const [errors, setErrors] = useState([]);
  const [result, setResult] = useState(null);
  const [activeScenario, setActiveScenario] = useState(0);

  useEffect(() => {
    setActiveScenario(0);
  }, [result]);

  const handleFieldChange = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'birthDate') {
        const birthDate = parseISODate(value);
        if (birthDate) {
          const ageValue = Number(prev.retirementAge);
          const yearValue = Number(prev.retirementYear);
          if (Number.isFinite(ageValue) && ageValue > 0) {
            const targetDate = addYears(birthDate, ageValue);
            next.retirementYear = String(targetDate.getUTCFullYear());
          } else if (Number.isInteger(yearValue)) {
            const derivedAge = retirementAgeFromYear(birthDate, yearValue);
            if (derivedAge != null && derivedAge > 0) {
              next.retirementAge = String(derivedAge);
            }
          }
        }
      }
      if (field === 'retirementAge') {
        const birthDate = parseISODate(prev.birthDate);
        const ageValue = Number(value);
        if (birthDate && Number.isFinite(ageValue) && ageValue > 0) {
          const targetDate = addYears(birthDate, ageValue);
          next.retirementYear = String(targetDate.getUTCFullYear());
        }
      }
      if (field === 'retirementYear') {
        const birthDate = parseISODate(prev.birthDate);
        const yearValue = Number(value);
        if (birthDate && Number.isInteger(yearValue)) {
          const derivedAge = retirementAgeFromYear(birthDate, yearValue);
          if (derivedAge != null && derivedAge > 0) {
            next.retirementAge = String(derivedAge);
          }
        }
      }
      return next;
    });
  };

  const handleContributionChange = (index) => (event) => {
    const { value } = event.target;
    setForm((prev) => {
      const nextContributions = [...prev.contributions];
      nextContributions[index] = value;
      return { ...prev, contributions: nextContributions };
    });
  };

  const resetForm = () => {
    setForm({ ...defaultForm });
    setErrors([]);
    setResult(null);
    setActiveScenario(0);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationErrors = [];
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      validationErrors.push('Ingresa un nombre.');
    }

    const birthDate = parseISODate(form.birthDate);
    if (!birthDate) {
      validationErrors.push('Selecciona una fecha de nacimiento válida.');
    } else {
      const today = new Date();
      const todayUTC = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
      );
      if (birthDate > todayUTC) {
        validationErrors.push('La fecha de nacimiento no puede ser futura.');
      }
    }

    const retirementAgeNumber = Number(form.retirementAge);
    if (!Number.isFinite(retirementAgeNumber) || retirementAgeNumber <= 0) {
      validationErrors.push('La edad de jubilación debe ser un número mayor a 0.');
    } else if (!Number.isInteger(retirementAgeNumber)) {
      validationErrors.push('La edad de jubilación debe ser un número entero.');
    }

    const retirementYearNumber = Number(form.retirementYear);
    if (!Number.isInteger(retirementYearNumber)) {
      validationErrors.push('El año de jubilación debe ser un número entero.');
    }

    const averageReturnNumber = parseMoneyInput(form.averageReturn);
    if (!Number.isFinite(averageReturnNumber) || averageReturnNumber < 0) {
      validationErrors.push('La rentabilidad promedio debe ser un número mayor o igual a 0.');
    }

    const currentSavingsNumber =
      form.currentSavings.trim() === ''
        ? 0
        : parseMoneyInput(form.currentSavings);
    if (!Number.isFinite(currentSavingsNumber) || currentSavingsNumber < 0) {
      validationErrors.push('El ahorro actual debe ser un número mayor o igual a 0.');
    }

    const contributions = form.contributions.map((value, index) => {
      const parsed = parseMoneyInput(value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        validationErrors.push(`El escenario ${index + 1} debe ser un número mayor a 0.`);
      }
      return parsed;
    });

    if (birthDate && Number.isFinite(retirementAgeNumber) && retirementAgeNumber > 0) {
      const currentAge = calculateAgeInYears(new Date(), birthDate);
      if (retirementAgeNumber <= currentAge) {
        validationErrors.push('La edad de jubilación debe ser mayor a tu edad actual.');
      }
    }

    if (birthDate && Number.isInteger(retirementYearNumber)) {
      const currentYear = new Date().getUTCFullYear();
      if (retirementYearNumber < currentYear) {
        validationErrors.push('El año de jubilación debe ser igual o posterior al año actual.');
      }
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setResult(null);
      return;
    }

    try {
      const plan = simulateRetirementPlan({
        birthDate,
        retirementAge: retirementAgeNumber,
        retirementYear: retirementYearNumber,
        annualReturnRate: averageReturnNumber / 100,
        monthlyContributions: contributions,
        initialSavings: currentSavingsNumber,
      });
      setResult({ name: trimmedName, plan });
      setErrors([]);
    } catch (error) {
      setErrors([error.message ?? 'Ocurrió un error inesperado.']);
      setResult(null);
    }
  };

  const summaryItems = useMemo(() => {
    if (!result) return [];
    const { plan } = result;
    const retirementDate = plan.targetDate.toISOString().slice(0, 10);
    return [
      {
        label: 'Fecha estimada de jubilación',
        value: `${retirementDate} (año ${plan.expectedRetirementYear})`,
      },
      {
        label: 'Tiempo restante',
        value: `${plan.duration.years} años y ${plan.duration.months} meses (${plan.monthsToRetirement} meses)`,
      },
      {
        label: 'Edad actual',
        value: `${plan.currentAge} años`,
      },
      {
        label: 'Edad objetivo',
        value: `${plan.retirementAge} años`,
      },
      {
        label: 'Ahorro actual',
        value: currencyFormatter.format(plan.initialSavings),
      },
    ];
  }, [result]);

  const activeScenarioData = result?.plan.scenarios[activeScenario] ?? null;

  return (
    <div className="app">
      <header className="hero">
        <div className="hero__content">
          <h1>Simulador de jubilación</h1>
          <p>
            Ingresa tus datos para estimar cuánto podrías ahorrar en tres escenarios
            distintos de inversión mensual en dólares.
          </p>
        </div>
      </header>
      <main className="container">
        <section className="panel">
          <h2 className="panel__title">Datos de entrada</h2>
          <form className="form" onSubmit={handleSubmit}>
            <div className="form__grid">
              <label className="field">
                <span>Nombre</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={handleFieldChange('name')}
                  placeholder="Tu nombre"
                />
              </label>
              <label className="field">
                <span>Fecha de nacimiento</span>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={handleFieldChange('birthDate')}
                />
              </label>
              <label className="field">
                <span>Edad de jubilación deseada (años)</span>
                <input
                  type="number"
                  min="1"
                  value={form.retirementAge}
                  onChange={handleFieldChange('retirementAge')}
                  placeholder="Ej: 65"
                />
              </label>
              <label className="field">
                <span>Año objetivo de jubilación</span>
                <input
                  type="number"
                  min="1900"
                  value={form.retirementYear}
                  onChange={handleFieldChange('retirementYear')}
                  placeholder="Ej: 2050"
                />
              </label>
              <label className="field">
                <span>Rentabilidad promedio anual (%)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.averageReturn}
                  onChange={handleFieldChange('averageReturn')}
                  placeholder="Ej: 6.5"
                />
              </label>
              <label className="field">
                <span>Ahorro actual (USD)</span>
                <input
                  type="number"
                  min="0"
                  value={form.currentSavings}
                  onChange={handleFieldChange('currentSavings')}
                  placeholder="Ej: 15000"
                />
              </label>
            </div>
            <div className="scenarios">
              <h3>Escenarios de ahorro mensual (USD)</h3>
              <div className="form__grid form__grid--scenarios">
                {form.contributions.map((value, index) => (
                  <label key={index} className="field">
                    <span>{`Escenario ${index + 1}`}</span>
                    <input
                      type="number"
                      min="1"
                      value={value}
                      onChange={handleContributionChange(index)}
                      placeholder="Ej: 500"
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="form__actions">
              <button type="submit" className="button button--primary">
                Simular
              </button>
              <button type="button" className="button button--ghost" onClick={resetForm}>
                Limpiar
              </button>
            </div>
          </form>
          {errors.length > 0 && (
            <div className="alert alert--error">
              <h3>Revisa los datos ingresados</h3>
              <ul>
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
        <section className="panel">
          <h2 className="panel__title">Resultados</h2>
          {result ? (
            <div className="results">
              <div className="results__header">
                <h3>{result.name}</h3>
                <p>
                  Rentabilidad anual simulada:{' '}
                  <strong>{`${(result.plan.annualReturnRate * 100).toFixed(2)}%`}</strong>
                </p>
              </div>
              {result.plan.yearMismatch && (
                <div className="alert alert--warning">
                  <p>
                    El año indicado ({result.plan.yearMismatch.provided}) no coincide con la edad objetivo
                    según la fecha de nacimiento (se espera {result.plan.yearMismatch.expected}).
                  </p>
                </div>
              )}
              <div className="summary">
                {summaryItems.map((item) => (
                  <div key={item.label} className="summary__item">
                    <span className="summary__label">{item.label}</span>
                    <span className="summary__value">{item.value}</span>
                  </div>
                ))}
              </div>
              {activeScenarioData && (
                <div className="scenario-tabs">
                  <div className="scenario-tabs__nav" role="tablist">
                    {result.plan.scenarios.map((scenario, index) => {
                      const isActive = index === activeScenario;
                      return (
                        <button
                          key={scenario.id}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          className={`scenario-tabs__button${isActive ? ' is-active' : ''}`}
                          onClick={() => setActiveScenario(index)}
                        >
                          {`Escenario ${index + 1}`}
                        </button>
                      );
                    })}
                  </div>
                  <div className="scenario-tabs__panel" role="tabpanel">
                    <div className="scenario-detail">
                      <div className="scenario-detail__chart">
                        <ScenarioChart
                          timeline={activeScenarioData.timeline}
                          retirementAge={result.plan.retirementAge}
                          formatCurrency={(value) => currencyFormatter.format(value)}
                          initialBalance={result.plan.initialSavings}
                        />
                      </div>
                      <div className="scenario-detail__metrics">
                        {[
                          {
                            label: 'Aporte mensual',
                            value: currencyFormatter.format(activeScenarioData.monthlyContribution),
                          },
                          {
                            label: `Total aportado hasta los ${result.plan.retirementAge} años`,
                            value: currencyFormatter.format(activeScenarioData.totalContributed),
                          },
                          {
                            label: `Capital a los ${result.plan.retirementAge} años`,
                            value: currencyFormatter.format(activeScenarioData.valueAtRetirement),
                          },
                          {
                            label: `Interés generado a los ${result.plan.retirementAge} años`,
                            value: currencyFormatter.format(activeScenarioData.interestEarned),
                          },
                        ].map((item) => (
                          <div key={item.label} className="metric-card">
                            <span className="metric-card__label">{item.label}</span>
                            <strong className="metric-card__value">{item.value}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Escenario</th>
                      <th>Ahorro mensual</th>
                      <th>Total aportado</th>
                      <th>{`Capital a los ${result.plan.retirementAge} años`}</th>
                      <th>{`Interés a los ${result.plan.retirementAge} años`}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.plan.scenarios.map((scenario, index) => (
                      <tr key={scenario.id}>
                        <td>{`Escenario ${index + 1}`}</td>
                        <td>{currencyFormatter.format(scenario.monthlyContribution)}</td>
                        <td>{currencyFormatter.format(scenario.totalContributed)}</td>
                        <td>{currencyFormatter.format(scenario.futureValue)}</td>
                        <td>{currencyFormatter.format(scenario.interestEarned)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="placeholder">
              Ingresa los datos y presiona "Simular" para ver los resultados.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
