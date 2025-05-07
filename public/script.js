let currentRoom = null;
let mainUserId = 0;
let roomId = 0;
let questionId = 0;
let globalUserCount = 3;
let usersCount = 0;
let passForLoad = false;
let list = [];
let questionSerialNumber = 0;

// Основные функции
async function executeQuery(sql, params = []) {
    try {
        const response = await fetch('https://alexcrowd3-anochat-f80f.twc1.net/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql, params })
        });

        if (!response.ok) throw new Error('Ошибка сервера');
        return await response.json();
    } catch (error) {
        console.error('Ошибка запроса:', error);
        showError(error.message);
        throw error;
    }
}

function showError(text) {
    const errWindow = document.getElementById("ErrorWindow");
    errWindow.innerHTML = text;
    errWindow.style.transform = 'translateY(0)';
    setTimeout(() => errWindow.style.transform = 'translateY(-60vh)', 4000);
}

// Обработчики интерфейса
function sendReviewAnimate() {
    document.getElementById("onclickReviewWindow").style.transform = 'translateY(0)';
    document.getElementById("opasity-win").style.transform = 'translateY(0)';
}

function hideReviewAnimate() {
    document.getElementById("onclickReviewWindow").style.transform = 'translateY(+350px)';
    document.getElementById("opasity-win").style.transform = 'translateY(+100vh)';
}

function getProfil() {
    if (mainUserId === 0) {
        document.getElementById("profilWindow").innerHTML = `
            <p id="but-hide" onclick="hideProfil()">Скрыть</p>
            <img src="img/profil_icon_0.png" alt="" style="height: 150px;">
            <p style="color: #6D6D6D; margin-top: 30px;">
                Для входа в аккаунт<br>
                зайдите через нашего <a href="https://t.me/chat_ano_bot?start" style="color: #43A7FD;">Telegram бота</a>
            </p>`;
    } else {
        executeQuery('SELECT * FROM users WHERE id = ?', [mainUserId])
            .then(rows => {
                document.getElementById("profilWindow").innerHTML = `
                    <p id="but-hide" onclick="hideProfil()">Скрыть</p>
                    <img src="img/profil_icon_1.png" alt="" style="height: 150px;">
                    <h1 style="font-size: 30px; margin-top: 5px; color: #353535; font-weight: 800">
                        ${rows[0].name} ${rows[0].last_name}
                    </h1>
                    <p style="font-size: 30px; margin-top: 10px; color: #6D6D6D;">
                        Регистрация: ${rows[0].date_of_registration}<br>
                        Баланс: ${rows[0].coin_count}<img src="img/n-coin.svg" alt="" style="height: 30px; transform: translateY(+5px);">
                    </p>
                    <p class="but-option">Пригласить друга 👍</p>
                    <p class="but-option">Пополнить баланс 💸</p>
                    <p class="but-option">Сменить аватар 😎</p>`;
            });
    }
    document.getElementById("profilWindow").style.transform = 'translateY(0)';
    document.getElementById("opasity-win").style.transform = 'translateY(0)';
}

function hideProfil() {
    document.getElementById("profilWindow").style.transform = 'translateY(+600px)';
    document.getElementById("opasity-win").style.transform = 'translateY(+100vh)';
}

// Логика игры
function startGame() {
    document.getElementById("start-game").style.transform = 'translateY(0)';
    document.getElementById("opasity-win").style.transform = 'translateY(0)';
}

function makeRoom() {
    document.getElementById("roomGame").style.transform = 'translateY(0)';
}

function setValueInput() {
    const value = document.getElementById('Player_count').value;
    document.getElementById("input_value").innerHTML = value;
    document.getElementById("input_value").style.marginLeft = `calc(9% - 10px + ${(89 / 7) * (value - 3)}%)`;
}

