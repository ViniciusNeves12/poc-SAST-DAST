// =====================================================================
// APLICACAO PROPOSITALMENTE VULNERAVEL - USO EXCLUSIVO EM POC
// Nao publicar, nao expor na internet, nao reaproveitar este codigo.
// =====================================================================
const express = require('express');
const jwt = require('jsonwebtoken');
const { exec } = require('child_process');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const app = express();
app.use(express.urlencoded({ extended: false }));

// [VULN 1] Segredo hardcoded no codigo
const JWT_SECRET = 'segredo-super-secreto-123';

const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE usuarios (id INTEGER PRIMARY KEY, nome TEXT, email TEXT, senha TEXT);
  INSERT INTO usuarios (nome, email, senha) VALUES
    ('Ana', 'ana@exemplo.com', '123456'),
    ('Bruno', 'bruno@exemplo.com', 'senha');
`);

// Pagina inicial com links para o spider do ZAP descobrir os endpoints
app.get('/', (req, res) => {
  res.send(`<html><head><title>POC DevSecOps</title></head><body>
    <h1>Servidorzinho da POC</h1>
    <ul>
      <li><a href="/usuario?id=1">Buscar usuario</a></li>
      <li><a href="/ola?nome=visitante">Saudacao</a></li>
      <li><a href="/ping?host=127.0.0.1">Ping</a></li>
      <li><a href="/arquivo?nome=leiame.txt">Arquivo</a></li>
    </ul>
    <form method="post" action="/login">
      <input name="email" value="ana@exemplo.com">
      <input name="senha" type="password" value="123456">
      <button type="submit">Entrar</button>
    </form>
  </body></html>`);
});

app.get('/health', (req, res) => res.send('ok'));

// [VULN 2] SQL Injection + vazamento de mensagem de erro
app.get('/usuario', (req, res) => {
  const query = 'SELECT id, nome, email FROM usuarios WHERE id = ' + req.query.id;
  try {
    res.json(db.prepare(query).all());
  } catch (err) {
    res.status(500).send('Erro no banco: ' + err.message);
  }
});

// [VULN 3] XSS refletido
app.get('/ola', (req, res) => {
  res.send(`<h1>Ola, ${req.query.nome}!</h1>`);
});

// [VULN 4] Command injection
app.get('/ping', (req, res) => {
  exec(`ping -c 1 ${req.query.host}`, (err, stdout, stderr) => {
    res.type('text/plain').send(stdout + stderr);
  });
});

// [VULN 5] Path traversal
app.get('/arquivo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', req.query.nome));
});

// [VULN 6] SQL Injection no login + cookie sem HttpOnly/Secure/SameSite
app.post('/login', (req, res) => {
  const { email, senha } = req.body;
  const sql = "SELECT * FROM usuarios WHERE email = '" + email + "' AND senha = '" + senha + "'";
  const user = db.prepare(sql).get();
  if (!user) return res.status(401).send('Credenciais invalidas');
  const token = jwt.sign({ id: user.id, nome: user.nome }, JWT_SECRET);
  res.cookie('session', token);
  res.send(`Bem-vindo, ${user.nome}`);
});

// [VULN 7] Sem headers de seguranca (CSP, HSTS, X-Frame-Options) e com X-Powered-By exposto
app.listen(3000, () => console.log('POC rodando em http://localhost:3000'));
