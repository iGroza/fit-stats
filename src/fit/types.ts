/** Нормализованная точка трека (единицы: метры, км/ч, уд/мин, °C). */
export interface TrackPoint {
  /** Время точки. */
  time: Date;
  /** Секунды от старта. */
  t: number;
  /** Кумулятивная дистанция, м. */
  dist: number;
  lat?: number;
  lng?: number;
  /** Высота, м. */
  alt?: number;
  /** Скорость, км/ч. */
  speed?: number;
  /** Темп, мин/км (производная от скорости). */
  pace?: number;
  /** Пульс, уд/мин. */
  hr?: number;
  /** Каденс, шаг/об в мин. */
  cadence?: number;
  /** Мощность, Вт. */
  power?: number;
  /** Температура, °C. */
  temp?: number;
  /** Длина шага, м. */
  stride?: number;
  /** Вертикальные колебания, см. */
  vo?: number;
  /** Время контакта с землёй, мс. */
  gct?: number;
}

/** Тип отрезка интервальной тренировки (авто-детект). */
export type SplitKind = 'warmup' | 'work' | 'rest' | 'cooldown';

/** Круг (lap) из FIT-файла либо расчётный сплит. */
export interface Split {
  /** Номер, с 1. */
  n: number;
  /** Категория отрезка (только для авто-интервалов). */
  kind?: SplitKind;
  /** Начало отрезка: секунд от старта тренировки. */
  startT?: number;
  /** Длина отрезка, м. */
  distance: number;
  /** Длительность отрезка, с. */
  time: number;
  /** км/ч */
  avgSpeed?: number;
  avgHr?: number;
  maxHr?: number;
  avgCadence?: number;
  avgPower?: number;
  /** Набор высоты на отрезке, м. */
  ascent?: number;
}

/** Сводка по одному треку. */
export interface TrackSummary {
  sport?: string;
  startTime?: Date;
  /** Дистанция, м. */
  distance: number;
  /** Полное время, с. */
  elapsed: number;
  /** Время в движении (за вычетом пауз), с. */
  moving: number;
  /** км/ч */
  avgSpeed?: number;
  maxSpeed?: number;
  avgHr?: number;
  maxHr?: number;
  minHr?: number;
  avgCadence?: number;
  maxCadence?: number;
  avgPower?: number;
  maxPower?: number;
  avgTemp?: number;
  /** Набор/сброс высоты, м. */
  ascent?: number;
  descent?: number;
  calories?: number;
  /** Средняя длина шага, м. */
  avgStride?: number;
  /** Аэробный training effect (0–5). */
  trainingEffect?: number;
  /** Анаэробный training effect (0–5). */
  anaerobicTrainingEffect?: number;
  vo2max?: number;
}

/** Загруженный и разобранный .fit-файл. */
export interface Track {
  id: string;
  /** Ключ файла в истории (имя + размер) — дедупликация повторных загрузок. */
  sourceId: string;
  fileName: string;
  color: string;
  visible: boolean;
  points: TrackPoint[];
  summary: TrackSummary;
  /** Круги из файла (если писались отсечки). */
  laps: Split[];
  /** true, если в треке есть GPS-координаты. */
  hasGps: boolean;
}

/** Параметры, по которым строятся графики. */
export type MetricKey = 'speed' | 'pace' | 'hr' | 'alt' | 'cadence' | 'power' | 'stride' | 'vo' | 'gct' | 'temp';

export interface MetricDef {
  key: MetricKey;
  icon: string;
  /** Семантический цвет иконки метрики. */
  color: string;
  /** Меньше = лучше (темп): ось Y перевёрнута. */
  reversed?: boolean;
}

/* Подписи, единицы и пояснения метрик — в словарях локализации (i18n/dict). */
export const METRICS: MetricDef[] = [
  { key: 'speed', icon: 'fa-gauge-high', color: '#f2a35e' },
  { key: 'pace', icon: 'fa-stopwatch', color: '#f2a35e', reversed: true },
  { key: 'hr', icon: 'fa-heart-pulse', color: '#f25e8a' },
  { key: 'alt', icon: 'fa-mountain', color: '#4ade80' },
  { key: 'cadence', icon: 'fa-shoe-prints', color: '#a78bfa' },
  { key: 'power', icon: 'fa-bolt', color: '#e0d75e' },
  { key: 'stride', icon: 'fa-ruler-horizontal', color: '#34d399' },
  { key: 'vo', icon: 'fa-arrows-up-down', color: '#5ec8f2' },
  { key: 'gct', icon: 'fa-hourglass-half', color: '#f2a35e' },
  { key: 'temp', icon: 'fa-temperature-half', color: '#5ec8f2' },
];
