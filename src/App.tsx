import { Nav } from './components/layout/Nav';
import { Footer } from './components/layout/Footer';
import { AuroraBackground } from './components/common/AuroraBackground';
import { HintLayer } from './components/common/HintLayer';
import { ToastProvider } from './components/common/Toast';
import { TopGithub } from './components/layout/TopGithub';
import { HomePage } from './pages/HomePage';
import { LocaleProvider } from './i18n';
import { TracksProvider } from './state/TracksContext';

export default function App() {
  return (
    <LocaleProvider>
      <ToastProvider>
        <TracksProvider>
          <div className="app-shell">
            <AuroraBackground />
            <TopGithub />
            <Nav />
            <main>
              <HomePage />
            </main>
            <Footer />
            <HintLayer />
          </div>
        </TracksProvider>
      </ToastProvider>
    </LocaleProvider>
  );
}
