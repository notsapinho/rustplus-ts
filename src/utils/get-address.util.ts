export function getAddress(
    useFacepunchProxy: boolean,
    ip: string,
    port: string
): string {
    return useFacepunchProxy
        ? `wss://companion-rust.facepunch.com/game/${ip}/${port}`
        : `ws://${ip}:${port}`;
}
