import type { AppInfo } from "@/lib/interfaces/rustplus";

import { getCorrectedMapSize } from "@/lib/utils";
import { Logger } from "@/utils";

export class ServerInfo {
    public mapSize: number;

    public constructor(appInfo: AppInfo) {
        this.mapSize = getCorrectedMapSize(appInfo.mapSize);
    }

    public update(appInfo: AppInfo) {
        if (!appInfo) {
            Logger.warn("Received invalid server info update from app.");
            return;
        }

        this.mapSize = getCorrectedMapSize(appInfo.mapSize);
    }
}
