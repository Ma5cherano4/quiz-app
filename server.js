const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// 1,000 Questions Generator Engine
function generate1000Questions() {
  const list = [
    { q: "What is the capital of France?", answer: "Paris" },
    { q: "Which planet is known as the Red Planet?", answer: "Mars" },
    { q: "What is 5 + 5 * 2?", answer: "15" },
    { q: "Which programming language runs web browsers?", answer: "JavaScript" },
    { q: "What color do you get by mixing blue and yellow?", answer: "Green" },
    { q: "What is the capital of Japan?", answer: "Tokyo" },
    { q: "Who wrote 'Romeo and Juliet'?", answer: "Shakespeare" },
    { q: "What is the chemical symbol for water?", answer: "H2O" },
    { q: "Which ocean is the largest?", answer: "Pacific" },
    { q: "What year did the Titanic sink?", answer: "1912" }
  ];

  const capitals = [
    { c: "Germany", a: "Berlin" }, { c: "Italy", a: "Rome" }, { c: "Spain", a: "Madrid" },
    { c: "Canada", a: "Ottawa" }, { c: "Australia", a: "Canberra" }, { c: "Brazil", a: "Brasilia" },
    { c: "Argentina", a: "Buenos Aires" }, { c: "Egypt", a: "Cairo" }, { c: "India", a: "New Delhi" },
    { c: "China", a: "Beijing" }, { c: "South Korea", a: "Seoul" }, { c: "Mexico", a: "Mexico City" }
  ];
  
  capitals.forEach(item => {
    list.push({ q: `What is the capital of ${item.c}?`, answer: item.a });
  });

  for (let i = 1; i <= 500; i++) {
    let a = Math.floor(Math.random() * 50) + 1;
    let b = Math.floor(Math.random() * 50) + 1;
    list.push({ q: `What is ${a} + ${b}?`, answer: (a + b).toString() });
    list.push({ q: `What is ${a} * ${b}?`, answer: (a * b).toString() });
  }

  for (let i = 1; i <= 450; i++) {
    list.push({ q: `Quick Math: What is ${i} + ${i}?`, answer: (i + i).toString() });
  }

  return list;
}

const questions = generate1000Questions();

let players = {};
let currentQuestionIndex = 0;
let roundOver = false;
let failedPlayers = {}; // Tracks who answered incorrectly for the current question

io.on('connection', (socket) => {
  console.log('A player connected:', socket.id);

  socket.on('join game', (username) => {
    players[socket.id] = { name: username, score: 0 };
    io.emit('update players', players);
    
    socket.emit('new question', { 
      questionNumber: currentQuestionIndex + 1, 
      questionText: questions[currentQuestionIndex].q,
      roundOver: roundOver
    });
  });

  // Handle typed answer submissions
  socket.on('submit answer', (answerText) => {
    if (roundOver || !players[socket.id]) return;
    
    // If this player already failed this question, ignore them
    if (failedPlayers[socket.id]) return;

    const correctAnswer = questions[currentQuestionIndex].answer.trim().toLowerCase();
    const userAns = answerText.trim().toLowerCase();

    if (userAns === correctAnswer) {
      // Correct! Player wins the point
      roundOver = true;
      players[socket.id].score += 1;

      io.emit('round winner', {
        name: players[socket.id].name,
        answer: questions[currentQuestionIndex].answer,
        players: players
      });
    } else {
      // Incorrect! Lock this player out for this question
      failedPlayers[socket.id] = true;
      socket.emit('wrong answer notification');

      // Check if ALL active players have now answered incorrectly
      const activeIds = Object.keys(players);
      const allFailed = activeIds.every(id => failedPlayers[id]);

      if (allFailed && activeIds.length > 0) {
        roundOver = true;
        io.emit('round draw', {
          answer: questions[currentQuestionIndex].answer,
          players: players
        });
      }
    }
  });

  socket.on('next question', () => {
    currentQuestionIndex = (currentQuestionIndex + 1) % questions.length;
    roundOver = false;
    failedPlayers = {}; // Reset failed attempts for the new question

    io.emit('new question', {
      questionNumber: currentQuestionIndex + 1,
      questionText: questions[currentQuestionIndex].q,
      roundOver: false
    });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    delete failedPlayers[socket.id];
    io.emit('update players', players);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Quiz Server running on port ${PORT}`);
});
