import type { AppInfo } from "@/lib/interfaces/rustplus";

import { getCorrectedMapSize } from "@/lib/utils";

export class ServerInfo {
    public mapSize: number;

    public constructor(appInfo: AppInfo) {
        this.mapSize = getCorrectedMapSize(appInfo.mapSize);
    }

    public update(appInfo: AppInfo) {
        if (!appInfo) return;

        this.mapSize = getCorrectedMapSize(appInfo.mapSize);
    }
}
