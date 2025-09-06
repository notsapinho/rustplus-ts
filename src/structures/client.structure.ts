import type { ClientOptions } from "@/lib/core";

import { Client } from "@/lib/core";
import { isValidAppResponse } from "@/lib/utils";
import { Camera, Map, MapMarkers, ServerInfo, Team, Time } from "@/structures";
import { Logger } from "@/utils";

export class BotClient extends Client {
    public team: Team | null = null;
    public serverInfo: ServerInfo | null = null;
    public time: Time | null = null;
    public mapMarkers: MapMarkers | null = null;
    public map: Map | null = null;

    public connectedCamera: Camera | null = null;
    private poolInterval: NodeJS.Timeout | null = null;

    public constructor(options: ClientOptions) {
        super(options);
    }

    public async startPoolInterval() {
        if (this.poolInterval) return;

        await this.pool();

        this.poolInterval = setInterval(() => {
            void this.pool();
        }, 5000);
    }

    private async pool() {
        if (!this.isConnected) {
            throw new Error("Client is not connected.");
        }

        if (!this.map) {
            const map = await this.services.server.getMap();

            if (isValidAppResponse(map)) {
                this.map = new Map(map.map);
            } else {
                Logger.warn("Failed to get map");
            }
        }

        const time = await this.services.server.getTime();

        if (isValidAppResponse(time)) {
            if (this.time) this.time.update(time.time);
            else this.time = new Time(time.time);
        } else {
            Logger.warn("Failed to get time");
        }

        const serverInfo = await this.services.server.getInfo();

        if (isValidAppResponse(serverInfo)) {
            if (this.serverInfo) this.serverInfo.update(serverInfo.info);
            else this.serverInfo = new ServerInfo(serverInfo.info);
        } else {
            Logger.warn("Failed to get server info");
        }

        const team = await this.services.team.getInfo();

        if (isValidAppResponse(team)) {
            if (this.team) this.team.update(team.teamInfo);
            else this.team = new Team(team.teamInfo);
        } else {
            console.log("Failed to get team info");
        }

        const mapMarkers = await this.services.server.getMapMarkers();

        if (isValidAppResponse(mapMarkers)) {
            if (this.mapMarkers) this.mapMarkers.update(mapMarkers.mapMarkers);
            else this.mapMarkers = new MapMarkers(mapMarkers.mapMarkers);
        } else {
            Logger.warn("Failed to get map markers");
        }
    }

    public async connectToCamera(identifier: string) {
        if (this.connectedCamera)
            // TODO: Create and use a specific error for this
            throw new Error(
                "A camera is already connected. Please disconnect it before connecting to another camera."
            );

        const camera = new Camera(identifier);

        const subscribed = await camera.subscribe();

        if (!subscribed) return null;

        this.connectedCamera = camera;

        return camera;
    }
}

declare module "@/lib/core" {
    interface Client {
        team: Team | null;
        serverInfo: ServerInfo | null;
        time: Time | null;
        mapMarkers: MapMarkers | null;
        map: Map | null;
        connectedCamera: Camera | null;
        startPoolInterval(): Promise<void>;
    }
}
