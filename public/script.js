// script.js
let mainUserId = 0;
let roomId = 0;
let currentQuestionId = 0;
let globalUserCount = 3;
let userList = [];
let questionSerial = 0;
let intervalId;

// Базовые функции
async function executeQuery(sql, params = []) {
    try {
        const response = await fetch('https://alexcrowd3-anochat-f80f.twc1.net/query', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                sql: sql.replace(/\s+/g, ' '),
                params: params.map(p => p.toString())
            })
        });

        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        return await response.json();
    } catch (error) {
        showError(`Ошибка запроса: ${error.message}`);
        throw error;
    }
}

function showError(text) {
    const errWindow = document.getElementById("ErrorWindow");
    errWindow.innerHTML = text;
    errWindow.style.transform = 'translateY(0)';
    setTimeout(() => errWindow.style.transform = 'translateY(-60vh)', 4000);
}

// Инициализация
window.addEventListener('load', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    mainUserId = parseInt(urlParams.get('main_id')) || 0;
    
    try {
        await executeQuery(
            "DELETE FROM user_in_game_room WHERE user_id = ?",
            [mainUserId]
        );
        
        if (mainUserId > 0) {
            const userData = await executeQuery(
                "SELECT coin_count FROM users WHERE id = ?",
                [mainUserId]
            );
            document.getElementById("count").textContent = userData[0]?.coin_count || 0;
        }
    } catch (error) {
        console.error("Init error:", error);
    }
});

// Профиль
window.getProfil = async () => {
    try {
        let htmlContent;
        if (mainUserId === 0) {
            htmlContent = `
                <p onclick="hideProfil()">Скрыть</p>
                <img src="img/profil_icon_0.png" style="height:150px;">
                <p style="color:#6D6D6D;margin-top:30px;">
                    Для входа используйте 
                    <a href="https://t.me/chat_ano_bot?start" style="color:#43A7FD;">Telegram бота</a>
                </p>`;
        } else {
            const result = await executeQuery(
                "SELECT name, last_name, coin_count, date_of_registration FROM users WHERE id = ?",
                [mainUserId]
            );
            const user = result[0];
            htmlContent = `
                <p onclick="hideProfil()">Скрыть</p>
                <img src="img/profil_icon_1.png" style="height:150px;">
                <h1 style="font-size:30px;color:#353535;">${user.name} ${user.last_name}</h1>
                <p style="font-size:30px;color:#6D6D6D;">
                    Баланс: ${user.coin_count} <img src="img/n-coin.svg" style="height:30px;">
                    <br>Регистрация: ${user.date_of_registration}
                </p>`;
        }
        
        document.getElementById("profilWindow").innerHTML = htmlContent;
        document.getElementById("profilWindow").style.transform = 'translateY(0)';
        document.getElementById("opasity-win").style.transform = 'translateY(0)';
    } catch (error) {
        showError("Ошибка загрузки профиля");
    }
};

window.hideProfil = () => {
    document.getElementById("profilWindow").style.transform = 'translateY(+600px)';
    document.getElementById("opasity-win").style.transform = 'translateY(+100vh)';
};

// Логика комнат
window.startGame = () => {
    document.getElementById("start-game").style.transform = 'translateY(0)';
    document.getElementById("opasity-win").style.transform = 'translateY(0)';
};

window.makeRoom = () => {
    document.getElementById("roomGame").style.transform = 'translateY(0)';
};

window.setValueInput = () => {
    const value = document.getElementById('Player_count').value;
    document.getElementById("input_value").textContent = value;
    document.getElementById("input_value").style.marginLeft = 
        `calc(9% - 10px + ${(89 / 7) * (value - 3)}%)`;
};

window.createRoom = async () => {
    const name = document.getElementById("name").value;
    const pass = document.getElementById("pass").value;
    const count = document.getElementById("Player_count").value;
    const mode = document.getElementById("querAll").classList.contains('active') ? 2 : 1;

    try {
        const existing = await executeQuery(
            "SELECT id FROM game_room WHERE room_name = ?",
            [name]
        );
        
        if (existing.length > 0) {
            showError("Комната уже существует!");
            return;
        }

        const result = await executeQuery(
            `INSERT INTO game_room 
                (user_count, room_mode, room_name, room_password) 
             VALUES (?, ?, ?, ?)
             RETURNING id`,
            [count, mode, name, pass]
        );
        
        roomId = result[0].id;

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

        await executeQuery(
            "INSERT INTO user_in_game_room (user_id, room_id) VALUES (?, ?)",
            [mainUserId, roomId]
        );

        document.getElementById("roomGame").style.transform = 'translateY(-100vh)';
        startUserMonitoring(roomId, count);
    } catch (error) {
        showError(`Ошибка создания: ${error.message}`);
    }
};

