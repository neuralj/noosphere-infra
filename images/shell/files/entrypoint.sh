#!/bin/bash
set -e

umask 002

echo "=== Shell Container Startup ==="
echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "User: $(whoami)"
echo "UMASK: $(umask)"

# 修复挂载卷权限（首次运行）
PERMISSION_MARKER="/noosphere/.permissions_fixed"
if [ -d "/noosphere" ] && [ ! -f "$PERMISSION_MARKER" ]; then
    echo "[entrypoint] Fixing /noosphere permissions (first run)..."
    chown -R travis:travis /noosphere
    find /noosphere -type d -exec chmod 775 {} \;
    find /noosphere -type f -exec chmod 664 {} \;
    touch "$PERMISSION_MARKER"
    chown travis:travis "$PERMISSION_MARKER"
    echo "[entrypoint] Permission fix completed"
elif [ -d "/noosphere" ]; then
    echo "[entrypoint] Permissions already fixed"
else
    echo "[entrypoint] /noosphere not found, skipping"
fi

echo "=== Starting supervisord ==="
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
