pipeline {
    agent any

    environment {
        COMPOSE_FILE = 'docker-prod-compose.yml'
        APP_NAME = 'remo-api'
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
                                --config auto \
                                --config p/typescript \
                                --config p/nodejs \
                                --config p/owasp-top-ten \
                                --config .semgrep/rules/nestjs.yml \
                                --config .semgrep/rules/nextjs.yml \
                                --json \
                                --output semgrep.json \
                                --no-error \
                                --quiet \
                                src/
                    '''

                    def highCount = sh(
                        script: "grep -o '\"severity\": \"ERROR\"' semgrep.json | wc -l",
                        returnStdout: true
                    ).trim().toInteger()

                    def mediumCount = sh(
                        script: "grep -o '\"severity\": \"WARNING\"' semgrep.json | wc -l",
                        returnStdout: true
                    ).trim().toInteger()

                    echo "SAST результат: HIGH=${highCount}, MEDIUM=${mediumCount}"

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
                    } else if (mediumCount >= 5) {
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
                withCredentials([file(credentialsId: 'remo-api-env', variable: 'API_ENV')]) {
                    sh 'rm -f .env || true'
                    sh 'cp $API_ENV .env'
                }
                script {
                    sh "docker compose -f ${COMPOSE_FILE} build"
                }
            }
        }

        stage('Deploy') {
            steps {
                script {
                    sh "docker compose -f ${COMPOSE_FILE} down"
                    sh "docker rm -f remo-api || true"
                    sh "docker compose -f ${COMPOSE_FILE} up -d"
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
