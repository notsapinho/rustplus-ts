import { EventEmitter } from "events";
import type {
    AppCameraInfo,
    AppCameraRays,
    AppMessage,
    AppResponse
} from "@/interfaces/rustplus";
import type { Client } from "../client.core";

import * as jimp from "jimp";

import { IndexGenerator } from "@/utils/index-generator.util";

export enum Buttons {
    NONE = 0,
    FORWARD = 2,
    BACKWARD = 4,
    LEFT = 8,
    RIGHT = 16,
    JUMP = 32,
    DUCK = 64,
    SPRINT = 128,
    USE = 256,
    FIRE_PRIMARY = 1024,
    FIRE_SECONDARY = 2048,
    RELOAD = 8192,
    FIRE_THIRD = 134217728
}

/**
 * The control flags that can be sent to the server.
 * - CCTV Camera:       0, NONE
 * - PTZ CCTV Camera:   10, NONE, MOUSE, FIRE
 * - Drone:             7, NONE, MOVEMENT, MOUSE, SPRINT_AND_DUCK
 * - Auto Turret:       58, NONE, MOUSE, FIRE, RELOAD, CROSSHAIR
 */
export enum ControlFlags {
    NONE = 0,
    MOVEMENT = 1,
    MOUSE = 2,
    SPRINT_AND_DUCK = 4,
    FIRE = 8,
    RELOAD = 16,
    CROSSHAIR = 32
}

export enum CameraType {
    UNKNOWN = 0,
    CCTV_CAMERA = 1,
    PTZ_CCTV_CAMERA = 2,
    DRONE = 3,
    AUTO_TURRET = 4
}

export function getCameraType(controlFlags: number): CameraType {
    switch (controlFlags) {
        case 0: {
            return CameraType.CCTV_CAMERA;
        }
        case 10: {
            return CameraType.PTZ_CCTV_CAMERA;
        }
        case 7: {
            return CameraType.DRONE;
        }
        case 58: {
            return CameraType.AUTO_TURRET;
        }
        default: {
            return CameraType.UNKNOWN;
        }
    }
}

export class Camera extends EventEmitter {
    private isSubscribed = false;

    private cameraType: CameraType = CameraType.UNKNOWN;
    private cameraRays: AppCameraRays[] = [];
    private cameraSubscribeInfo: AppCameraInfo | null = null;

    constructor(
        public client: Client,
        public identifier: string
    ) {
        super();

        this.client.on("message", this.onMessage.bind(this));

        this.client.once("disconnected", this.onDisconnected.bind(this));
    }

    private async onMessage(appMessage: AppMessage) {
        if (this.isSubscribed && appMessage.broadcast?.cameraRays) {
            this.cameraRays.push(appMessage.broadcast.cameraRays);

            if (this.cameraRays.length > 10) {
                this.cameraRays.shift();

                const image = await this.renderCameraFrame();

                this.emit("render", image);
            }
        }
    }

    private async onDisconnected() {
        if (this.isSubscribed) {
            await this.unsubscribe();
        }
    }

    private async renderCameraFrame() {
        const frames = this.cameraRays;
        const width = this.cameraSubscribeInfo.width;
        const height = this.cameraSubscribeInfo.height;

        const samplePositionBuffer = new Int16Array(width * height * 2);
        for (let y = 0, index = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                samplePositionBuffer[index++] = x;
                samplePositionBuffer[index++] = y;
            }
        }

        const indexGenerator = new IndexGenerator(1337);
        for (let R = width * height - 1; R >= 1; R--) {
            const C = 2 * R;
            const I = 2 * indexGenerator.nextInt(R + 1);

            const P = samplePositionBuffer[C];
            const k = samplePositionBuffer[C + 1];
            const A = samplePositionBuffer[I];
            const F = samplePositionBuffer[I + 1];

            samplePositionBuffer[I] = P;
            samplePositionBuffer[I + 1] = k;
            samplePositionBuffer[C] = A;
            samplePositionBuffer[C + 1] = F;
        }

        const output = new Array(width * height);

