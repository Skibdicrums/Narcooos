const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = 3000;

// In-memory storage
const links = {}; // { shortId: { url, logs: [{ip, timestamp}] } }
const users = { admin: 'tard' };

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'dedsecsecretkey',
  resave: false,
  saveUninitialized: false
}));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Better IP detection
function getIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]
         || req.headers['x-real-ip']
         || req.socket.remoteAddress;
}

// Auth middleware
function auth(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/login');
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/shorten', (req, res) => {
  const { url } = req.body;
  const shortId = crypto.randomBytes(3).toString('hex');
  links[shortId] = { url, logs: [] };
  res.send(`
    <p style="color:#0f0;">Short link created: <a href="/${shortId}" style="color:#0ff;">/${shortId}</a></p>
    <p><a href="/" style="color:#0ff;">Create another</a></p>
  `);
});

app.get('/:id', (req, res) => {
  const { id } = req.params;
  const link = links[id];
  if (!link) return res.status(404).send('Link not found');
  const ip = getIP(req);
  link.logs.push({ ip, timestamp: new Date().toISOString() });
  res.redirect(link.url);
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username] === password) {
    req.session.user = username;
    res.redirect('/logs');
  } else {
    res.send('<p style="color:red;">Invalid credentials</p><a href="/login" style="color:#0ff;">Try again</a>');
  }
});

app.get('/logs', auth, (req, res) => {
  let html = `
    <html>
      <head>
        <title>DEDSEC Logs</title>
        <link rel="stylesheet" href="/public/css/style.css">
      </head>
      <body>
        <h1>DEDSEC Tracker Logs</h1>
        <p><a href="/logout" class="button">Logout</a></p>
  `;

  for (const [id, data] of Object.entries(links)) {
    html += `<div class="link-block">/<span class="short">${id}</span> -> ${data.url}</div>`;
    if (data.logs.length === 0) {
      html += '<p class="no-visits">No visits yet.</p>';
    } else {
      html += '<ul>';
      data.logs.forEach(log => {
        html += `<li>${log.ip} @ ${log.timestamp}</li>`;
      });
      html += '</ul>';
    }
  }

  html += '</body></html>';
  res.send(html);
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.listen(PORT, () => console.log(`DEDSEC Grabify running at http://localhost:${PORT}`));