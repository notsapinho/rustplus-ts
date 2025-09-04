import { ConsumeTokensError } from "@/errors/consume-tokens.error";
import { BaseService } from "./base.service";

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

export class ServerService extends BaseService {
    public async getInfo() {
        const result = await this.client.consumeTokens(
            ServerServiceCosts.getInfo
        );
        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.client.sendRequestAsync(
            {
                getInfo: {}
            },
            ServerServiceCosts.getInfo.timeout
        );

        return appResponse;
    }

    public async getTime() {
        const result = await this.client.consumeTokens(
            ServerServiceCosts.getTime
        );

        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.client.sendRequestAsync(
            {
                getTime: {}
            },
            ServerServiceCosts.getTime.timeout
        );

        return appResponse;
    }

    public async getMap() {
        const result = await this.client.consumeTokens(
            ServerServiceCosts.getMap
        );

        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.client.sendRequestAsync(
            {
                getMap: {}
            },
            ServerServiceCosts.getMap.timeout
        );

        return appResponse;
    }

    public async getMapMarkers() {
        const result = await this.client.consumeTokens(
            ServerServiceCosts.getMapMarkers
        );
        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.client.sendRequestAsync(
            {
                getMapMarkers: {}
            },
            ServerServiceCosts.getMapMarkers.timeout
        );

        return appResponse;
    }
}
