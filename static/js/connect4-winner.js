/**
 * Checks if a player has won the game
 */

let player;
let state = [];

export function connect4Winner(p, s) {
    player = p;
    state = s;

    let winner = checkVertical() || checkHorizontal() || checkDiagonal()

    return (winner);
}

/**
 * Checks if a player has won vertically
 */
function checkVertical() {
    for(let i = 0; i < state.length - 3; i++) {
        for(let j = 0; j < state[0].length; j++) {
            if(state[i][j] === player && state[i + 1][j] === player && state[i + 2][j] === player && state[i + 3][j] === player) {
                return player
            }
        }
    }
}

/**
 * Checks if a player has won horizontally
 */
function checkHorizontal() {
    for (let i = 0; i < state.length; i++) {
        for (let j = 0; j < state[0].length - 3; j++) {
            if (state[i][j] === player && state[i][j + 1] === player && state[i][j + 2] === player && state[i][j + 3] === player) {
                return player
            }
        }
    }
}

/**
 * Checks if a player has won diagonally
 */
function checkDiagonal(){

    // Check for diagonal win from top left to bottom right
    for (let i = 0; i < state.length - 3; i++) {
        for (let j = 0; j < state[0].length - 3; j++) {
            if (state[i][j] === player && state[i + 1][j + 1] === player && state[i + 2][j + 2] === player && state[i + 3][j + 3] === player) {
                return player
            }
        }
    }

    // Check for diagonal win from top right to bottom left
    for (let i = 0; i < state.length - 3; i++) {
        for (let j = 3; j < state[0].length; j++) {
            if (state[i][j] === player && state[i + 1][j - 1] === player && state[i + 2][j - 2] === player && state[i + 3][j - 3] === player) {
                return player
            }
        }
    }
}
