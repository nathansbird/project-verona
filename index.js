const express = require('express');
var port = process.env.PORT || 3000;
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/src/index.html');
});

app.get('/style.css', function(req, res){
  res.sendFile(__dirname + '/src/style.css');
});

app.get('/index.js', function(req, res){
  res.sendFile(__dirname + '/src/index.js');
});

app.use('/static/assets', express.static(__dirname + '/src/assets'));

const sockets = [];
const player_data = {};
io.on('connection', (socket) => {
  sockets.push(socket);
  player_data[socket.id] = {x: 0, y: 0, vx: 0, vy: 0, speed: 0, rotation: 0};
  const filtered = allExcept(socket.id);
  for(s of filtered){
    s.emit('new_player', {id: s.id});
  }

  socket.on('position', (player) => {
    player_data[socket.id] = player;
  });
  
  socket.on('disconnect', function(){
    delete player_data[socket.id];
    sockets.splice(sockets.indexOf(socket))
  });
})

const broadcast = () => {
  for(s of sockets){
    s.emit('players', player_data);
  }
}

const allExcept = (id) => {
  return sockets.filter(item => {
    return item.id != id;
  })
}

http.listen(port, function(){
  console.log('listening');
});

//Position update clock
setInterval(broadcast, 1000/20);