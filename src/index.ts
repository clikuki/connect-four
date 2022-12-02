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
interface Column {
	element: HTMLElement;
	holes: Hole[];
}
interface Hole {
	element: HTMLElement;
	tokenColor: null | Color;
}
function createBoard(w: number, h: number): Column[] {
	connectFourBoardElement.style.setProperty('--col-cnt', String(w));
	connectFourBoardElement.style.setProperty('--row-cnt', String(h));
	return new Array(w).fill(0).map(() => {
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
	});
}

function createToken(color: Color) {
	const tokenElem = document.createElement('div');
	tokenElem.className = 'token';
	tokenElem.setAttribute('data-color', color);
	return tokenElem;
}

function checkBoardForWinner(board: Column[]): null | Color {
	const xDirections = [-1, 0, 1] as const;
	const yDirections = [0, 1] as const;
	function checkForTokenLine(
		x: number,
		y: number,
		color: Color,
		xDirection: number,
		yDirection: number,
		depth: number,
	): boolean {
		if (!board[x]?.holes[y]) return false;
		if (board[x].holes[y].tokenColor !== color) return false;
		if (depth <= 0) return true;
		return checkForTokenLine(
			x + xDirection,
			y + yDirection,
			color,
			xDirection,
			yDirection,
			depth - 1,
		);
	}
	for (let x = 0; x < board.length; x++) {
		const column = board[x];
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
	return null;
}

const board = createBoard(7, 6);
let gameHasWinner = false;
let currentColor: Color = 'YELLOW';
let currentToken: HTMLElement = createToken(currentColor);
currentToken.style.setProperty('top', 'calc(var(--hole-box-size) * -1)');
currentToken.style.setProperty(
	'left',
	`calc(${
		connectFourBoardElement.getBoundingClientRect().width / 2
	}px - var(--hole-box-size) / 2)`,
);
tokensContainer.appendChild(currentToken);

connectFourBoardElement.addEventListener('mousemove', ({ x }) => {
	if (gameHasWinner) return;
	const { x: boardX } = connectFourBoardElement.getBoundingClientRect();
	currentToken.style.setProperty(
		'left',
		`calc(${x - boardX}px - var(--hole-box-size) / 2)`,
	);
});

board.forEach((column) => {
	let emptyIndex = 0;
	column.element.addEventListener('mousedown', async () => {
		if (emptyIndex >= column.holes.length) return; // Don't do anything if column is full
		if (gameHasWinner) return;

		// Save current token
		const tokenToDrop = currentToken;

		// Update board data
		const hole = column.holes[emptyIndex];
		hole.tokenColor = currentColor;

		const { x: boardX, y: boardY } =
			connectFourBoardElement.getBoundingClientRect();
		const { x: holeX, y: holeY } = hole.element.getBoundingClientRect();

		// Check for winner
		const winner = checkBoardForWinner(board);
		if (winner) {
			gameHasWinner = true;
			console.log(`${winner} has won!`);
		}

		// Swap color
		if (currentColor === 'RED') currentColor = 'YELLOW';
		else if (currentColor === 'YELLOW') currentColor = 'RED';
		else throw `invalid color`;

		// Create new token
		if (!winner) {
			currentToken = createToken(currentColor);
			currentToken.style.setProperty('left', `${holeX - boardX}px`);
			currentToken.style.setProperty('top', 'calc(var(--hole-box-size) * -2)');
			currentToken.style.setProperty('opacity', '0');
			tokensContainer.appendChild(currentToken);
			setTimeout(() => {
				currentToken.style.setProperty('top', 'calc(var(--hole-box-size) * -1)');
				currentToken.style.removeProperty('opacity');
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
	});
});
