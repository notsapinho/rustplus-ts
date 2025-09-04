import { ConsumeTokensError } from "@/errors/consume-tokens.error";
import { BaseService } from "./base.service";

export const EntityServiceCosts = {
    getEntityInfo: {
        tokens: 1,
        timeout: 10000
    },
    setEntityValue: {
        tokens: 1,
        timeout: 10000
    },
    checkSubscription: {
        tokens: 1,
        timeout: 10000
    },
    setSubscription: {
        tokens: 1,
        timeout: 10000
    }
};

export class EntityService extends BaseService {
    public async getInfo(entityId: number) {
        const result = await this.client.consumeTokens(
            EntityServiceCosts.getEntityInfo
        );
        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.client.sendRequestAsync(
            {
                entityId: entityId,
                getEntityInfo: {}
            },
            EntityServiceCosts.getEntityInfo.timeout
        );

        return appResponse;
    }

    public async setValue(entityId: number, value: boolean) {
        const result = await this.client.consumeTokens(
            EntityServiceCosts.setEntityValue
        );
        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.client.sendRequestAsync(
            {
                entityId: entityId,
                setEntityValue: {
                    value: value
                }
            },
            EntityServiceCosts.setEntityValue.timeout
        );

        return appResponse;
    }

    public async checkSubscription(entityId: number) {
        const result = await this.client.consumeTokens(
            EntityServiceCosts.checkSubscription
        );
        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.client.sendRequestAsync(
            {
                entityId: entityId,
                checkSubscription: {}
            },
            EntityServiceCosts.checkSubscription.timeout
        );

        return appResponse;
    }

    public async setSubscription(entityId: number, value: boolean) {
        const result = await this.client.consumeTokens(
            EntityServiceCosts.setSubscription
        );
        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.client.sendRequestAsync(
            {
                entityId: entityId,
                setSubscription: {
                    value: value
                }
            },
            EntityServiceCosts.setSubscription.timeout
        );

        return appResponse;
    }
}
