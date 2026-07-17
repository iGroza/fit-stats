/**
 * Словари локализации. `ru` — эталон структуры, `en` типизируется от него,
 * поэтому пропущенный перевод не соберётся.
 */

export type Locale = 'ru' | 'en';

const plural = (n: number, one: string, few: string, many: string): string => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

export const ru = {
  locale: 'ru-RU',
  langLabel: 'Язык',

  units: {
    km: 'км',
    m: 'м',
    h: 'ч',
    min: 'мин',
    s: 'с',
    kmh: 'км/ч',
    perKm: '/км',
    kcal: 'ккал',
    bpm: 'уд/мин',
    spm: 'шагов/мин',
    watts: 'Вт',
  },

  nav: {
    aria: 'Основная навигация',
    toTop: 'наверх',
    sections: { tracks: 'Треки', summary: 'Сводка', map: 'Карта', charts: 'Графики' },
    upload: 'Загрузить треки',
    export: 'Экспорт в Excel',
    exporting: 'Готовлю…',
    exportTitle: 'Скачать Excel: сводка, записи, все отсечки (1/5 км, круги, интервалы) и графики',
    downloadPng: 'Скачать PNG',
    downloadPngTitle: 'Скачать PNG-отчёт: карта в текущем виде, сводка и графики',
    github: 'Исходный код на GitHub',
    menuOpen: 'Открыть меню',
    menuClose: 'Закрыть меню',
  },

  hero: {
    eyebrow: 'Просмотр FIT/GPX треков в браузере',
    title: 'Все ваши тренировки на одном экране',
    sub: 'Просмотр и анализ FIT/GPX треков прямо в браузере: массовая загрузка, карта, сводка, метрики и графики. Файлы не загружаются на сервер — парсинг и расчёты происходят локально.',
    features: [
      {
        title: 'Массовая загрузка',
        text: 'Перетащите сразу все .fit и .gpx файлы — с часов, велокомпьютера или из экспорта Apple Health. Каждый разбирается локально за доли секунды.',
      },
      {
        title: 'Карта всех треков',
        text: 'Маршруты всех тренировок на одной карте: цвет на трек, старт и финиш, клик — сводка по активности.',
      },
      {
        title: 'Метрики и графики',
        text: 'Темп, пульс, высота, каденс, мощность, беговая механика — графики по каждому параметру и отсечки по километрам.',
      },
      {
        title: 'Приватно и офлайн',
        text: 'Никакого сервера: файлы не покидают браузер, история хранится на вашем устройстве. Работает даже без сети.',
      },
    ],
  },

  dropzone: {
    aria: 'Загрузить .fit / .gpx файлы',
    title: 'Перетащите .fit или .gpx файлы сюда',
    busy: (n: number) => `Разбираю файлы… ещё ${n}`,
    subtitle: 'или нажмите, чтобы выбрать — можно сразу несколько',
    choose: 'Выбрать файлы',
  },

  errors: {
    duplicate: 'этот трек уже добавлен',
    noRecords: 'в файле нет записей трека',
    historyMissing: 'файл не найден в истории',
    more: (n: number) => `…и ещё ${n} ${plural(n, 'ошибка', 'ошибки', 'ошибок')}`,
  },

  toasts: {
    duplicateTitle: 'Уже в анализе',
    duplicateMsg: (name: string) => name.replace(/\.(fit|gpx)$/i, ''),
    loadedTitle: 'Треки загружены',
    loadedMsg: (n: number) =>
      `Добавлено ${n} ${plural(n, 'трек', 'трека', 'треков')}`,
    trackRemovedTitle: 'Трек убран из списка',
    listClearedTitle: 'Список треков очищен',
    showAllTitle: 'Все треки показаны',
    hideAllTitle: 'Все треки скрыты',
    historyDeletedTitle: 'Удалено из истории',
    historyDeletedManyTitle: (n: number) =>
      `Удалено из истории: ${n} ${plural(n, 'трек', 'трека', 'треков')}`,
    historyClearedTitle: 'История очищена',
    exportExcelTitle: 'Excel скачан',
    exportExcelError: 'Не удалось экспортировать Excel',
    exportPngTitle: 'PNG-отчёт скачан',
    exportPngError: 'Не удалось сохранить PNG',
  },

  history: {
    open: (n: number) => `История треков · ${n}`,
    title: 'История треков',
    subtitle: 'Хранится на этом устройстве. Файлы можно вернуть в анализ в любой момент.',
    searchPlaceholder: 'Поиск по названию, виду спорта, дате…',
    searchAria: 'Поиск по истории треков',
    empty: 'Ничего не найдено',
    add: 'Добавить',
    added: 'Проанализирован',
    addAll: 'Добавить все',
    deleteAll: 'Удалить все',
    addSelected: (n: number) => `Добавить выбранные (${n})`,
    deleteSelected: (n: number) => `Удалить выбранные (${n})`,
    deleteAllConfirm: 'Удалить всю историю? Это действие необратимо.',
    deleteSelectedConfirm: (n: number) =>
      `Удалить ${n} ${plural(n, 'трек', 'трека', 'треков')} из истории? Это действие необратимо.`,
    selectAll: 'Выбрать все',
    selectAria: (name: string) => `Выбрать ${name}`,
    deleteTitle: 'Удалить из истории',
    close: 'Закрыть',
  },

  sections: {
    tracks: {
      eyebrow: 'Файлы',
      title: 'Загруженные треки',
      lead: 'Кнопка с глазом убирает трек из сводки, карты и графиков — и возвращает обратно. Разверните трек — детальные метрики и отсечки.',
      clear: 'Очистить список',
      sort: 'Сортировка',
      showAll: 'Показать все',
      hideAll: 'Скрыть все',
      sortKeys: {
        date: 'Дата',
        name: 'Имя',
        sport: 'Тип',
        distance: 'Дистанция',
        duration: 'Время',
        pace: 'Темп/скорость',
      },
    },
    summary: {
      eyebrow: 'Итоги',
      title: 'Общая сводка',
      lead: (v: number, total: number) =>
        `По ${v} из ${total} загруженных треков. Наведите курсор на карточку — пояснение метрики.`,
    },
    map: {
      eyebrow: 'Маршруты',
      title: 'Карта всех треков',
      lead: 'Каждый трек — своим цветом (скрытые из анализа не показываются). Клик по линии — сводка, зелёная точка — старт, розовая — финиш.',
      noGps: 'В видимых треках нет GPS-координат',
      recenter: 'Показать все треки целиком',
      start: 'Старт',
      finish: 'Финиш',
      hiddenBadge: 'скрыт из анализа',
    },
    charts: {
      eyebrow: 'Анализ',
      title: 'Графики по всем параметрам',
      lead: 'Показываются только метрики, которые есть в загруженных треках.',
      axis: 'Ось X',
      axisDist: 'Дистанция',
      axisTime: 'Время',
      view: 'Треки',
      viewEach: 'Каждый отдельно',
      viewAvg: 'Среднее по всем',
      avgSeries: 'Среднее по всем трекам',
      busy: 'Графики появятся после загрузки…',
      limited: (shown: number, total: number) =>
        `На графике ${shown} из ${total} треков (самые длинные). Переключитесь на «Среднее по всем», чтобы учесть все.`,
    },
  },

  cards: {
    distance: { label: 'Дистанция', hint: 'Суммарное расстояние по всем трекам, участвующим в анализе.' },
    tracksCount: (n: number) => `${n} ${plural(n, 'трек', 'трека', 'треков')}`,
    moving: {
      label: 'Время в движении',
      hint: 'Чистое время движения по всем трекам — паузы и остановки не считаются.',
    },
    withPauses: (s: string) => `с паузами ${s}`,
    pace: {
      label: 'Средний темп',
      hint: 'Минуты и секунды на 1 километр (дистанция ÷ время в движении). Чем меньше — тем быстрее.',
    },
    speedSub: (s: string) => `скорость ${s}`,
    speed: { label: 'Средняя скорость', hint: 'Общая дистанция, делённая на суммарное время в движении.' },
    maxSub: (s: string) => `макс. ${s}`,
    hr: {
      label: 'Средний пульс',
      hint: 'Средняя частота сердечных сокращений, взвешенная по длительности каждого трека.',
    },
    ascent: { label: 'Набор высоты', hint: 'Суммарный подъём по всем трекам; сброс — суммарный спуск.' },
    descentSub: (s: string) => `сброс ${s}`,
    calories: { label: 'Калории', hint: 'Суммарная оценка потраченной энергии из данных устройства.' },
  },

  row: {
    distance: { label: 'Дистанция', hint: 'Пройденное расстояние за тренировку.' },
    time: { label: 'Время', hint: 'Чистое время в движении (час:мин:сек), без пауз.' },
    pace: {
      label: 'Темп',
      hint: 'Средний темп: минуты и секунды на 1 километр. Чем меньше — тем быстрее.',
    },
    speed: { label: 'Скорость', hint: 'Средняя скорость движения.' },
    hr: { label: 'Пульс', hint: 'Средняя частота сердечных сокращений за тренировку.' },
    ascent: { label: 'Набор', hint: 'Суммарный подъём в метрах за тренировку.' },
    calories: { label: 'Калории', hint: 'Оценка потраченной энергии — по пульсу, весу и профилю в устройстве.' },
    badge: 'скрыт из анализа',
    noGps: 'без GPS',
    hide: 'Скрыть из анализа: трек исчезнет из сводки, карты и графиков, но останется в этом списке. Вернуть — повторным нажатием.',
    show: 'Вернуть трек в анализ',
    remove: 'Убрать трек из списка (в истории останется)',
  },

  details: {
    elapsed: { label: 'Общее время', hint: 'Время от старта до финиша, включая все паузы и остановки.' },
    moving: { label: 'Время в движении', hint: 'Чистое время движения — паузы и остановки не считаются.' },
    bestPace: {
      label: 'Лучший темп, мин/км',
      hint: 'Самый быстрый темп за тренировку: минуты и секунды на километр.',
    },
    maxSpeed: { label: 'Макс. скорость, км/ч', hint: 'Максимальная мгновенная скорость за тренировку.' },
    hr: {
      label: 'Пульс, уд/мин',
      hint: 'Частота сердечных сокращений: средняя, максимальная и минимальная за тренировку.',
    },
    cadence: {
      label: 'Каденс, шагов/мин',
      hint: 'Частота шагов в минуту, считаются обе ноги (для велосипеда — обороты педалей). Ориентир для бега: 170–180.',
    },
    power: {
      label: 'Мощность, Вт',
      hint: 'Оценка усилий в ваттах — как быстро вы тратите энергию. Устройство рассчитывает её по скорости, весу и рельефу. Стабильнее пульса: реагирует на нагрузку мгновенно.',
    },
    stride: { label: 'Длина шага, м', hint: 'Среднее расстояние за один шаг: скорость ÷ каденс.' },
    descent: { label: 'Сброс высоты, м', hint: 'Суммарный спуск за тренировку в метрах.' },
    temp: { label: 'Температура, °C', hint: 'Средняя температура окружающей среды по датчику устройства.' },
    te: {
      label: 'Эффект тренировки, 0–5',
      hint: 'Оценка пользы тренировки по шкале 0–5: до 1 — без эффекта, 2 — поддержание формы, 3 — улучшение, 4–5 — сильное развитие. Аэробный — выносливость, анаэробный — скорость и мощность.',
    },
    vo2: {
      label: 'VO₂max, мл/кг/мин',
      hint: 'Максимальное потребление кислорода — главный показатель выносливости. У любителей обычно 35–55.',
    },
    points: {
      label: 'Записей в треке',
      hint: 'Сколько измерений сделало устройство за тренировку (обычно раз в секунду).',
    },
    avg: 'ср',
    max: 'макс',
    min: 'мин',
    aerobic: 'аэробный',
    anaerobic: 'анаэробный',
  },

  splits: {
    label: 'Отсечки',
    hint: 'Тренировка нарезается на отрезки, по каждому — свои показатели. Круги берутся из часов, если вы отмечали их кнопкой или автокругом.',
    per1: 'Каждый 1 км',
    per5: 'Каждые 5 км',
    laps: (n: number) => `Круги (${n})`,
    intervals: (n: number) => `Интервалы (${n})`,
    intervalsHint:
      'Интервалы определены автоматически по скорости: быстрые отрезки — работа, медленные — отдых.',
    kinds: { warmup: 'Разминка', work: 'Работа', rest: 'Отдых', cooldown: 'Заминка' },
    hCategory: 'Категория',
    empty: 'Недостаточно данных для отсечек.',
    hN: '№',
    hLap: 'Круг',
    hDist: 'Дистанция',
    hTime: { label: 'Длительность', hint: 'Длительность отрезка: круга, этапа или отдыха (мин:сек)' },
    hPace: { label: 'Темп, мин/км', hint: 'Средний темп отрезка, мин:сек на километр' },
    hSpeed: { label: 'Скорость, км/ч', hint: 'Средняя скорость отрезка, км/ч' },
    hHr: { label: 'Пульс, уд/мин', hint: 'Средний пульс отрезка, ударов в минуту' },
    hCadence: { label: 'Каденс, шагов/мин', hint: 'Средняя частота шагов на отрезке (обе ноги)' },
    hAscent: { label: 'Набор, м', hint: 'Суммарный подъём на отрезке, метров' },
    kindTotalsLabel: 'Длительность по категориям',
    kindTotalsHint:
      'Суммарная длительность этапов: разминка, работа, отдых и заминка. Считается по всем отрезкам вкладки «Интервалы».',
    kindTotal: (n: number, time: string) => `${n} × · ${time}`,
  },

  metrics: {
    speed: { label: 'Скорость', unit: 'км/ч', hint: 'Скорость движения по данным GPS.' },
    pace: {
      label: 'Темп',
      unit: 'мин/км',
      hint: 'Время на 1 километр — чем меньше, тем быстрее. Основная метрика бегуна.',
    },
    hr: { label: 'Пульс', unit: 'уд/мин', hint: 'Частота сердечных сокращений — ударов сердца в минуту.' },
    alt: { label: 'Высота', unit: 'м', hint: 'Высота над уровнем моря по барометру или GPS.' },
    cadence: {
      label: 'Каденс',
      unit: 'шагов/мин',
      hint: 'Частота шагов в минуту (обе ноги). Для велосипеда — обороты педалей.',
    },
    power: {
      label: 'Мощность',
      unit: 'Вт',
      hint: 'Оценка усилий в ваттах: рассчитывается устройством по скорости, весу и рельефу.',
    },
    stride: { label: 'Длина шага', unit: 'м', hint: 'Расстояние, преодолеваемое за один шаг: скорость ÷ каденс.' },
    vo: {
      label: 'Верт. колебания',
      unit: 'см',
      hint: 'Подъём и опускание центра масс при беге. Меньше — экономичнее техника.',
    },
    gct: {
      label: 'Контакт с землёй',
      unit: 'мс',
      hint: 'Сколько миллисекунд стопа контактирует с землёй. Меньше — лучше техника бега.',
    },
    temp: { label: 'Температура', unit: '°C', hint: 'Температура окружающей среды по датчику устройства.' },
  },

  sports: {
    running: 'Бег',
    cycling: 'Велосипед',
    walking: 'Ходьба',
    hiking: 'Хайкинг',
    swimming: 'Плавание',
    training: 'Тренировка',
    fitness_equipment: 'Тренажёр',
    cross_country_skiing: 'Лыжи',
    alpine_skiing: 'Горные лыжи',
    snowboarding: 'Сноуборд',
    rowing: 'Гребля',
    e_biking: 'Электровелосипед',
    motorcycling: 'Мотоцикл',
    generic: 'Активность',
  } as Record<string, string>,

  footer: {
    tagline: 'Просмотр и анализ .fit/.gpx треков в браузере. Файлы не покидают ваше устройство.',
    formatTitle: 'Форматы',
    formatLine1: 'FIT — Garmin, Zepp/Amazfit, Suunto, COROS, Polar',
    formatLine2: 'GPX — Apple Health / Apple Watch и другие',
    privacy:
      'Все вычисления выполняются локально в браузере: треки не отправляются на сервер и нигде не сохраняются, история — только на вашем устройстве.',
  },

  xlsx: {
    summarySheet: 'Сводка',
    chartsSheet: 'Графики · все треки',
    chartsAvgSheet: 'Графики · среднее',
    recordsSuffix: 'записи',
    kmSuffix: '1км',
    km5Suffix: '5км',
    lapsSuffix: 'круги',
    intervalsSuffix: 'интерв',
    summarySubtitle: 'сводка по трекам',
    chartsSubtitle: 'графики: каждый трек отдельно',
    chartsAvgSubtitle: 'графики: среднее по всем трекам',
    recordsSubtitle: (name: string) => `записи · ${name}`,
    /** @deprecated use splits1kmSubtitle */
    splitsSubtitle: (name: string) => `отсечки по 1 км · ${name}`,
    splits1kmSubtitle: (name: string) => `отсечки по 1 км · ${name}`,
    splits5kmSubtitle: (name: string) => `отсечки по 5 км · ${name}`,
    splitsLapsSubtitle: (name: string) => `круги · ${name}`,
    splitsIntervalsSubtitle: (name: string) => `интервалы (работа/отдых) · ${name}`,
    generated: (url: string) => `Сформировано на сайте · ${url}`,
    openSite: 'Открыть FIT Stats',
    fileName: 'fit-tracks.xlsx',
    summaryHeader: [
      'Файл', 'Вид', 'Старт', 'Дистанция, км', 'Время всего', 'В движении',
      'Ср. темп, мин/км', 'Ср. скорость, км/ч', 'Макс. скорость, км/ч',
      'Ср. пульс, уд/мин', 'Макс. пульс, уд/мин', 'Ср. каденс, шагов/мин',
      'Ср. мощность, Вт', 'Набор высоты, м', 'Сброс высоты, м', 'Калории, ккал',
    ],
    recordsHeader: [
      'Время', 'Сек от старта', 'Дистанция, м', 'Широта', 'Долгота', 'Высота, м',
      'Скорость, км/ч', 'Пульс, уд/мин', 'Каденс, шагов/мин', 'Мощность, Вт', 'Температура, °C',
    ],
    splitsHeaderN: '№',
    splitsHeaderKm: 'Км',
    splitsHeaderLap: 'Круг',
    splitsHeaderDist: 'Дистанция, м',
    splitsHeaderCategory: 'Категория',
    splitsHeader: ['Длительность', 'Ср. пульс, уд/мин', 'Макс. пульс, уд/мин', 'Ср. каденс, шагов/мин', 'Набор, м'],
    splitsPace: 'Темп, мин/км',
    splitsSpeed: 'Скорость, км/ч',
    splitsTotalLabel: 'Итого',
  },
};

