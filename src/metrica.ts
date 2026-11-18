type MetricaFunction = ((counterId: number, method: string, ...args: unknown[]) => void) & {
  a?: IArguments[];
  l?: number;
};

const metricaWindow = window as Window & { ym?: MetricaFunction };

// React-пакет подключает Varioqub. Счётчик Метрики инициализируется отдельно.
export function initMetrica(counterId: number) {
  if (document.getElementById('personal-metrica-script')) return;
  metricaWindow.ym ??= function () {
    (metricaWindow.ym!.a ??= []).push(arguments);
  } as MetricaFunction;
  metricaWindow.ym.l = Date.now();
  metricaWindow.ym(counterId, 'init', {
    webvisor: false,
    clickmap: false,
    trackLinks: false,
  });
  const script = document.createElement('script');
  script.id = 'personal-metrica-script';
  script.async = true;
  script.src = 'https://mc.yandex.ru/metrika/tag.js';
  script.onerror = () => console.error('Не удалось загрузить Метрику. Проверьте Network и блокировщики.');
  document.head.appendChild(script);
}

export function sendGoal(counterId: number, target: string, params: Record<string, unknown>) {
  metricaWindow.ym?.(counterId, 'reachGoal', target, params);
}
