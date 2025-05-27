const urlParams = new URLSearchParams(window.location.search);
const urlParam = parseInt(urlParams.get("main_id"));

let mode = 2;
let main_id = 0;
let room_id = null;
let global_user_count = 0;
let intervalId = null;
let pass_for_load = false;
let user_count = 0;
let list = []; // пользователи в комнате
let question_serial_number = 0; // порядковый номер вопроса
let question_id = 0;
let chat_string = "";
let usersCount = 0;
let pass_for_delete = false;
let msg_id = "";
let elHeight = 0;
let msgSring = "";

const API_URL = "https://alexcrowd3-anochat-f80f.twc1.net/query";

async function executeQuery(sql, params = []) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql, params }),
    });
    if (!res.ok) throw new Error("Ошибка выполнения запроса");
    return await res.json();
  } catch (e) {
    console.error("Ошибка запроса:", e);
    return [];
  }
}

async function init() {
  await executeQuery(`DELETE FROM questions_in_game_room WHERE NOT EXISTS (SELECT 1 FROM review_for_question r WHERE r.question_id = questions_in_game_room.id)`);
  await executeQuery(`DELETE FROM game_room WHERE NOT EXISTS (SELECT 1 FROM questions_in_game_room q WHERE q.room_id = game_room.id)`);
  const users = await executeQuery(`SELECT * FROM users WHERE telegram_id == ?`, [urlParam]);
  if (users.length > 0) {
    main_id = users[0].id;
    await updateCoinCount();
    await executeQuery(`DELETE FROM user_in_game_room WHERE user_id == ?`, [main_id]);
  }
}

async function updateCoinCount() {
  const rows = await executeQuery(`SELECT * FROM users WHERE id == ?`, [main_id]);
  document.getElementById("count").innerHTML = rows.length > 0 ? parseInt(rows[0].coin_count) : 0;
}

window.addEventListener("load", init);

function animateWindow(id, translateY) {
  document.getElementById(id).style.transform = `translateY(${translateY})`;
}

function sendReviewAnimate() {
  animateWindow("onclickReviewWindow", "0px");
  animateWindow("opasity-win", "0vh");
}

function hideReviewAnimate() {
  animateWindow("onclickReviewWindow", "+350px");
  animateWindow("opasity-win", "+100vh");
}

function hideProfil() {
  animateWindow("profilWindow", "+600px");
  animateWindow("opasity-win", "+100vh");
}

function hideStartGame() {
  animateWindow("start-game", "+400px");
  animateWindow("opasity-win", "+100vh");
}

function startGame() {
  further();
  animateWindow("start-game", "0");
  animateWindow("opasity-win", "0");
}

async function getProfil() {
  if (main_id === 0) {
    document.getElementById("profilWindow").innerHTML = `
      <p id="but-hide" onclick="hideProfil()">Скрыть</p>
      <img src="img/profil_icon_0.png" alt="" style="height: 150px;">
      <p id="profil_info" style="font-size: 30px; margin-top: 30px; color: #6D6D6D;">
        Для входа в аккаунт<br>
        зайдите через нашего <a href="https://t.me/chat_ano_bot?start" style="color: #43A7FD;">Telegram бота</a>
      </p>`;
  } else {
    const [user] = await executeQuery(`SELECT * FROM users WHERE id == ?`, [main_id]);
    document.getElementById("profilWindow").innerHTML = `
      <p id="but-hide" onclick="hideProfil()">Скрыть</p>
      <img src="img/profil_icon_1.png" alt="" style="height: 150px;">
      <h1 id="profil_info" style="font-size: 30px; margin-top: 5px; color: #353535; font-weight: 800">
        ${user.name} ${user.last_name}
      </h1>
      <p id="profil_info" style="font-size: 30px; margin-top: 10px; color: #6D6D6D;">
        Регистрация: ${user.date_of_registration}<br>
        Баланс: ${user.coin_count}
        <img src="img/n-coin.svg" alt="" style="height: 30px; transform: translateY(+5px);">
      </p>
      <p id="but-option">Пригласить друга 👍</p>
      <p id="but-option">Пополнить баланс 💸</p>
      <p id="but-option">Сменить аватар 😎</p>`;
  }
  animateWindow("profilWindow", "0px");
  animateWindow("opasity-win", "0vh");
}

// 🔽 Продолжение: создание комнат, чат, обработка вопросов и ответы игроков

function makeRoom() {
  animateWindow("roomGame", "0px");
}

function hideMakeRoom() {
  animateWindow("roomGame", "-100vh");
}

