import { SURVEY_GROUPS } from './questions';

type GroupName = typeof SURVEY_GROUPS[number]['name'];
export type SurveyField = GroupName | 'email' | 'name' | 'birthYear' | 'kilometers' | 'runs' | 'otherGoal' | 'wishes' | 'consent';
export type SurveyErrors = Partial<Record<SurveyField, string>>;

export function validateSurvey(data: FormData, year = new Date().getFullYear()) {
  const errors: SurveyErrors = {};
  const text = (field: SurveyField) => String(data.get(field) ?? '').trim();
  const answers = {
    email: text('email'), name: text('name'), birthYear: Number(text('birthYear')),
    kilometers: Number(text('kilometers')), runs: Number(text('runs')),
    otherGoal: data.getAll('goals').includes('Свой вариант') ? text('otherGoal') : '',
    wishes: text('wishes'), consent: data.get('consent') === 'on',
  };
  if (!answers.email || answers.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email)) {
    errors.email = 'Укажите корректную почту, например name@example.com (до 254 символов).';
  }
  if (!answers.name || answers.name.length > 80) errors.name = 'Укажите имя: от 1 до 80 символов.';
  for (const [field, min, max, message] of [
    ['birthYear', 1900, year, `Укажите год рождения целым числом от 1900 до ${year}.`],
    ['kilometers', 0, 200, 'Укажите целое число километров от 0 до 200.'],
    ['runs', 1, 10, 'Укажите целое число пробежек от 1 до 10.'],
  ] as const) {
    if (!text(field) || !Number.isInteger(answers[field]) || answers[field] < min || answers[field] > max) errors[field] = message;
  }
  const selections: Partial<Record<GroupName, string | string[]>> = {};
  for (const group of SURVEY_GROUPS) {
    const values = data.getAll(group.name).map(String);
    if (!values.length || new Set(values).size !== values.length || (!group.multiple && values.length !== 1) ||
      values.some(value => !(group.options as readonly string[]).includes(value))) {
      errors[group.name] = group.multiple ? 'Выберите хотя бы один вариант.' : 'Выберите один вариант.';
    }
    selections[group.name] = group.multiple ? values : values[0];
  }
  if (data.getAll('goals').includes('Свой вариант') && (!answers.otherGoal || answers.otherGoal.length > 200)) {
    errors.otherGoal = 'Опишите свою цель: от 1 до 200 символов.';
  }
  if (answers.wishes.length > 800) errors.wishes = 'Сократите пожелания до 800 символов.';
  for (const field of ['email', 'name', 'otherGoal', 'wishes'] as const) {
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(answers[field])) errors[field] = 'Удалите недопустимые управляющие символы.';
  }
  if (!answers.consent) errors.consent = 'Для отправки необходимо согласие на обработку данных.';
  return { answers: { ...answers, ...selections }, errors };
}
