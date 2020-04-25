const lobby_canvas = document.getElementById('lobby_canvas');
const lobby_context = lobby_canvas.getContext("2d");
const shootingSound = new Audio('/static/assets/shooting.wav');
const newPlayerSound = new Audio('/static/assets/new_player.wav');

const atmosphere_sound = new Howl({
  src: ['/static/assets/atmosphere.wav'],
  loop: true,
  volume: 0.4
});

const glow = false;
const lines = false;

const resizeCanvas = () => {
  lobby_canvas.width = window.innerWidth;
  lobby_canvas.height = window.innerHeight;
  lobby_canvas.style.width = window.innerWidth;
  lobby_canvas.style.height = window.innerHeight;
}

window.onresize = () => {
  resizeCanvas();
}
resizeCanvas();

const socket = io({
  reconnection: false,
  timeout: 2500
});

socket.on('players', (players) => {
  delete players[socket.id]

  for(player in otherPlayers){
    if(players[player] == null){
      delete otherPlayers[player];
    }
  }

  for(player in players){
    if(otherPlayers[player] != null){
      otherPlayers[player].newValues(players[player].x, players[player].y, players[player].vx, players[player].vy, players[player].rotation);
    }else{
      otherPlayers[player] = new OtherPlayer();
      newPlayerSound.play();
    }
  }
});

socket.on('keys', (players) => {
  delete players[socket.id]

  for(player in otherPlayers){
    if(players[player] == null){
      delete otherPlayers[player];
    }
  }

  for(player in players){
    if(otherPlayers[player] != null){
      otherPlayers[player].keys(players[player][0], players[player][1], players[player][2], players[player][3], players[player][4]);
    }else{
      otherPlayers[player] = new OtherPlayer();
    }
  }
});

const otherPlayers = {};

class OtherPlayer{
  constructor(){
    this.speed = 0;
    this.acceleration = 1;
    this.decceleration = 1;
    this.maxMaxSpeed = 40;
    this.minMaxSpeed = 30;
    this.maxSpeed = this.maxMaxSpeed;

    this.x = 0;
    this.y = 0;

    this.realX = 0;
    this.realY = 0;

    this.rotation = 0;
    this.realRotation = 0;
    this.rotationV = 0;
    this.maxRotationV = 0;
    this.maxMaxRotationV = 4.0;
    this.minMaxRotationV = 1.0;

    this.radians;

    this.activeLeft;
    this.activeRight;
    this.activeDown;
    this.activeAcc;

    this.vy = 0;
    this.vx = 0;

    this.realVy = 0;
    this.realVx = 0;

    this.update = () => {
      if(this.activeRight || this.activeLeft){
        this.maxSpeed = this.minMaxSpeed;
      }else{
        this.maxSpeed = this.maxMaxSpeed;
      }

      this.acceleration = (1-(this.speed/this.maxSpeed))/2;
      this.decceleration = (this.speed/this.maxSpeed)/3;
      if(this.activeAcc && !this.activeDown){
        this.speed += this.acceleration;
      }else{
        this.speed -= this.activeDown ? this.decceleration*5 : this.decceleration;
        if(this.speed < 0){
          this.speed = 0;
        }
      }

      this.maxRotationV = this.minMaxRotationV+(this.maxMaxRotationV-this.minMaxRotationV)*(this.speed/this.maxSpeed)

      if(this.activeLeft){
        this.rotationV -= 0.1;
      }else if(this.activeRight){
        this.rotationV += 0.1;
      }else{
        this.rotationV -= (this.rotationV/this.maxRotationV)/16;
      }

      if(this.rotationV <= -this.maxRotationV){
        this.rotationV = -this.maxRotationV;
      }else if(this.rotationV >= this.maxRotationV){
        this.rotationV = this.maxRotationV;
      }

      this.radians = (-this.rotation+90) * 0.0174533;

      this.vy = -Math.sin(this.radians) * ((this.speed < 2 && this.activeUp) ? 2 : this.speed);
      this.vx = Math.cos(this.radians) * ((this.speed < 2 && this.activeUp) ? 2 : this.speed);

      this.y += this.vy;
      this.x += this.vx;

      this.rotation += this.rotationV;

      this.blendWithReal();
    }

    this.blendWithReal = () => {
      this.x += (this.realX - this.x)/10;
      this.y += (this.realY - this.y)/10;
      this.vx += (this.realVx - this.vx)/10;
      this.vy += (this.realVy - this.vy)/10;
      this.rotation += (this.realRotation - this.rotation)/10;
    }

    this.newValues = (x, y, vx, vy, rotation) => {
      this.realX = x; 
      this.realY = y; 
      this.realVx = vx; 
      this.realVy = vy; 
      this.realRotation = rotation;
    }

    this.keys = (acc, left, right, down, up) => {
      this.activeAcc = acc;
      this.activeLeft = left;
      this.activeRight = right;
      this.activeDown = down;
     }

    this.newValues(0, 0, 0, 0, 0, 0);

    this.render = (context) => {
      context.fillStyle = "#fff";
      context.strokeStyle = "#fff";
      context.save();
      context.beginPath();
      
      context.translate(lobby_canvas.width/2, lobby_canvas.height/2);
      context.scale(1.2 - (newPlayer.speed/newPlayer.maxMaxSpeed)/3, 1.2 - (newPlayer.speed/newPlayer.maxMaxSpeed)/3);
      context.rotate(-newPlayer.rotation * Math.PI / 180);
      context.translate(-lobby_canvas.width/2, -lobby_canvas.height/2);
      context.translate(lobby_canvas.width/2 + this.x - newPlayer.x, lobby_canvas.height/2 + this.y - newPlayer.y);
      context.rotate(this.rotation * Math.PI / 180);

      context.moveTo(0, 0);
      context.lineTo(-15, 35);
      context.lineTo(0, 25);
      context.lineTo(15, 35);
      context.lineTo(0, 0);
      context.stroke();
      context.closePath();
      context.restore();
    }
  }
}

