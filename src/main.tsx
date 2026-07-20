import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// Прогрессивное улучшение: прячем reveal-блоки только если есть JS и нет
// запроса на меньше движения. Класс добавляется до рендера — без мигания.
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('reveal-on');
}

const container = document.getElementById('root') as HTMLElement;
const tree = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (container.hasChildNodes()) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}

// Кэш тайлов карты в браузере — тайлы сохраняются между сессиями и не
// перезагружаются повторно (регистрируем после загрузки, вне гидрации).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
