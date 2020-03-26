import {lobbyStart, lobbyKillProcess} from '/rooms/lobby.js';
import {introStart, introKillProcess} from '/rooms/intro.js';

class RoomCoordinator {
  constructor(){
    this.intro_container = document.getElementById('intro_container');
    this.lobby_container = document.getElementById('lobby_container');

    this.setRoom = (room) => {
      if(room == 'lobby'){
        this.intro_container.style.display = 'none';
        this.lobby_container.style.display = 'flex';
        
        introKillProcess();
        lobbyStart();
      }else if(room == 'intro'){
        this.intro_container.style.display = 'flex';
        this.lobby_container.style.display = 'none';
        
        lobbyKillProcess();
        introStart();
      }
    }
  }
}

const roomCoordinator = new RoomCoordinator();
roomCoordinator.setRoom('intro');

document.getElementById('skip_intro').addEventListener("click", function(){
  roomCoordinator.setRoom('lobby');
});