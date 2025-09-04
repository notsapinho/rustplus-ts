import type { ServiceRequestCost } from "@/types/cost.type";

import { ConsumeTokensError } from "@/errors/consume-tokens.error";
import { BaseService } from "./base.service";

export const CameraServiceCosts: Record<string, ServiceRequestCost> = {
    cameraSubscribe: {
        tokens: 1,
        timeout: 10000
    },
    cameraUnsubscribe: {
        tokens: 1,
        timeout: 10000
    },
    cameraInput: {
        tokens: 0.01,
        timeout: 10000
    }
};

export class CameraService extends BaseService {
    public async subscribe(identifier: string) {
        const result = await this.client.consumeTokens(
            CameraServiceCosts.cameraSubscribe
        );
        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.client.sendRequestAsync(
            {
                cameraSubscribe: {
                    cameraId: identifier
                }
            },
            CameraServiceCosts.cameraSubscribe.timeout
        );

        return appResponse;
    }

    public async unsubscribe() {
        const result = await this.client.consumeTokens(
            CameraServiceCosts.cameraUnsubscribe
        );

        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.client.sendRequestAsync(
            {
                cameraUnsubscribe: {}
            },
            CameraServiceCosts.cameraUnsubscribe.timeout
        );

        return appResponse;
    }

    public async input(buttons: number, x: number, y: number) {
        const result = await this.client.consumeTokens(
            CameraServiceCosts.cameraInput
        );
        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.client.sendRequestAsync(
            {
                cameraInput: {
                    buttons,
                    mouseDelta: {
                        x: x,
                        y: y
                    }
                }
            },
            CameraServiceCosts.cameraInput.timeout
        );

        return appResponse;
    }
}
