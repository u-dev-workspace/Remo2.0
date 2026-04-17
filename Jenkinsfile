pipeline {
    agent any

    environment {
        APP_NAME       = 'remo-api'
        STACK_NAME     = 'remo'
        GHCR_IMAGE     = 'ghcr.io/u-dev-workspace/remo-api'
        TELEGRAM_BOT_TOKEN = credentials('telegram-bot-token')
        TELEGRAM_CHAT_ID   = credentials('telegram-chat-id')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test') {
            steps {
                script {
                    try {
                        sh "docker build --target test -t ${APP_NAME}-test ."
                        sh "docker rmi ${APP_NAME}-test || true"
                    } catch (err) {
                        sh "docker rmi ${APP_NAME}-test || true"

                        def text = """❌ Jenkins: тесты упали
Job: ${env.JOB_NAME}
Build: #${env.BUILD_NUMBER}
Stage: Test
URL: ${env.BUILD_URL}"""

                        def safeText = text.replace('"', '\\"')

                        sh """
                          curl -s -X POST "https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/sendMessage" \
                            -d chat_id="\${TELEGRAM_CHAT_ID}" \
                            -d text="${safeText}"
                        """
                        error("Тесты не прошли — деплой отменён")
                    }
                }
            }
        }

        stage('SAST Semgrep') {
            steps {
                script {
                    sh '''
                        docker run --rm \
                            -v "$(pwd):/src" \
                            -w /src \
                            semgrep/semgrep:latest \
                            semgrep scan \
                                --config p/typescript \
                                --config p/nodejs \
                                --config p/owasp-top-ten \
                                --config .semgrep/rules/nestjs.yml \
                                --config .semgrep/rules/nextjs.yml \
                                --json \
                                --output semgrep.json \
                                src/ || true
                    '''

                    def highCount = sh(
                        script: "grep -oE '\"severity\"\\s*:\\s*\"ERROR\"' semgrep.json | wc -l || echo 0",
                        returnStdout: true
                    ).trim().toInteger()

                    def mediumCount = sh(
                        script: "grep -oE '\"severity\"\\s*:\\s*\"WARNING\"' semgrep.json | wc -l || echo 0",
                        returnStdout: true
                    ).trim().toInteger()

                    def totalCount = sh(
                        script: "grep -oE '\"severity\"\\s*:\\s*\"(ERROR|WARNING|INFO)\"' semgrep.json | wc -l || echo 0",
                        returnStdout: true
                    ).trim().toInteger()

                    echo "SAST результат: HIGH(ERROR)=${highCount}, MEDIUM(WARNING)=${mediumCount}, TOTAL=${totalCount}"

                    if (highCount >= 1) {
                        def text = """🔴 SAST: найдено ${highCount} HIGH уязвимостей — деплой заблокирован
Job: ${env.JOB_NAME}
Build: #${env.BUILD_NUMBER}
URL: ${env.BUILD_URL}"""
                        def safeText = text.replace('"', '\\"')
                        sh """
                          curl -s -X POST "https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/sendMessage" \
                            -d chat_id="\${TELEGRAM_CHAT_ID}" \
                            -d text="${safeText}"
                        """
                        error("SAST: найдено ${highCount} HIGH уязвимостей — деплой заблокирован")
                    } else if (mediumCount >= 10) {
                        def text = """🟡 SAST: найдено ${mediumCount} MEDIUM уязвимостей — требуют внимания
Job: ${env.JOB_NAME}
Build: #${env.BUILD_NUMBER}
URL: ${env.BUILD_URL}"""
                        def safeText = text.replace('"', '\\"')
                        sh """
                          curl -s -X POST "https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/sendMessage" \
                            -d chat_id="\${TELEGRAM_CHAT_ID}" \
                            -d text="${safeText}"
                        """
                        unstable("SAST: найдено ${mediumCount} MEDIUM уязвимостей")
                    }
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'semgrep.json', allowEmptyArchive: true
                }
            }
        }

        stage('Build and Push Images') {
            steps {
                // Копируем .env на менеджер (нужен для env_file в stack deploy и для миграций)
                withCredentials([file(credentialsId: 'remo-api-env', variable: 'API_ENV')]) {
                    sh 'rm -f .env || true'
                    sh 'cp $API_ENV .env'
                }
                script {
                    def imageTag = "${GHCR_IMAGE}:${env.BUILD_NUMBER}"

                    // Собираем production-образ
                    sh "docker build -t ${imageTag} -t ${GHCR_IMAGE}:latest ."

                    // Пушим в GitHub Container Registry
                    withCredentials([string(credentialsId: 'ghcr-token', variable: 'GHCR_TOKEN')]) {
                        sh "echo \${GHCR_TOKEN} | docker login ghcr.io -u \$(echo ${GHCR_IMAGE} | cut -d/ -f2) --password-stdin"
                        sh "docker push ${imageTag}"
                        sh "docker push ${GHCR_IMAGE}:latest"
                    }

                    // Сохраняем тег для следующих стейджей
                    env.IMAGE_TAG = imageTag
                }
            }
        }

        stage('Deploy') {
            steps {
                script {
                    // ── Шаг 1: Миграции (один раз, до запуска реплик) ──────────
                    sh """
                        docker run --rm \
                            --env-file .env \
                            --network remo-network \
                            ${env.IMAGE_TAG} \
                            node_modules/.bin/prisma migrate deploy
                    """

                    // ── Шаг 2: Деплой / rolling update Swarm стека ─────────────
                    sh """
                        IMAGE_TAG=${env.IMAGE_TAG} \
                        docker stack deploy \
                            --compose-file docker-stack.yml \
                            --with-registry-auth \
                            --prune \
                            ${STACK_NAME}
                    """

                    // ── Шаг 3: Ждём пока все реплики станут Running ─────────────
                    sh '''
                        echo "Ожидаем сходимости сервиса..."
                        for i in $(seq 1 30); do
                            REPLICAS=$(docker service ls --filter name=remo_app --format "{{.Replicas}}" 2>/dev/null || echo "0/0")
                            RUNNING=$(echo "$REPLICAS" | cut -d/ -f1)
                            DESIRED=$(echo "$REPLICAS" | cut -d/ -f2)
                            echo "  Реплики: $RUNNING/$DESIRED"
                            if [ "$RUNNING" = "$DESIRED" ] && [ "$DESIRED" != "0" ]; then
                                echo "✓ Все $DESIRED реплики запущены"
                                exit 0
                            fi
                            sleep 10
                        done
                        echo "⚠ Таймаут ожидания реплик (5 мин)"
                        docker service ps remo_app --no-trunc
                        exit 1
                    '''
                }
            }
        }

        stage('DAST ZAP') {
            steps {
                script {
                    sh 'mkdir -p zap-reports'
                    sh '''
                        docker run --rm \
                            -v "$(pwd)/zap-reports:/zap/wrk" \
                            ghcr.io/zaproxy/zaproxy:stable \
                            zap-api-scan.py \
                                -t https://remo-api.centi.space/docs/json \
                                -f openapi \
                                -r zap-report.html \
                                -J zap-report.json \
                                -I \
                                -l WARN || true
                    '''

                    def highCount = sh(
                        script: "grep -oE '\"riskdesc\"\\s*:\\s*\"High' zap-reports/zap-report.json | wc -l || echo 0",
                        returnStdout: true
                    ).trim().toInteger()

                    echo "DAST ZAP результат: HIGH=${highCount}"

                    if (highCount >= 1) {
                        def text = """🔴 DAST: найдено ${highCount} HIGH уязвимостей
Job: ${env.JOB_NAME}
Build: #${env.BUILD_NUMBER}
URL: ${env.BUILD_URL}"""
                        def safeText = text.replace('"', '\\"')
                        sh """
                          curl -s -X POST "https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/sendMessage" \
                            -d chat_id="\${TELEGRAM_CHAT_ID}" \
                            -d text="${safeText}"
                        """
                        error("DAST: найдено ${highCount} HIGH уязвимостей")
                    }
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'zap-reports/zap-report.html,zap-reports/zap-report.json', allowEmptyArchive: true
                }
            }
        }
    }

    post {
        failure {
            script {
                def text = """⚠️ Jenkins: сборка упала
Job: ${env.JOB_NAME}
Build: #${env.BUILD_NUMBER}
Status: FAILURE
URL: ${env.BUILD_URL}"""

                def safeText = text.replace('"', '\\"')

                sh """
                  curl -s -X POST "https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/sendMessage" \
                    -d chat_id="\${TELEGRAM_CHAT_ID}" \
                    -d text="${safeText}"
                """
            }
        }

        success {
            script {
                def text = """🟢 Jenkins: сборка успешна
Job: ${env.JOB_NAME}
Build: #${env.BUILD_NUMBER}
Status: SUCCESS
URL: ${env.BUILD_URL}"""

                def safeText = text.replace('"', '\\"')

                sh """
                  curl -s -X POST "https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/sendMessage" \
                    -d chat_id="\${TELEGRAM_CHAT_ID}" \
                    -d text="${safeText}"
                """
            }
        }
    }
}
