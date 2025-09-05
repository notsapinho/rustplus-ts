export function decimalToHHMM(time: number) {
    const hours = Math.floor(time);
    const minutes = Math.floor((time - hours) * 60);

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export function decimalToHM(time: number) {
    const hours = Math.floor(time);
    const minutes = Math.floor((time - hours) * 60);

    return `${hours}h ${minutes}m`;
}
