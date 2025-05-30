var mode = 2;
const urlParams = new URLSearchParams(window.location.search);
let main_id = 0;
let urlParam = parseInt(urlParams.get('main_id'))

var global_user_count;
let intervalId;
var room_id;
var pass_for_load = 0;
var user_count = 0;
var list = []; // пользователи в комнате
var question_serial_number = 0; // порядковый номер вопроса
var question_id = 0;
var chat_string = "";
var usersCount = 0; // количество пользователей в комнате
var pass_for_delete = false;

// Функция для выполнения SQL-запроса
async function executeQuery(sql, params = []) {
    try {
        const response = await fetch('https://alexcrowd3-anochat-f80f.twc1.net/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sql, params }), // Отправляем SQL-запрос и параметры
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Произошла ошибка на сервере');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка при выполнении запроса:', error.message);
    }
}
window.addEventListener('load', () => {
    quer = 'DELETE FROM questions_in_game_room WHERE NOT EXISTS ( SELECT 1 FROM review_for_question r WHERE r.question_id = questions_in_game_room.id )';
    executeQuery(quer)
    quer = 'DELETE FROM game_room WHERE NOT EXISTS ( SELECT 1 FROM questions_in_game_room q WHERE q.room_id = game_room.id )';
    executeQuery(quer)
    quer = 'SELECT * FROM users WHERE telegram_id == ' + urlParam;
    executeQuery(quer)
        .then(rows => {
            main_id = parseInt(rows[0].id);
        })
    setTimeout(function(){ 
        quer = 'SELECT * FROM users WHERE id == ' + main_id;
        executeQuery(quer)
        .then(row1 => {
            if (main_id != 0){
                document.getElementById("count").innerHTML = parseInt(row1[0].coin_count); 
            } else {
                document.getElementById("count").innerHTML = 0;
            }
        })
    },2000);
    var quer = 'DELETE FROM user_in_game_room WHERE user_id == ' + main_id;
    executeQuery(quer)
});

