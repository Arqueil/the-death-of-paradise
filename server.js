const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, 'users.json');

function readUsers() {
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        return [];
    }
}

function writeUsers(users) {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

function findUser(username) {
    return readUsers().find(u => u.username === username);
}

function findUserById(id) {
    return readUsers().find(u => u.id === id);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/editor', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/world', (req, res) => res.sendFile(path.join(__dirname, 'public', 'world.html')));

app.post('/api/register', (req, res) => {
    const { username, password, nickname } = req.body;
    if (!username || !password || !nickname) return res.json({ error: 'Заполни все поля' });
    const users = readUsers();
    if (findUser(username)) return res.json({ error: 'Имя занято' });
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    users.push({
        id,
        username,
        password: bcrypt.hashSync(password, 10),
        nickname,
        skin_color: '#F2E7CD',
        outline_color: '#3A2E2E',
        height: 1.0
    });
    writeUsers(users);
    res.json({ success: true, id });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = findUser(username);
    if (!user || !bcrypt.compareSync(password, user.password)) return res.json({ error: 'Неверный логин или пароль' });
    res.json({ success: true, user: { id: user.id, username: user.username, nickname: user.nickname, skinColor: user.skin_color, outlineColor: user.outline_color, height: user.height } });
});

app.post('/api/save_appearance', (req, res) => {
    const { id, skinColor, outlineColor, height, nickname } = req.body;
    if (!id) return res.json({ error: 'Не авторизован' });
    const users = readUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return res.json({ error: 'Пользователь не найден' });
    users[idx].skin_color = skinColor;
    users[idx].outline_color = outlineColor;
    users[idx].height = height;
    users[idx].nickname = nickname;
    writeUsers(users);
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