import { useCallback, useEffect, useRef, useState } from 'react';
import { useExperimentsContext, useFlagContext } from 'yandex-metrica-ab-react';
import { sendGoal } from './metrica';

const FLAG = 'payment_personal_consent';
const TAKE_FIRST_FEATURE_FLAG = true as const;
const FLAG_TIMEOUT_MS = 5000; // Учебная настройка, не требование к рабочей оплате.
type Variant = 'A' | 'B';
type FeatureFlagsMap = { payment_personal_consent: Variant };
type Resolution =
  | { kind: 'loading' }
  | { kind: 'assigned'; variant: Variant }
  | { kind: 'fallback'; reason: string };
type RecordedEvent = { target: string; params: Record<string, unknown> };

export function App({ counterId }: { counterId: number }) {
  // Такой же способ чтения значения, как в ИФЛ.
  const { value } = useFlagContext<FeatureFlagsMap>(FLAG, TAKE_FIRST_FEATURE_FLAG);
  const { ready, flags } = useExperimentsContext<FeatureFlagsMap>();
  const [resolution, setResolution] = useState<Resolution>({ kind: 'loading' });
  const settled = useRef(false);
  const [checked, setChecked] = useState(false);
  const [result, setResult] = useState('');
  const [events, setEvents] = useState<RecordedEvent[]>([]);
  const [renderCheck, setRenderCheck] = useState(0);
  const viewRecorded = useRef(false);
  const pageId = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const eventSequence = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (settled.current) return;
      settled.current = true;
      setResolution({ kind: 'fallback', reason: 'Нет ответа за 5 секунд.' });
    }, FLAG_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready || settled.current) return;
    settled.current = true;
    const values = flags[FLAG];
    if (values?.length === 1 && (value === 'A' || value === 'B')) {
      setResolution({ kind: 'assigned', variant: value });
    } else {
      setResolution({ kind: 'fallback', reason: 'Ожидается один флаг со значением A или B.' });
    }
  }, [ready, flags, value]);

  const record = useCallback((target: string, details: Record<string, unknown>) => {
    if (resolution.kind !== 'assigned') return;
    const params = {
      experiment_id: 'personal-consent-demo',
      variant: resolution.variant,
      event_at: new Date().toISOString(),
      event_id: `${pageId.current}-${++eventSequence.current}`,
      ...details,
    };
    sendGoal(counterId, target, params);
    setEvents(current => [...current, { target, params }]);
  }, [counterId, resolution]);

  useEffect(() => {
    if (resolution.kind !== 'assigned') return;
    const recordView = () => {
      if (viewRecorded.current || document.visibilityState === 'hidden') return;
      viewRecorded.current = true;
      record('ab_payment_consent_view', {
        personal_visible: 1,
        personal_required: Number(resolution.variant === 'B'),
      });
    };
    recordView();
    document.addEventListener('visibilitychange', recordView);
    return () => document.removeEventListener('visibilitychange', recordView);
  }, [record, resolution]);

  const loading = resolution.kind === 'loading';
  const required = resolution.kind !== 'assigned' || resolution.variant === 'B';
  const disabled = loading || (required && !checked);
  const variantLabel = resolution.kind === 'assigned'
    ? resolution.variant
    : resolution.kind === 'loading' ? 'ожидание' : 'вне эксперимента';

  return (
    <main>
      <h1>React · Varioqub</h1>
      <p className="muted">Учебная форма · yandex-metrica-ab-react 1.7.0</p>
      <section>
        <h2>Состояние React-пакета</h2>
        <dl>
          <dt>clientId провайдера</dt><dd><code>metrika.{counterId}</code></dd>
          <dt>ready</dt><dd data-testid="ready">{String(ready)}</dd>
          <dt>useFlagContext → value</dt><dd><code>{value ?? 'undefined'}</code></dd>
          <dt>Применённый вариант</dt><dd data-testid="variant">{variantLabel}</dd>
        </dl>
        {resolution.kind === 'fallback' && <p role="status">{resolution.reason} Учебный резервный режим: отметка обязательна, события A/B не отправляются.</p>}
        <details><summary>Все флаги из контекста</summary><pre>{JSON.stringify(flags, null, 2)}</pre></details>
        <button className="secondary" onClick={() => setRenderCheck(current => current + 1)}>
          Проверить повторный рендер ({renderCheck})
        </button>
      </section>
      <section>
        <h2>Тестовая форма</h2>
        <p>{loading ? 'Ожидается вариант.' : required ? 'Для продолжения нужна отметка.' : 'Можно продолжить без отметки.'}</p>
        <form onSubmit={event => {
          event.preventDefault();
          if (disabled) return;
          record('ab_payment_submit', { personal_checked: Number(checked) });
          setResult(resolution.kind === 'assigned'
            ? 'Вызвано событие попытки оплаты. Настоящий платёж не выполнялся.'
            : 'Проверка пройдена в резервном режиме. Событие A/B не отправлено.');
        }}>
          <label>
            <input type="checkbox" checked={checked} required={required} disabled={loading}
              onChange={event => {
                setChecked(event.target.checked);
                setResult('');
                record('ab_payment_consent_change', { personal_checked: Number(event.target.checked) });
              }} />
            <span>Тестовый чекбокс согласия</span>
          </label>
          <button type="submit" disabled={disabled}>Оплатить (имитация)</button>
        </form>
        <p role="status">{result}</p>
      </section>
      <section>
        <h2>Вызовы Метрики</h2>
        <p className="muted">Получение событий проверяется в отладчике Метрики и отчётах. Здесь показаны вызовы со страницы.</p>
        <pre data-testid="events">{events.length ? events.map(event => JSON.stringify(event, null, 2)).join('\n\n') : 'Пока нет событий.'}</pre>
      </section>
    </main>
  );
}
