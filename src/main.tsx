import { createRoot } from 'react-dom/client';
import { MetricaExperimentsProvider } from 'yandex-metrica-ab-react';
import { App } from './App';
import { initMetrica } from './metrica';
import './style.css';

const counterId = Number(import.meta.env.VITE_YM_COUNTER_ID);
const configured = Number.isSafeInteger(counterId) && counterId > 0;
const root = createRoot(document.getElementById('root')!);

if (configured) {
  initMetrica(counterId);
  root.render(
    <MetricaExperimentsProvider clientId={`metrika.${counterId}`}>
      <App counterId={counterId} />
    </MetricaExperimentsProvider>,
  );
} else {
  root.render(
    <main>
      <h1>React · Varioqub</h1>
      <section>
        <h2>Указать личный счётчик</h2>
        <p>Создайте <code>.env.local</code> по примеру <code>.env.example</code> и задайте номер в <code>VITE_YM_COUNTER_ID</code>.</p>
        <p>Затем перезапустите dev-сервер. Для опубликованной страницы повторите сборку и публикацию.</p>
      </section>
    </main>,
  );
}
