pipeline {
    agent any
    options {
        disableConcurrentBuilds()
        skipDefaultCheckout()
    }
    stages {
        stage('Checkout'){
            steps {
                checkout scm
            }
        }
        stage('Prep buildx') {
            when { branch 'master' }
            steps {
                script {
                    env.BUILDX_BUILDER = getBuildxBuilder();
                }
            }
        }
        stage('Test') {
            when {
                branch 'master'
                not { changelog '^skip-tests.*' }
            }
            steps {
                sh '''#!/bin/bash
                    set -euo pipefail
                    docker buildx build --pull --builder "$BUILDX_BUILDER" --target test .
                    '''
            }
        }
        stage('Dockerhub login') {
            when { branch 'master' }
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKERHUB_CREDENTIALS_USR', passwordVariable: 'DOCKERHUB_CREDENTIALS_PSW')]) {
                    sh '''#!/bin/bash
                        set -euo pipefail
                        printf '%s' "$DOCKERHUB_CREDENTIALS_PSW" | docker login --username "$DOCKERHUB_CREDENTIALS_USR" --password-stdin
                    '''
                }
            }
        }
        stage('Build Docker Image') {
            when { branch 'master' }
            steps {
                sh '''#!/bin/bash
                    set -euo pipefail
                    docker buildx build --pull --builder "$BUILDX_BUILDER" --platform linux/arm64,linux/amd64 -t nbr23/tower-duty:latest -t "nbr23/tower-duty:$(git rev-parse --short HEAD)" --push .
                    '''
            }
        }
        stage('Sync github repos') {
            when { branch 'master' }
            steps {
                ghSync()
            }
        }
    }
}
