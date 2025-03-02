const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

app.use(express.json());

const db = new sqlite3.Database('./data.sqlite3', (err) => {
    if (err) {
        console.error('Ошибка при подключении к базе данных:', err.message);
    } else {
        console.log('Подключение к базе данных успешно!');
    }
});

app.get('/profil', (req, res) => {
    db.all('SELECT * FROM users', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post('/query', (req, res) => {
    const { sql, params } = req.body;

    if (!sql || typeof sql !== 'string') {
        return res.status(400).json({ error: 'Неверный формат SQL-запроса' });
    }
    db.all(sql, params || [], (err, rows) => {
        if (err) {
            console.error('Ошибка при выполнении запроса:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.use(express.static(path.join('public')));

app.get('/', (req, res) => {
    res.sendFile(path.join('public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Сервер запущен успешно!`);
});