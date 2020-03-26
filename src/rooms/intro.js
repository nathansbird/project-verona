const intro_canvas = document.getElementById('intro_canvas');
const intro_context = intro_canvas.getContext("2d");
intro_canvas.style.background = "linear-gradient(45deg, #fff, #fff)";

var intro_sound = new Howl({
  src: ['/static/assets/intro_start.wav'],
  loop: false
});

var tutorial_sound = new Howl({
  src: ['/static/assets/intro_loop.wav'],
  loop: true
});

const resizeCanvas = () => {
  intro_canvas.width = window.innerWidth;
  intro_canvas.height = window.innerHeight;
  intro_canvas.style.width = window.innerWidth;
  intro_canvas.style.height = window.innerHeight;
}

window.onresize = () => {
  resizeCanvas();
}
resizeCanvas();

const letters = 'BIRD';
const studioLetters = 'STUDIOS';
let frame = 0;

class FrameGenerator {
  constructor(){
    this.getFrameBuilder = (frame) => {
      intro_context.fillStyle = "#000";
      this.currentFrame = frame;
      if(frame <= 16){
        return this.birdFrame;
      }if(frame <= 28){
        return this.birdStudiosFrame;
      }else if(frame == 29){
        document.getElementById('skip_intro').classList.toggle('inverted');
        intro_canvas.style.background = "transparent";
        return (context) => {}
      }else if(frame == 30){
        intro_context.shadowColor = "#ffffff88";
        intro_context.fillStyle = "#fff";
        intro_context.shadowBlur = 35;
        return this.birdFrame;
      }else if(frame == 31){
        intro_context.shadowColor = "#ffffff88";
        intro_context.fillStyle = "#fff";
        intro_context.shadowBlur = 35;
        return this.birdStudios;
      }else if(frame <= 32){
        intro_context.shadowColor = "#ffffff88";
        intro_context.fillStyle = "#fff";
        intro_context.shadowBlur = 35;
        return this.birdStudiosPresents;
      }else if(frame == 33){
        newPlayer.speed = 40;
        intro_context.shadowColor = "#ffffff88";
        intro_context.fillStyle = "#fff";
        intro_context.shadowBlur = 35;
        showPlayer = true;
        return this.birdStudiosPresents;
      }else if(frame <= 40){
        intro_context.shadowColor = "#ffffff88";
        intro_context.fillStyle = "#fff";
        intro_context.shadowBlur = 35;
        return this.birdStudiosPresents;
      }else{
        clearInterval(introInterval);
        return null;
      }
    }

    this.birdFrame = (context) => {
      context.font = "113px Title";
      context.fillText(letters.substr(0, Math.ceil(this.currentFrame/4)), intro_canvas.width/2 - 180, intro_canvas.height/2 - 30);
    }

    this.birdStudiosFrame = (context) => {
      context.font = "113px Title";
      context.fillText('BIRD', intro_canvas.width/2 - 180, intro_canvas.height/2 - 30);
      context.font = "60px Title";
      context.fillText(studioLetters.substr(0, Math.ceil((this.currentFrame-16)/4)*2.35), intro_canvas.width/2 - 178, intro_canvas.height/2 + 40);
    }

    this.birdStudios = (context) => {
      context.font = "113px Title";
      context.fillText('BIRD', intro_canvas.width/2 - 180, intro_canvas.height/2 - 30);
      context.font = "60px Title";
      context.fillText('STUDIOS', intro_canvas.width/2 - 178, intro_canvas.height/2 + 40);
    }

    this.birdStudiosPresents = (context) => {
      context.font = "113px Title";
      context.fillText('BIRD', intro_canvas.width/2 - 180, intro_canvas.height/2 - 30);
      context.font = "60px Title";
      context.fillText('STUDIOS', intro_canvas.width/2 - 178, intro_canvas.height/2 + 40);
      context.font = "50px Title";
      context.fillText('PRESENTS', intro_canvas.width/2 - 180, intro_canvas.height/2 + 100);
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
      context.save();
      context.beginPath();
      context.translate(intro_canvas.width/2, intro_canvas.height/2 - this.speed*4 + this.jerk);
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

    this.die = () => {
      dieSound.play();
    }

    this.notifyKill = (player) => {
      killSound.play();
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
      context.lineWidth = 2;

      this.startX = intro_canvas.width/2 - (player.x % 500);
      this.startY = intro_canvas.height/2 - (player.y % 500);
      let distanceStep = 0;

      this.offsetY = -player.y;
      this.offsetX = -player.x;

      context.save();
      context.beginPath();
      context.translate(intro_canvas.width/2, intro_canvas.height/2);
      context.rotate(-player.rotation * Math.PI / 180);
      context.scale(1.2 - (player.speed/player.maxMaxSpeed)/3, 1.2 - (player.speed/player.maxMaxSpeed)/3);
      context.translate(-intro_canvas.width/2, -intro_canvas.height/2);
      while(distanceStep < 3){
        let currentDistance = distanceStep * this.gridGap;

        if(currentDistance > 0){
          context.moveTo(this.startX - currentDistance, -intro_canvas.width*0.3);
          context.lineTo(this.startX - currentDistance, intro_canvas.width*1.3);
        }
        
        context.moveTo(this.startX + currentDistance, -intro_canvas.width*0.3);
        context.lineTo(this.startX + currentDistance, intro_canvas.width*1.3);

        context.moveTo(-intro_canvas.width*0.3, this.startY - currentDistance);
        context.lineTo(intro_canvas.width*1.3, this.startY - currentDistance);

        context.moveTo(-intro_canvas.width*0.3, this.startY + currentDistance);
        context.lineTo(intro_canvas.width*1.3, this.startY + currentDistance);

        context.stroke();

        distanceStep++;
      }

      context.closePath();
      context.restore();
    }

    this.renderLines = (context, player) => {
      let test = 0;
      context.strokeStyle = `#aaaaaa18`;
      context.lineWidth = 3;
      context.beginPath();
      while(test < intro_canvas.height){
        context.moveTo(0, test);
        context.lineTo(intro_canvas.width, test);
  
        test+=6;
      }
      context.stroke();
      context.closePath();
    }

    this.renderText = (context, player) => {
      context.font = "20px Numbers";
      context.fillText("SPEED: "+(parseInt(Math.ceil(player.speed)) >= player.maxMaxSpeed ? 'MAX' : parseInt(Math.floor(player.speed))), 30, intro_canvas.height - 30);
    }
  }
}

let gen = new FrameGenerator();
let currentIntroFrame = null;
let introScale = 1.0;
let showPlayer = false;

const updateCanvas = () => {
  intro_context.clearRect(0, 0, intro_canvas.width, intro_canvas.height);

  if(currentIntroFrame != null){

    introScale += 0.001;

    intro_context.save();
    intro_context.translate(intro_canvas.width/2, intro_canvas.height/2);
    intro_context.scale(introScale, introScale);
    intro_context.translate(-intro_canvas.width/2, -intro_canvas.height/2);

    currentIntroFrame(intro_context);

    intro_context.restore();
  }

  if(showPlayer || currentIntroFrame == null){
    intro_context.shadowBlur = 0;
    intro_context.shadowColor = "#00000000";
    newPlayer.render(intro_context);
    effects.renderGrid(intro_context, newPlayer);
    effects.renderText(intro_context, newPlayer);
    intro_context.shadowColor = "#ffffff88";
    intro_context.shadowBlur = 35;
  }
}

window.addEventListener('keydown', function(event) {newPlayer.updateKey(event.keyCode, true);}, false);
window.addEventListener('keyup', function(event) {newPlayer.updateKey(event.keyCode, false);}, false);

let newPlayer = new Player();
let effects = new EffectsLayer();
const newFrame = () => {
  newPlayer.update();
  updateCanvas();
}

const newIntroFrame = () => {
  frame++;
  currentIntroFrame = gen.getFrameBuilder(frame);
}

const introFrame = () => {
  newIntroFrame();
}

let newFrameInterval = null;
let introInterval = null;

const start = () => {
  //Frame gen clock
  newFrameInterval = setInterval(newFrame, 1000/60);

  intro_sound.play();
  intro_sound.on('end', () => {
    tutorial_sound.play();
  });

  intro_sound.on('play', () => {
    introInterval = setInterval(introFrame, 150);
    introFrame();
  });
}

const killProcess = () => {
  clearInterval(newFrameInterval);
  clearInterval(introInterval);
  tutorial_sound.stop();
  intro_sound.stop();
}

export { start as introStart,
  killProcess as introKillProcess };