#!/bin/bash
set -e

# 设置 umask，确保新创建的文件有正确的权限
umask 002

echo "=== Devshell Container Startup ==="
echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "User: $(whoami)"
echo "UMASK: $(umask)"

# 修复挂载卷的权限（只在第一次运行时执行）
PERMISSION_MARKER="/noosphere/.permissions_fixed"
if [ -d "/noosphere" ] && [ ! -f "$PERMISSION_MARKER" ]; then
    echo "[entrypoint] Fixing /noosphere permissions (first run)..."
    
    # 递归修改所有权为 travis:noosphere
    chown -R travis:noosphere /noosphere
    echo "[entrypoint] Changed ownership to travis:noosphere"
    
    # 设置 setgid 位，确保新目录继承组权限
    find /noosphere -type d -exec chmod g+s {} \;
    echo "[entrypoint] Set setgid bit on directories"
    
    # 确保目录可写 (775: rwxrwxr-x)
    find /noosphere -type d -exec chmod 775 {} \;
    echo "[entrypoint] Set directory permissions to 775"
    
    # 确保文件可写 (664: rw-rw-r--)
    find /noosphere -type f -exec chmod 664 {} \;
    echo "[entrypoint] Set file permissions to 664"
    
    # 创建标记文件，避免下次重复执行
    touch "$PERMISSION_MARKER"
    chown travis:noosphere "$PERMISSION_MARKER"
    echo "[entrypoint] Permission fix completed"
elif [ -d "/noosphere" ]; then
    echo "[entrypoint] Permissions already fixed, skipping..."
else
    echo "[entrypoint] /noosphere directory not found, skipping permission fix"
fi

echo "=== Starting supervisord ==="
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
