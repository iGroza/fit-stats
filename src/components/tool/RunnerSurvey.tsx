import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { SURVEY_GROUPS } from '../../survey/questions';
import './RunnerSurvey.css';

const endpoint = import.meta.env.VITE_SURVEY_FUNCTION_URL ||
  'https://us-central1-fit-igroza-su.cloudfunctions.net/submitRunnerSurvey';

export function RunnerSurvey({ open, onClose, onComplete }: {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const sending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [customGoal, setCustomGoal] = useState(false);
  const [kilometers, setKilometers] = useState(20);
  const [runs, setRuns] = useState(3);

  useEffect(() => {
    const node = dialog.current;
    if (!open || !node) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      node.close();
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, [open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const answers: Record<string, unknown> = {
      email: String(data.get('email') || '').trim(),
      name: String(data.get('name') || '').trim(),
      birthYear: Number(data.get('birthYear')),
      kilometers, runs,
      otherGoal: customGoal ? String(data.get('otherGoal') || '').trim() : '',
      wishes: String(data.get('wishes') || '').trim(),
      consent: data.get('consent') === 'on',
    };
    for (const group of SURVEY_GROUPS) {
      const values = data.getAll(group.name).map(String);
      if (!values.length) {
        setError(`Выберите ответ: ${group.title}`);
        form.querySelector<HTMLInputElement>(`input[name="${group.name}"]`)?.focus();
        return;
      }
      answers[group.name] = group.multiple ? values : values[0];
    }
    if (!answers.name || (customGoal && !answers.otherGoal)) {
      setError('Заполните имя и свой вариант цели, если он выбран.');
      return;
    }
    sending.current = true;
    setBusy(true);
    setError('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error('delivery-failed');
      onComplete();
      setSent(true);
    } catch {
      setError('Не удалось подтвердить отправку. Ответы сохранены в открытой анкете — попробуйте ещё раз.');
    } finally {
      window.clearTimeout(timeout);
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialog} className="runner-survey" lang="ru" aria-labelledby="survey-title"
      onCancel={(event) => { event.preventDefault(); if (!sending.current) onClose(); }}>
      <header className="runner-survey__header">
        <span>FIT Stats <span className="runner-survey__muted">/ Опрос бегунов</span></span>
        <button type="button" className="icon-btn" aria-label="Закрыть анкету" disabled={busy} onClick={onClose}>
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </header>
      <div className="runner-survey__body">
        <div className="runner-survey__intro">
          <span className="runner-survey__eyebrow">ВАШ ОПЫТ ВАЖЕН</span>
          <h1 id="survey-title">{sent ? 'Спасибо за ваши ответы' : 'Каким будет ваш следующий бег?'}</h1>
          {sent ? <p role="status">Анкета отправлена. Вы помогаете нам создать приложение для бегунов.</p> : <>
            <p>Перед вами небольшой опросник. Его цель — оценить, насколько целесообразно приложение для бегунов, и узнать о ваших предпочтениях, пожеланиях и запросах.</p>
            <p>Если у вас есть знакомые, которые занимаются бегом или планируют начать, попросите их также заполнить эту анкету.</p>
            <span className="runner-survey__muted">Опрос добровольный. Все вопросы обязательны, кроме пожеланий.</span>
          </>}
        </div>
        {sent ? <button className="btn btn--primary" onClick={onClose}>Вернуться к трекам</button> :
          <form onSubmit={submit}>
            <fieldset className="runner-survey__fields" disabled={busy}>
              <legend className="runner-survey__section-title">01 / Немного о вас</legend>
              <div className="runner-survey__grid">
                <label>Электронная почта<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
                <label>Как вас зовут<input name="name" autoComplete="given-name" maxLength={80} required /></label>
                <label>Год рождения<input name="birthYear" type="number" inputMode="numeric" min={1900} max={new Date().getFullYear()} required /></label>
              </div>
              {SURVEY_GROUPS.map((group, index) => <div key={group.name}>
                {index === 2 && <>
                  <h2 className="runner-survey__section-title">02 / Ваш бег</h2>
                  <label className="runner-survey__range">Сколько км бегаете в неделю (в среднем)?
                    <output htmlFor="survey-km">{kilometers} км</output>
                    <input id="survey-km" aria-label="Километров в неделю" type="range" min={0} max={200} value={kilometers} onChange={(e) => setKilometers(Number(e.target.value))} />
                    <span className="runner-survey__scale"><span>0 км</span><span>200 км</span></span>
                  </label>
                  <label className="runner-survey__range">Сколько раз в неделю вы бегаете?
                    <output htmlFor="survey-runs">{runs}</output>
                    <input id="survey-runs" aria-label="Пробежек в неделю" type="range" min={1} max={10} value={runs} onChange={(e) => setRuns(Number(e.target.value))} />
                    <span className="runner-survey__scale"><span>1 раз</span><span>10 раз</span></span>
                  </label>
                </>}
                {index === 6 && <h2 className="runner-survey__section-title">03 / Приложение для вас</h2>}
                <fieldset className="runner-survey__question">
                  <legend>{group.title}</legend>
                  {group.name === 'aiCoach' && <p className="runner-survey__muted">Приложение подготовит индивидуальный план с учётом ваших данных, будет сопровождать вас и корректировать тренировки по вашим результатам.</p>}
                  {group.name === 'routes' && <p className="runner-survey__muted">Треки с описаниями и выбором места и расстояния: город, парки, природа, без набора высоты или с горками.</p>}
                  {group.multiple && <p className="runner-survey__muted">Можно выбрать несколько вариантов.</p>}
                  <div className="runner-survey__options">
                    {group.options.map((option) => <label className="runner-survey__option" key={option}>
                      <input type={group.multiple ? 'checkbox' : 'radio'} name={group.name} value={option} required={!group.multiple}
                        onChange={group.name === 'goals' && option === 'Свой вариант' ? (e) => setCustomGoal(e.target.checked) : undefined} />
                      <span>{option}{group.name === 'price' ? ' ₽ / месяц' : ''}</span>
                    </label>)}
                  </div>
                  {group.name === 'goals' && customGoal && <label className="runner-survey__custom">Свой вариант<input name="otherGoal" maxLength={200} required /></label>}
                </fieldset>
              </div>)}
              <label className="runner-survey__custom">Ваши пожелания к такому приложению <span className="runner-survey__muted">(необязательно)</span>
                <textarea name="wishes" rows={5} maxLength={800} placeholder="Чего вам не хватает в приложениях для бега?" />
              </label>
              <div className="runner-survey__consent">
                <p>При отправке ответы анкеты, включая почту, имя, год рождения и пол, будут переданы автору FIT Stats через Firebase в Telegram для изучения спроса на приложение. Файлы треков и GPS-координаты не отправляются.</p>
                <label className="runner-survey__option"><input name="consent" type="checkbox" required /><span>Даю согласие на обработку персональных данных для указанной цели.</span></label>
              </div>
            </fieldset>
            {error && <p className="runner-survey__error" role="alert">{error}</p>}
            <footer className="runner-survey__actions">
              <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Отправляем…' : 'Отправить ответы'}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
              <button className="btn" type="button" disabled={busy} onClick={onClose}>Позже</button>
            </footer>
          </form>}
      </div>
    </dialog>
  );
}