function sendReviewAnimate() {
    document.getElementById("onclickReviewWindow").style.transform = 'translateY(0px)';
    document.getElementById("opasity-win").style.transform = 'translateY(0vh)';
}
function hideReviewAnimate() {
    document.getElementById("onclickReviewWindow").style.transform = 'translateY(+350px)';
    document.getElementById("opasity-win").style.transform = 'translateY(+100vh)';
}
function hideProfil() {
    document.getElementById("profilWindow").style.transform = 'translateY(+600px)';
    document.getElementById("opasity-win").style.transform = 'translateY(+100vh)';
}
function hideStartGame() {
    document.getElementById("start-game").style.transform = 'translateY(+400px)';
    document.getElementById("opasity-win").style.transform = 'translateY(+100vh)';
}
function startGame() {
    document.getElementById("start-game").style.transform = 'translateY(0)';
    document.getElementById("opasity-win").style.transform = 'translateY(0)';
}
function getProfil() {
    if (main_id == 0) {
        document.getElementById("profilWindow").innerHTML = '<p id="but-hide" onclick="hideProfil()">Скрыть</p><img src="img/profil_icon_0.png" alt="" style="height: 150px;"><p id="profil_info" style="font-size: 30px; margin-top: 30px; color: #6D6D6D;">Для входа в аккаунт<br>зайдите через нашего <a href="https://t.me/chat_ano_bot?start" style="color: #43A7FD;">Telegram бота</a></p>';
    }
    else {
        executeQuery('SELECT * FROM users WHERE id == ?', [main_id])
        .then(rows => {
            document.getElementById("profilWindow").innerHTML = '<p id="but-hide" onclick="hideProfil()">Скрыть</p><img src="img/profil_icon_1.png" alt="" style="height: 150px;"><h1 id="profil_info" style="font-size: 30px; margin-top: 5px; color: #353535; font-weight: 800">'+ rows[0].name + ' ' + rows[0].last_name +'</h1><p id="profil_info" style="font-size: 30px; margin-top: 10px; color: #6D6D6D;">Регистрация: '+ rows[0].date_of_registration +'<br>Баланс: '+ rows[0].coin_count +'<img src="img/n-coin.svg" alt="" style="height: 30px; transform: translateY(+5px);"></p><p id="but-option">Пригласить друга 👍</p><p id="but-option">Пополнить баланс 💸</p><p id="but-option">Сменить аватар 😎</p>';
        })
        .catch(err => {
            console.error('Ошибка:', err);
        });
    }
    document.getElementById("profilWindow").style.transform = 'translateY(0px)';
    document.getElementById("opasity-win").style.transform = 'translateY(0vh)';
}
function makeRoom() {
    document.getElementById("roomGame").style.transform = 'translateY(0px)';
}
function hideMakeRoom() {
    document.getElementById("roomGame").style.transform = 'translateY(-100vh)';
}
function setValueInput() {
    var value = document.getElementById('Player_count').value;
    document.getElementById("input_value").style.marginLeft = 'calc((9% - 10px) + ' + 89 / 8 * (value - 3) + '%)';
    document.getElementById("input_value").innerHTML = value;
}
function querAll() {
    mode = 2;
    document.getElementById("querANO").className = '';
    document.getElementById("querAll").className = 'active';
}
function querANO() {
    mode = 1;
    document.getElementById("querANO").className = 'active';
    document.getElementById("querAll").className = '';
}
function createRoom() {
    question_serial_number = 0;
    var name = document.getElementById("name").value
    var pass = document.getElementById("pass").value
    var count = document.getElementById("Player_count").value
    if (name != "" && pass != "") {
        var quer = 'SELECT room_name FROM game_room WHERE room_name == \'' + name +'\'';
        executeQuery(quer)
        .then(rows1 => {
            if (rows1.length === 0) {
                var query = 'INSERT INTO game_room VALUES ((SELECT MAX(id)+1 FROM game_room), ' + count + ', ' + mode + ', "' + name + '", "' + pass + '")';
                executeQuery(query)
                document.getElementById("roomGame").style.transform = 'translateY(-100vh)';
                pass_for_load = true;
                var quer = 'SELECT * FROM game_room WHERE room_name == \'' + name +'\' AND room_password == \'' + pass +'\'';
                executeQuery(quer)
                .then(rows => { 
                    room_id = rows[0].id; 
                    if ( mode == 1 ) {
                        var randomList = [];
                        for (let i = 1; i <= count; ++i) {
                            var randomNum = Math.floor(Math.random() * 70) + 1;
                            if (!contains(randomList, randomNum)) {
                                randomList.push(randomNum);
                                var query = 'INSERT INTO questions_in_game_room VALUES ((SELECT MAX(id)+1 FROM questions_in_game_room), (SELECT question FROM questions WHERE id == ' + randomNum + '), ' + room_id + ', ' + i + ')';
                                executeQuery(query)
                            } else {
                                i--;
                            }
                        }
                    }
                    var quer = 'INSERT INTO user_in_game_room VALUES ((SELECT MAX(id)+1 FROM user_in_game_room), ' + main_id + ', ' + room_id + ')';
                    executeQuery(quer)
                    loadRoom();
                    quer = 'SELECT * FROM game_room WHERE id == ' + room_id;
                    executeQuery(quer)
                    .then(count => { 
                        global_user_count = count[0].user_count;
                        document.getElementById("user_count_in_connect").innerHTML = '1/' + global_user_count;
                    })
                    intervalId = setInterval(loadUsers, 1000);
                })
                .catch(err => {
                    console.error('Ошибка:', err);
                });
            } else {
                document.getElementById("ErrorWindow").innerHTML = 'Ошибка:<br>Такая комната уже существует!';
                document.getElementById("ErrorWindow").style.transform = 'translateY(0vh)'
                setTimeout(() => document.getElementById("ErrorWindow").style.transform = 'translateY(-60vh)', 4000);
            }
        })
    } else {
        if (name == "") {
            document.getElementById("name").style.animation = 'inpError 0.5s forwards'
            setTimeout(() => document.getElementById("name").style.animation = '',500);
        } 
        if (pass == "") {
            document.getElementById("pass").style.animation = 'inpError 0.5s forwards'
            setTimeout(() => document.getElementById("pass").style.animation = '',500);
        }
    }
}
function loginInRoom() {
    document.getElementById("inRoomGame").style.transform = 'translateY(0px)';
}
function hideInRoomGame() {
    document.getElementById("inRoomGame").style.transform = 'translateY(-100vh)';
}
function loadRoom() {
    document.getElementById("search_players").style.transform = 'translateY(0)';
}
function hideLoadRoom() {
    document.getElementById("search_players").style.transform = 'translateY(-100vh)';
}
function writeQuestion() {
    document.getElementById("write_question").style.transform = 'translateY(0vh)'
}
function hideWriteQuestion() {
    document.getElementById("write_question").style.transform = 'translateY(+100vh)'
}
function searchRoom() {
    question_serial_number = 0;
    var name = document.getElementById("name1").value
    var pass = document.getElementById("pass1").value
    var quer = 'SELECT * FROM game_room WHERE room_name == \'' + name +'\' AND room_password == \'' + pass +'\'';
    executeQuery(quer)
    .then(rows => {
        if (rows.length === 0) {
            document.getElementById("ErrorWindow").innerHTML = 'Упс...<br>Не нашли такую комнату<br>Проверьте написание имя комнаты или пароля!';
            document.getElementById("ErrorWindow").style.transform = 'translateY(0vh)'
            setTimeout(() => document.getElementById("ErrorWindow").style.transform = 'translateY(-60vh)',4000);
            if (name == "") {
                document.getElementById("name1").style.animation = 'inpError 0.5s forwards'
                setTimeout(() => document.getElementById("name1").style.animation = '',500);
            } 
            if (pass == "") {
                document.getElementById("pass1").style.animation = 'inpError 0.5s forwards'
                setTimeout(() => document.getElementById("pass1").style.animation = '',500);
            }
        } else {
            room_id = rows[0].id;
            pass_for_load = true;
            var quer = 'INSERT INTO user_in_game_room VALUES ((SELECT MAX(id)+1 FROM user_in_game_room), ' + main_id + ', ' + room_id + ')';
            executeQuery(quer)
            .then(qwe1 => {
                hideInRoomGame();
                loadRoom();
                quer = 'SELECT * FROM game_room WHERE id == ' + room_id;
                executeQuery(quer)
                .then(count => { 
                    global_user_count = count[0].user_count;
                    document.getElementById("user_count_in_connect").innerHTML = '1/' + global_user_count;
                })
                intervalId = setInterval(loadUsers, 1000);
            })
        }
    })
}
function loadUsers() {
    var length_user;
    quer = 'SELECT * FROM user_in_game_room WHERE room_id == ' + room_id;
    executeQuery(quer)
    .then(usersInRoom => { 
        length_user = usersInRoom.length;
        for (let i = 0; i < usersInRoom.length; i++) {
            if (!contains(list, usersInRoom[i].user_id)) {
                quer = 'SELECT * FROM users WHERE id == ' + usersInRoom[i].user_id;
                executeQuery(quer)
                .then(nameUser => { 
                    document.getElementById("usersInRoom").innerHTML +='<div class="users"><img src="img/connect_icon.png" alt=""><p>' + nameUser[0].name + '</p></div>';
                })
                document.getElementById("user_count_in_connect").innerHTML = usersInRoom.length + '/' + global_user_count;
                list.push(usersInRoom[i].user_id);
            }
        }
        if (pass_for_load == false || length_user == global_user_count) {
            list.splice(0, list.length);
            hideLoadRoom()
            document.getElementById("usersInRoom").innerHTML = '';
            clearInterval(intervalId);
            if (pass_for_load == false) {
                var quer = 'DELETE FROM user_in_game_room WHERE user_id == ' + main_id;
                executeQuery(quer)
            }
            if ( length_user == global_user_count ) {
                quer = 'SELECT * FROM game_room WHERE id == ' + room_id;
                executeQuery(quer)
                .then(roomMode => { 
                    if (roomMode[0].room_mode == 1) {
                        openChatRoom();
                    } else {
                        writeQuestion();
                    }
                })
            }
        }
    })
}
function contains(arr, elem) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === elem) {
            return true;
        }
    }
    return false;
}
function openChatRoom() {
    if (question_serial_number < global_user_count) {
        document.getElementById("title_in_load").innerHTML = 'Раунд ' + (question_serial_number + 1);
        document.getElementById("load_msg_window").style.transform = 'translateY(0)';
        document.getElementById("title_in_load").style.animation = 'printed_text 2s 2s forwards, winP 2s forwards';
        document.getElementById("load_msg_window").style.animation = 'opasityWin 1s forwards';
        document.getElementById("load_logo_in_win").style.animation = 'winImg 1s 2s forwards';
    } else {
        list.length = 0;
        document.getElementById("title_in_load").innerHTML = 'Конец игры';
        document.getElementById("load_msg_window").style.transform = 'translateY(0)';
        document.getElementById("title_in_load").style.animation = 'printed_text2 2s 2s forwards, winP 2s forwards';
        document.getElementById("load_msg_window").style.animation = 'opasityWin 1s forwards';
        document.getElementById("load_logo_in_win").style.animation = 'winImg 1s 2s forwards';
        var quer = 'DELETE FROM user_in_game_room WHERE user_id == ' + main_id;
        executeQuery(quer)
        var quer = 'SELECT * FROM game_room WHERE id == ' + room_id;
        executeQuery(quer)
        .then(rew => { 
            console.log(rew.length);
            if (rew.length != 0) {
                var quer = 'DELETE FROM game_room WHERE id == ' + room_id;
                executeQuery(quer)
            }
        })
        user_count = 0;
        usersCount = 0;
        global_user_count = 0;
    }
    setTimeout(() => document.getElementById("load_msg_window").style.transform = 'translateY(+100vh)', 5000);
    setTimeout(() => {
        document.getElementById("title_in_load").style.animation = '';
        document.getElementById("load_msg_window").style.animation = '';
        document.getElementById("load_logo_in_win").style.animation = '';
    }, 6000)
    /*if (pass_for_delete == true) {
        var quer = 'DELETE FROM questions_in_game_room WHERE serial_number == ' + question_serial_number;
        executeQuery(quer)
    }*/
    document.getElementById("chat_input").innerHTML = '<input type="text" id="inp_chat" placeholder="Пиши тут..."><img src="img/send.svg" alt="" onclick="readyMessage()">'
    document.getElementById("chat_input").onclick = 'openKeyboard';
    document.getElementById("chat_room").style.transform = 'translateY(0px)';
    var quer = 'SELECT * FROM questions_in_game_room WHERE room_id == ' + room_id + ' ORDER BY serial_number';
    executeQuery(quer)
    .then(list2 => { 
        if (list2.length == 0) {
            closeChatRoom();
        } else {
            question_id = parseInt(list2[0].id);
            document.getElementById("chat").innerHTML = '<p id="question_inchat"></p>';
            document.getElementById("question_inchat").innerHTML = 'Вопрос:<br>' + list2[0].question;
            chat_string = '<p id="question_inchat">Вопрос:<br>' + list2[0].question + '</p>';
        }
    })
}
function closeChatRoom() {
    document.getElementById("chat_room").style.transform = 'translateY(+100vh)';
}
function canselSearch() {
    pass_for_load = false;
    var quer = 'SELECT * FROM game_room WHERE id == ' + room_id;
    executeQuery(quer)
    .then(list => { 
        if (list.length != 0) {
            var quer = 'DELETE FROM game_room WHERE id == ' + room_id;
            executeQuery(quer)
        }
    })
}
var elHeight = 0;
let msg_id = "";
function openButton(obj) {
    msg_id = obj.id;
    if (document.getElementById(obj.id).className == 'message_left') {
        msgSring = document.getElementById(obj.id).innerHTML;
        document.getElementById(obj.id).className += ' open';
        elHeight = parseInt(document.getElementById(obj.id).offsetHeight);
        document.querySelector('.open').style.height = (parseInt(document.getElementById(obj.id).offsetHeight) + 10) + 'px';
        document.getElementById('close_but').className = 'closeMsgActive';
        document.getElementById('notification').style.transform = 'translate(0px)'
    } else if (document.getElementById(obj.id).className == 'message_left open') {
        document.querySelector('.open').style.height = elHeight + 'px';
        document.getElementById(obj.id).className = 'message_left';
        document.getElementById('close_but').className = '';
        document.getElementById('notification').style.transform = 'translateY(-200px)'
    }
}
function closeButton() {
    document.querySelector('.open').style.height = elHeight + 'px';
    document.getElementById(msg_id).className = 'message_left';
    document.getElementById(msg_id).innerHTML = msgSring;
    document.getElementById('close_but').className = '';
    document.getElementById('notification').style.transform = 'translateY(-200px)'
}
function openKeyboard() {
    document.getElementById("close_keyboard").className = 'closeKeyboardActive';
}
function closeKeyboard() {
    document.getElementById("close_keyboard").className = '';
}
function readyQuestion() {
    var question = document.getElementById("question").value;
    if (question.length == 0) {
        document.getElementById("ErrorWindow").innerHTML = 'Упс...<br>А вопрос то писать кто будет?';
        document.getElementById("ErrorWindow").style.transform = 'translateY(0vh)'
        setTimeout(() => document.getElementById("ErrorWindow").style.transform = 'translateY(-30vh)',4000);
    } else {
        var quer = 'SELECT MAX(serial_number)+1 AS count FROM questions_in_game_room WHERE room_id == ' + room_id;
        executeQuery(quer)
        .then(count1 => { 
            if (count1[0].count == null) {
                var query = 'INSERT INTO questions_in_game_room VALUES ((SELECT MAX(id)+1 FROM questions_in_game_room), "' + question + '", ' + room_id + ', 1)';
                executeQuery(query)
            } else {
                var query = 'INSERT INTO questions_in_game_room VALUES ((SELECT MAX(id)+1 FROM questions_in_game_room), "' + question + '", ' + room_id + ', (SELECT MAX(serial_number)+1 FROM questions_in_game_room WHERE room_id == ' + room_id + '))';
                executeQuery(query)
            }
        })
        document.getElementById("ready_write_question_button").innerHTML = 'Ждем других...';
        document.getElementById("ready_write_question_button").style.animation = 'pulsar 1s infinite';
        document.getElementById("ready_write_question_button").onclick = '';
        var quer = 'SELECT * FROM game_room WHERE id == ' + room_id;
        executeQuery(quer)
        .then(quesCount => { 
            usersCount = quesCount[0].user_count;
        })
        loadQuestion()
        document.getElementById("ready_write_question_button").onclick = 'readyQuestion()';
    }
}
function loadQuestion() {
    var quer = 'SELECT * FROM questions_in_game_room WHERE room_id == ' + room_id;
    executeQuery(quer)
    .then(quesCount => { 
        document.getElementById("ready_users").innerHTML = 'Готово ' + quesCount.length +'/' + usersCount + ' игрока'
        if (quesCount.length < usersCount) {
            setTimeout(() => loadQuestion(), 1000)
        }
        else {
            hideWriteQuestion();
            openChatRoom();
        }
    })
}
function readyMessage() {
    var message = document.getElementById("inp_chat").value
    if (message.length === 0) {
        document.getElementById("ErrorWindow").innerHTML = 'Упс...<br>Надо сначала написать ответ на вопрос(';
        document.getElementById("ErrorWindow").style.transform = 'translateY(0vh)'
        setTimeout(() => document.getElementById("ErrorWindow").style.transform = 'translateY(-30vh)',4000);
    }
    else {
        var quer = 'INSERT INTO review_for_question VALUES ((SELECT MAX(id)+1 FROM review_for_question), ' + question_id + ', "' + message + '", ' + main_id + ')';
        executeQuery(quer)
        document.getElementById("chat_input").innerHTML = '<p>Ждем остальных</p>';
        document.getElementById("chat").innerHTML += '<p class="titleMsg" id="readyTitle">Готово 2/3 игрока</p>';
        document.getElementById("chat_input").style.animation = 'pulsarMin 1s infinite';
        loadAllMessage() 
    }
}
function loadAllMessage() {
    var quer = 'SELECT * FROM review_for_question WHERE question_id == ' + question_id;
    executeQuery(quer)
    .then(reviewCount => { 
        document.querySelector(".titleMsg").innerHTML = 'Готово ' + reviewCount.length +'/' + global_user_count + ' игрока';
        if (reviewCount.length < global_user_count) { 
            setTimeout(() => loadAllMessage(), 1000)
        }
        else {
            sendAllMessage()
        }
    })
}
function sendAllMessage() {
    document.getElementById("chat_input").innerHTML = '<p>Дальше</p>';
    document.getElementById("chat_input").onclick = function() {
        further();
    };
    document.getElementById("chat_input").style.animation = '';
    document.getElementById("chat").innerHTML = chat_string;
    var quer = 'SELECT * FROM review_for_question WHERE question_id == ' + question_id;
    executeQuery(quer)
    .then(review => { 
        for (let i = 0; i < review.length; i++) {
            if (review[i].user_id == main_id) {
                document.getElementById("chat").innerHTML += '<div class="message_right" id="' + review[i].id + '"><p>' + review[i].review + '</p></div>';
                setTimeout(() => document.getElementById(review[i].id).style.animation = 'emergeRight 0.5s forwards', i * 1000);
            } else {
                document.getElementById("chat").innerHTML += '<div class="message_left" onclick="openButton(this)" id="' + review[i].id + '"><p>' + review[i].review + '</p></div>';
                setTimeout(() => document.getElementById(review[i].id).style.animation = 'emergeLeft 0.5s forwards', i * 1000);
            }
        }
    })
}
function further() {
    var quer = 'DELETE FROM review_for_question WHERE user_id == ' + main_id;
    executeQuery(quer)
    document.getElementById("chat_input").innerHTML = '<p>Ждем остальных</p>';
    document.getElementById("chat_input").style.animation = 'pulsarMin 1s infinite';
    waitUsers()
}
function waitUsers() {
    var quer = 'SELECT * FROM review_for_question WHERE question_id == ' + question_id;
    executeQuery(quer)
    .then(reviewCount => { 
        if (reviewCount.length == 0) {
            question_serial_number += 1;
            pass_for_delete = true;
            document.getElementById("chat_input").style.animation = '';
            openChatRoom()
        } else {
            setTimeout(() => waitUsers(), 1000);
        }
    })
}