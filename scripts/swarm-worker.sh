#!/usr/bin/env bash
# =================================================================
# Подготовка и подключение рабочего узла к Swarm
# Запускать на каждом WORKER-сервере
#
# Использование:
#   bash swarm-worker.sh <MANAGER_IP> <JOIN_TOKEN>
#
# Токен и IP берёшь с менеджера: docker swarm join-token worker
# =================================================================

set -euo pipefail

MANAGER_IP="${1:?Укажи IP менеджера: bash swarm-worker.sh <MANAGER_IP> <TOKEN>}"
JOIN_TOKEN="${2:?Укажи токен: bash swarm-worker.sh <MANAGER_IP> <TOKEN>}"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Docker Swarm Worker — подключение      ║"
echo "╚══════════════════════════════════════════╝"
echo "  Manager: $MANAGER_IP"
echo ""

# ── 1. Установка Docker (если нет) ────────────────────────────
if ! command -v docker &>/dev/null; then
    echo "→ Docker не найден, устанавливаю..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
    usermod -aG docker "${SUDO_USER:-$USER}" 2>/dev/null || true
    echo "✓ Docker установлен"
else
    echo "✓ Docker уже установлен: $(docker --version)"
fi

# ── 2. Подключение к Swarm ─────────────────────────────────────
SWARM_STATE=$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo "inactive")

if [ "$SWARM_STATE" = "active" ]; then
    echo "⚠  Этот узел уже в Swarm-кластере."
    echo "   Для выхода и переподключения: docker swarm leave --force"
    exit 0
fi

echo "→ Подключение к кластеру..."
docker swarm join \
    --token "$JOIN_TOKEN" \
    "${MANAGER_IP}:2377"

echo ""
echo "✓ Узел успешно подключён!"
echo ""
echo "Проверь на менеджере:"
echo "  docker node ls"