// Мониторинг пользователей
async function startUserMonitoring(roomId, maxUsers) {
    intervalId = setInterval(async () => {
        try {
            const users = await executeQuery(
                `SELECT u.id, u.name 
                 FROM user_in_game_room ugr
                 JOIN users u ON ugr.user_id = u.id
                 WHERE ugr.room_id = ?`,
                [roomId]
            );
            
            updateUserInterface(users, maxUsers);
            
            if (users.length >= maxUsers) {
                clearInterval(intervalId);
                startGameProcess(roomId);
            }
        } catch (error) {
            console.error("Monitoring error:", error);
        }
    }, 1000);
}

function updateUserInterface(users, maxUsers) {
    const container = document.getElementById("usersInRoom");
    container.innerHTML = users.map(user => `
        <div class="users">
            <img src="img/connect_icon.png">
            <p>${user.name}</p>
        </div>
    `).join('');

    document.getElementById("user_count_in_connect").textContent = 
        `${users.length}/${maxUsers}`;
}

// Игровой процесс
async function startGameProcess(roomId) {
    try {
        const roomInfo = await executeQuery(
            "SELECT room_mode FROM game_room WHERE id = ?",
            [roomId]
        );
        
        if (roomInfo[0].room_mode === 1) {
            openChatInterface();
            loadGameQuestions();
        } else {
            showQuestionInput();
        }
    } catch (error) {
        showError("Ошибка запуска игры");
    }
}

async function loadGameQuestions() {
    try {
        const questions = await executeQuery(
            "SELECT * FROM questions_in_game_room WHERE room_id = ? ORDER BY serial_number",
            [roomId]
        );
        
        if (questions.length > 0) {
            currentQuestionId = questions[0].id;
            document.getElementById("question_inchat").textContent = questions[0].question;
        }
    } catch (error) {
        showError("Ошибка загрузки вопросов");
    }
}

window.openChatInterface = () => {
    document.getElementById("chat_room").style.transform = 'translateY(0)';
};

// Отправка сообщений
window.readyMessage = async () => {
    const input = document.getElementById("inp_chat");
    const message = input.value.trim();
    
    if (!message) {
        input.style.animation = 'inpError 0.5s';
        setTimeout(() => input.style.animation = '', 500);
        return;
    }

    try {
        await executeQuery(
            "INSERT INTO review_for_question (question_id, review, user_id) VALUES (?, ?, ?)",
            [currentQuestionId, message, mainUserId]
        );
        input.value = '';
        checkAnswers();
    } catch (error) {
        showError("Ошибка отправки");
    }
};

async function checkAnswers() {
    const interval = setInterval(async () => {
        try {
            const result = await executeQuery(
                "SELECT COUNT(*) as count FROM review_for_question WHERE question_id = ?",
                [currentQuestionId]
            );
            
            if (result[0].count >= globalUserCount) {
                clearInterval(interval);
                displayAllMessages();
            }
        } catch (error) {
            console.error("Check error:", error);
        }
    }, 1000);
}

// Восстановленные функции
window.further = async () => {
    try {
        await executeQuery(
            "DELETE FROM review_for_question WHERE user_id = ?",
            [mainUserId]
        );
        
        document.getElementById("chat_input").innerHTML = '<p>Ждем остальных</p>';
        document.getElementById("chat_input").style.animation = 'pulsarMin 1s infinite';
        waitForNextQuestion();
    } catch (error) {
        showError("Ошибка перехода: " + error.message);
    }
};

async function waitForNextQuestion() {
    const interval = setInterval(async () => {
        try {
            const result = await executeQuery(
                "SELECT COUNT(*) as count FROM review_for_question WHERE question_id = ?",
                [currentQuestionId]
            );
            
            if (result[0].count === 0) {
                clearInterval(interval);
                questionSerial++;
                loadNextQuestion();
            }
        } catch (error) {
            console.error("Wait error:", error);
        }
    }, 1000);
}

async function loadNextQuestion() {
    try {
        const questions = await executeQuery(
            "SELECT * FROM questions_in_game_room WHERE room_id = ? AND serial_number = ?",
            [roomId, questionSerial]
        );
        
        if (questions.length > 0) {
            currentQuestionId = questions[0].id;
            document.getElementById("question_inchat").textContent = questions[0].question;
            openChatInterface();
        } else {
            endGame();
        }
    } catch (error) {
        showError("Ошибка загрузки вопроса: " + error.message);
    }
}

function endGame() {
    document.getElementById("chat_room").style.transform = 'translateY(+100vh)';
    showError("Игра завершена!");
}

// Дополнительные обработчики
window.hideStartGame = () => {
    document.getElementById("start-game").style.transform = 'translateY(+400px)';
    document.getElementById("opasity-win").style.transform = 'translateY(+100vh)';
};

window.querAll = () => {
    document.getElementById("querANO").className = '';
    document.getElementById("querAll").className = 'active';
};

window.querANO = () => {
    document.getElementById("querANO").className = 'active';
    document.getElementById("querAll").className = '';
};