async function createRoom() {
    const name = document.getElementById("name").value;
    const pass = document.getElementById("pass").value;
    const count = document.getElementById("Player_count").value;

    if (!name || !pass) {
        if (!name) animateInput('name');
        if (!pass) animateInput('pass');
        return;
    }

    try {
        const existing = await executeQuery(
            'SELECT id FROM game_room WHERE room_name = ?', 
            [name]
        );

        if (existing.length > 0) {
            showError('Комната с таким именем уже существует!');
            return;
        }

        const result = await executeQuery(
            `INSERT INTO game_room (user_count, room_mode, room_name, room_password)
             VALUES (?, ?, ?, ?)`,
            [count, 2, name, pass]
        );

        roomId = result.lastInsertRowid;
        passForLoad = true;
        
        if (document.getElementById("querAll").classList.contains('active')) {
            await executeQuery(
                `INSERT INTO questions_in_game_room (question, room_id, serial_number)
                 SELECT question, ?, 1 FROM questions ORDER BY RANDOM() LIMIT ?`,
                [roomId, count]
            );
        }

        await executeQuery(
            `INSERT INTO user_in_game_room (user_id, room_id)
             VALUES (?, ?)`,
            [mainUserId, roomId]
        );

        document.getElementById("roomGame").style.transform = 'translateY(-100vh)';
        loadRoom();
    } catch (error) {
        showError('Ошибка создания комнаты: ' + error.message);
    }
}

function animateInput(id) {
    const element = document.getElementById(id);
    element.style.animation = 'inpError 0.5s';
    setTimeout(() => element.style.animation = '', 500);
}

// Остальные функции
function querAll() {
    document.getElementById("querANO").className = '';
    document.getElementById("querAll").className = 'active';
}

function querANO() {
    document.getElementById("querANO").className = 'active';
    document.getElementById("querAll").className = '';
}

window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    mainUserId = parseInt(urlParams.get('main_id')) || 0;

    executeQuery('DELETE FROM user_in_game_room WHERE user_id = ?', [mainUserId])
        .then(() => {
            if (mainUserId !== 0) {
                return executeQuery('SELECT coin_count FROM users WHERE id = ?', [mainUserId]);
            }
            return Promise.resolve([{ coin_count: 0 }]);
        })
        .then(rows => {
            document.getElementById("count").textContent = rows[0].coin_count;
        });
});

// ========== Работа с комнатами ==========
function loginInRoom() {
    document.getElementById("inRoomGame").style.transform = 'translateY(0)';
}

function hideInRoomGame() {
    document.getElementById("inRoomGame").style.transform = 'translateY(-100vh)';
}

function loadRoom() {
    document.getElementById("search_players").style.transform = 'translateY(0)';
    startUserLoading();
}

function hideLoadRoom() {
    document.getElementById("search_players").style.transform = 'translateY(-100vh)';
}

async function searchRoom() {
    const name = document.getElementById("name1").value;
    const pass = document.getElementById("pass1").value;

    try {
        const result = await executeQuery(
            'SELECT * FROM game_room WHERE room_name = ? AND room_password = ?',
            [name, pass]
        );

        if (result.length === 0) {
            showError('Комната не найдена! Проверьте имя и пароль');
            animateInput('name1');
            animateInput('pass1');
            return;
        }

        roomId = result[0].id;
        await executeQuery(
            'INSERT INTO user_in_game_room (user_id, room_id) VALUES (?, ?)',
            [mainUserId, roomId]
        );

        hideInRoomGame();
        loadRoom();
        startUserLoading();
    } catch (error) {
        showError('Ошибка входа: ' + error.message);
    }
}

// ========== Загрузка пользователей ==========
let intervalId;

function startUserLoading() {
    intervalId = setInterval(async () => {
        try {
            const users = await executeQuery(
                'SELECT u.* FROM user_in_game_room ugr ' +
                'JOIN users u ON ugr.user_id = u.id ' +
                'WHERE ugr.room_id = ?',
                [roomId]
            );

            updateUserList(users);
            
            if (users.length >= globalUserCount) {
                clearInterval(intervalId);
                startGameSession();
            }
        } catch (error) {
            console.error('Ошибка загрузки:', error);
        }
    }, 1000);
}

function updateUserList(users) {
    const container = document.getElementById("usersInRoom");
    container.innerHTML = users.map(user => `
        <div class="users">
            <img src="img/connect_icon.png" alt="">
            <p>${user.name}</p>
        </div>
    `).join('');

    document.getElementById("user_count_in_connect").textContent = 
        `${users.length}/${globalUserCount}`;
}

// ========== Игровой процесс ==========
async function startGameSession() {
    try {
        const roomInfo = await executeQuery(
            'SELECT * FROM game_room WHERE id = ?',
            [roomId]
        );
        
        if (roomInfo[0].room_mode === 1) {
            openChatRoom();
        } else {
            writeQuestion();
        }
    } catch (error) {
        showError('Ошибка старта игры: ' + error.message);
    }
}

