class App {
  constructor() {
    const usernameLabel = document.querySelector('#username');
    const scoreLabel = document.querySelector('#scores');
    const allQuizzesContainer = document.querySelector('#allQuizzes');

    // Function for correct answer
    function handleCorrectAnswer( timeLeft, setterId ) {
      const score = 100*timeLeft;

      // Add score to current Reddit user
      if (window.parent) {

        // Update score in redis
        window.parent.postMessage({
          type: 'updateScore',
          data: { score: score, setterId: setterId } 
        }, '*');

      }
      
      // Redirect to win page
      window.location.href = 'win.html';
      // Return score and time used to Devvit app
      window.parent.postMessage({
        type: 'returnInfo',
        data: { quizScore: score, timeUsed: (10 - timeLeft) } 
      }, '*');
    
    }


    // Function for wrong answer
    function handleWrongAnswer() {

      // Redirect to lose page
      window.location.href = 'lose.html';

      // Return score and time used to Devvit app
      window.parent.postMessage({
        type: 'returnInfo',
        data: { quizScore: 0, timeUsed: 0 } 
      }, '*');
    }

    // Answer Quiz
    const question_element = document.querySelector('#question');
    const option1_element = document.querySelector('#option1');
    const option2_element = document.querySelector('#option2');
    const option3_element = document.querySelector('#option3');
    const option4_element = document.querySelector('#option4');

    const button1 = document.querySelector('#button1');
    const button2 = document.querySelector('#button2');
    const button3 = document.querySelector('#button3');
    const button4 = document.querySelector('#button4');

    const leaderboardContainer = document.querySelector('#leaderboardContainer');

    const timeUsed = document.querySelector('#timeUsed');
    const quizScore = document.querySelector('#quizScore');

    // When the Devvit app sends a message with `context.ui.webView.postMessage`, this will be triggered
    window.addEventListener('message', (ev) => {
      const { type, data } = ev.data;

      // Reserved type for messages sent via `context.ui.webView.postMessage`
      if (type === 'devvit-message') {
        const { message } = data;

        // Load initial data
        if (message.type === 'initialData') {
          const { username, score, setterId, question, option1, option2, option3, option4, correctAnswer, allQuizzes, leaderboard } = message.data;

          
          
          if(usernameLabel){
            usernameLabel.innerText = username;
          }

          if(scoreLabel){
            scoreLabel.innerText = score;
          }

          if(question_element && option1_element && option2_element && option3_element && option4_element) {
            question_element.innerText = question?? 'Question';
            option1_element.innerText = option1?? 'Option 1';
            option2_element.innerText = option2?? 'Option 2';
            option3_element.innerText = option3?? 'Option 3';
            option4_element.innerText = option4?? 'Option 4';
          }

          if(button1 && button2 && button3 && button4) {
            console.log(correctAnswer)
            button1.addEventListener('click', () => {
              if (correctAnswer === '1') {
                button1.style.backgroundColor = 'green';
                handleCorrectAnswer( window.countdownValue, setterId );
              } else {
                button1.style.backgroundColor = 'red';
                handleWrongAnswer();
              }
            });
            button2.addEventListener('click', () => {
              if (correctAnswer === "2") {
                button2.style.backgroundColor = 'green';
                handleCorrectAnswer( window.countdownValue, setterId );
              } else {
                button2.style.backgroundColor = 'red';
                handleWrongAnswer();
              }
            });
            button3.addEventListener('click', () => {
              if (correctAnswer === '3') {
                button3.style.backgroundColor = 'green';
                handleCorrectAnswer(window.countdownValue, setterId );
              } else {
                button3.style.backgroundColor = 'red';
                handleWrongAnswer();
              }
            });
            button4.addEventListener('click', () => {
              if (correctAnswer === '4') {
                button4.style.backgroundColor = 'green';
                handleCorrectAnswer( window.countdownValue, setterId );
              } else {
                button4.style.backgroundColor = 'red';
                handleWrongAnswer();
              }
            });
          }

          if(allQuizzesContainer) {
            allQuizzesContainer.innerHTML = '';
            let currentPage = 1;
            const itemsPerPage = 5;

            function renderQuizzes(page) {
              allQuizzesContainer.innerHTML = '';
              const start = (page - 1) * itemsPerPage;
              const end = start + itemsPerPage;
              const quizzesToShow = allQuizzes.slice(start, end);

              quizzesToShow.forEach(quiz => {
              const quizCard = document.createElement('div');
              quizCard.className = 'quiz-card';
              
              quizCard.style.borderRadius = '8px';
              quizCard.style.color = 'black';
              quizCard.style.padding = '16px';
              quizCard.style.margin = '8px 0';
              quizCard.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
              quizCard.style.backgroundColor = '#fff';
              quizCard.style.maxWidth = '80%';
              quizCard.style.minWidth = '80%';
              quizCard.innerHTML = `
                <div style="display: flex; justify-content: space-between;">
                <div style="">
                <h3>${quiz.question}</h3>
                </div>
                <div>
                <p>Correct Attempts: ${quiz.attemptUser ? quiz.attemptUser.length : 0}</p>
                </div>
                </div>
              `;
              allQuizzesContainer.appendChild(quizCard);
              });

              renderPagination();
            }

            function renderPagination() {
              const totalPages = Math.ceil(allQuizzes.length / itemsPerPage);
              const paginationContainer = document.createElement('div');
              paginationContainer.className = 'pagination-container';
              paginationContainer.style.display = 'flex';
              paginationContainer.style.justifyContent = 'center';
              paginationContainer.style.marginTop = '16px';

              for (let i = 1; i <= totalPages; i++) {
              const pageButton = document.createElement('button');
              pageButton.innerText = i;
              pageButton.style.margin = '0 4px';
              pageButton.style.padding = '8px 16px';
              pageButton.style.border = 'none';
              pageButton.style.borderRadius = '4px';
              pageButton.style.cursor = 'pointer';
              pageButton.style.backgroundColor = i === currentPage ? '#007bff' : '#fff';
              pageButton.style.color = i === currentPage ? '#fff' : '#000';

              pageButton.addEventListener('click', () => {
                currentPage = i;
                renderQuizzes(currentPage);
              });

              paginationContainer.appendChild(pageButton);
              }

              allQuizzesContainer.appendChild(paginationContainer);
            }

            if (allQuizzes && allQuizzes.length > 0) {
              renderQuizzes(currentPage);
            }
          }

          if(leaderboardContainer){
            leaderboardContainer.innerHTML = '';
            const { leaderboard } = message.data;
            if (leaderboard && leaderboard.length > 0) {
              const table = document.createElement('table');
                table.innerHTML = `
                <tr>
                  <th>Rank</th>
                  <th>User ID</th>
                  <th>Score</th>
                </tr>
                `;
                leaderboard.slice(0, 10).forEach((entry, index) => {
                  const row = document.createElement('tr');
                  row.innerHTML = `
                  <td>${index + 1}</td>
                  <td>${entry.username}</td>
                  <td>${entry.score}</td>
                  `;
                  table.appendChild(row);
                });

                // Display current user's score at the bottom
                const currentUserRow = document.createElement('tr');
                currentUserRow.innerHTML = `
                  <td colspan="3" style="text-align: center; font-weight: bold; padding-top:1rem;">Your Score: ${message.data.score}</td>
                `;
                table.appendChild(currentUserRow);

                // Style the table
                table.style.borderRadius = '8px';
                table.style.color = 'black';
                table.style.padding = '16px';
                table.style.margin = '0 auto';
                table.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                table.style.backgroundColor = '#fff';
                table.style.width = '80%';
                table.style.textAlign = 'center';
              leaderboardContainer.appendChild(table);
            }
          }
        }

        if (message.type === 'returnInfo'){
          if(timeUsed && quizScore) {
            timeUsed.innerText = message.data.timeUsed + 's';
            quizScore.innerText = '+' + message.data.quizScore;
          }
        }
      }
    });


    // B A C K B U T T O N
    const backButton = document.querySelector('#backButton');
    if(backButton) {
      backButton.addEventListener('click', () => {
        window.location.href = 'home.html';
        if (window.parent) {
          window.parent.postMessage({
            type: 'reloadData'
          }, '*');
        }
      });
    }

    // H O M E P A G E
    // homepage buttons
    const createQuestionButton = document.querySelector('#createQuestionButton');
    const yourQuestionButton = document.querySelector('#yourQuestionButton');
    const leaderboardButton = document.querySelector('#leaderboardButton');
    const instructionButton = document.querySelector('#instructionButton');

    // homepage button event listeners
    if (createQuestionButton) {
      createQuestionButton.addEventListener('click', () => {
        window.location.href = 'createQuestion.html';
      });
    }

    if (yourQuestionButton) {

      yourQuestionButton.addEventListener('click', () => {
        window.location.href = 'yourQuestion.html';
        if (window.parent) {
          window.parent.postMessage({
            type: 'reloadData'
          }, '*');
        }
      });
    }

    if (leaderboardButton) {
      leaderboardButton.addEventListener('click', () => {
        window.location.href = 'leaderboard.html';
        if (window.parent) {
          window.parent.postMessage({
            type: 'reloadData'
          }, '*');
        }
      });
    }

    if (instructionButton) {
      instructionButton.addEventListener('click', () => {
        window.location.href = 'instruction.html';
      });
    }

    // R E S U L T  P A G E
    const goToHomeButton = document.querySelector('#goToHomeButton');
    if(goToHomeButton) {
      goToHomeButton.addEventListener('click', () => {
        window.location.href = 'home.html';
        if (window.parent) {
          window.parent.postMessage({
            type: 'reloadData'
          }, '*');
        }
      });
    }

    // C R E A T E  Q U E S T I O N
    const quizForm = document.querySelector('#quizForm');
    const submitButton = document.querySelector('#submitButton');
    
    if (quizForm && submitButton) {
      submitButton.addEventListener('click', (event) => {        
        event.preventDefault();
        const formData = new FormData(quizForm);
        try {
          submitButton.textContent = 'Submitting';
          submitButton.disabled = true;
          const data = Object.fromEntries(formData);

          // Post message to reddit block to create quiz
          if (window.parent) {
            window.parent.postMessage({
              type: 'createQuiz',
              data: data
            }, '*');
          } else {
            submitButton.textContent = 'Submit';
            submitButton.disabled = false;
          }
        } catch (error) {
          submitButton.textContent = 'Submit';
          submitButton.disabled = false;
          console.error('Error submitting form:', error);
        }
      });
    }

    // A N S W E R  Q U E S T I O N
    const countdownElement = document.querySelector('#countdown');
    if (countdownElement) {
      let countdownValue = 10;
      countdownElement.innerText = `Time left: ${countdownValue} seconds`;

      const countdownInterval = setInterval(() => {
      countdownValue -= 1;
      window.countdownValue = countdownValue??0;

      countdownElement.innerText = `Time left: ${countdownValue} seconds`;

      if (countdownValue <= 0) {
        clearInterval(countdownInterval);
        handleWrongAnswer();
      }
      }, 1000);

    }

    // A L L  Q U I Z E S

    // L E A D E R B O A R D


    // T E M P L A T E S
    // const increaseButton = document.querySelector('#btn-increase');

    // increaseButton.addEventListener('click', () => {
    //   // Sends a message to the Devvit app
    //   window.parent?.postMessage(
    //     { type: 'setCounter', data: { newCounter: Number(counter + 1) } },
    //     '*'
    //   );
    // });

  }
}

new App();
