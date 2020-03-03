const canvas = document.getElementById('canvas');
const context = canvas.getContext("2d");

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

class Player{
  constructor(){
    this.size = 60;

    this.speed = 0;
    this.acceleration = 1;
    this.decceleration = 1;
    this.maxMaxSpeed = 35;
    this.minMaxSpeed = 15;
    this.maxSpeed = this.maxMaxSpeed;

    this.x = 0;
    this.y = 0;

    this.angleX = 0.0;
    this.angleY = 1.0;

    this.rotation = 0;
    this.rotationV = 0;
    this.maxRotationV = 0;
    this.maxMaxRotationV = 4.0;
    this.minMaxRotationV = 1.0;

    this.radians;
    this.spin = 0;

    this.activeLeft;
    this.activeRight;
    this.activeUp;
    this.activeDown;
    this.activeAcc;

    this.update = () => {
      if(this.activeRight || this.activeLeft){
        this.maxSpeed = this.minMaxSpeed;
      }else{
        this.maxSpeed = this.maxMaxSpeed;
      }

      this.acceleration = (1-(this.speed/this.maxSpeed))/2;
      this.decceleration = (this.speed/this.maxSpeed)/2;
      if(this.activeAcc && !this.activeDown){
        this.speed += this.acceleration;
      }else{
        this.speed -= this.activeDown ? this.decceleration*3 : this.decceleration;
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

      this.vy = -Math.sin(this.radians) * this.speed;
      this.vx = Math.cos(this.radians) * this.speed;

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
      if(!this.hasInited){
        this.init();
      }

      context.fillStyle = "#fff";
      context.strokeStyle = "#fff";
      context.shadowBlur = 10;
      context.shadowColor = "#fff";
      context.save();
      context.beginPath();
      context.translate(canvas.width/2, canvas.height/2 - this.speed*4);
      context.rotate(this.rotationV*4 * Math.PI / 180);
      context.scale(1.2 - (this.speed/this.maxMaxSpeed)/2, 1.2 - (this.speed/this.maxMaxSpeed)/2);
      context.moveTo(0, 0);
      context.lineTo(-15 + this.speed/5 - (this.activeDown ? 5 : 0), 35);
      context.lineTo(0, 25);
      context.lineTo(15 - this.speed/5 + (this.activeDown ? 5 : 0), 35);
      context.lineTo(0, 0);
      context.stroke();
      context.closePath();
      context.restore();
    }

    this.hasInited = false;
    this.init = () => {
      this.x = canvas.width/2;
      this.y = canvas.height/2;
      this.hasInited = true;
    }
  }
}

class Map {
  constructor() {
    this.offsetX = 0;
    this.offsetY = 0;
    this.gridGap = 500;
    this.rotation = 1;

    this.render = (context, player) => {
      context.strokeStyle = "#fff";
      context.shadowBlur = 15;
      context.shadowColor = "#ff4477cc";
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

      let test = 0;
      context.shadowBlur = 0;
      context.shadowColor = "#00000000";
      context.strokeStyle = `#ffffff18`;
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
  }
}

class Indicators {
  constructor() {
    this.render = (context, player) => {
      context.font = "24px Arial";
      context.fillText("Speed: "+(parseInt(Math.ceil(player.speed)) >= 35 ? 'MAX' : parseInt(Math.ceil(player.speed))), 30, canvas.height - 30);
    }
  }
}

let newPlayer = new Player();
let newMap = new Map();
let indicators = new Indicators();
window.addEventListener('keydown', function(event) {newPlayer.updateKey(event.keyCode, true)}, false);
window.addEventListener('keyup', function(event) {newPlayer.updateKey(event.keyCode, false)}, false);

const updateCanvas = () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  newMap.render(context, newPlayer);
  newPlayer.render(context);
  indicators.render(context, newPlayer);
}

const newFrame = function(){
  newPlayer.update();
  updateCanvas();
}

//Frame gen clock
setInterval(newFrame, 1000/60);