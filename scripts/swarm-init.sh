#!/usr/bin/env bash
# =================================================================
# Инициализация Docker Swarm кластера
# Запускать ТОЛЬКО на узле-менеджере (обычно это Jenkins-сервер)
#
# Использование:
#   chmod +x scripts/swarm-init.sh
#   bash scripts/swarm-init.sh
# =================================================================

set -euo pipefail

NETWORK_NAME="remo-swarm"
MANAGER_IP="${SWARM_ADVERTISE_ADDR:-$(hostname -I | awk '{print $1}')}"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     Docker Swarm Init — remo cluster     ║"
echo "╚══════════════════════════════════════════╝"
echo "  Manager IP: $MANAGER_IP"
echo ""

# ── 1. Инициализация Swarm ─────────────────────────────────────
SWARM_STATE=$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo "inactive")

if [ "$SWARM_STATE" = "active" ]; then
    echo "✓ Swarm уже активен"
else
    echo "→ Инициализация Swarm..."
    docker swarm init --advertise-addr "$MANAGER_IP"
    echo "✓ Swarm инициализирован"
fi

# ── 2. Overlay-сеть ───────────────────────────────────────────
if docker network ls --format '{{.Name}}' | grep -qx "$NETWORK_NAME"; then
    echo "✓ Сеть '$NETWORK_NAME' уже существует"
else
    echo "→ Создание overlay сети '$NETWORK_NAME'..."
    docker network create \
        --driver overlay \
        --attachable \
        "$NETWORK_NAME"
    echo "✓ Сеть создана"
fi

# ── 3. Volumes для мониторинга ─────────────────────────────────
echo "→ Проверка Docker volumes для мониторинга..."
for vol in prometheus-data loki-data grafana-data; do
    if docker volume ls --format '{{.Name}}' | grep -qx "monitoring_${vol}"; then
        echo "  ✓ Volume 'monitoring_${vol}' уже существует"
    else
        echo "  → Volume 'monitoring_${vol}' будет создан при первом deploy"
    fi
done

# ── 4. Токены для подключения узлов ───────────────────────────
echo ""
echo "================================================================"
echo "  ТОКЕНЫ ДЛЯ ПОДКЛЮЧЕНИЯ УЗЛОВ"
echo "  Сохрани их — они понадобятся для worker-серверов"
echo "================================================================"
echo ""
echo "─── Рабочий узел (worker) ───"
echo "Скопируй и выполни на каждом worker-сервере:"
echo ""
docker swarm join-token worker
echo ""
echo "─── Менеджер (manager) ───"
echo "Только если хочешь добавить резервный менеджер:"
echo ""
docker swarm join-token manager
echo ""
echo "================================================================"
echo ""

# ── 4. Текущее состояние кластера ─────────────────────────────
echo "Текущие узлы кластера:"
docker node ls

echo ""
echo "Готово! Теперь:"
echo "  1. Подключи worker-ноды командой выше"
echo "  2. Добавь в Jenkins credentials: ghcr-token (GitHub PAT с write:packages)"
echo "  3. Задай GHCR_IMAGE в Jenkinsfile (строка GHCR_IMAGE = '...')"
echo "  4. Запусти pipeline — он сам задеплоит стек"
echo ""
echo "  5. Для мониторинга (Prometheus + Loki + Grafana):"
echo "     docker stack deploy -c docker-stack-monitoring.yml monitoring"
echo "     → Grafana: http://<MANAGER_IP>:3000  (admin / admin)"
echo "     → Prometheus: http://<MANAGER_IP>:9090"
