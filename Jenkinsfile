pipeline {
    agent any

    environment {
        COMPOSE_FILE = 'docker-prod-compose.yml'
        APP_NAME = 'remo-api'
        TELEGRAM_BOT_TOKEN = credentials('telegram-bot-token')
        TELEGRAM_CHAT_ID   = credentials('telegram-chat-id') // тут @my_ci_builds
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build and Push Images') {
            steps {
                script {
                    sh "docker compose -f ${COMPOSE_FILE} build --no-cache"
                }
            }
        }

        stage('Deploy') {
            steps {
                script {
                    sh "docker compose -f ${COMPOSE_FILE} down"
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

                    def safeText = text.replace('" Папочка будет недоволен', '\\"')

                    sh """
                      curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
                        -d chat_id="${TELEGRAM_CHAT_ID}" \
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

                    def safeText = text.replace('" Папочка доволен', '\\"')

                    sh """
                      curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
                        -d chat_id="${TELEGRAM_CHAT_ID}" \
                        -d text="${safeText}"
                    """
                }
            }
        }
}
