import { container } from "@sapphire/pieces";

import { ConsumeTokensError } from "@/lib/errors/consume-tokens.error";
import { Service } from "../structures/client/service/service.structure";

export const ServerServiceCosts = {
    getInfo: {
        tokens: 1,
        timeout: 10000
    },
    getTime: {
        tokens: 1,
        timeout: 10000
    },
    getMap: {
        tokens: 5,
        timeout: 30000
    },
    getMapMarkers: {
        tokens: 1,
        timeout: 15000
    }
};

export class ServerService extends Service {
    public async getInfo() {
        const result = await this.container.client.consumeTokens(
            ServerServiceCosts.getInfo
        );
        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.container.client.sendRequestAsync(
            {
                getInfo: {}
            },
            ServerServiceCosts.getInfo.timeout
        );

        return appResponse;
    }

    public async getTime() {
        const result = await this.container.client.consumeTokens(
            ServerServiceCosts.getTime
        );

        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.container.client.sendRequestAsync(
            {
                getTime: {}
            },
            ServerServiceCosts.getTime.timeout
        );

        return appResponse;
    }

    public async getMap() {
        const result = await this.container.client.consumeTokens(
            ServerServiceCosts.getMap
        );

        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.container.client.sendRequestAsync(
            {
                getMap: {}
            },
            ServerServiceCosts.getMap.timeout
        );

        return appResponse;
    }

    public async getMapMarkers() {
        const result = await this.container.client.consumeTokens(
            ServerServiceCosts.getMapMarkers
        );
        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.container.client.sendRequestAsync(
            {
                getMapMarkers: {}
            },
            ServerServiceCosts.getMapMarkers.timeout
        );

        return appResponse;
    }
}

declare module "@/lib/structures/client/service" {
    interface Services {
        server: ServerService;
    }
}

void container.stores.loadPiece({
    name: "server",
    piece: ServerService,
    store: "services"
});
