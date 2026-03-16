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
