import type { AppInfo } from "@/lib/interfaces/rustplus";

export class ServerInfo {
    public mapSize: number;

    public constructor(serverInfo: AppInfo) {
        this.mapSize = serverInfo.mapSize;
    }

    public update(serverInfo: AppInfo) {
        this.mapSize = serverInfo.mapSize;
    }
}
