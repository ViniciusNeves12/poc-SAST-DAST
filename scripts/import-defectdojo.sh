#!/usr/bin/env bash
# Baixa os relatorios da ultima execucao bem-sucedida e importa no DefectDojo local.
# Requisitos: gh CLI autenticado (gh auth login), curl.
# Uso: DOJO_TOKEN=xxxx ./scripts/import-defectdojo.sh <owner>/<repo>
set -euo pipefail

REPO="${1:?Uso: DOJO_TOKEN=xxx ./scripts/import-defectdojo.sh owner/repo}"
DOJO_URL="${DOJO_URL:-http://localhost:8080}"
: "${DOJO_TOKEN:?Defina a variavel DOJO_TOKEN com a API key do DefectDojo}"

RUN_ID=$(gh run list -R "$REPO" -w security.yml -s success -L 1 \
  --json databaseId -q '.[0].databaseId')
echo "Baixando artefatos da execucao $RUN_ID..."
rm -rf reports && gh run download "$RUN_ID" -R "$REPO" -D reports

importar() {
  echo "Importando $2..."
  curl -sf -X POST "$DOJO_URL/api/v2/reimport-scan/" \
    -H "Authorization: Token $DOJO_TOKEN" \
    -F "scan_type=$1" \
    -F "file=@$2" \
    -F "product_type_name=POC DevSecOps" \
    -F "product_name=$REPO" \
    -F "engagement_name=CI/CD" \
    -F "auto_create_context=true" \
    -F "close_old_findings=true" > /dev/null
}

importar "Semgrep JSON Report" reports/semgrep-report/semgrep.json
importar "ZAP Scan"            reports/zap-report/zap-report.xml
echo "Pronto: abra $DOJO_URL e veja o produto $REPO."