function createRoom() {
  question_serial_number = 0;
  const name = document.getElementById("name").value;
  const pass = document.getElementById("pass").value;
  const count = document.getElementById("Player_count").value;

  if (!name || !pass) {
    if (!name) animateInputError("name");
    if (!pass) animateInputError("pass");
    return;
  }

  executeQuery(`SELECT room_name FROM game_room WHERE room_name == ?`, [name]).then(async rows => {
    if (rows.length > 0) {
      showError("Такая комната уже существует!");
    } else {
      await executeQuery(
        `INSERT INTO game_room VALUES ((SELECT IFNULL(MAX(id),0)+1 FROM game_room), ?, ?, ?, ?)`,
        [count, mode, name, pass]
      );

      const room = await executeQuery(`SELECT * FROM game_room WHERE room_name == ? AND room_password == ?`, [name, pass]);
      if (room.length > 0) {
        room_id = room[0].id;
        pass_for_load = true;

        if (mode === 1) {
          await insertRandomQuestions(count);
        }

        await executeQuery(
          `INSERT INTO user_in_game_room VALUES ((SELECT IFNULL(MAX(id),0)+1 FROM user_in_game_room), ?, ?)`,
          [main_id, room_id]
        );

        loadRoom();
        const game = await executeQuery(`SELECT * FROM game_room WHERE id == ?`, [room_id]);
        global_user_count = game[0].user_count;
        document.getElementById("user_count_in_connect").innerText = `1/${global_user_count}`;
        intervalId = setInterval(loadUsers, 1000);
        hideMakeRoom();
      }
    }
  });
}

function animateInputError(id) {
  const el = document.getElementById(id);
  el.style.animation = "inpError 0.5s forwards";
  setTimeout(() => (el.style.animation = ""), 500);
}

function showError(text) {
  const win = document.getElementById("ErrorWindow");
  win.innerHTML = `Ошибка:<br>${text}`;
  animateWindow("ErrorWindow", "0vh");
  setTimeout(() => animateWindow("ErrorWindow", "-60vh"), 4000);
}

async function insertRandomQuestions(count) {
  const randomSet = new Set();
  while (randomSet.size < count) {
    const id = Math.floor(Math.random() * 70) + 1;
    if (!randomSet.has(id)) {
      randomSet.add(id);
      const serial = randomSet.size;
      await executeQuery(
        `INSERT INTO questions_in_game_room VALUES ((SELECT IFNULL(MAX(id),0)+1 FROM questions_in_game_room), (SELECT question FROM questions WHERE id == ?), ?, ?)`,
        [id, room_id, serial]
      );
    }
  }
}

function loadRoom() {
  animateWindow("search_players", "0");
}

function hideLoadRoom() {
  animateWindow("search_players", "-100vh");
}

function loadUsers() {
  executeQuery(`SELECT * FROM user_in_game_room WHERE room_id == ?`, [room_id]).then(async users => {
    if (!users) return;
    document.getElementById("usersInRoom").innerHTML = "";
    for (const user of users) {
      if (!list.includes(user.user_id)) {
        const [userInfo] = await executeQuery(`SELECT * FROM users WHERE id == ?`, [user.user_id]);
        document.getElementById("usersInRoom").innerHTML += `
          <div class="users">
            <img src="img/connect_icon.png" alt=""><p>${userInfo.name}</p>
          </div>`;
        list.push(user.user_id);
      }
    }
    document.getElementById("user_count_in_connect").innerText = `${users.length}/${global_user_count}`;
    if (users.length === global_user_count) {
      clearInterval(intervalId);
      hideLoadRoom();
      document.getElementById("usersInRoom").innerHTML = "";
      list = [];
      const [room] = await executeQuery(`SELECT * FROM game_room WHERE id == ?`, [room_id]);
      if (room.room_mode === 1) {
        openChatRoom();
      } else {
        writeQuestion();
      }
    }
  });
}

function writeQuestion() {
  animateWindow("write_question", "0vh");
}

