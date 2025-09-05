import type { AppMarker } from "@/lib/interfaces/rustplus";
import type { ListenerContext } from "@/lib/structures/listener";

import { AppMarkerType } from "@/lib/interfaces/rustplus";
import { Listener } from "@/lib/structures/listener";
import { getGridLabelByXY, isOutsideGridSystem } from "@/lib/utils";
import { MapMarkersEvent } from "@/structures";
import { Logger } from "@/utils";

export class MapMarkerListener extends Listener<
    typeof MapMarkersEvent.MarkerRemove
> {
    public constructor(context: ListenerContext) {
        super(context, {
            event: MapMarkersEvent.MarkerRemove
        });
    }

    public override async run(marker: AppMarker) {
        switch (marker.type) {
            case AppMarkerType.CargoShip:
                {
                    await this.onCargoShipDespawn();
                }
                break;
            case AppMarkerType.PatrolHelicopter:
                {
                    await this.onPatrolHelicopterDespawn(marker);
                }
                break;
        }
    }

    private async onCargoShipDespawn() {
        this.container.client.mapMarkers.cargo = null;

        await this.container.client.services.team.sendMessage(
            "O Cargo saiu do mapa."
        );

        Logger.info("Cargo ship despawned");
    }

    private async onPatrolHelicopterDespawn(marker: AppMarker) {
        if (
            isOutsideGridSystem(
                marker.x,
                marker.y,
                this.container.client.serverInfo.mapSize
            )
        ) {
            await this.container.client.services.team.sendMessage(
                "O Patrol saiu do mapa."
            );
        } else {
            const grid = getGridLabelByXY(
                marker.x,
                marker.y,
                this.container.client.serverInfo.mapSize
            );

            await this.container.client.services.team.sendMessage(
                `O Patrol foi derrubado perto do ${grid}.`
            );
        }
    }
}
