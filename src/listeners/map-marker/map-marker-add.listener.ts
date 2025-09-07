import type { AppMarker } from "@/lib/interfaces/rustplus";
import type { ListenerContext } from "@/lib/structures/listener";

import { AppMarkerType } from "@/lib/interfaces/rustplus";
import { Listener } from "@/lib/structures/listener";
import { Constants, getDistanceBetween, MonumentTokens } from "@/lib/utils";
import { MapMarkersEvent } from "@/structures";
import { Logger } from "@/utils";

export class MapMarkerListener extends Listener<
    typeof MapMarkersEvent.MarkerAdd
> {
    public constructor(context: ListenerContext) {
        super(context, {
            event: MapMarkersEvent.MarkerAdd
        });
    }

    public override async run(marker: AppMarker) {
        switch (marker.type) {
            case AppMarkerType.CH47:
                {
                    await this.onCH47Spawn(marker);
                }
                break;
            case AppMarkerType.CargoShip:
                {
                    await this.onCargoShipSpawn();
                }
                break;
        }
    }

    private async onCargoShipSpawn() {
        this.container.client.mapMarkers.cargo = {
            dockedAt: null,
            spawnedAt: new Date()
        };

        // TODO: Add position
        await this.container.client.services.team.sendMessage(
            "Cargo just spawned!"
        );

        Logger.info("Cargo ship spawned");
    }

    private async onCH47Spawn(marker: AppMarker) {
        const rigs = this.container.client.map.monuments.filter((m) =>
            [
                MonumentTokens.SMALL_OIL_RIG,
                MonumentTokens.LARGE_OIL_RIG
            ].includes(m.token)
        );

        for (const rig of rigs) {
            const distance = getDistanceBetween(
                marker.x,
                marker.y,
                rig.x,
                rig.y
            );

            if (distance > Constants.OIL_RIG_CH47_MAX_SPAWN_DISTANCE) return;

            const rigName =
                rig.token === MonumentTokens.SMALL_OIL_RIG
                    ? "Small Oil Rig"
                    : "Large Oil Rig";

            await this.container.client.services.team.sendMessage(
                `${rigName} was just called!`
            );

            //TODO: Use scheduled tasks or similar
            setTimeout(async () => {
                await this.container.client.services.team.sendMessage(
                    `The crate at ${rigName} has been unlocked!`
                );

                Logger.info(`Crate unlocked at ${rigName}`);
            }, Constants.OIL_RIG_LOCKED_CRATE_UNLOCK_TIME);

            Logger.info(`CH47 spawned at ${rigName}`);

            break;
        }
    }
}