function writeQuestion() {
    document.getElementById("write_question").style.transform = 'translateY(0)';
}

function hideWriteQuestion() {
    document.getElementById("write_question").style.transform = 'translateY(+100vh)';
}

async function readyQuestion() {
    const question = document.getElementById("question").value;
    
    if (!question) {
        showError('Напишите вопрос!');
        animateInput('question');
        return;
    }

    try {
        await executeQuery(
            'INSERT INTO questions_in_game_room (question, room_id, serial_number) ' +
            'VALUES (?, ?, (SELECT MAX(serial_number) + 1 FROM questions_in_game_room))',
            [question, roomId]
        );

        document.getElementById("ready_write_question_button").disabled = true;
        monitorQuestions();
    } catch (error) {
        showError('Ошибка сохранения: ' + error.message);
    }
}

async function monitorQuestions() {
    const checkInterval = setInterval(async () => {
        const result = await executeQuery(
            'SELECT COUNT(*) as count FROM questions_in_game_room WHERE room_id = ?',
            [roomId]
        );

        const count = result[0].count;
        document.getElementById("ready_users").textContent = 
            `Готово ${count}/${globalUserCount}`;

        if (count >= globalUserCount) {
            clearInterval(checkInterval);
            hideWriteQuestion();
            openChatRoom();
        }
    }, 1000);
}

// ========== Чат ==========
function openChatRoom() {
    document.getElementById("chat_room").style.transform = 'translateY(0)';
    loadChatMessages();
}

async function loadChatMessages() {
    try {
        const questions = await executeQuery(
            'SELECT * FROM questions_in_game_room WHERE room_id = ? ORDER BY serial_number',
            [roomId]
        );

        const chatContainer = document.getElementById("chat");
        chatContainer.innerHTML = questions.map(q => `
            <div class="message_block">
                <p class="question">${q.question}</p>
            </div>
        `).join('');

        questionSerialNumber = questions.length;
    } catch (error) {
        showError('Ошибка загрузки чата: ' + error.message);
    }
}

// ========== Обработчики сообщений ==========
async function readyMessage() {
    const input = document.getElementById("inp_chat");
    const message = input.value.trim();
    
    if (!message) {
        animateInput('inp_chat');
        return;
    }

    try {
        await executeQuery(
            'INSERT INTO review_for_question (question_id, review, user_id) ' +
            'VALUES (?, ?, ?)',
            [questionId, message, mainUserId]
        );
        
        input.value = '';
        monitorMessages();
    } catch (error) {
        showError('Ошибка отправки: ' + error.message);
    }
}

async function monitorMessages() {
    const checkInterval = setInterval(async () => {
        const result = await executeQuery(
            'SELECT COUNT(*) as count FROM review_for_question WHERE question_id = ?',
            [questionId]
        );

        if (result[0].count >= globalUserCount) {
            clearInterval(checkInterval);
            displayAllMessages();
        }
    }, 1000);
}

// ========== Вспомогательные функции ==========
function contains(arr, elem) {
    return arr.some(item => item === elem);
}

function canselSearch() {
    clearInterval(intervalId);
    executeQuery('DELETE FROM user_in_game_room WHERE user_id = ?', [mainUserId])
        .then(() => {
            hideLoadRoom();
            list = [];
        });
}

// ========== Анимации и UI ==========
function openButton(element) {
    element.classList.toggle('open');
    document.getElementById("notification").style.transform = 
        element.classList.contains('open') ? 'translateY(0)' : 'translateY(-200px)';
}

function closeButton() {
    document.querySelector('.message_left.open').classList.remove('open');
    document.getElementById("notification").style.transform = 'translateY(-200px)';
}

function openKeyboard() {
    document.getElementById("chat_input").style.transform = 'translateY(-50px)';
}

function closeKeyboard() {
    document.getElementById("chat_input").style.transform = 'translateY(0)';
}

// ========== Инициализация ==========
document.addEventListener('DOMContentLoaded', () => {
    if (mainUserId !== 0) {
        executeQuery('SELECT coin_count FROM users WHERE id = ?', [mainUserId])
            .then(result => {
                document.getElementById("count").textContent = result[0].coin_count;
            });
    }
});