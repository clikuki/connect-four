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
	token: Token | null;
}
interface Token {
	element: HTMLElement;
	color: Color;
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
				token: null,
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

function createToken(color: Color): Token {
	const tokenElem = document.createElement('div');
	tokenElem.className = 'token';
	tokenElem.setAttribute('data-color', color);
	return {
		element: tokenElem,
		color,
	};
}

const board = createBoard(7, 6);
let currentColor: Color = 'YELLOW';
let currentToken: Token = createToken(currentColor);
currentToken.element.style.setProperty(
	'top',
	'calc(var(--hole-box-size) * -1)',
);
currentToken.element.style.setProperty(
	'left',
	`calc(${
		connectFourBoardElement.getBoundingClientRect().width / 2
	}px - var(--hole-box-size) / 2)`,
);
tokensContainer.appendChild(currentToken.element);

connectFourBoardElement.addEventListener('mousemove', ({ x }) => {
	const { x: boardX } = connectFourBoardElement.getBoundingClientRect();
	currentToken.element.style.setProperty(
		'left',
		`calc(${x - boardX}px - var(--hole-box-size) / 2)`,
	);
});

board.forEach((column) => {
	let emptyIndex = 0;
	column.element.addEventListener('mousedown', async () => {
		// Don't do anything if column is full
		if (emptyIndex >= column.holes.length) return;

		// Swap color
		if (currentColor === 'RED') currentColor = 'YELLOW';
		else if (currentColor === 'YELLOW') currentColor = 'RED';
		else throw `invalid color`;

		// Save current token
		const tokenToDrop = currentToken;

		// Create new token
		const hole = column.holes[emptyIndex];
		const { x: boardX, y: boardY } =
			connectFourBoardElement.getBoundingClientRect();
		const { x: holeX, y: holeY } = hole.element.getBoundingClientRect();
		currentToken = createToken(currentColor);
		currentToken.element.style.setProperty('left', `${holeX - boardX}px`);
		currentToken.element.style.setProperty(
			'top',
			'calc(var(--hole-box-size) * -2)',
		);
		currentToken.element.style.setProperty('opacity', '0');
		tokensContainer.appendChild(currentToken.element);
		setTimeout(() => {
			currentToken.element.style.setProperty(
				'top',
				'calc(var(--hole-box-size) * -1)',
			);
			currentToken.element.style.removeProperty('opacity');
		});

		// Drop/place token
		tokenToDrop.element.style.setProperty(
			'--speed-percentage',
			String((column.holes.length - emptyIndex) / column.holes.length),
		);
		tokenToDrop.element.style.setProperty('left', `${holeX - boardX}px`);
		const isTransitioningOnAxisX = tokenToDrop.element
			.getAnimations()
			.some(
				(anim) =>
					anim instanceof CSSTransition && anim.transitionProperty === 'left',
			);
		if (isTransitioningOnAxisX) {
			await new Promise((res) => {
				tokenToDrop.element.addEventListener('transitionend', res, { once: true });
			});
		}
		tokenToDrop.element.style.setProperty(
			'top',
			`calc(${holeY - boardY}px - var(--hole-box-size))`,
		);

		// increment empty index
		emptyIndex++;
	});
});
