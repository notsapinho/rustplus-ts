import type {
    AppMap_Monument,
    AppMapMarkers,
    AppMarker
} from "@/lib/interfaces/rustplus";

import { container } from "@sapphire/pieces";

import { AppMarkerType } from "@/lib/interfaces/rustplus";
import { Constants, getDistanceBetween, MonumentTokens } from "@/lib/utils";
import { Logger } from "@/utils";

export const MapMarkersEvent = {
    MarkerAdd: "markerAdd",
    MarkerUpdate: "markerUpdate",
    MarkerRemove: "markerRemove"
} as const;

interface CargoShip {
    dockedAt: AppMap_Monument | null;
    spawnedAt: Date;
}

export class MapMarkers {
    public cargo: CargoShip | null = null;
    public markers: AppMarker[] = [];

    public constructor(appMapMarkers: AppMapMarkers) {
        this.markers = appMapMarkers.markers;

        const cargo = this.markers.find(
            (m) => m.type === AppMarkerType.CargoShip
        );

        if (cargo) {
            const docked = this.getCargoDockedHarbor(cargo);

            this.cargo = {
                dockedAt: docked || null,
                spawnedAt: new Date()
            };
        }
    }

    public getCargoDockedHarbor(marker: AppMarker) {
        const harbors = container.client.map.monuments.filter((m) =>
            [MonumentTokens.HARBOR, MonumentTokens.HARBOR_2].includes(m.token)
        );

        const docked = harbors.find(
            (harbor) =>
                getDistanceBetween(marker.x, marker.y, harbor.x, harbor.y) <=
                Constants.HARBOR_DOCK_DISTANCE
        );

        return docked;
    }

    public update(newAppMapMarkers: AppMapMarkers) {
        if (!newAppMapMarkers) {
            Logger.warn("Received invalid map markers update from app.");

            return;
        }

        for (const newMarker of newAppMapMarkers.markers) {
            const oldMarker = this.markers.find((m) => m.id === newMarker.id);

            if (!oldMarker) {
                container.client.emit(MapMarkersEvent.MarkerAdd, newMarker);
            }
        }

        for (const oldMarker of this.markers) {
            const newMarker = newAppMapMarkers.markers.find(
                (m) => m.id === oldMarker.id
            );

            if (!newMarker) {
                container.client.emit(MapMarkersEvent.MarkerRemove, oldMarker);
            } else if (
                JSON.stringify(oldMarker) !== JSON.stringify(newMarker)
            ) {
                container.client.emit(
                    MapMarkersEvent.MarkerUpdate,
                    oldMarker,
                    newMarker
                );
            }
        }

        this.markers = newAppMapMarkers.markers;
    }
}

declare module "@/lib/types/events.type" {
    interface ClientEvents {
        [MapMarkersEvent.MarkerAdd]: [marker: AppMarker];
        [MapMarkersEvent.MarkerUpdate]: [
            oldMarker: AppMarker,
            newMarker: AppMarker
        ];
        [MapMarkersEvent.MarkerRemove]: [marker: AppMarker];
    }
}
