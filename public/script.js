// script.js
let currentRoom = null;
let mainUserId = 0;
let roomId = 0;
let questionId = 0;
let globalUserCount = 3;
let usersCount = 0;
let passForLoad = false;
let list = [];
let questionSerialNumber = 0;

// Базовый метод выполнения запросов
async function executeQuery(sql, params = []) {
    try {
        const response = await fetch('https://alexcrowd3-anochat-f80f.twc1.net/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                sql: sql.replace(/\n/g, ' '), 
                params: params.map(p => p.toString()) 
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`HTTP error! status: ${response.status}\n${errorData}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Invalid content type: ${contentType}\nResponse: ${text}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Query Error:', {
            sql,
            params,
            error: error.message
        });
        showError(`Database error: ${error.message}`);
        throw error;
    }
}

// Инициализация при загрузке
window.addEventListener('load', async () => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        mainUserId = parseInt(urlParams.get('main_id')) || 0;

        // Очистка предыдущих подключений
        await executeQuery(
            `DELETE FROM user_in_game_room 
             WHERE user_id = ?`,
            [mainUserId]
        );

        // Загрузка баланса пользователя
        if (mainUserId > 0) {
            const result = await executeQuery(
                `SELECT coin_count 
                 FROM users 
                 WHERE id = ?`,
                [mainUserId]
            );
            
            if (result.length > 0) {
                document.getElementById("count").textContent = result[0].coin_count;
            }
        }
    } catch (error) {
        console.error('Initialization error:', error);
    }
});

// Функции интерфейса
function showError(text) {
    const errWindow = document.getElementById("ErrorWindow");
    errWindow.innerHTML = text;
    errWindow.style.transform = 'translateY(0)';
    setTimeout(() => {
        errWindow.style.transform = 'translateY(-60vh)';
    }, 4000);
}

function animateInput(id) {
    const element = document.getElementById(id);
    element.style.animation = 'inpError 0.5s';
    setTimeout(() => element.style.animation = '', 500);
}

// Профиль пользователя
async function getProfil() {
    try {
        if (mainUserId === 0) {
            document.getElementById("profilWindow").innerHTML = `
                <p onclick="hideProfil()">Скрыть</p>
                <img src="img/profil_icon_0.png">
                <p>Для входа используйте Telegram бота</p>`;
        } else {
            const result = await executeQuery(
                `SELECT name, last_name, coin_count, date_of_registration 
                 FROM users 
                 WHERE id = ?`,
                [mainUserId]
            );
            
            const user = result[0];
            document.getElementById("profilWindow").innerHTML = `
                <p onclick="hideProfil()">Скрыть</p>
                <img src="img/profil_icon_1.png">
                <h1>${user.name} ${user.last_name}</h1>
                <p>Баланс: ${user.coin_count} <img src="img/n-coin.svg"></p>
                <p>Регистрация: ${user.date_of_registration}</p>`;
        }
        
        document.getElementById("profilWindow").style.transform = 'translateY(0)';
        document.getElementById("opasity-win").style.transform = 'translateY(0)';
    } catch (error) {
        showError('Ошибка загрузки профиля');
    }
}

// Логика комнат
async function createRoom() {
    try {
        const name = document.getElementById("name").value;
        const pass = document.getElementById("pass").value;
        const count = parseInt(document.getElementById("Player_count").value);
        const mode = document.querySelector('.active').id === 'querAll' ? 2 : 1;

        // Валидация
        if (!name || !pass) {
            if (!name) animateInput('name');
            if (!pass) animateInput('pass');
            return;
        }

        // Проверка существующей комнаты
        const existing = await executeQuery(
            `SELECT id 
             FROM game_room 
             WHERE room_name = ?`,
            [name]
        );

        if (existing.length > 0) {
            showError('Комната с таким именем уже существует!');
            return;
        }

        // Создание комнаты
        const createResult = await executeQuery(
            `INSERT INTO game_room 
                (user_count, room_mode, room_name, room_password) 
             VALUES (?, ?, ?, ?)
             RETURNING id`,
            [count, mode, name, pass]
        );
        
        roomId = createResult[0].id;

        // Создание вопросов для режима ANO
        if (mode === 1) {
            await executeQuery(
                `INSERT INTO questions_in_game_room 
                    (question, room_id, serial_number)
                 SELECT question, ?, 1 
                 FROM questions 
                 ORDER BY RANDOM() 
                 LIMIT ?`,
                [roomId, count]
            );
        }

        // Присоединение к комнате
        await executeQuery(
            `INSERT INTO user_in_game_room 
                (user_id, room_id) 
             VALUES (?, ?)`,
            [mainUserId, roomId]
        );

        // Обновление интерфейса
        document.getElementById("roomGame").style.transform = 'translateY(-100vh)';
        startUserLoading(roomId, count);
    } catch (error) {
        showError(`Ошибка создания комнаты: ${error.message}`);
    }
}

// Загрузка пользователей
async function startUserLoading(roomId, maxUsers) {
    try {
        const interval = setInterval(async () => {
            const users = await executeQuery(
                `SELECT u.id, u.name 
                 FROM user_in_game_room ugr
                 JOIN users u ON ugr.user_id = u.id
                 WHERE ugr.room_id = ?`,
                [roomId]
            );
            
            updateUserList(users);
            
            if (users.length >= maxUsers) {
                clearInterval(interval);
                startGameSession(roomId);
            }
        }, 1000);
    } catch (error) {
        showError(`Ошибка загрузки пользователей: ${error.message}`);
    }
}

function updateUserList(users) {
    const container = document.getElementById("usersInRoom");
    container.innerHTML = users.map(user => `
        <div class="users">
            <img src="img/connect_icon.png">
            <p>${user.name}</p>
        </div>
    `).join('');

    document.getElementById("user_count_in_connect").textContent = 
        `${users.length}/${globalUserCount}`;
}

// Остальные функции остаются аналогичными, но с исправленными запросами
// ...

// Пример исправленного запроса для поиска комнаты
async function searchRoom() {
    try {
        const name = document.getElementById("name1").value;
        const pass = document.getElementById("pass1").value;

        const result = await executeQuery(
            `SELECT id 
             FROM game_room 
             WHERE room_name = ? 
             AND room_password = ?`,
            [name, pass]
        );

        if (result.length === 0) {
            showError('Неверное имя комнаты или пароль');
            return;
        }

        roomId = result[0].id;
        
        await executeQuery(
            `INSERT INTO user_in_game_room 
                (user_id, room_id) 
             VALUES (?, ?)`,
            [mainUserId, roomId]
        );

        startUserLoading(roomId, result[0].user_count);
    } catch (error) {
        showError(`Ошибка входа в комнату: ${error.message}`);
    }
}