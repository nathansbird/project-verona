const canvas = document.getElementById('canvas');
const context = canvas.getContext("2d");

const glow = false;
const lines = false;

const resizeCanvas = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.width = window.innerWidth;
  canvas.style.height = window.innerHeight;
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
      this.x += (this.realX - this.x)/2;
      this.y += (this.realY - this.y)/2;
      this.vx += (this.realVx - this.vx)/2;
      this.vy += (this.realVy - this.vy)/2;
      this.rotation += (this.realRotation - this.rotation)/2;
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
      this.activeUp = up;
    }

    this.newValues(0, 0, 0, 0, 0, 0);

    this.render = (context) => {
      context.fillStyle = "#fff";
      context.strokeStyle = "#fff";
      context.save();
      context.beginPath();
      
      context.translate(canvas.width/2, canvas.height/2);
      context.scale(1.2 - (newPlayer.speed/newPlayer.maxMaxSpeed)/3, 1.2 - (newPlayer.speed/newPlayer.maxMaxSpeed)/3);
      context.rotate(-newPlayer.rotation * Math.PI / 180);
      context.translate(-canvas.width/2, -canvas.height/2);
      context.translate(canvas.width/2 + this.x - newPlayer.x, canvas.height/2 + this.y - newPlayer.y);
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
    this.activeUp;
    this.activeAcc;

    this.vy = 0;
    this.vx = 0;

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
    }
    
    this.updateKey = (key, active) => {
      if(key == 37 || key == 65){
        this.activeLeft = active;
      }else if(key == 38 || key == 87){
        this.activeUp = active;
      }else if(key == 39 || key == 68){
        this.activeRight = active;
      }else if(key == 40 || key == 83){
        this.activeDown = active;
      }else if(key == 32){
        this.activeAcc = active;
      }
    }

    this.render = (context) => {
      context.fillStyle = "#fff";
      context.strokeStyle = "#fff";
      if(glow){
        context.shadowBlur = 30;
        context.shadowColor = "#fff";
      }
      context.save();
      context.beginPath();
      context.translate(canvas.width/2, canvas.height/2 - this.speed*4);
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
      const offX = -(this.x - player.x) / (this.depth);
      const offY = -(this.y - player.y) / (this.depth);

      const startX = this.x - this.width/2;
      const startY = this.y - this.height/2;

      const difference = 10;

      context.beginPath();
      context.rect(startX - player.x + difference, startY - player.y + difference, this.width - difference*2, this.height - difference*2);

      context.moveTo(startX - player.x + difference, startY - player.y + difference);
      context.lineTo(startX - player.x - offX, startY - player.y - offY);

      context.moveTo(startX - player.x + this.width - difference, startY - player.y + difference);
      context.lineTo(startX - player.x + this.width - offX, startY - player.y - offY);

      context.moveTo(startX - player.x + difference, startY - player.y + this.height - difference);
      context.lineTo(startX - player.x - offX, startY - player.y + this.height - offY);

      context.moveTo(startX - player.x + this.width - difference, startY - player.y + this.height - difference);
      context.lineTo(startX - player.x + this.width - offX, startY - player.y + this.height - offY);

      context.rect(startX - player.x - offX, startY - player.y - offY, this.width, this.height);
      context.stroke();
      context.closePath();

      context.fillStyle = "#603";
      context.clearRect(startX - player.x - offX + 1, startY - player.y - offY + 1, this.width - 2, this.height - 2);
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
      context.translate(canvas.width/2, canvas.height/2);
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
        context.shadowBlur = 50;
        context.shadowColor = "#ff4477cc";
      }
      
      context.lineWidth = 2;

      this.startX = canvas.width/2 - (player.x % 500);
      this.startY = canvas.height/2 - (player.y % 500);
      let distanceStep = 0;

      this.offsetY = -player.y;
      this.offsetX = -player.x;

      context.save();
      context.beginPath();
      context.translate(canvas.width/2, canvas.height/2);
      context.rotate(-player.rotation * Math.PI / 180);
      context.scale(1.2 - (player.speed/player.maxMaxSpeed)/3, 1.2 - (player.speed/player.maxMaxSpeed)/3);
      context.translate(-canvas.width/2, -canvas.height/2);
      while(distanceStep < 3){
        let currentDistance = distanceStep * this.gridGap;

        if(currentDistance > 0){
          context.moveTo(this.startX - currentDistance, -canvas.width*0.3);
          context.lineTo(this.startX - currentDistance, canvas.width*1.3);
        }
        
        context.moveTo(this.startX + currentDistance, -canvas.width*0.3);
        context.lineTo(this.startX + currentDistance, canvas.width*1.3);

        context.moveTo(-canvas.width*0.3, this.startY - currentDistance);
        context.lineTo(canvas.width*1.3, this.startY - currentDistance);

        context.moveTo(-canvas.width*0.3, this.startY + currentDistance);
        context.lineTo(canvas.width*1.3, this.startY + currentDistance);

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
      while(test < canvas.height){
        context.moveTo(0, test);
        context.lineTo(canvas.width, test);
  
        test+=6;
      }
      context.stroke();
      context.closePath();
    }

    this.renderText = (context, player) => {
      context.font = "20px Numbers";
      context.fillText("SPEED: "+(parseInt(Math.ceil(player.speed)) >= player.maxMaxSpeed ? 'MAX' : parseInt(Math.ceil(player.speed))), 30, canvas.height - 30);
    }
  }
}

let newPlayer = new Player();
let renderer = new MapRenderer(canvas.width, canvas.height);
let effects = new EffectsLayer();

const removeInstructions = () => {
  document.getElementById('instructions').innerHTML = "";
}

window.addEventListener('keydown', function(event) {newPlayer.updateKey(event.keyCode, true); removeInstructions();}, false);
window.addEventListener('keyup', function(event) {newPlayer.updateKey(event.keyCode, false);}, false);

const updateCanvas = () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  effects.renderGrid(context, newPlayer);
  newPlayer.render(context);
  for(player in otherPlayers){
    otherPlayers[player].render(context);
  }
  renderer.renderAtPosition(newPlayer, context);
  effects.renderText(context, newPlayer);
  if(lines){effects.renderLines(context, newPlayer);}
}

const newFrame = () => {
  newPlayer.update();
  for(player in otherPlayers){
    otherPlayers[player].update();
  }
  updateCanvas();
}

const correction = () => {
  socket.emit('position', {x: parseInt(newPlayer.x), y: parseInt(newPlayer.y), vx: parseInt(newPlayer.vx*100)/100, vy: parseInt(newPlayer.vy*100)/100, rotation: parseInt(newPlayer.rotation)});
}

const keys = () => {
  socket.emit('keys', [newPlayer.activeAcc, newPlayer.activeLeft, newPlayer.activeRight, newPlayer.activeDown, newPlayer.activeUp]);
}

//Frame gen clock
setInterval(newFrame, 1000/60);

//Correction update clock
setInterval(correction, 1000/30);

//Keys update clock
setInterval(keys, 1000/60);