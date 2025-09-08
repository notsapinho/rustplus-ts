import type { AppMap, AppMap_Monument } from "@/lib/interfaces/rustplus";

import { Logger } from "@/utils";

export class Map {
    public monuments: AppMap_Monument[] = [];

    public constructor(appMap: AppMap) {
        this.monuments = appMap.monuments;
    }

    public update(appMap: AppMap) {
        if (!appMap) {
            Logger.warn("Received invalid map update from app.");
            return;
        }

        this.monuments = appMap.monuments;
    }
}
