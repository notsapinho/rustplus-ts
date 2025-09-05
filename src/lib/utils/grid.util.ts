const GRID_DIAMETER = 146.25;

export function getGridByXY(x: number, y: number, mapSize: number) {
    const pos = {
        location: null,
        monument: null,
        string: null,
        x,
        y
    };

    pos.location = getGridLabelByXY(x, y, mapSize);

    pos.string = `${pos.location}${pos.monument !== null ? ` (${pos.monument})` : ""}`;

    return pos;
}

export function getGridLabelByXY(x: number, y: number, mapSize: number) {
    const correctedMapSize = getCorrectedMapSize(mapSize);

    if (isOutsideGridSystem(x, y, correctedMapSize)) {
        return null;
    }

    const gridPosLetters = getGridLettersByX(x, correctedMapSize);
    const gridPosNumber = getGridNumberByY(y, correctedMapSize);

    return gridPosLetters + gridPosNumber;
}

export function getGridLettersByX(x: number, mapSize: number) {
    let counter = 1;
    for (let startGrid = 0; startGrid < mapSize; startGrid += GRID_DIAMETER) {
        if (x >= startGrid && x <= startGrid + GRID_DIAMETER) {
            return numberToLetters(counter);
        }
        counter++;
    }
}

export function getGridNumberByY(y: number, mapSize: number) {
    let counter = 1;
    const numberOfGrids = Math.floor(mapSize / GRID_DIAMETER);
    for (let startGrid = 0; startGrid < mapSize; startGrid += GRID_DIAMETER) {
        if (y >= startGrid && y <= startGrid + GRID_DIAMETER) {
            return numberOfGrids - counter;
        }
        counter++;
    }
}

export function numberToLetters(num: number) {
    const mod = num % 26;
    let pow = (num / 26) | 0;
    const out = mod ? String.fromCharCode(64 + mod) : (pow--, "Z");
    return pow ? numberToLetters(pow) + out : out;
}

export function getCorrectedMapSize(mapSize: number) {
    const remainder = mapSize % GRID_DIAMETER;
    const offset = GRID_DIAMETER - remainder;
    return remainder < 120 ? mapSize - remainder : mapSize + offset;
}

export function isOutsideGridSystem(
    x: number,
    y: number,
    mapSize: number,
    offset = 0
) {
    if (
        x < -offset ||
        x > mapSize + offset ||
        y < -offset ||
        y > mapSize + offset
    ) {
        return true;
    }

    return false;
}
