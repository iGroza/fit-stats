import { useCallback, useEffect, useMemo, useState } from 'react';
import { VirtualList } from '../common/VirtualList';
import { useI18n, sportLabel } from '../../i18n';
import type { SavedTrackMeta } from '../../fit/storage';
import { useTracks } from '../../state/TracksContext';

const HISTORY_ROW = 64;
const VIRTUAL_THRESHOLD = 40;

const scrollToTracks = () => {
  // Дать React дорисовать секцию #tracks, затем плавно проскроллить.
  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      document.getElementById('tracks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  });
};

/**
 * История загрузок (IndexedDB): кнопка в hero открывает модалку со списком,
 * поиском, чекбоксами и массовыми действиями. Без выбора кнопки действуют
 * на всю историю («все»), с выбором — только на отмеченные треки.
 */
export const History = () => {
  const { t, fmt } = useI18n();
  const {
    history,
    tracks,
    busyCount,
    addFromHistory,
    addManyFromHistory,
    deleteFromHistory,
    deleteManyFromHistory,
  } = useTracks();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        sportLabel(t, h.sport).toLowerCase().includes(q) ||
        fmt.day(h.startTime).toLowerCase().includes(q)
    );
  }, [history, query, t, fmt]);

  // Esc закрывает модалку, скролл страницы блокируется.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  // Загрузка через dropzone/файл — модалку истории не держим открытой.
  useEffect(() => {
    if (busyCount > 0) setOpen(false);
  }, [busyCount]);

  // Выбор не должен ссылаться на удалённые записи.
  useEffect(() => {
    setSelected((prev) => {
      const alive = new Set([...prev].filter((id) => history.some((h) => h.id === id)));
      return alive.size === prev.size ? prev : alive;
    });
  }, [history]);

  const inAnalysis = useMemo(() => new Set(tracks.map((tr) => tr.sourceId)), [tracks]);

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const closeAndGo = useCallback(() => {
    setOpen(false);
    setSelected(new Set());
    scrollToTracks();
  }, []);

  const onAddOne = useCallback(
    (id: string) => {
      addFromHistory(id);
      closeAndGo();
    },
    [addFromHistory, closeAndGo]
  );

  const onAddMany = useCallback(() => {
    const selectedIds = [...selected];
    const hasSelection = selected.size > 0;
    addManyFromHistory(hasSelection ? selectedIds : []);
    closeAndGo();
  }, [addManyFromHistory, selected, closeAndGo]);

  if (!history.length) return null;

  const selectedIds = [...selected];
  const hasSelection = selected.size > 0;
  const allFilteredSelected = filtered.length > 0 && filtered.every((h) => selected.has(h.id));
  const allAdded = (hasSelection ? history.filter((h) => selected.has(h.id)) : history).every((h) =>
    inAnalysis.has(h.id)
  );

  const toggleAll = () =>
    setSelected((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        for (const h of filtered) next.delete(h.id);
        return next;
      }
      return new Set([...prev, ...filtered.map((h) => h.id)]);
    });

  const useVirtual = filtered.length >= VIRTUAL_THRESHOLD;
  const listHeight = Math.min(420, Math.max(200, filtered.length * HISTORY_ROW));

  const renderItem = (h: SavedTrackMeta) => {
    const added = inAnalysis.has(h.id);
    return (
      <div className={`history__item${selected.has(h.id) ? ' is-selected' : ''}`}>
        <label className="check" aria-label={t.history.selectAria(h.name)}>
          <input type="checkbox" checked={selected.has(h.id)} onChange={() => toggleOne(h.id)} />
          <span className="check__box" aria-hidden="true">
            <i className="fa-solid fa-check" />
          </span>
        </label>
        <span className="history__item-meta">
          <b>{h.name.replace(/\.(fit|gpx)$/i, '')}</b>
          <small>
            {sportLabel(t, h.sport)} · {fmt.day(h.startTime)} · {fmt.distance(h.distance)} ·{' '}
            {fmt.duration(h.moving)}
          </small>
        </span>
        <button
          type="button"
          className={`btn btn--ghost btn--xs${added ? ' is-added' : ''}`}
          disabled={added}
          onClick={() => onAddOne(h.id)}
        >
          {added ? (
            <>
              <i className="fa-solid fa-check" aria-hidden="true" /> {t.history.added}
            </>
          ) : (
            <>
              <i className="fa-solid fa-plus" aria-hidden="true" /> {t.history.add}
            </>
          )}
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--danger"
          title={t.history.deleteTitle}
          aria-label={`${t.history.deleteTitle}: ${h.name}`}
          onClick={() => deleteFromHistory(h.id)}
        >
          <i className="fa-solid fa-trash-can" aria-hidden="true" />
        </button>
      </div>
    );
  };

  return (
    <>
      <button type="button" className="btn btn--ghost history-open" onClick={() => setOpen(true)}>
        <i className="fa-solid fa-clock-rotate-left" style={{ color: '#a78bfa' }} aria-hidden="true" />
        {t.history.open(history.length)}
      </button>

      {open && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={t.history.title}>
          <div className="modal__backdrop" onClick={() => setOpen(false)} />
          <div className="modal__panel glass">
            <div className="modal__head">
              <span className="modal__icon" aria-hidden="true" style={{ color: '#a78bfa' }}>
                <i className="fa-solid fa-clock-rotate-left" />
              </span>
              <div className="modal__titles">
                <b>{t.history.title}</b>
                <small>{t.history.subtitle}</small>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label={t.history.close}
                onClick={() => setOpen(false)}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="history__toolbar">
              <label className="check history__select-all">
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} />
                <span className="check__box" aria-hidden="true">
                  <i className="fa-solid fa-check" />
                </span>
                {t.history.selectAll}
              </label>
              <div className="history__search">
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                <input
                  type="search"
                  placeholder={t.history.searchPlaceholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label={t.history.searchAria}
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="history__empty">{t.history.empty}</div>
            ) : useVirtual ? (
              <VirtualList
                className="history__list history__list--virtual"
                items={filtered}
                estimateSize={HISTORY_ROW}
                height={listHeight}
                getKey={(h) => h.id}
                renderItem={renderItem}
                ariaLabel={t.history.title}
              />
            ) : (
              <ul className="history__list">
                {filtered.map((h) => (
                  <li key={h.id}>{renderItem(h)}</li>
                ))}
              </ul>
            )}

            <div className="modal__footer">
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={allAdded}
                onClick={onAddMany}
              >
                <i className="fa-solid fa-layer-group" aria-hidden="true" />
                {hasSelection ? t.history.addSelected(selected.size) : t.history.addAll}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm modal__danger"
                onClick={() => {
                  const msg = hasSelection
                    ? t.history.deleteSelectedConfirm(selected.size)
                    : t.history.deleteAllConfirm;
                  if (window.confirm(msg)) {
                    deleteManyFromHistory(hasSelection ? selectedIds : []);
                    if (!hasSelection) setOpen(false);
                  }
                }}
              >
                <i className="fa-solid fa-trash-can" aria-hidden="true" />
                {hasSelection ? t.history.deleteSelected(selected.size) : t.history.deleteAll}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
