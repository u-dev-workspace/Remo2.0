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

        stage('Healthcheck') {
            steps {
                sh "curl -f http://localhost:3005/docs || exit 1"
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
