
(function () {
    
    WinJS.UI.processAll().then(function () {
      
      var game, board, socket, playerColor, serverGame;
      var usersOnline = [];
      socket = io();
           
      //////////////////////////////
      // Socket.io handlers
      ////////////////////////////// 
      
      socket.on('login', function(msg) {
            usersOnline = msg;
            updateUserList();
      });
      
      socket.on('joinlobby', function (msg) {
        usersOnline.push(msg);
        updateUserList();
      });
      
       socket.on('leavelobby', function (msg) {
        for (var i=0; i<usersOnline.length; i++) {
            if (usersOnline[i] === msg) {
                usersOnline.splice(i, 1);
            }
        }
        
        updateUserList();
      });
          
          
      socket.on('joingame', function(msg) {
        console.log("joined as game id: " + msg.game.id );   
        playerColor = msg.color;
        initGame(msg.game);
        
        $('#page-lobby').hide();
        $('#page-game').show();
      });
        
      socket.on('move', function (msg) {
        if (msg.gameId === serverGame.id) {
           game.move(msg.move);
           board.position(game.fen());
        }
      });
      
      socket.on('logout', function (msg) {
        if (msg.gameId === serverGame.id) {
           serverGame = null;
           game = null;
           board.destroy();
           socket.disconnect();
        }
      });
      
      //////////////////////////////
      // Menus
      ////////////////////////////// 
      $('#login').on('click', function() {
        socket.emit('login',  $('#username').val());
        
        $('#page-login').hide();
        $('#page-lobby').show();
        
      });
      
      var updateUserList = function() {
        document.getElementById('userList').innerHTML = '';
        usersOnline.forEach(function(user) {
          $('#userList').append($('<button>')
                        .text(user)
                        .on('click', function() {
                          socket.emit('invite',  user);
                        }));
        });
      };
           
      //////////////////////////////
      // Chess Game
      ////////////////////////////// 
      
      var initGame = function (serverGameState) {
        serverGame = serverGameState; 
        
          var cfg = {
            draggable: true,
            showNotation: false,
            orientation: playerColor,
            position: 'start',
            onDragStart: onDragStart,
            onDrop: onDrop,
            onSnapEnd: onSnapEnd
          };
      
          game = new Chess();
          board = new ChessBoard('board', cfg);
      }
       
      // do not pick up pieces if the game is over
      // only pick up pieces for the side to move
      var onDragStart = function(source, piece, position, orientation) {
        if (game.game_over() === true ||
            (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (game.turn() === 'b' && piece.search(/^w/) !== -1) ||
            (game.turn() !== playerColor[0])) {
          return false;
        }
      };  
      
      var onDrop = function(source, target) {
        // see if the move is legal
        var move = game.move({
          from: source,
          to: target,
          promotion: 'q' // NOTE: always promote to a queen for example simplicity
        });
      
        // illegal move
        if (move === null) { 
          return 'snapback';
        } else {
           socket.emit('move', {move: move, gameId: serverGame.id, board: game.fen()});
        }
      
      };
      
      // update the board position after the piece snap 
      // for castling, en passant, pawn promotion
      var onSnapEnd = function() {
        board.position(game.fen());
      };
    });
})();
