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

export function minutesToMMSS(minutes: number): string {
    const totalSeconds = Math.max(0, Math.round(minutes * 60));
    const mm = Math.floor(totalSeconds / 60)
        .toString()
        .padStart(2, "0");
    const ss = (totalSeconds % 60).toString().padStart(2, "0");
    return `${mm}m ${ss}s`;
}
