function fill<T>(count: number, fn: (x: number) => T): T[] {
    return new Array(count).fill(undefined).map((x,i) => fn(i));
}

function choose<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)]
}

function rndInt(max: number): number {
    return Math.floor(Math.random() * max);
}

export {fill, choose, rndInt}