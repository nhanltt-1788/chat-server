var express = require('express');
var axios = require('axios');
var app = express();
var _findIndex = require('lodash/findIndex');

var server = require('http').Server(app);
var port = (process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 8080);
var io = require('socket.io')(server);
server.listen(port, () => console.log('Server running in port ' + port));

var messageListAPI = 'http://localhost:3004/messageList';
var memberListAPI = 'http://localhost:3004/memberList';
var userOnlineListAPI = 'http://localhost:3004/userOnlineList';

var userOnline = [];
io.on('connection', function(socket){
  console.log(socket.id + ': connected');
  //lắng nghe khi người dùng thoát
  socket.on('disconnect', function() {
    var index = _findIndex(userOnline, ['id', socket.id]);
    userOnline.splice(index, 1);
    io.sockets.emit('updateUserList', userOnline);
  })

  //lắng nghe khi có người gửi tin nhắn
  socket.on('newMessage', message => {
    axios.post(messageListAPI, message)
    .then(function () {
      socket.emit('addNewMessageSuccess');
    })
    .catch(function (error) {
      socket.emit('addNewMessageFail', error);
    });
  })

  //lắng nghe khi có người login
  socket.on('login', async data => {
    var memberList = await getMemberList();
    var onlineUserList = await getUserOnlineList();
    for(var i = 0; i < memberList.length; i++) {
      if(memberList[i].userName === data.userName && memberList[i].password === data.password) {
        updateOnlineUserList(memberList[i]);
        socket.emit('loginSuccess', { user: memberList[i], onlineList: onlineUserList});
      }
    }

    socket.emit('loginFail', 'User Name or Password is invalid');
  })

  //lắng nghe khi có người người đăng kí
  socket.on('register',async user => {
    var memberList = await getMemberList();
    var count = 0;

    for(var i = 0; i < memberList.length; i++) {
      if(memberList[i].userName === user.userName) {
        count++;
      }
    }

    if(count > 0) {
      socket.emit('registerError', 'User name is existed.');
    }
    else {
      axios.post(memberListAPI, user)
      .then( function (response) {
        socket.emit('registerSuccess', response.data);
      })
      .catch(function (error) {
        socket.emit('registerError', error);
      });
    }
  })

  //lắng nghe khi yêu cầu lấy danh sách message
  socket.on('getMessageList', () => {
    axios.get(messageListAPI)
      .then(function (response) {
        socket.emit('getMessageList', response.data);
      })
      .catch(function (error) {
        socket.emit('getMessageList', error);
      })
  })
});

async function updateOnlineUserList(onlineUser) {
  var onlineUserList = await getUserOnlineList();
  var counter = 0;

  for(var i = 0; i < onlineUserList.length; i++) {
    if(onlineUserList[i].id === onlineUser.id) {
      counter++;
    }
  }

  if(counter === 0) {
    axios.post(userOnlineListAPI, onlineUser)
    .then(function () {
      console.log('update user list success')
    })
    .catch(function (error) {
      console.log(error);
    });
  }
}

async function getMemberList() {
  var result = [];

  await axios.get(memberListAPI)
  .then(function (response) {
    result = response.data
  })
  .catch(function (error) {
    console.log(error);
  })

  return result;
}

async function getUserOnlineList() {
  var result = [];

  await axios.get(userOnlineListAPI)
  .then(function (response) {
    result = response.data
  })
  .catch(function (error) {
    console.log(error);
  })

  return result;
}

app.get('/', (req, res) => {
  res.send("Home page. Server running okay.");
})