#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

echo "==> Instalando dependencias Python..."
pip install --ignore-installed -r requirements.txt

echo "==> Instalando flake8 para linting..."
pip install --ignore-installed flake8

echo "==> Dependencias instaladas correctamente."
