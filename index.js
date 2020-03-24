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
const player_keys = {};
io.on('connection', (socket) => {
  sockets.push(socket);
  player_data[socket.id] = {x: 0, y: 0, vx: 0, vy: 0, rotation: 0};
  const filtered = allExcept(socket.id);
  for(s of filtered){
    s.emit('new_player', {id: s.id});
  }

  socket.on('position', (player) => {
    player_data[socket.id] = player;
  });

  socket.on('keys', (keys) => {
    player_keys[socket.id] = keys;
  });
  
  socket.on('disconnect', function(){
    delete player_data[socket.id];
    delete player_keys[socket.id];
    sockets.splice(sockets.indexOf(socket))
  });
})

const broadcast = () => {
  for(s of sockets){
    s.emit('players', player_data);
  }
}

const keys = () => {
  for(s of sockets){
    s.emit('keys', player_keys);
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

//Player update clock
setInterval(broadcast, 1000/30);

//Keys update clock
setInterval(keys, 1000/60);