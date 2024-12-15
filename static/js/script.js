import {createElement, parseSjdon, render, useEffect, useState} from './lib/suiweb.min.js';
import {connect4Winner} from "./connect4-winner.js";

const createEmptyBoard = (rows, cols) => Array(rows).fill(null).map(() => Array(cols).fill(null));
const moveHistory = [];
let isAnimating = false;

// Field Component
const Field = ({row, col, value, handleClick}) => {
    return [
        'div',
        {
            class: 'field',
            onclick: () => handleClick(row, col),
        },
        value ? ['div', {class: `piece ${value}`}, ''] : ''
    ];
};

// Board Component
const Board = ({boardState, handleFieldClick}) => {
    return [
        'div',
        {class: 'board'},
        ...boardState.flatMap((row, rowIndex) =>
            row.map((field, colIndex) =>
                [Field, {row: rowIndex, col: colIndex, value: field, handleClick: handleFieldClick}]
            )
        )
    ];
};

const PlayerField = ({currentPlayer}) => {
    return [
        'p',
        {class: "player", style: `background-color: ${currentPlayer};`},
        `It's ${capitalizeFirstLetter(currentPlayer)}'s turn`
    ];
}

function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

const App = () => {
    const rows = 6;
    const cols = 7;
    const apiKey = 'c4game';
    const apiUrl = 'http://localhost:8080/api/data/c4';
    const [board, setBoard] = useState(createEmptyBoard(rows, cols)); // Fix: Initialize board state
    const [currentPlayer, setCurrentPlayer] = useState('red');
    const [winner, setWinner] = useState('');

    const handleFieldClick = (row, col) => {
        if (winner !== '') return;

        // Find the lowest empty field in the column
        let targetRow = -1;
        for (let i = rows - 1; i >= 0; i--) {
            if (!board[i][col]) {
                targetRow = i;
                break;
            }
        }

        if (targetRow !== -1) {
            const newBoard = board.map(r => r.slice());
            newBoard[targetRow][col] = currentPlayer;
            setBoard(newBoard);

            moveHistory.push(col);

            if (connect4Winner(currentPlayer, newBoard)) {
                setWinner(currentPlayer);
            } else {
                setCurrentPlayer(currentPlayer === 'red' ? 'blue' : 'red');
            }
        }
    };

    const withAnimationGuard = (fn) => {
        return (...args) => {
            if (isAnimating) return;
            isAnimating = true;
            try {
                return fn(...args);
            } finally {
                isAnimating = false; // Reset flag
            }
        };
    };

    const undoLastMove = () => {
        if (moveHistory.length === 0 || winner !== '' || isAnimating) {
            showToast("I'm sorry Dave, I'm afraid I can't do that");
            return;
        } // No moves to undo or game over

        isAnimating = true;

        const lastCol = moveHistory.pop(); // Get last move

        // Find the top-most piece in the column
        const newBoard = board.map(r => r.slice());
        for (let i = 0; i < rows; i++) {
            if (newBoard[i][lastCol]) {
                const pieceElement = document.querySelector(`.field:nth-child(${i * cols + lastCol + 1}) .piece`);
                if (pieceElement) {
                    requestAnimationFrame(() => {
                        pieceElement.classList.add('removed');
                    });
                    setTimeout(() => {
                        newBoard[i][lastCol] = null;
                        setBoard(newBoard);
                        setCurrentPlayer(currentPlayer === 'red' ? 'blue' : 'red');
                        isAnimating = false;
                    }, 300); // Match the animation duration
                }
                break;
            }
        }

        setBoard(newBoard);
        setCurrentPlayer(currentPlayer === 'red' ? 'blue' : 'red'); // Switch player
    };

    const showToast = (msg) => {
        const toast = document.createElement('div');
        toast.classList.add('toast');
        toast.innerHTML = msg;

        document.body.appendChild(toast);

        toast.addEventListener('animationed', () => {
            document.body.removeChild(toast);
        });
    };

    const celebrate = () => {
        const winScreen = document.createElement('div');
        const messageContainer = document.createElement('div');
        const confettiContainer = document.createElement('div');
        const newGameButton = document.createElement('button');

        winScreen.classList.add('winScreen');
        messageContainer.classList.add('message');
        confettiContainer.classList.add('confetti-container');
        newGameButton.classList.add('button');

        messageContainer.textContent = `${capitalizeFirstLetter(winner)} wins!`;
        messageContainer.style.backgroundColor = winner;
        newGameButton.innerText = `Start new game!`;

        newGameButton.addEventListener('click', (e) => {
            e.stopPropagation();
            winScreen.remove();
            resetGame();
        })

        document.body.appendChild(winScreen);

        winScreen.appendChild(messageContainer);
        winScreen.appendChild(confettiContainer);
        messageContainer.appendChild(newGameButton);

        for (let i = 0; i < 100; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.setProperty('--i', i);
            piece.style.left = `${Math.random() * 100}%`; // Randomize left position
            confettiContainer.appendChild(piece);
        }
    }

    const resetGame = () => {
        const pieces = document.querySelectorAll('.field .piece');

        pieces.forEach(pieceElement => {
            pieceElement.classList.add('removed'); // Add the animation class
        });

        setTimeout(() => {
            setBoard(createEmptyBoard(rows, cols));
            setCurrentPlayer('red');
            setWinner('');
            moveHistory.splice(0, moveHistory.length);
        }, 300);

        showToast('Game reset');
    };

    const saveGame = () => {
        const gameState = {
          'c4': {
            board,
            currentPlayer,
            winner,
            moveHistory,
          },
        };

        localStorage.setItem('c4', JSON.stringify(gameState));
        fetch(apiUrl, {
          method: 'PUT',
          headers: {
              'Content-Type': 'application/json',
              'X-API-Key': 'c4game'
          },
          body: JSON.stringify(gameState)
      }).then(res => {
            let response = res.json();
            response.then(response => {
                showToast('Game saved on Server & offline');
            })
        }).catch(error => {
            console.log(error);
            showToast('Server is not available, saved offline');
        });
    };

    const loadLocalState = () => {
        const savedState = localStorage.getItem('c4');
        if (savedState) {
            const {
                c4: {
                  board: savedBoard,
                  currentPlayer: savedPlayer,
                  winner: savedWinner,
                  moveHistory: savedHistory
                }
            } = JSON.parse(savedState);
            setBoard(savedBoard);
            setCurrentPlayer(savedPlayer);
            setWinner(savedWinner);
            moveHistory.splice(0, moveHistory.length);
            if (savedHistory) {
                moveHistory.push(...savedHistory);
            }
            showToast(`Server unavailable, game loaded from local`);
        } else {
            showToast('Server unavailable, no saved game was found');
        }
    }

    const removePieces = (pieces) => {
        pieces.forEach(pieceElement => {
            pieceElement.classList.add('removed');
        });
    }

    const loadGame = () => {
        const pieces = document.querySelectorAll('.field .piece');

        removePieces(pieces);

        setTimeout(() => {
            fetch(apiUrl, {
              method: 'GET',
              headers: {
                  'Content-Type': 'application/json',
                  'X-API-Key': 'c4game'
              }
          }).then(response => {
                response.json().then(data => {
                    if (data.c4) {
                        const {
                            board: savedBoard,
                            currentPlayer: savedPlayer,
                            winner: savedWinner,
                            moveHistory: savedMoveHistory
                        } = data.c4;

                        setBoard(savedBoard);
                        setCurrentPlayer(savedPlayer);
                        setWinner(savedWinner);
                        moveHistory.splice(0, moveHistory.length);
                        if (Array.isArray(savedMoveHistory)) {
                            moveHistory.push(...savedMoveHistory);
                        }
                        showToast('Game loaded from server');
                    } else {
                        console.log("Server State empty");
                        loadLocalState();
                    }
                })
            }).catch(error => {
                console.log(error);
                loadLocalState();
            })
        }, 300);
    }

    useEffect(() => {
            winner !== '' ? celebrate() : '';
        if (winner == '') {
            const winScreenElement = document.querySelector('.winScreen');
            if (winScreenElement) winScreenElement.remove();
        }
    }, [winner]);

    const undoLastMoveWithGuard = (e) => {
        e.preventDefault();
        if (isAnimating) return; // Guard against multiple rapid clicks
        undoLastMove();
    };

    const loadGameWithGuard = withAnimationGuard(loadGame);
    const resetGameWithGuard = withAnimationGuard(resetGame);

    return [
        'div',
        ['h1', 'Connect4 Game'],
        winner !== '' ? ['p', `${capitalizeFirstLetter(winner)} wins!`] : [PlayerField, {currentPlayer}],
        [Board, {boardState: board, handleFieldClick}],
        ['div', {'class': 'button-group'},
            ['button', {onclick: resetGameWithGuard}, 'Reset Game'],
            ['button', {onclick: saveGame}, 'Save'],
            ['button', {onclick: loadGameWithGuard}, 'Load'],
            ['button', {onclick: undoLastMoveWithGuard}, 'Undo'],
        ],
    ];
}

render(parseSjdon([App], createElement), document.getElementById('app'));