function hideWriteQuestion() {
  animateWindow("write_question", "+100vh");
}
function openChatRoom() {
  if (question_serial_number < global_user_count) {
    document.getElementById("title_in_load").innerText = `Раунд ${question_serial_number + 1}`;
    animateWindow("load_msg_window", "0");
    document.getElementById("title_in_load").style.animation = "printed_text 2s 2s forwards, winP 2s forwards";
    document.getElementById("load_msg_window").style.animation = "opasityWin 1s forwards";
    document.getElementById("load_logo_in_win").style.animation = "winImg 1s 2s forwards";
  } else {
    endGame();
  }
  setTimeout(() => animateWindow("load_msg_window", "+100vh"), 5000);
  setTimeout(() => {
    document.getElementById("title_in_load").style.animation = "";
    document.getElementById("load_msg_window").style.animation = "";
    document.getElementById("load_logo_in_win").style.animation = "";
  }, 6000);

  if (pass_for_delete) {
    executeQuery(`DELETE FROM questions_in_game_room WHERE serial_number == ?`, [question_serial_number]);
  }

  document.getElementById("chat_input").innerHTML = `
    <input type="text" id="inp_chat" placeholder="Пиши тут...">
    <img src="img/send.svg" alt="" onclick="readyMessage()">
  `;
  document.getElementById("chat_input").onclick = openKeyboard;
  animateWindow("chat_room", "0px");

  executeQuery(`SELECT * FROM questions_in_game_room WHERE room_id == ? ORDER BY serial_number`, [room_id])
    .then(list2 => {
      if (list2.length === 0) {
        closeChatRoom();
      } else {
        question_id = parseInt(list2[0].id);
        document.getElementById("chat").innerHTML = `<p id="question_inchat"></p>`;
        document.getElementById("question_inchat").innerHTML = `Вопрос:<br>${list2[0].question}`;
        chat_string = `<p id="question_inchat">Вопрос:<br>${list2[0].question}</p>`;
      }
    });
}

function endGame() {
  list.length = 0;
  document.getElementById("title_in_load").innerText = "Конец игры";
  animateWindow("load_msg_window", "0");
  document.getElementById("title_in_load").style.animation = "printed_text2 2s 2s forwards, winP 2s forwards";
  document.getElementById("load_msg_window").style.animation = "opasityWin 1s forwards";
  document.getElementById("load_logo_in_win").style.animation = "winImg 1s 2s forwards";

  executeQuery(`DELETE FROM user_in_game_room WHERE user_id == ?`, [main_id]);
  executeQuery(`DELETE FROM game_room WHERE id == ?`, [room_id]);

  user_count = 0;
  usersCount = 0;
  global_user_count = 0;
}

function closeChatRoom() {
  animateWindow("chat_room", "+100vh");
}

function readyMessage() {
  const message = document.getElementById("inp_chat").value.trim();
  if (!message) {
    showError("Надо сначала написать ответ на вопрос(");
    return;
  }
  executeQuery(`INSERT INTO review_for_question VALUES ((SELECT IFNULL(MAX(id),0)+1 FROM review_for_question), ?, ?, ?)`, [question_id, message, main_id]);
  document.getElementById("chat_input").innerHTML = "<p>Ждем остальных</p>";
  document.getElementById("chat_input").style.animation = "pulsarMin 1s infinite";
  document.getElementById("chat").innerHTML += `<p class="titleMsg" id="readyTitle">Готово 1/${global_user_count} игрока</p>`;
  loadAllMessage();
}

function loadAllMessage() {
  executeQuery(`SELECT * FROM review_for_question WHERE question_id == ?`, [question_id])
    .then(reviews => {
      document.querySelector(".titleMsg").innerText = `Готово ${reviews.length}/${global_user_count} игрока`;
      if (reviews.length < global_user_count) {
        setTimeout(loadAllMessage, 1000);
      } else {
        sendAllMessage(reviews);
      }
    });
}

function sendAllMessage(reviews) {
  document.getElementById("chat_input").innerHTML = "<p>Дальше</p>";
  document.getElementById("chat_input").onclick = further;
  document.getElementById("chat_input").style.animation = "";
  document.getElementById("chat").innerHTML = chat_string;

  reviews.forEach((msg, i) => {
    const msgHTML = msg.user_id === main_id
      ? `<div class="message_right" id="${msg.id}"><p>${msg.review}</p></div>`
      : `<div class="message_left" onclick="openButton(this)" id="${msg.id}"><p>${msg.review}</p></div>`;

    setTimeout(() => {
      document.getElementById("chat").innerHTML += msgHTML;
      const anim = msg.user_id === main_id ? "emergeRight" : "emergeLeft";
      document.getElementById(msg.id).style.animation = `${anim} 0.5s forwards`;
    }, i * 1000);
  });
}

function further() {
  executeQuery(`DELETE FROM review_for_question WHERE user_id == ?`, [main_id]);
  document.getElementById("chat_input").innerHTML = "<p>Ждем остальных</p>";
  document.getElementById("chat_input").style.animation = "pulsarMin 1s infinite";
  waitUsers();
}

function waitUsers() {
  executeQuery(`SELECT * FROM review_for_question WHERE question_id == ?`, [question_id])
    .then(reviews => {
      if (reviews.length === 0) {
        question_serial_number++;
        pass_for_delete = true;
        openChatRoom();
      } else {
        setTimeout(waitUsers, 1000);
      }
    });
}