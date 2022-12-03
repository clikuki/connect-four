const connectFourBoardElement = document.querySelector(
	'.connect-four',
) as HTMLElement;
const columnsContainer = connectFourBoardElement.querySelector(
	'.columns',
) as HTMLElement;
const tokensContainer = connectFourBoardElement.querySelector(
	'.tokens',
) as HTMLElement;
const gamestateTextElem = document.querySelector(
	'.gamestate-text',
) as HTMLElement;
const gamestateTextDefault = gamestateTextElem.textContent;
const restartBtn = document.querySelector('.restart-btn') as HTMLElement;

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
	gameState: 'NORMAL' | 'TIE' | Color = 'NORMAL';
	currentColor: Color = 'YELLOW';
	currentToken: HTMLElement = createToken(this.currentColor);
	#listenerElementList: [HTMLElement, string, (...arg: any[]) => void][] = [];
	finishListener: ((
		gameState: Exclude<typeof this.gameState, 'NORMAL'>,
	) => void)[] = [];
	constructor(w: number, h: number) {
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
						if (checkForTokenLine(x, y, tokenColor, xDirection, yDirection, 4 - 1)) {
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

const gameDimensions = [7, 6] as const;
let game = new Game(...gameDimensions);
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

restartBtn.addEventListener('click', () => {
	game.destroy();
	game = new Game(...gameDimensions);
	game.onFinish(gameFinishCB);
});