export type Dict = typeof ru;

export const en: Dict = {
  locale: 'en-US',
  langLabel: 'Language',

  units: {
    km: 'km',
    m: 'm',
    h: 'h',
    min: 'min',
    s: 's',
    kmh: 'km/h',
    perKm: '/km',
    kcal: 'kcal',
    bpm: 'bpm',
    spm: 'spm',
    watts: 'W',
  },

  nav: {
    aria: 'Main navigation',
    toTop: 'back to top',
    sections: { tracks: 'Tracks', summary: 'Summary', map: 'Map', charts: 'Charts' },
    upload: 'Upload tracks',
    export: 'Export to Excel',
    exporting: 'Preparing…',
    exportTitle: 'Download Excel: summary, records, all splits (1/5 km, laps, intervals) and charts',
    downloadPng: 'Download PNG',
    downloadPngTitle: 'Download a PNG report: current map view, summary and charts',
    github: 'Source code on GitHub',
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
  },

  hero: {
    eyebrow: 'FIT/GPX track viewer in your browser',
    title: 'All your workouts on a single screen',
    sub: 'View and analyze FIT/GPX tracks right in the browser: bulk upload, map, summary, metrics and charts. Files are never uploaded to a server — parsing and math happen locally.',
    features: [
      {
        title: 'Bulk upload',
        text: 'Drop all your .fit and .gpx files at once — from a watch, bike computer or an Apple Health export. Each is parsed locally in a fraction of a second.',
      },
      {
        title: 'All tracks on a map',
        text: 'Every workout route on one map: a color per track, start and finish markers, click for a quick summary.',
      },
      {
        title: 'Metrics and charts',
        text: 'Pace, heart rate, elevation, cadence, power, running dynamics — a chart for every parameter plus kilometer splits.',
      },
      {
        title: 'Private and offline',
        text: 'No server involved: files never leave the browser and history is stored on your device. Works without a network.',
      },
    ],
  },

  dropzone: {
    aria: 'Upload .fit / .gpx files',
    title: 'Drop your .fit or .gpx files here',
    busy: (n: number) => `Parsing files… ${n} left`,
    subtitle: 'or click to choose — multiple files at once',
    choose: 'Choose files',
  },

  errors: {
    duplicate: 'this track is already loaded',
    noRecords: 'no track records in this file',
    historyMissing: 'file not found in history',
    more: (n: number) => `…and ${n} more ${n === 1 ? 'error' : 'errors'}`,
  },

  toasts: {
    duplicateTitle: 'Already in analysis',
    duplicateMsg: (name: string) => name.replace(/\.(fit|gpx)$/i, ''),
    loadedTitle: 'Tracks loaded',
    loadedMsg: (n: number) => `Added ${n} ${n === 1 ? 'track' : 'tracks'}`,
    trackRemovedTitle: 'Track removed from list',
    listClearedTitle: 'Track list cleared',
    showAllTitle: 'All tracks shown',
    hideAllTitle: 'All tracks hidden',
    historyDeletedTitle: 'Removed from history',
    historyDeletedManyTitle: (n: number) =>
      `Removed from history: ${n} ${n === 1 ? 'track' : 'tracks'}`,
    historyClearedTitle: 'History cleared',
    exportExcelTitle: 'Excel downloaded',
    exportExcelError: 'Failed to export Excel',
    exportPngTitle: 'PNG report downloaded',
    exportPngError: 'Failed to save PNG',
  },

  history: {
    open: (n: number) => `Track history · ${n}`,
    title: 'Track history',
    subtitle: 'Stored on this device. You can bring files back into the analysis at any time.',
    searchPlaceholder: 'Search by name, sport, date…',
    searchAria: 'Search track history',
    empty: 'Nothing found',
    add: 'Add',
    added: 'Analyzed',
    addAll: 'Add all',
    deleteAll: 'Delete all',
    addSelected: (n: number) => `Add selected (${n})`,
    deleteSelected: (n: number) => `Delete selected (${n})`,
    deleteAllConfirm: 'Delete the entire history? This cannot be undone.',
    deleteSelectedConfirm: (n: number) =>
      `Delete ${n} ${n === 1 ? 'track' : 'tracks'} from history? This cannot be undone.`,
    selectAll: 'Select all',
    selectAria: (name: string) => `Select ${name}`,
    deleteTitle: 'Remove from history',
    close: 'Close',
  },

  sections: {
    tracks: {
      eyebrow: 'Files',
      title: 'Loaded tracks',
      lead: 'The eye button removes a track from the summary, map and charts — and brings it back. Expand a track for detailed metrics and splits.',
      clear: 'Clear list',
      sort: 'Sort',
      showAll: 'Show all',
      hideAll: 'Hide all',
      sortKeys: {
        date: 'Date',
        name: 'Name',
        sport: 'Sport',
        distance: 'Distance',
        duration: 'Time',
        pace: 'Pace/speed',
      },
    },
    summary: {
      eyebrow: 'Totals',
      title: 'Overall summary',
      lead: (v: number, total: number) =>
        `Based on ${v} of ${total} loaded tracks. Hover a card to see what the metric means.`,
    },
    map: {
      eyebrow: 'Routes',
      title: 'All tracks on the map',
      lead: 'Each track has its own color (tracks hidden from analysis are not shown). Click a line for a summary; green dot — start, pink — finish.',
      noGps: 'No GPS coordinates in the visible tracks',
      recenter: 'Fit all tracks in view',
      start: 'Start',
      finish: 'Finish',
      hiddenBadge: 'hidden from analysis',
    },
    charts: {
      eyebrow: 'Analysis',
      title: 'Charts for every parameter',
      lead: 'Only metrics present in the loaded tracks are shown.',
      axis: 'X axis',
      axisDist: 'Distance',
      axisTime: 'Time',
      view: 'Tracks',
      viewEach: 'Each separately',
      viewAvg: 'Average of all',
      avgSeries: 'Average of all tracks',
      busy: 'Charts will appear after loading…',
      limited: (shown: number, total: number) =>
        `Showing ${shown} of ${total} tracks (longest ones). Switch to “Average of all” to include every track.`,
    },
  },

  cards: {
    distance: { label: 'Distance', hint: 'Total distance across all tracks included in the analysis.' },
    tracksCount: (n: number) => `${n} ${n === 1 ? 'track' : 'tracks'}`,
    moving: {
      label: 'Moving time',
      hint: 'Pure moving time across all tracks — pauses and stops are excluded.',
    },
    withPauses: (s: string) => `with pauses ${s}`,
    pace: {
      label: 'Average pace',
      hint: 'Minutes and seconds per kilometer (distance ÷ moving time). Lower is faster.',
    },
    speedSub: (s: string) => `speed ${s}`,
    speed: { label: 'Average speed', hint: 'Total distance divided by total moving time.' },
    maxSub: (s: string) => `max ${s}`,
    hr: { label: 'Average heart rate', hint: 'Average heart rate weighted by each track duration.' },
    ascent: { label: 'Elevation gain', hint: 'Total climb across all tracks; loss — total descent.' },
    descentSub: (s: string) => `loss ${s}`,
    calories: { label: 'Calories', hint: 'Total energy estimate from the device data.' },
  },

  row: {
    distance: { label: 'Distance', hint: 'Distance covered during the workout.' },
    time: { label: 'Time', hint: 'Pure moving time (h:mm:ss), pauses excluded.' },
    pace: { label: 'Pace', hint: 'Average pace: minutes and seconds per kilometer. Lower is faster.' },
    speed: { label: 'Speed', hint: 'Average moving speed.' },
    hr: { label: 'HR', hint: 'Average heart rate during the workout.' },
    ascent: { label: 'Ascent', hint: 'Total climb in meters during the workout.' },
    calories: { label: 'Calories', hint: 'Energy estimate based on HR, weight and device profile.' },
    badge: 'hidden from analysis',
    noGps: 'no GPS',
    hide: 'Hide from analysis: the track disappears from summary, map and charts but stays in this list. Click again to bring it back.',
    show: 'Bring the track back into analysis',
    remove: 'Remove the track from the list (it stays in history)',
  },

  details: {
    elapsed: { label: 'Total time', hint: 'Time from start to finish, including all pauses and stops.' },
    moving: { label: 'Moving time', hint: 'Pure moving time — pauses and stops are excluded.' },
    bestPace: { label: 'Best pace, min/km', hint: 'Fastest pace of the workout: minutes and seconds per kilometer.' },
    maxSpeed: { label: 'Max speed, km/h', hint: 'Maximum instantaneous speed of the workout.' },
    hr: { label: 'Heart rate, bpm', hint: 'Heart rate: average, maximum and minimum for the workout.' },
    cadence: {
      label: 'Cadence, spm',
      hint: 'Steps per minute, both feet counted (pedal revolutions for cycling). Running target: 170–180.',
    },
    power: {
      label: 'Power, W',
      hint: 'Effort estimate in watts — how fast you spend energy. Calculated from speed, weight and terrain. More stable than HR: reacts to load instantly.',
    },
    stride: { label: 'Stride length, m', hint: 'Average distance per step: speed ÷ cadence.' },
    descent: { label: 'Elevation loss, m', hint: 'Total descent in meters for the workout.' },
    temp: { label: 'Temperature, °C', hint: 'Average ambient temperature from the device sensor.' },
    te: {
      label: 'Training effect, 0–5',
      hint: 'Workout benefit on a 0–5 scale: below 1 — no effect, 2 — maintaining, 3 — improving, 4–5 — highly improving. Aerobic — endurance, anaerobic — speed and power.',
    },
    vo2: {
      label: 'VO₂max, ml/kg/min',
      hint: 'Maximal oxygen uptake — the key endurance indicator. Amateurs usually score 35–55.',
    },
    points: { label: 'Records in track', hint: 'How many measurements the device made (usually one per second).' },
    avg: 'avg',
    max: 'max',
    min: 'min',
    aerobic: 'aerobic',
    anaerobic: 'anaerobic',
  },

  splits: {
    label: 'Splits',
    hint: 'The workout is sliced into segments with per-segment stats. Laps come from the watch if you marked them with a button or auto-lap.',
    per1: 'Every 1 km',
    per5: 'Every 5 km',
    laps: (n: number) => `Laps (${n})`,
    intervals: (n: number) => `Intervals (${n})`,
    intervalsHint:
      'Intervals are auto-detected from speed: fast segments — work, slow — rest.',
    kinds: { warmup: 'Warm-up', work: 'Work', rest: 'Rest', cooldown: 'Cool-down' },
    hCategory: 'Category',
    empty: 'Not enough data for splits.',
    hN: '#',
    hLap: 'Lap',
    hDist: 'Distance',
    hTime: { label: 'Duration', hint: 'Segment duration: lap, work stage or rest (min:sec)' },
    hPace: { label: 'Pace, min/km', hint: 'Average segment pace, min:sec per kilometer' },
    hSpeed: { label: 'Speed, km/h', hint: 'Average segment speed, km/h' },
    hHr: { label: 'HR, bpm', hint: 'Average segment heart rate, beats per minute' },
    hCadence: { label: 'Cadence, spm', hint: 'Average steps per minute on the segment (both feet)' },
    hAscent: { label: 'Ascent, m', hint: 'Total climb on the segment, meters' },
    kindTotalsLabel: 'Duration by category',
    kindTotalsHint:
      'Total duration of stages: warm-up, work, rest and cool-down. Summed across all segments on the Intervals tab.',
    kindTotal: (n: number, time: string) => `${n}× · ${time}`,
  },

  metrics: {
    speed: { label: 'Speed', unit: 'km/h', hint: 'Moving speed from GPS data.' },
    pace: { label: 'Pace', unit: 'min/km', hint: 'Time per kilometer — lower is faster. The key running metric.' },
    hr: { label: 'Heart rate', unit: 'bpm', hint: 'Heart rate — beats per minute.' },
    alt: { label: 'Elevation', unit: 'm', hint: 'Altitude above sea level from barometer or GPS.' },
    cadence: { label: 'Cadence', unit: 'spm', hint: 'Steps per minute (both feet). Pedal revolutions for cycling.' },
    power: { label: 'Power', unit: 'W', hint: 'Effort estimate in watts: calculated from speed, weight and terrain.' },
    stride: { label: 'Stride length', unit: 'm', hint: 'Distance covered per step: speed ÷ cadence.' },
    vo: {
      label: 'Vertical oscillation',
      unit: 'cm',
      hint: 'Up-and-down movement of the body center while running. Less — more economical form.',
    },
    gct: {
      label: 'Ground contact',
      unit: 'ms',
      hint: 'Milliseconds the foot stays on the ground. Less — better running form.',
    },
    temp: { label: 'Temperature', unit: '°C', hint: 'Ambient temperature from the device sensor.' },
  },

  sports: {
    running: 'Running',
    cycling: 'Cycling',
    walking: 'Walking',
    hiking: 'Hiking',
    swimming: 'Swimming',
    training: 'Training',
    fitness_equipment: 'Gym',
    cross_country_skiing: 'XC skiing',
    alpine_skiing: 'Alpine skiing',
    snowboarding: 'Snowboarding',
    rowing: 'Rowing',
    e_biking: 'E-biking',
    motorcycling: 'Motorcycling',
    generic: 'Activity',
  } as Record<string, string>,

  footer: {
    tagline: 'View and analyze .fit/.gpx tracks in the browser. Files never leave your device.',
    formatTitle: 'Formats',
    formatLine1: 'FIT — Garmin, Zepp/Amazfit, Suunto, COROS, Polar',
    formatLine2: 'GPX — Apple Health / Apple Watch and more',
    privacy:
      'All processing happens locally in your browser: tracks are never sent to a server; history is stored on your device only.',
  },

  xlsx: {
    summarySheet: 'Summary',
    chartsSheet: 'Charts · all tracks',
    chartsAvgSheet: 'Charts · average',
    recordsSuffix: 'records',
    kmSuffix: '1km',
    km5Suffix: '5km',
    lapsSuffix: 'laps',
    intervalsSuffix: 'interv',
    summarySubtitle: 'tracks summary',
    chartsSubtitle: 'charts: each track separately',
    chartsAvgSubtitle: 'charts: average of all tracks',
    recordsSubtitle: (name: string) => `records · ${name}`,
    /** @deprecated use splits1kmSubtitle */
    splitsSubtitle: (name: string) => `1 km splits · ${name}`,
    splits1kmSubtitle: (name: string) => `1 km splits · ${name}`,
    splits5kmSubtitle: (name: string) => `5 km splits · ${name}`,
    splitsLapsSubtitle: (name: string) => `laps · ${name}`,
    splitsIntervalsSubtitle: (name: string) => `intervals (work/rest) · ${name}`,
    generated: (url: string) => `Generated in the · ${url}`,
    openSite: 'Open FIT Stats',
    fileName: 'fit-tracks.xlsx',
    summaryHeader: [
      'File', 'Sport', 'Start', 'Distance, km', 'Total time', 'Moving time',
      'Avg pace, min/km', 'Avg speed, km/h', 'Max speed, km/h',
      'Avg HR, bpm', 'Max HR, bpm', 'Avg cadence, spm',
      'Avg power, W', 'Elevation gain, m', 'Elevation loss, m', 'Calories, kcal',
    ],
    recordsHeader: [
      'Time', 'Sec from start', 'Distance, m', 'Latitude', 'Longitude', 'Elevation, m',
      'Speed, km/h', 'HR, bpm', 'Cadence, spm', 'Power, W', 'Temperature, °C',
    ],
    splitsHeaderN: '#',
    splitsHeaderKm: 'Km',
    splitsHeaderLap: 'Lap',
    splitsHeaderDist: 'Distance, m',
    splitsHeaderCategory: 'Category',
    splitsHeader: ['Duration', 'Avg HR, bpm', 'Max HR, bpm', 'Avg cadence, spm', 'Ascent, m'],
    splitsPace: 'Pace, min/km',
    splitsSpeed: 'Speed, km/h',
    splitsTotalLabel: 'Total',
  },
};

export const DICTS: Record<Locale, Dict> = { ru, en };
