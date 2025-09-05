import type { AppMap, AppMap_Monument } from "@/lib/interfaces/rustplus";

export class Map {
    public monuments: AppMap_Monument[] = [];

    public constructor(appMap: AppMap) {
        this.monuments = appMap.monuments;
    }

    public update(appMap: AppMap) {
        this.monuments = appMap.monuments;
    }
}
