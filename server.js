const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, 'users.json');
const RESET_FILE = path.join(__dirname, 'resets.json');

function readJSON(file) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) { return []; }
}
function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

// Регистрация (ник не обязателен)
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ error: 'Логин и пароль обязательны' });
    if (password.length < 3) return res.json({ error: 'Пароль от 3 символов' });
    const users = readJSON(DB_FILE);
    if (users.find(u => u.username === username)) return res.json({ error: 'Логин занят' });
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    users.push({
        id,
        username,
        password: bcrypt.hashSync(password, 10),
        nickname: username,
        skin_color: '#F2E7CD',
        outline_color: '#3A2E2E',
        shorts_color: '#34292E',
        shorts_outline_color: '#34292E',
        height: 1.0
    });
    writeJSON(DB_FILE, users);
    res.json({ success: true, id });
});

// Вход
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ error: 'Введи логин и пароль' });
    const user = readJSON(DB_FILE).find(u => u.username === username);
    if (!user || !bcrypt.compareSync(password, user.password)) return res.json({ error: 'Неверный логин или пароль' });
    res.json({ success: true, user: { id: user.id, username: user.username, nickname: user.nickname, skinColor: user.skin_color, outlineColor: user.outline_color, shortsColor: user.shorts_color, shortsOutlineColor: user.shorts_outline_color, height: user.height } });
});

// Запрос сброса пароля
app.post('/api/forgot', (req, res) => {
    const { username } = req.body;
    if (!username) return res.json({ error: 'Введи логин' });
    const users = readJSON(DB_FILE);
    const user = users.find(u => u.username === username);
    if (!user) return res.json({ error: 'Пользователь не найден' });
    const token = crypto.randomBytes(4).toString('hex');
    const resets = readJSON(RESET_FILE);
    resets.push({ username, token, created: Date.now() });
    writeJSON(RESET_FILE, resets);
    res.json({ success: true, token });
});

// Сброс пароля
app.post('/api/reset', (req, res) => {
    const { username, token, newPassword } = req.body;
    if (!username || !token || !newPassword) return res.json({ error: 'Заполни все поля' });
    if (newPassword.length < 3) return res.json({ error: 'Пароль от 3 символов' });
    const resets = readJSON(RESET_FILE);
    const found = resets.find(r => r.username === username && r.token === token);
    if (!found) return res.json({ error: 'Неверный код' });
    if (Date.now() - found.created > 3600000) return res.json({ error: 'Код истёк (1 час)' });
    const users = readJSON(DB_FILE);
    const idx = users.findIndex(u => u.username === username);
    if (idx === -1) return res.json({ error: 'Пользователь не найден' });
    users[idx].password = bcrypt.hashSync(newPassword, 10);
    writeJSON(DB_FILE, users);
    writeJSON(RESET_FILE, resets.filter(r => !(r.username === username && r.token === token)));
    res.json({ success: true });
});

// Сохранение внешности
app.post('/api/save_appearance', (req, res) => {
    const { id, skinColor, outlineColor, shortsColor, shortsOutlineColor, height, nickname } = req.body;
    if (!id) return res.json({ error: 'Не авторизован' });
    const users = readJSON(DB_FILE);
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return res.json({ error: 'Пользователь не найден' });
    if (skinColor) users[idx].skin_color = skinColor;
    if (outlineColor) users[idx].outline_color = outlineColor;
    if (shortsColor) users[idx].shorts_color = shortsColor;
    if (shortsOutlineColor) users[idx].shorts_outline_color = shortsOutlineColor;
    if (height) users[idx].height = height;
    if (nickname) users[idx].nickname = nickname;
    writeJSON(DB_FILE, users);
    res.json({ success: true });
});

let objects = [];
app.get('/objects', (req, res) => res.json(objects));

io.on('connection', (socket) => {
    console.log('Игрок зашёл');
    socket.on('chat_message', (data) => io.emit('chat_message', { nickname: data.nickname, message: data.message, time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }));
    socket.on('place_object', (data) => {
        if (data.password === 'admin123') { objects.push({ x: data.x, y: data.y, img: data.img }); io.emit('update_objects', objects); }
    });
    socket.on('request_objects', () => socket.emit('update_objects', objects));
});

server.listen(3000, () => console.log('The Death of Paradise: http://localhost:3000'));