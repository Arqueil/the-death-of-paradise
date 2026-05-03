const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// База данных
const db = new sqlite3.Database('game.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        nickname TEXT,
        skin_color TEXT DEFAULT '#F2E7CD',
        outline_color TEXT DEFAULT '#3A2E2E',
        height REAL DEFAULT 1.0
    )`);
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// Главная — если не вошёл, то логин
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Редактор
app.get('/editor', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Мир
app.get('/world', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'world.html'));
});

// Регистрация
app.post('/api/register', (req, res) => {
    const { username, password, nickname } = req.body;
    if (!username || !password || !nickname) {
        return res.json({ error: 'Заполни все поля' });
    }
    const hash = bcrypt.hashSync(password, 10);
    db.run(
        'INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)',
        [username, hash, nickname],
        function (err) {
            if (err) return res.json({ error: 'Имя пользователя занято' });
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Вход
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (!user) return res.json({ error: 'Неверный логин или пароль' });
        if (!bcrypt.compareSync(password, user.password)) {
            return res.json({ error: 'Неверный логин или пароль' });
        }
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                nickname: user.nickname,
                skinColor: user.skin_color,
                outlineColor: user.outline_color,
                height: user.height
            }
        });
    });
});

// Сохранение внешности
app.post('/api/save_appearance', (req, res) => {
    const { id, skinColor, outlineColor, height, nickname } = req.body;
    if (!id) return res.json({ error: 'Не авторизован' });
    db.run(
        'UPDATE users SET skin_color = ?, outline_color = ?, height = ?, nickname = ? WHERE id = ?',
        [skinColor, outlineColor, height, nickname, id],
        (err) => {
            if (err) return res.json({ error: 'Ошибка сохранения' });
            res.json({ success: true });
        }
    );
});

// Объекты мира
let objects = [];
app.get('/objects', (req, res) => res.json(objects));

io.on('connection', (socket) => {
    console.log('Игрок зашёл');

    // Чат
    socket.on('chat_message', (data) => {
        io.emit('chat_message', {
            nickname: data.nickname,
            message: data.message,
            time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        });
    });

    // Объекты
    socket.on('place_object', (data) => {
        if (data.password === 'admin123') {
            objects.push({ x: data.x, y: data.y, img: data.img });
            io.emit('update_objects', objects);
        }
    });
    socket.on('request_objects', () => socket.emit('update_objects', objects));
});

server.listen(3000, () => {
    console.log('The Death of Paradise: http://localhost:3000');
});