let currentRoom = null;
const gameState = {
  room: null,
  questions: [],
  currentQuestionIndex: 0,
  players: new Map()
};

class DatabaseService {
  static async executeQuery(sql, params = []) {
    try {
      const response = await fetch('https://alexcrowd3-anochat-f80f.twc1.net/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql, params }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Database error');
      }

      return await response.json();
    } catch (error) {
      console.error('Query error:', error);
      this.showError(error.message);
      throw error;
    }
  }
}

class RoomManager {
  static async createRoom(name, pass, count, mode) {
    try {
      await this.validateRoomParams(name, pass);
      
      const checkQuery = `SELECT id FROM game_room WHERE room_name = ?`;
      const existing = await DatabaseService.executeQuery(checkQuery, [name]);
      
      if (existing.length > 0) {
        throw new Error('Room already exists');
      }

      const insertQuery = `INSERT INTO game_room(
        user_count, room_mode, room_name, room_password
      ) VALUES (?, ?, ?, ?)`;
      
      const result = await DatabaseService.executeQuery(insertQuery, [
        count, mode, name, pass
      ]);

      gameState.room = {
        id: result.lastInsertRowid,
        name,
        mode,
        maxPlayers: count
      };

      await this.insertInitialQuestions(mode, count, result.lastInsertRowid);
      await this.joinRoom(mainUserId, result.lastInsertRowid);
      
      return result.lastInsertRowid;
    } catch (error) {
      console.error('Room creation failed:', error);
      throw error;
    }
  }

  static async validateRoomParams(name, pass) {
    const NAME_REGEX = /^[\w\s-]{3,20}$/;
    const PASS_REGEX = /^[\w\d]{4,8}$/;
    
    if (!NAME_REGEX.test(name)) {
      throw new Error('Invalid room name (3-20 chars, alphanumeric)');
    }
    
    if (!PASS_REGEX.test(pass)) {
      throw new Error('Invalid password (4-8 chars, alphanumeric)');
    }
  }

  static async insertInitialQuestions(mode, count, roomId) {
    if (mode === 1) {
      const questions = await this.getRandomQuestions(count);
      const insertQuestions = questions.map((q, i) => 
        `INSERT INTO questions_in_game_room(question, room_id, serial_number)
         VALUES (?, ?, ?)`
      );
      
      for (const [index, query] of insertQuestions.entries()) {
        await DatabaseService.executeQuery(query, [
          questions[index].question,
          roomId,
          index + 1
        ]);
      }
    }
  }
}

class UserManager {
  static async joinRoom(userId, roomId) {
    const query = `INSERT INTO user_in_game_room(user_id, room_id)
                  VALUES (?, ?)`;
    try {
      await DatabaseService.executeQuery(query, [userId, roomId]);
      gameState.players.set(userId, {
        joinedAt: new Date().toISOString(),
        status: 'connected'
      });
    } catch (error) {
      console.error('Join room failed:', error);
      throw error;
    }
  }

  static async getCurrentUser() {
    if (!mainUserId) return null;
    const query = `SELECT * FROM users WHERE id = ?`;
    const [user] = await DatabaseService.executeQuery(query, [mainUserId]);
    return user;
  }
}

class GameController {
  static async startGame() {
    try {
      UI.showLoading();
      await this.initializeGame();
      await this.loadQuestions();
      UI.hideLoading();
      UI.showGameScreen();
    } catch (error) {
      UI.showError(error.message);
    }
  }

  static async nextQuestion() {
    if (gameState.currentQuestionIndex >= gameState.questions.length) {
      await this.endGame();
      return;
    }
    
    const question = gameState.questions[gameState.currentQuestionIndex];
    UI.displayQuestion(question);
    gameState.currentQuestionIndex++;
  }
}

class UI {
  static showError(message) {
    const errorWindow = document.getElementById('ErrorWindow');
    errorWindow.innerHTML = `Error: ${message}`;
    errorWindow.style.transform = 'translateY(0)';
    setTimeout(() => {
      errorWindow.style.transform = 'translateY(-60vh)';
    }, 4000);
  }

  static animateElement(id, animation) {
    const element = document.getElementById(id);
    if (element) {
      element.style.animation = animation;
      setTimeout(() => element.style.animation = '', 500);
    }
  }

  static updatePlayerCount(current, max) {
    const counter = document.getElementById('user_count_in_connect');
    if (counter) {
      counter.textContent = `${current}/${max}`;
    }
  }
}

// Инициализация игры
window.addEventListener('load', async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    mainUserId = parseInt(urlParams.get('main_id')) || 0;
    
    await DatabaseService.executeQuery(
      `DELETE FROM user_in_game_room WHERE user_id = ?`,
      [mainUserId]
    );

    const user = await UserManager.getCurrentUser();
    if (user) {
      document.getElementById('count').textContent = user.coin_count;
    }
  } catch (error) {
    console.error('Initialization error:', error);
  }
});

// Обновленные функции обработчиков
async function createRoom() {
  try {
    const name = document.getElementById("name").value;
    const pass = document.getElementById("pass").value;
    const count = document.getElementById("Player_count").value;
    const mode = document.querySelector('.active').dataset.mode;

    await RoomManager.createRoom(name, pass, count, mode);
    UI.updatePlayerCount(1, count);
    await loadUsers();
  } catch (error) {
    UI.showError(error.message);
  }
}

async function loadUsers() {
  try {
    const query = `SELECT u.* FROM user_in_game_room ugr
                  JOIN users u ON ugr.user_id = u.id
                  WHERE ugr.room_id = ?`;
    
    const users = await DatabaseService.executeQuery(query, [gameState.room.id]);
    
    const container = document.getElementById("usersInRoom");
    container.innerHTML = users.map(user => `
      <div class="users">
        <img src="img/connect_icon.png" alt="">
        <p>${user.name}</p>
      </div>
    `).join('');

    UI.updatePlayerCount(users.length, gameState.room.maxPlayers);

    if (users.length === gameState.room.maxPlayers) {
      await GameController.startGame();
    }
  } catch (error) {
    UI.showError(error.message);
  }
}