class Player{
  constructor(){
    this.speed = 0;
    this.acceleration = 1;
    this.decceleration = 1;
    this.maxMaxSpeed = 40;
    this.minMaxSpeed = 30;
    this.maxSpeed = this.maxMaxSpeed;

    this.x = 0;
    this.y = 0;

    this.rotation = 0;
    this.rotationV = 0;
    this.maxRotationV = 0;
    this.maxMaxRotationV = 4.0;
    this.minMaxRotationV = 1.0;

    this.radians;

    this.activeLeft;
    this.activeRight;
    this.activeDown;
    this.activeAcc;

    this.vy = 0;
    this.vx = 0;

    this.jerk = 0;

    this.update = () => {
      if(this.activeRight || this.activeLeft){
        this.maxSpeed = this.minMaxSpeed;
      }else{
        this.maxSpeed = this.maxMaxSpeed;
      }

      this.acceleration = (1-(this.speed/this.maxSpeed))/2;
      this.decceleration = (this.speed/this.maxSpeed)/3;
      if(this.activeAcc && !this.activeDown){
        this.speed += this.acceleration;
      }else{
        this.speed -= this.activeDown ? this.decceleration*5 : this.decceleration;
        if(this.speed < 0){
          this.speed = 0;
        }
      }

      this.maxRotationV = this.minMaxRotationV+(this.maxMaxRotationV-this.minMaxRotationV)*(this.speed/this.maxSpeed)

      if(this.activeLeft){
        this.rotationV -= 0.1;
      }else if(this.activeRight){
        this.rotationV += 0.1;
      }else{
        this.rotationV -= (this.rotationV/this.maxRotationV)/16;
      }

      if(this.rotationV <= -this.maxRotationV){
        this.rotationV = -this.maxRotationV;
      }else if(this.rotationV >= this.maxRotationV){
        this.rotationV = this.maxRotationV;
      }

      this.radians = (-this.rotation+90) * 0.0174533;

      this.vy = -Math.sin(this.radians) * ((this.speed < 2 && this.activeUp) ? 2 : this.speed);
      this.vx = Math.cos(this.radians) * ((this.speed < 2 && this.activeUp) ? 2 : this.speed);

      this.jerk -= this.jerk/4;

      this.y += this.vy;
      this.x += this.vx;

      this.rotation += this.rotationV;
    }
    
    this.updateKey = (key, active) => {
      if(key == 32){
        this.shooting(active);
      }

      if(key == 37 || key == 65){
        this.activeLeft = active;
      }else if(key == 39 || key == 68){
        this.activeRight = active;
      }else if(key == 40 || key == 83){
        this.activeDown = active;
      }else if(key == 38 || key == 87){
        this.activeAcc = active;
      }
    }

    this.isShooting = false;
    this.ammo = 25;
    this.shooting = (active) => {
      this.isShooting = active;
      if(active){
        shootingSound.play();
      }else{
        shootingSound.pause();
        shootingSound.currentTime = 0;
      }
    }

    this.kick = () => {
      if(this.isShooting && this.ammo > 0){
        this.jerk = 10;
        this.ammo--;
      }
    }

    setInterval(this.kick, 90);

    this.render = (context) => {
      context.fillStyle = "#fff";
      context.strokeStyle = "#fff";
      if(glow){
        context.shadowBlur = 30;
        context.shadowColor = "#fff";
      }
      context.save();
      context.beginPath();
      context.translate(lobby_canvas.width/2, lobby_canvas.height/2 - this.speed*4 + this.jerk);
      context.rotate(this.rotationV*4 * Math.PI / 180);
      context.scale(1.2 - (this.speed/this.maxMaxSpeed)/2, 1.2 - (this.speed/this.maxMaxSpeed)/2);
      context.moveTo(0, 0);
      context.lineTo(-15 + this.speed/15, 35);
      context.lineTo(0, 25);
      context.lineTo(15 - this.speed/15, 35);
      context.lineTo(0, 0);
      context.stroke();
      context.closePath();
      context.restore();
    }
  }
}

