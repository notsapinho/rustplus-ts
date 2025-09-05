import type { Service } from "./service.structure";

import { container } from "@sapphire/pieces";

export class Services {
    public constructor() {
        container.services = this;
    }

    public exposePiece(name: string, piece: Service) {
        this[name] = piece;
    }
}

declare module "@sapphire/pieces" {
    interface Container {
        services: Services;
    }
}
