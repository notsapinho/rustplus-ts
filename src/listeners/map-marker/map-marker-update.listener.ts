import type { AppMarker } from "@/lib/interfaces/rustplus";
import type { ListenerContext } from "@/lib/structures/listener";

import { AppMarkerType } from "@/lib/interfaces/rustplus";
import { Listener } from "@/lib/structures/listener";
import { getGridLabelByXY } from "@/lib/utils";
import { MapMarkersEvent } from "@/structures";
import { Logger } from "@/utils";

export class MapMarkerListener extends Listener<
    typeof MapMarkersEvent.MarkerUpdate
> {
    public constructor(context: ListenerContext) {
        super(context, {
            event: MapMarkersEvent.MarkerUpdate
        });
    }

    public override async run(oldMarker: AppMarker, newMarker: AppMarker) {
        switch (newMarker.type) {
            case AppMarkerType.CargoShip:
                {
                    await this.onCargoShipUpdate(oldMarker, newMarker);
                }
                break;
        }
    }

    private async onCargoShipUpdate(_: AppMarker, newMarker: AppMarker) {
        const dockedAt =
            this.container.client.mapMarkers.getCargoDockedHarbor(newMarker);

        const grid =
            dockedAt &&
            getGridLabelByXY(
                dockedAt.x,
                dockedAt.y,
                this.container.client.serverInfo.mapSize
            );

        if (
            dockedAt &&
            this.container.client.mapMarkers.cargo?.dockedAt === null
        ) {
            this.container.client.mapMarkers.cargo = {
                dockedAt: dockedAt,
                spawnedAt: new Date()
            };

            await this.container.client.services.team.sendMessage(
                `O Cargo entrou no porto do ${grid}.`
            );

            Logger.info(`Cargo ship docked at ${grid}`);
        } else if (
            !dockedAt &&
            this.container.client.mapMarkers.cargo?.dockedAt !== null
        ) {
            this.container.client.mapMarkers.cargo.dockedAt = null;

            await this.container.client.services.team.sendMessage(
                `O Cargo saiu do porto.`
            );

            Logger.info("Cargo ship undocked");
        }
    }
}
