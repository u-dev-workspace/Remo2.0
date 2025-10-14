pipeline {
    agent any

    environment {
        COMPOSE_FILE = 'docker-prod-compose.yml'
        APP_NAME = 'remo-api'
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
            echo "Deploy failed!"
        }
        success {
            echo "Deploy successful!"
        }
    }
}
