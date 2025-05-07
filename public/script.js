// script.js
// ========== Глобальные обработчики ==========
window.sendReviewAnimate = function() {
    UI.toggleReviewWindow(true);
  }
  
  window.hideReviewAnimate = function() {
    UI.toggleReviewWindow(false);
  }
  
  window.getProfil = async function() {
    try {
      const user = await UserManager.getCurrentUser();
      UI.showProfile(user);
    } catch (error) {
      UI.showError(error.message);
    }
  }
  
  window.startGame = function() {
    GameController.initGame();
    UI.toggleStartGameWindow(true);
  }
  
  window.makeRoom = function() {
    RoomManager.initRoomCreation();
  }
  
  window.readyMessage = function() {
    GameController.handleMessageSubmit();
  }
  
  // ========== Класс UI (дополненный) ==========
  class UI {
    static toggleReviewWindow(show) {
      const reviewWindow = document.getElementById("onclickReviewWindow");
      reviewWindow.style.transform = show ? 'translateY(0)' : 'translateY(+350px)';
      this.toggleOverlay(show);
    }
  
    static showProfile(user) {
      const profileHtml = user ? 
        `<img src="img/profil_icon_1.png" alt="" style="height: 150px;">
         <h1>${user.name} ${user.last_name}</h1>
         <p>Регистрация: ${user.date_of_registration}</p>` 
        : `<img src="img/profil_icon_0.png" alt="">
           <p>Для входа зайдите через Telegram бота</p>`;
      
      document.getElementById("profilWindow").innerHTML = profileHtml;
      this.toggleElement("profilWindow", true);
    }
  
    static toggleStartGameWindow(show) {
      this.toggleElement("start-game", show);
      this.toggleOverlay(show);
    }
  
    static toggleElement(id, show) {
      const el = document.getElementById(id);
      if (el) el.style.transform = show ? 'translateY(0)' : 'translateY(+400px)';
    }
  
    static toggleOverlay(show) {
      document.getElementById("opasity-win").style.transform = 
        show ? 'translateY(0)' : 'translateY(+100vh)';
    }
  
    static handleAnimation(element, animation) {
      element.style.animation = animation;
      setTimeout(() => element.style.animation = '', 500);
    }
  }
  
  // ========== Класс GameController (дополненный) ==========
  class GameController {
    static async initGame() {
      try {
        this.resetGameState();
        await this.loadInitialData();
        UI.updateGameUI();
      } catch (error) {
        UI.showError(error.message);
      }
    }
  
    static handleMessageSubmit() {
      const input = document.getElementById("inp_chat");
      if (!input.value.trim()) {
        UI.showError("Напишите сообщение!");
        UI.handleAnimation(input, 'inpError 0.5s');
        return;
      }
      this.sendMessage(input.value);
      input.value = '';
    }
  
    static async sendMessage(text) {
      try {
        await DatabaseService.executeQuery(
          `INSERT INTO review_for_question (...) VALUES (...)`,
          [text, currentQuestionId, mainUserId]
        );
        UI.updateChat();
      } catch (error) {
        UI.showError("Ошибка отправки сообщения");
      }
    }
  }
  
  // ========== Инициализация ==========
  document.addEventListener('DOMContentLoaded', () => {
    // Привязка сложных обработчиков
    document.getElementById("but-start-game").addEventListener('click', () => {
      GameController.showGameModes();
    });
    
    // Инициализация WebSocket
    NetworkManager.initWebSocket();
  });