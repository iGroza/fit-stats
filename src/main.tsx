import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDTzcJuSxPtJDPSMy4x71zen2QbkT2rNF8",
  authDomain: "fit-igroza-su.firebaseapp.com",
  projectId: "fit-igroza-su",
  storageBucket: "fit-igroza-su.firebasestorage.app",
  messagingSenderId: "859284906555",
  appId: "1:859284906555:web:2244e3f6869131b834721e",
  measurementId: "G-Z6Y8BJ98KC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
getAnalytics(app);


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