class Structure {
  constructor(x, y, width, height, depth){
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.depth = depth;

    this.render = (context, offset, player) => {
      const offLX = -((this.x - this.width/2) - player.x) / (this.depth);
      const offRX = -((this.x + this.width/2) - player.x) / (this.depth);
      const offTY = -((this.y - this.height/2) - player.y) / (this.depth);
      const offBY = -((this.y + this.height/2) - player.y) / (this.depth);

      const startX = this.x - this.width/2;
      const startY = this.y - this.height/2;

      const upperWidth = (startX - player.x + this.width - offRX) - (startX - player.x - offLX)
      const upperHeight = (startY - player.y + this.height - offBY) - (startY - player.y - offTY)

      context.beginPath();
      context.rect(startX - player.x, startY - player.y, this.width, this.height);

      context.moveTo(startX - player.x, startY - player.y);
      context.lineTo(startX - player.x - offLX, startY - player.y - offTY);

      context.moveTo(startX - player.x + this.width, startY - player.y);
      context.lineTo(startX - player.x + this.width - offRX, startY - player.y - offTY);

      context.moveTo(startX - player.x, startY - player.y + this.height);
      context.lineTo(startX - player.x - offLX, startY - player.y + this.height - offBY);

      context.moveTo(startX - player.x + this.width, startY - player.y + this.height);
      context.lineTo(startX - player.x + this.width - offRX, startY - player.y + this.height - offBY);

      context.rect(startX - player.x - offLX, startY - player.y - offTY, upperWidth, upperHeight);
      context.stroke();
      context.closePath();
      context.clearRect(startX - player.x - offLX + 1, startY - player.y - offTY + 1, upperWidth - 2, upperHeight - 2);
     }

    this.shouldRender = (x, y, offset) => {
      if(x - offset <= this.x && x + offset >= this.x){
        if(y - offset <= this.y && y + offset >= this.y){
          return true;
        }
      }
      return false;
    }
  }
}

const structures = [
  new Structure(0, 0, 600, 150, 4),
  new Structure(-62.5, 250, 125, 150, 4),
  new Structure(325, 250, 400, 150, 4),
  new Structure(62.5, -250, 125, 150, 4),
  new Structure(-325, -250, 400, 150, 4)
];

class MapRenderer {
  constructor(height, width) {
    this.renderFieldSize = Math.sqrt(height*height + width*width);
    this.overscanAmount = width > height ? this.renderFieldSize-width : this.renderFieldSize-height;
    this.renderAtPosition = (player, context) => {
      context.save();
      context.translate(lobby_canvas.width/2, lobby_canvas.height/2);
      context.rotate(-player.rotation * Math.PI / 180);
      context.scale(1.2 - (player.speed/player.maxMaxSpeed)/3, 1.2 - (player.speed/player.maxMaxSpeed)/3);
      context.strokeStyle = "#fff"
      
      for(let structure of structures){
        if(structure.shouldRender(player.x, player.y, this.renderFieldSize/2)){
          structure.render(context, this.renderFieldSize/2, player);
        }
      }

      context.restore();
    }
  }
}

