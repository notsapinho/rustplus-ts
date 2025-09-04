import type { AppInfo } from "@/interfaces/rustplus";

//TODO: Add more server info
export class ServerInfo {
    public mapSize: number;

    public constructor(serverInfo: AppInfo) {
        this.mapSize = serverInfo.mapSize;
    }

    public update(serverInfo: AppInfo) {
        this.mapSize = serverInfo.mapSize;
    }
}
