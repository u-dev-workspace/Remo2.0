import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js';

// ── Кастомные метрики ──────────────────────────────────────────
const errorRate = new Rate('errors');
const healthDuration = new Trend('health_duration', true);
const projectsDuration = new Trend('projects_duration', true);
const searchDuration = new Trend('search_duration', true);

// ── Конфигурация нагрузки ──────────────────────────────────────
export const options = {
  stages: [
    { duration: '30s', target: 50 },     // Разогрев: 0 → 50
    { duration: '1m',  target: 200 },    // Рост: 50 → 200
    { duration: '2m',  target: 500 },    // Серьёзная нагрузка: 500 юзеров
    { duration: '2m',  target: 500 },    // Удержание пика
    { duration: '1m',  target: 1000 },   // Стресс: 1000 юзеров
    { duration: '1m',  target: 1000 },   // Удержание стресса
    { duration: '30s', target: 0 },      // Остывание
  ],

  thresholds: {
    http_req_duration: [
      'p(50)<200',      // 50% запросов < 200ms
      'p(95)<500',      // 95% запросов < 500ms
      'p(99)<1000',     // 99% запросов < 1s
    ],
    http_req_failed: ['rate<0.01'],    // < 1% ошибок
    errors: ['rate<0.05'],              // < 5% ошибок в кастомной метрике
  },
};

// ── Базовый URL ────────────────────────────────────────────────
const BASE = __ENV.BASE_URL || 'https://remo-api.centi.space';
const TOKEN = __ENV.AUTH_TOKEN || '';

const headers = TOKEN
  ? { Authorization: `Bearer ${TOKEN}` }
  : {};

// ── Сценарий нагрузки ──────────────────────────────────────────
export default function () {

  // 1. Health Check (всегда доступен)
  group('Health Check', () => {
    const res = http.get(`${BASE}/health`);
    const ok = check(res, {
      'health: status 200': (r) => r.status === 200,
      'health: has status field': (r) => {
        try { return JSON.parse(r.body).status === 'ok'; }
        catch { return false; }
      },
      'health: response < 100ms': (r) => r.timings.duration < 100,
    });
    errorRate.add(!ok);
    healthDuration.add(res.timings.duration);
  });

  sleep(0.3);

  // 2. Список проектов (публичный)
  group('Projects List', () => {
    const res = http.get(`${BASE}/projects`, { headers });
    const ok = check(res, {
      'projects: status 200': (r) => r.status === 200,
      'projects: response < 500ms': (r) => r.timings.duration < 500,
    });
    errorRate.add(!ok);
    projectsDuration.add(res.timings.duration);
  });

  sleep(0.3);

  // 3. Поиск (публичный)
  group('Search', () => {
    const res = http.get(`${BASE}/search/projects?query=ремонт`, { headers });
    const ok = check(res, {
      'search: status 2xx': (r) => r.status >= 200 && r.status < 300,
      'search: response < 500ms': (r) => r.timings.duration < 500,
    });
    errorRate.add(!ok);
    searchDuration.add(res.timings.duration);
  });

  sleep(0.3);

  // 4. Категории
  group('Categories', () => {
    const res = http.get(`${BASE}/categories`, { headers });
    check(res, {
      'categories: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.5);

  // 5. Swagger Docs (проверка что API жив)
  group('Swagger JSON', () => {
    const res = http.get(`${BASE}/docs/json`);
    check(res, {
      'swagger: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.5);
}

// ── Генерация отчётов ──────────────────────────────────────────
export function handleSummary(data) {
  const now = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

  return {
    // HTML-отчёт (красивый, с графиками)
    [`reports/loadtest-${now}.html`]: htmlReport(data),

    // JSON-отчёт (для автоматизации / CI)
    [`reports/loadtest-${now}.json`]: JSON.stringify(data, null, 2),

    // Консольный вывод (сразу видишь результат)
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}
