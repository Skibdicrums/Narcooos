const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// In-memory storage
const links = {};
const users = { admin: 'tard' };

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'dedsecsecret',
  resave: false,
  saveUninitialized: false
}));

function getIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]
         || req.headers['x-real-ip']
         || req.socket.remoteAddress;
}

function auth(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/login');
}

// Serve homepage
app.get('/', (req, res) => {
  res.send(`
  <html><head><title>DEDSEC Tracker</title>
  <style>
    body { background:#0a0a0a; color:#0f0; font-family:monospace; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; }
    input, button { padding:10px; margin:5px; border:none; border-radius:5px; background:#111; color:#0f0; }
    button { background:#0ff; color:#000; cursor:pointer; }
    button:hover { background:#0f0; }
    a { color:#0ff; text-decoration:none; }
  </style>
  </head>
  <body>
    <h1>DEDSEC Tracker</h1>
    <form method="POST" action="/shorten">
      <input name="url" placeholder="Enter URL" required/>
      <button type="submit">Generate Short Link</button>
    </form>
    <p><a href="/login">Admin Login</a></p>
  </body></html>`);
});

// Shorten URL
app.post('/shorten', (req, res) => {
  const { url } = req.body;
  const shortId = crypto.randomBytes(3).toString('hex');
  links[shortId] = { url, logs: [] };
  res.send(`<p>Short link: <a href="/${shortId}" style="color:#0ff;">/${shortId}</a></p><p><a href="/">Create another</a></p>`);
});

// Redirect short link + log
app.get('/:id', (req, res) => {
  const { id } = req.params;
  const link = links[id];
  if(!link) return res.status(404).send('Link not found');
  const ip = getIP(req);
  link.logs.push({ ip, timestamp: new Date().toISOString() });
  res.redirect(link.url);
});

// Login page
app.get('/login', (req, res) => {
  res.send(`
  <html><head><title>Login</title>
  <style>
    body { background:#0a0a0a; color:#0f0; font-family:monospace; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; }
    input, button { padding:10px; margin:5px; border:none; border-radius:5px; background:#111; color:#0f0; }
    button { background:#0ff; color:#000; cursor:pointer; }
  </style>
  </head>
  <body>
    <h1>Login</h1>
    <form method="POST" action="/login">
      <input name="username" placeholder="Username" required/>
      <input name="password" type="password" placeholder="Password" required/>
      <button type="submit">Login</button>
    </form>
  </body></html>`);
});

// Handle login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if(users[username] && users[username] === password){
    req.session.user = username;
    res.redirect('/logs');
  } else {
    res.send('<p style="color:red;">Invalid credentials</p><a href="/login" style="color:#0ff;">Try again</a>');
  }
});

// Logs page
app.get('/logs', auth, (req, res) => {
  let html = `<html><head><title>DEDSEC Logs</title>
  <style>
    body { background:#0a0a0a; color:#0f0; font-family:monospace; padding:20px; }
    a { color:#0ff; text-decoration:none; }
    h1 { color:#0ff; }
    ul { list-style:none; padding-left:0; }
  </style>
  </head><body>
    <h1>DEDSEC Tracker Logs</h1>
    <p><a href="/login">Logout</a></p>`;

  for(const [id, data] of Object.entries(links)){
    html += `<div>/${id} -> ${data.url}</div>`;
    if(data.logs.length === 0) html += '<p>No visits yet</p>';
    else html += `<ul>${data.logs.map(l=>`<li>${l.ip} @ ${l.timestamp}</li>`).join('')}</ul>`;
  }

  html += '</body></html>';
  res.send(html);
});

// Start server
app.listen(PORT, ()=>console.log(`DEDSEC Grabify running on http://localhost:${PORT}`));