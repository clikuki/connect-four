const connectFourBoardElement = document.querySelector(
	'.connect-four',
) as HTMLElement;
const columnsContainer = connectFourBoardElement.querySelector(
	'.columns',
) as HTMLElement;
const tokensContainer = connectFourBoardElement.querySelector(
	'.tokens',
) as HTMLElement;

type Color = 'RED' | 'YELLOW';
interface Board {
	columns: Column[];
	width: number;
	height: number;
}
interface Column {
	element: HTMLElement;
	holes: Hole[];
}
interface Hole {
	element: HTMLElement;
	tokenColor: null | Color;
}
function createBoard(w: number, h: number): Board {
	connectFourBoardElement.style.setProperty('--col-cnt', String(w));
	connectFourBoardElement.style.setProperty('--row-cnt', String(h));
	return {
		width: w,
		height: h,
		columns: new Array(w).fill(0).map(() => {
			const columnElem = document.createElement('div');
			columnElem.className = 'column';
			const holes = new Array(h).fill(0).map((): Hole => {
				const holeElem = document.createElement('div');
				holeElem.className = 'hole';
				return {
					element: holeElem,
					tokenColor: null,
				};
			});
			columnElem.append(...holes.map((hole) => hole.element));
			columnsContainer.append(columnElem);
			return {
				element: columnElem,
				holes,
			};
		}),
	};
}

function createToken(color: Color) {
	const tokenElem = document.createElement('div');
	tokenElem.className = 'token';
	tokenElem.setAttribute('data-color', color);
	return tokenElem;
}

class Game {
	board: Board;
	matchLength: number;
	gameState: 'NORMAL' | 'TIE' | Color = 'NORMAL';
	currentColor: Color = 'YELLOW';
	currentToken: HTMLElement = createToken(this.currentColor);
	#listenerElementList: [HTMLElement, string, (...arg: any[]) => void][] = [];
	finishListener: ((
		gameState: Exclude<typeof this.gameState, 'NORMAL'>,
	) => void)[] = [];
	constructor(w = 7, h = 6, matchLength = 4) {
		this.matchLength = matchLength;
		this.board = createBoard(w, h);
		this.currentToken.style.setProperty('top', 'calc(var(--hole-box-size) * -1)');
		this.currentToken.style.setProperty(
			'left',
			`calc(${
				connectFourBoardElement.getBoundingClientRect().width / 2
			}px - var(--hole-box-size) / 2)`,
		);
		tokensContainer.appendChild(this.currentToken);

		const boardMouseMoveCB = ({ x }: MouseEvent) => {
			if (this.gameState !== 'NORMAL') return;
			const { x: boardX } = connectFourBoardElement.getBoundingClientRect();
			this.currentToken.style.setProperty(
				'left',
				`calc(${x - boardX}px - var(--hole-box-size) / 2)`,
			);
		};
		connectFourBoardElement.addEventListener('mousemove', boardMouseMoveCB);
		this.#listenerElementList.push([
			connectFourBoardElement,
			'mousemove',
			boardMouseMoveCB,
		]);

		this.board.columns.forEach((column) => {
			let emptyIndex = 0;
			const columnClickCB = async () => {
				if (emptyIndex >= column.holes.length) return; // Don't do anything if column is full
				if (this.gameState !== 'NORMAL') return;

				// Save current token
				const tokenToDrop = this.currentToken;

				// Update board data
				const hole = column.holes[emptyIndex];
				hole.tokenColor = this.currentColor;

				const { x: boardX, y: boardY } =
					connectFourBoardElement.getBoundingClientRect();
				const { x: holeX, y: holeY } = hole.element.getBoundingClientRect();

				// Check for winner or ties
				const gameState = this.getGameState();
				if (gameState !== 'NORMAL') {
					this.gameState = gameState;
					this.finishListener.forEach((cb) => cb(gameState));
				}

				// Swap color
				if (this.currentColor === 'RED') this.currentColor = 'YELLOW';
				else if (this.currentColor === 'YELLOW') this.currentColor = 'RED';
				else throw `invalid color`;

				// Create new token
				if (gameState === 'NORMAL') {
					this.currentToken = createToken(this.currentColor);
					this.currentToken.style.setProperty('left', `${holeX - boardX}px`);
					this.currentToken.style.setProperty(
						'top',
						'calc(var(--hole-box-size) * -2)',
					);
					this.currentToken.style.setProperty('opacity', '0');
					tokensContainer.appendChild(this.currentToken);
					setTimeout(() => {
						this.currentToken.style.setProperty(
							'top',
							'calc(var(--hole-box-size) * -1)',
						);
						this.currentToken.style.removeProperty('opacity');
					});
				}

				// Drop/place token element
				tokenToDrop.style.setProperty(
					'--speed-percentage',
					String((column.holes.length - emptyIndex) / column.holes.length),
				);
				tokenToDrop.style.setProperty('left', `${holeX - boardX}px`);
				const isTransitioningOnAxisX = tokenToDrop
					.getAnimations()
					.some(
						(anim) =>
							anim instanceof CSSTransition && anim.transitionProperty === 'left',
					);
				if (isTransitioningOnAxisX) {
					await new Promise((res) => {
						tokenToDrop.addEventListener('transitionend', res, { once: true });
					});
				}
				tokenToDrop.style.setProperty(
					'top',
					`calc(${holeY - boardY}px - var(--hole-box-size))`,
				);

				// increment empty index
				emptyIndex++;
			};
			column.element.addEventListener('mousedown', columnClickCB);
			this.#listenerElementList.push([column.element, 'mousedown', columnClickCB]);
		});
	}
	getGameState(): typeof this.gameState {
		const xDirections = [-1, 0, 1] as const;
		const yDirections = [0, 1] as const;
		const checkForTokenLine = (
			x: number,
			y: number,
			color: Color,
			xDirection: number,
			yDirection: number,
			depth: number,
		): boolean => {
			if (!this.board.columns[x]?.holes[y]) return false;
			if (this.board.columns[x].holes[y].tokenColor !== color) return false;
			if (depth <= 0) return true;
			return checkForTokenLine(
				x + xDirection,
				y + yDirection,
				color,
				xDirection,
				yDirection,
				depth - 1,
			);
		};
		for (let x = 0; x < this.board.columns.length; x++) {
			const column = this.board.columns[x];
			for (let y = 0; y < column.holes.length; y++) {
				const tokenColor = column.holes[y].tokenColor;
				if (tokenColor === null) continue;
				for (const xDirection of xDirections) {
					for (const yDirection of yDirections) {
						if (xDirection === 0 && yDirection === 0) continue;
						if (
							checkForTokenLine(
								x,
								y,
								tokenColor,
								xDirection,
								yDirection,
								this.matchLength - 1,
							)
						) {
							return tokenColor;
						}
					}
				}
			}
		}
		const isFull = this.board.columns.every((column) =>
			column.holes.every((hole) => hole.tokenColor),
		);
		return isFull ? 'TIE' : 'NORMAL';
	}
	onFinish(cb: typeof this.finishListener[0]) {
		this.finishListener.push(cb);
	}
	destroy() {
		this.finishListener.length = 0;
		this.#listenerElementList.forEach(([elem, evType, cb]) => {
			elem.removeEventListener(evType, cb);
		});
		connectFourBoardElement.style.removeProperty('--col-cnt');
		connectFourBoardElement.style.removeProperty('--row-cnt');
		tokensContainer.replaceChildren();
		columnsContainer.replaceChildren();
		this.#listenerElementList.length = 0;
	}
}

