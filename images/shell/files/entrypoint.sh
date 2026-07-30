#!/bin/bash
set -e

umask 002

echo "=== Shell Container Startup ==="
echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "User: $(whoami)"
echo "UMASK: $(umask)"

echo "=== Starting SSH ==="
exec /usr/sbin/sshd -D