class EffectsLayer {
  constructor() {
    this.offsetX = 0;
    this.offsetY = 0;
    this.gridGap = 500;
    this.rotation = 1;

    this.renderGrid = (context, player) => {
      context.strokeStyle = "#ffffff11";
      if(glow){
        context.shadowBlur = 0;
        context.shadowColor = "#00000000";
      }
      context.lineWidth = 2;

      this.startX = lobby_canvas.width/2 - (player.x % 500);
      this.startY = lobby_canvas.height/2 - (player.y % 500);
      let distanceStep = 0;

      this.offsetY = -player.y;
      this.offsetX = -player.x;

      context.save();
      context.beginPath();
      context.translate(lobby_canvas.width/2, lobby_canvas.height/2);
      context.rotate(-player.rotation * Math.PI / 180);
      context.scale(1.2 - (player.speed/player.maxMaxSpeed)/3, 1.2 - (player.speed/player.maxMaxSpeed)/3);
      context.translate(-lobby_canvas.width/2, -lobby_canvas.height/2);
      while(distanceStep < 3){
        let currentDistance = distanceStep * this.gridGap;

        if(currentDistance > 0){
          context.moveTo(this.startX - currentDistance, -lobby_canvas.width*0.3);
          context.lineTo(this.startX - currentDistance, lobby_canvas.width*1.3);
        }
        
        context.moveTo(this.startX + currentDistance, -lobby_canvas.width*0.3);
        context.lineTo(this.startX + currentDistance, lobby_canvas.width*1.3);

        context.moveTo(-lobby_canvas.width*0.3, this.startY - currentDistance);
        context.lineTo(lobby_canvas.width*1.3, this.startY - currentDistance);

        context.moveTo(-lobby_canvas.width*0.3, this.startY + currentDistance);
        context.lineTo(lobby_canvas.width*1.3, this.startY + currentDistance);

        context.stroke();

        distanceStep++;
      }

      context.closePath();
      context.restore();
    }

    this.renderLines = (context, player) => {
      let test = 0;
      if(glow){
        context.shadowBlur = 0;
        context.shadowColor = "#00000000";
      }
      context.strokeStyle = `#aaaaaa18`;
      context.lineWidth = 3;
      context.beginPath();
      while(test < lobby_canvas.height){
        context.moveTo(0, test);
        context.lineTo(lobby_canvas.width, test);
  
        test+=6;
      }
      context.stroke();
      context.closePath();
    }

    this.renderText = (context, player) => {
      context.font = "20px Numbers";
      context.fillText("SPEED: "+(parseInt(Math.ceil(player.speed)) >= player.maxMaxSpeed ? 'MAX' : parseInt(Math.ceil(player.speed))), 30, lobby_canvas.height - 30);
    }
  }
}

let newPlayer = new Player();
let renderer = new MapRenderer(lobby_canvas.width, lobby_canvas.height);
let effects = new EffectsLayer();

const removeInstructions = () => {
  document.getElementById('instructions').innerHTML = "";
}

window.addEventListener('keydown', function(event) {newPlayer.updateKey(event.keyCode, true); removeInstructions();}, false);
window.addEventListener('keyup', function(event) {newPlayer.updateKey(event.keyCode, false);}, false);

const updateLobbyCanvas = () => {
  lobby_context.clearRect(0, 0, lobby_canvas.width, lobby_canvas.height);
  effects.renderGrid(lobby_context, newPlayer);
  newPlayer.render(lobby_context);
  for(player in otherPlayers){
    otherPlayers[player].render(lobby_context);
  }
  renderer.renderAtPosition(newPlayer, lobby_context);
  effects.renderText(lobby_context, newPlayer);
  if(lines){effects.renderLines(lobby_context, newPlayer);}
}

const newFrame = () => {
  newPlayer.update();
  for(player in otherPlayers){
    otherPlayers[player].update();
  }
  updateLobbyCanvas();
}

const correction = () => {
  socket.emit('position', {x: parseInt(newPlayer.x), y: parseInt(newPlayer.y), vx: parseInt(newPlayer.vx*100)/100, vy: parseInt(newPlayer.vy*100)/100, rotation: parseInt(newPlayer.rotation)});
}

const keys = () => {
  socket.emit('keys', [newPlayer.activeAcc, newPlayer.activeLeft, newPlayer.activeRight, newPlayer.activeDown, newPlayer.activeUp]);
}

let newFrameInterval = null;
let correctionInterval = null;
let keysInterval = null;

const start = () => {
  //Frame gen clock
  newFrameInterval = setInterval(newFrame, 1000/60);

  //Correction update clock
  correctionInterval = setInterval(correction, 1000/30);

  //Keys update clock
  keysInterval = setInterval(keys, 1000/60);

  atmosphere_sound.play();
}

const killProcess = () => {
  clearInterval(newFrameInterval);
  clearInterval(correctionInterval);
  clearInterval(keysInterval);
  atmosphere_sound.stop();
}

export {start as lobbyStart,
  killProcess as lobbyKillProcess};