const gameInitVals = {
	width: 7,
	height: 6,
	matchLength: 4,
};
let game = new Game(
	gameInitVals.width,
	gameInitVals.height,
	gameInitVals.matchLength,
);

const gamestateTextElem = document.querySelector(
	'.gamestate-text',
) as HTMLElement;

function gameFinishCB(finishState: Color | 'TIE') {
	const endTextObj = {
		TIE: "It's a tie!",
		YELLOW: 'Yellow has won!',
		RED: 'Red has won!',
	} as const;
	gamestateTextElem.textContent = endTextObj[finishState];
	gamestateTextElem.classList.add('win');
}
game.onFinish(gameFinishCB);

const restartBtn = document.querySelector('.restart-btn') as HTMLElement;
function restart() {
	game.destroy();
	game = new Game(
		gameInitVals.width,
		gameInitVals.height,
		gameInitVals.matchLength,
	);
	game.onFinish(gameFinishCB);
}
restartBtn.addEventListener('click', restart);

const boardConfigContainer = document.querySelector(
	'.board-config',
) as HTMLElement;
const boardWidthInput = boardConfigContainer.querySelector(
	'.width',
) as HTMLInputElement;
const boardHeightInput = boardConfigContainer.querySelector(
	'.height',
) as HTMLInputElement;
const boardMatchLengthInput = boardConfigContainer.querySelector(
	'.match-length',
) as HTMLInputElement;

const matchCountElemList = [
	...document.querySelectorAll('.match-count'),
] as HTMLElement[];
matchCountElemList.forEach(
	(elem) => (elem.textContent = String(gameInitVals.matchLength)),
);

boardWidthInput.valueAsNumber = gameInitVals.width;
boardHeightInput.valueAsNumber = gameInitVals.height;
boardMatchLengthInput.valueAsNumber = gameInitVals.matchLength;
boardWidthInput.addEventListener('change', () => {
	if (Number.isNaN(boardWidthInput.valueAsNumber)) return;
	gameInitVals.width = boardWidthInput.valueAsNumber;
	const newMax = Math.min(gameInitVals.width, gameInitVals.height);
	gameInitVals.matchLength = Math.min(
		newMax,
		boardMatchLengthInput.valueAsNumber,
	);
	boardMatchLengthInput.max = String(newMax);
	if (boardMatchLengthInput.valueAsNumber !== gameInitVals.matchLength)
		matchCountElemList.forEach(
			(elem) => (elem.textContent = String(gameInitVals.matchLength)),
		);
	boardMatchLengthInput.valueAsNumber = gameInitVals.matchLength;
	restart();
});
boardHeightInput.addEventListener('change', () => {
	if (Number.isNaN(boardHeightInput.valueAsNumber)) return;
	gameInitVals.height = boardHeightInput.valueAsNumber;
	const newMax = Math.min(gameInitVals.width, gameInitVals.height);
	gameInitVals.matchLength = Math.min(
		newMax,
		boardMatchLengthInput.valueAsNumber,
	);
	boardMatchLengthInput.max = String(newMax);
	if (boardMatchLengthInput.valueAsNumber !== gameInitVals.matchLength)
		matchCountElemList.forEach(
			(elem) => (elem.textContent = String(gameInitVals.matchLength)),
		);
	boardMatchLengthInput.valueAsNumber = gameInitVals.matchLength;
	restart();
});
boardMatchLengthInput.addEventListener('change', () => {
	if (Number.isNaN(boardMatchLengthInput.valueAsNumber)) return;
	gameInitVals.matchLength = boardMatchLengthInput.valueAsNumber;
	matchCountElemList.forEach(
		(elem) => (elem.textContent = String(gameInitVals.matchLength)),
	);
	restart();
});
