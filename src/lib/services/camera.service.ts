import type { ServiceRequestCost } from "@/lib/types/cost.type";

import { container } from "@sapphire/pieces";

import { ConsumeTokensError } from "@/lib/errors/consume-tokens.error";
import { Service } from "../structures/client/service";

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

export class CameraService extends Service {
    public async subscribe(identifier: string) {
        const result = await this.container.client.consumeTokens(
            CameraServiceCosts.cameraSubscribe
        );
        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.container.client.sendRequestAsync(
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
        const result = await this.container.client.consumeTokens(
            CameraServiceCosts.cameraUnsubscribe
        );

        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.container.client.sendRequestAsync(
            {
                cameraUnsubscribe: {}
            },
            CameraServiceCosts.cameraUnsubscribe.timeout
        );

        return appResponse;
    }

    public async input(buttons: number, x: number, y: number) {
        const result = await this.container.client.consumeTokens(
            CameraServiceCosts.cameraInput
        );
        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.container.client.sendRequestAsync(
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

declare module "@/lib/structures/client/service" {
    interface Services {
        camera: CameraService;
    }
}

void container.stores.loadPiece({
    name: "camera",
    piece: CameraService,
    store: "services"
});
