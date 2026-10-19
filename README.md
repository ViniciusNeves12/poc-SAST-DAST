# POC DevSecOps: GitHub + Semgrep + OWASP ZAP + DefectDojo

> ⚠️ A aplicação em `app/` é **propositalmente vulnerável**. Use repositório **privado** e nunca a exponha.

## 1. Subir o DefectDojo local (Docker)
```bash
git clone https://github.com/DefectDojo/django-DefectDojo
cd django-DefectDojo
docker compose up -d
docker compose logs initializer | grep "Admin password:"   # senha do usuário admin
```
Acesse http://localhost:8080 e copie sua API key em http://localhost:8080/api/key-v2.

## 2. Criar o repositório e subir a POC
Dentro da pasta da POC:
```bash
git init -b main && git add . && git commit -m "POC DevSecOps"
gh repo create poc-devsecops --private --source . --push
```
O push na `main` dispara o workflow `security-poc` (aba Actions). Leva alguns minutos; o ZAP é a parte mais lenta.

## 3. Importar os resultados no DefectDojo
```bash
DOJO_TOKEN=<sua_api_key> ./scripts/import-defectdojo.sh <seu_usuario>/poc-devsecops
```
No Windows, rode via WSL ou Git Bash.

## 4. O que esperar
| Vulnerabilidade plantada | Semgrep | ZAP |
|---|---|---|
| Segredo JWT hardcoded | sim | não |
| SQL Injection (`/usuario`, `/login`) | sim | provável |
| XSS refletido (`/ola`) | sim | provável |
| Command injection (`/ping`) | sim | possível |
| Path traversal (`/arquivo`) | sim | possível |
| Cookie sem HttpOnly/SameSite | não | sim |
| Headers ausentes / X-Powered-By | não | sim |

## 5. Testes extras sugeridos
- Corrija uma vulnerabilidade, faça push e reimporte: o finding deve ser fechado automaticamente.
- Marque um achado como falso positivo no DefectDojo e reimporte: ele não deve voltar.