        for (const frame of frames) {
            let sampleOffset = 2 * frame.sampleOffset;
            let dataPointer = 0;
            const rayLookback = new Array(64);
            for (let r = 0; r < 64; r++) {
                rayLookback[r] = [0, 0, 0];
            }

            const rayData = frame.rayData;

            // eslint-disable-next-line no-constant-condition
            while (true) {
                if (dataPointer >= rayData.length - 1) {
                    break;
                }

                let t = 0,
                    r = 0,
                    i = 0;
                const n = rayData[dataPointer++];

                if (255 === n) {
                    const l = rayData[dataPointer++];
                    const o = rayData[dataPointer++];
                    const s = rayData[dataPointer++];
                    const u =
                        (3 * (((t = (l << 2) | (o >> 6)) / 128) | 0) +
                            5 * (((r = 63 & o) / 16) | 0) +
                            7 * (i = s)) &
                        63;
                    const f = rayLookback[u];

                    f[0] = t;
                    f[1] = r;
                    f[2] = i;
                } else {
                    const c = 192 & n;

                    if (0 === c) {
                        const h = 63 & n;
                        const y = rayLookback[h];
                        t = y[0];
                        r = y[1];
                        i = y[2];
                    } else if (64 === c) {
                        const p = 63 & n;
                        const v = rayLookback[p];
                        const b = v[0];
                        const w = v[1];
                        const h = v[2];
                        const g = rayData[dataPointer++];
                        t = b + ((g >> 3) - 15);
                        r = w + ((7 & g) - 3);
                        i = h;
                    } else if (128 === c) {
                        const R = 63 & n;
                        const C = rayLookback[R];
                        const I = C[0];
                        const P = C[1];
                        const k = C[2];
                        t = I + (rayData[dataPointer++] - 127);
                        r = P;
                        i = k;
                    } else {
                        const A = rayData[dataPointer++];
                        const F = rayData[dataPointer++];
                        const D =
                            (3 * (((t = (A << 2) | (F >> 6)) / 128) | 0) +
                                5 * (((r = 63 & F) / 16) | 0) +
                                7 * (i = 63 & n)) &
                            63;
                        const E = rayLookback[D];
                        E[0] = t;
                        E[1] = r;
                        E[2] = i;
                    }
                }

                sampleOffset %= 2 * width * height;
                const index =
                    samplePositionBuffer[sampleOffset++] +
                    samplePositionBuffer[sampleOffset++] * width;
                output[index] = [t / 1023, r / 63, i];
            }
        }

        const colours = [
            [0.5, 0.5, 0.5],
            [0.8, 0.7, 0.7],
            [0.3, 0.7, 1],
            [0.6, 0.6, 0.6],
            [0.7, 0.7, 0.7],
            [0.8, 0.6, 0.4],
            [1, 0.4, 0.4],
            [1, 0.1, 0.1]
        ];

        const image = new jimp.Jimp({ width: width, height: height });

        for (let i = 0; i < output.length; i++) {
            const ray = output[i];
            if (!ray) {
                continue;
            }

            const distance = ray[0];
            const alignment = ray[1];
            const material = ray[2];

            let target_colour = [0, 0, 0];

            if (distance === 1 && alignment === 0 && material === 0) {
                target_colour = [208, 230, 252];
            } else {
                const colour = colours[material];
                target_colour = [
                    alignment * colour[0] * 255,
                    alignment * colour[1] * 255,
                    alignment * colour[2] * 255
                ];
            }

            const x = i % width;
            const y = height - 1 - Math.floor(i / width);
            image.setPixelColor(
                jimp.rgbaToInt(
                    target_colour[0],
                    target_colour[1],
                    target_colour[2],
                    255
                ),
                x,
                y
            );
        }

        return await image.getBuffer(jimp.JimpMime.png);
    }

    public async subscribe() {
        this.emit("subscribing");

        const response = (await this.client.cameraService.subscribe(
            this.identifier
        )) as AppResponse;

        if (!response.cameraSubscribeInfo) {
            this.emit("error", new Error("Failed to subscribe to camera."));
            return;
        }

        this.isSubscribed = true;
        this.cameraRays = [];
        this.cameraSubscribeInfo = response.cameraSubscribeInfo;
        this.cameraType = getCameraType(this.cameraSubscribeInfo.controlFlags);

        this.emit("subscribed");

        return true;
    }

    public async unsubscribe() {
        this.emit("unsubscribing");

        this.client.removeListener("message", this.onMessage.bind(this));
        this.client.removeListener(
            "disconnected",
            this.onDisconnected.bind(this)
        );

        if (this.client.isConnected) {
            await this.client.cameraService.unsubscribe();
        }

        this.identifier = "";
        this.isSubscribed = false;
        this.cameraRays = [];
        this.cameraSubscribeInfo = null;
        this.cameraType = CameraType.UNKNOWN;

        this.emit("unsubscribed");

        return true;
    }

    public async zoom(): Promise<boolean> {
        if (
            !this.isSubscribed ||
            this.cameraType !== CameraType.PTZ_CCTV_CAMERA
        ) {
            return false;
        }

        /* Press left mouse button to zoom in. */
        await this.client.cameraService.input(Buttons.FIRE_PRIMARY, 0, 0);

        /* Release all mouse buttons. */
        await this.client.cameraService.input(Buttons.NONE, 0, 0);

        return true;
    }

    async shoot(): Promise<boolean> {
        if (!this.isSubscribed || this.cameraType !== CameraType.AUTO_TURRET) {
            return false;
        }

        /* Press left mouse button to shoot. */
        await this.client.cameraService.input(Buttons.FIRE_PRIMARY, 0, 0);

        /* Release all mouse buttons. */
        await this.client.cameraService.input(Buttons.NONE, 0, 0);

        return true;
    }

    async reload(): Promise<boolean> {
        if (!this.isSubscribed || this.cameraType !== CameraType.AUTO_TURRET) {
            return false;
        }

        /* Press left mouse button to shoot. */
        await this.client.cameraService.input(Buttons.RELOAD, 0, 0);

        /* Release all mouse buttons. */
        await this.client.cameraService.input(Buttons.NONE, 0, 0);

        return true;
    }
}
