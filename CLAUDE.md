Контекст проекта:
- Стек: NestJS (backend) + Next.js (frontend)
- CI/CD: Jenkins
- Цель: внедрить SAST через Semgrep

Что уже решено:
- Инструмент: Semgrep (config=auto + p/typescript + p/nodejs + p/owasp-top-ten)
- Jenkins плагины: Warnings Next Generation + HTML Publisher
- Отчёты: SARIF + JSON + HTML через publishHTML и recordIssues
- Пороги: 1 HIGH = FAILED, 5+ MEDIUM = UNSTABLE
- Semgrep запускается в Docker-образе semgrep/semgrep:latest
- --no-error флаг, блокировка через qualityGates в recordIssues

Jenkinsfile уже написан со следующей структурой:
- stage Checkout
- stage SAST Semgrep (docker agent, semgrep ci, post always с recordIssues + publishHTML + archiveArtifacts)
- post failure/unstable с echo

Файлы в корне репо:
- Jenkinsfile
- .semgrepignore (node_modules, .next, dist, build, coverage)

Задачи на продолжение:
1. Создай .semgrep/rules/ с кастомными правилами для NestJS: отсутствие @UseGuards на контроллерах, небезопасный @Public(), отсутствие ValidationPipe
2. Создай кастомные правила для Next.js: dangerouslySetInnerHTML с переменной, eval(), document.write()
3. Добавь pre-commit хук через lefthook или husky — локальный запуск semgrep до коммита
4. Проверь Jenkinsfile на ошибки и предложи улучшения

