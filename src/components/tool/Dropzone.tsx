import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { TRACK_FILE_RE } from '../../fit/parseTrack';
import { useI18n } from '../../i18n';

interface DropzoneProps {
  /** Обработчик выбранных файлов (массовая загрузка). */
  onFiles: (files: File[]) => void;
  /** Сколько файлов сейчас парсится. */
  busyCount: number;
}

const pickFitFiles = (list: FileList | null): File[] =>
  Array.from(list ?? []).filter((f) => TRACK_FILE_RE.test(f.name));

/** Зона массовой загрузки .fit/.gpx: drag&drop + выбор через диалог. */
export const Dropzone = ({ onFiles, busyCount }: DropzoneProps) => {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = pickFitFiles(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  return (
    <div
      className={`dropzone glass${dragOver ? ' is-dragover' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
      aria-label={t.dropzone.aria}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".fit,.gpx"
        multiple
        hidden
        onChange={(e) => {
          const files = pickFitFiles(e.target.files);
          if (files.length) onFiles(files);
          e.target.value = '';
        }}
      />
      <span className="dropzone__icon" aria-hidden="true">
        <i className={`fa-solid ${busyCount > 0 ? 'fa-spinner fa-spin' : 'fa-file-arrow-up'}`} />
      </span>
      <div className="dropzone__text">
        <b>{busyCount > 0 ? t.dropzone.busy(busyCount) : t.dropzone.title}</b>
        <span>{t.dropzone.subtitle}</span>
      </div>
      <span className="btn btn--primary btn--sm dropzone__btn">
        {t.dropzone.choose}
        <i className="fa-solid fa-arrow-right" aria-hidden="true" />
      </span>
    </div>
  );
};
