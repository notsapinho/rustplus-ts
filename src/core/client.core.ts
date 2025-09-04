import { EventEmitter } from "events";
import type { ServiceRequestCost } from "@/types/cost.type";
import type TypedEventEmitter from "typed-emitter";
import type { AppResponse } from "../interfaces/rustplus";

import WebSocket from "ws";

import { ConsumeTokensError } from "@/errors/consume-tokens.error";
import { CameraService } from "@/services/camera.service";
import { EntityService } from "@/services/entity.service";
import { ServerService } from "@/services/server.service";
import { TeamService } from "@/services/team.service";
import { isValidAppResponse } from "@/utils/is-app-response.util";
import { sleep } from "@/utils/sleep.util";
import { AppMessage, AppRequest } from "../interfaces/rustplus";
import { Camera } from "./structures/camera.structure";
import { ServerInfo } from "./structures/server-info.structure";
import { Team } from "./structures/team.structure";
import { Time } from "./structures/time.structure";

export enum EmitErrorType {
    WebSocket = 0,
    Callback = 1
}

type CallbackFunction = (appMessage: AppMessage) => void;

type ClientEvents = {
    connecting: () => void;
    connected: () => void;
    message: (appMessage: AppMessage, handled: boolean) => void;
    request: (appRequest: AppRequest) => void;
    disconnected: () => void;
    error: (type: EmitErrorType, error: Error) => void;
};

export class Client extends (EventEmitter as new () => TypedEventEmitter<ClientEvents>) {
    private static readonly MAX_REQUESTS_PER_IP_ADDRESS = 50;
    private static readonly REQUESTS_PER_IP_REPLENISH_RATE = 15;
    private static readonly MAX_REQUESTS_PER_PLAYER_ID = 25;
    private static readonly REQUESTS_PER_PLAYER_ID_REPLENISH_RATE = 3;
    private static readonly MAX_REQUESTS_FOR_SERVER_PAIRING = 5;
    private static readonly REQUESTS_FOR_SERVER_PAIRING_REPLENISH_RATE = 0.1;

    private seq = 0;
    private seqCallbacks: CallbackFunction[] = [];
    private ws: WebSocket | null = null;
    private replenishInterval: NodeJS.Timeout | null = null;
    private tokens: {
        connection: number;
        player: number;
        serverPairing: number;
    } = {
        connection: Client.MAX_REQUESTS_PER_IP_ADDRESS,
        player: Client.MAX_REQUESTS_PER_PLAYER_ID,
        serverPairing: Client.MAX_REQUESTS_FOR_SERVER_PAIRING
    };

    private poolInterval: NodeJS.Timeout | null = null;

    public cameraService = new CameraService(this);
    public entityService = new EntityService(this);
    public serverService = new ServerService(this);
    public teamService = new TeamService(this);

    public connectedCamera: Camera | null = null;
    public team: Team | null = null;
    public serverInfo: ServerInfo | null = null;
    public time: Time | null = null;

    constructor(
        public ip: string,
        public port: string,
        public playerId: string,
        public playerToken: number,
        public useFacepunchProxy = false
    ) {
        super();
    }

    private replenishTask() {
        this.replenishConnectionTokens();
        this.replenishPlayerTokens();
        this.replenishServerPairingTokens();
    }

    private replenishConnectionTokens() {
        if (this.tokens.connection < Client.MAX_REQUESTS_PER_IP_ADDRESS) {
            this.tokens.connection = Math.min(
                this.tokens.connection + Client.REQUESTS_PER_IP_REPLENISH_RATE,
                Client.MAX_REQUESTS_PER_IP_ADDRESS
            );
        }
    }

    private replenishPlayerTokens() {
        if (this.tokens.player < Client.MAX_REQUESTS_PER_PLAYER_ID) {
            this.tokens.player = Math.min(
                this.tokens.player +
                    Client.REQUESTS_PER_PLAYER_ID_REPLENISH_RATE,
                Client.MAX_REQUESTS_PER_PLAYER_ID
            );
        }
    }

    private replenishServerPairingTokens() {
        if (
            this.tokens.serverPairing < Client.MAX_REQUESTS_FOR_SERVER_PAIRING
        ) {
            this.tokens.serverPairing = Math.min(
                this.tokens.serverPairing +
                    Client.REQUESTS_FOR_SERVER_PAIRING_REPLENISH_RATE,
                Client.MAX_REQUESTS_FOR_SERVER_PAIRING
            );
        }
    }

    public async consumeTokens({ tokens, timeout }: ServiceRequestCost) {
        const startTime = Date.now();

        const hasEnoughTokens = () =>
            this.tokens.connection >= tokens && this.tokens.player >= tokens;

        if (!hasEnoughTokens()) {
            if (this.tokens.connection < tokens) {
                return ConsumeTokensError.NotEnoughConnectionTokens;
            } else if (this.tokens.player < tokens) {
                return ConsumeTokensError.NotEnoughPlayerIdTokens;
            } else {
                return ConsumeTokensError.Unknown;
            }
        }

        while (!hasEnoughTokens()) {
            const elapsedTime = Date.now() - startTime;

            if (elapsedTime >= timeout) {
                return ConsumeTokensError.WaitReplenishTimeout;
            }

            await sleep(100);
        }

        this.tokens.connection -= tokens;
        this.tokens.player -= tokens;

        return ConsumeTokensError.NoError;
    }

    private getNextSeq(): number {
        let nextSeq = this.seq + 1;

        while (this.seqCallbacks[nextSeq]) {
            nextSeq++;
        }

        this.seq = nextSeq;
        return nextSeq;
    }

    public async connect() {
        if (this.ws !== null) {
            await this.disconnect();
        }

        this.emit("connecting");

        this.ws = new WebSocket(
            this.useFacepunchProxy
                ? `wss://companion-rust.facepunch.com/game/${this.ip}/${this.port}`
                : `ws://${this.ip}:${this.port}`
        );

        this.ws.on("open", () => {
            this.emit("connected");
        });
        this.ws.on("close", () => {
            this.emit("disconnected");
        });
        this.ws.on("error", (e) => {
            this.emit("error", EmitErrorType.WebSocket, e);
        });
        this.ws.on("message", (data: WebSocket.Data) => {
            try {
                if (!data) {
                    throw new Error("Received empty or invalid message data.");
                }

                let handled = false;
                const appMessage = AppMessage.fromBinary(data as Buffer);

                if (
                    appMessage.response &&
                    this.seqCallbacks[appMessage.response.seq]
                ) {
                    const callback: CallbackFunction =
                        this.seqCallbacks[appMessage.response.seq];

                    try {
                        callback(appMessage);
                        handled = true;
                    } catch (callbackError) {
                        const errorMessage =
                            callbackError instanceof Error
                                ? callbackError.message
                                : "Unknown error";
                        this.emit(
                            "error",
                            EmitErrorType.Callback,
                            new Error(`ERROR on.message: ${errorMessage}`)
                        );
                    } finally {
                        this.seqCallbacks.splice(appMessage.response.seq, 1);
                    }
                }

                this.emit("message", appMessage, handled);
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "Unknown error";
                this.emit(
                    "error",
                    EmitErrorType.Callback,
                    new Error(`ERROR on.message: ${errorMessage}`)
                );
            }
        });

        this.replenishInterval = setInterval(() => this.replenishTask(), 1000);

        return true;
    }

    public async disconnect() {
        if (this.replenishInterval) {
            clearInterval(this.replenishInterval);
        }

        if (this.poolInterval) {
            clearInterval(this.poolInterval);
        }

        if (this.ws !== null) {
            this.ws.removeAllListeners();
            this.ws.on("error", () => {
                /* Do nothing */
            });

            try {
                this.ws.terminate();
            } catch (error) {
                console.error(error);
            }

            this.ws = null;
            return true;
        } else {
            return false;
        }
    }

    public get isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    public sendRequest(
        data: Omit<AppRequest, "seq" | "playerId" | "playerToken">,
        callback: CallbackFunction,
        seq: number | null = null
    ) {
        if (this.ws === null || this.ws.readyState !== WebSocket.OPEN) {
            return new Error("ERROR sendRequest: WebSocket is not open.");
        }

        if (seq === null) {
            seq = this.getNextSeq();
        }

        this.seqCallbacks[seq] = callback;

        let appRequestData: AppRequest;
        try {
            appRequestData = {
                seq,
                playerId: this.playerId,
                playerToken: this.playerToken,
                ...data
            };
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            this.seqCallbacks.splice(seq, 1);
            return new Error(`ERROR sendRequest: ${errorMessage}`);
        }

        let appRequest: Uint8Array;
        try {
            appRequest = AppRequest.toBinary(appRequestData);
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            this.seqCallbacks.splice(seq, 1);
            return new Error(
                `ERROR sendRequest AppRequest.toBinary: ${errorMessage}`
            );
        }

        try {
            this.ws.send(appRequest);
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            this.seqCallbacks.splice(seq, 1);
            return new Error(`ERROR sendRequest ws.send: ${errorMessage}`);
        }

        this.emit("request", appRequestData);
    }

    public sendRequestAsync(
        data: Omit<AppRequest, "seq" | "playerId" | "playerToken">,
        timeoutMs: number
    ) {
        return new Promise<AppResponse | Error>((resolve) => {
            const seq = this.getNextSeq();

            const timeout = setTimeout(() => {
                this.seqCallbacks.splice(seq, 1);
                resolve(
                    new Error("Timeout reached while waiting for response.")
                );
            }, timeoutMs);

            const result = this.sendRequest(
                data,
                (appMessage: AppMessage) => {
                    clearTimeout(timeout);

                    try {
                        if (!appMessage.response) {
                            throw new Error("appMessage is missing response.");
                        }

                        resolve(appMessage.response);
                    } catch (error) {
                        const errorMessage =
                            error instanceof Error
                                ? error.message
                                : "Unknown error";

                        resolve(
                            new Error(`ERROR sendRequestAsync: ${errorMessage}`)
                        );
                    }
                },
                seq
            );

            if (result instanceof Error) {
                clearTimeout(timeout);
                resolve(result);
            }
        });
    }

    public async connectToCamera(identifier: string) {
        const camera = new Camera(this, identifier);

        const subscribed = await camera.subscribe();

        if (!subscribed) return null;

        if (this.connectedCamera)
            // TODO: Create and use a specific error for this
            throw new Error(
                "A camera is already connected. Please disconnect it before connecting to another camera."
            );

        this.connectedCamera = camera;

        return camera;
    }

    public async startPoolInterval() {
        if (this.poolInterval) return;

        await this.pool();

        this.poolInterval = setInterval(() => {
            void this.pool();
        }, 10000);
    }

    private async pool() {
        if (!this.isConnected) {
            throw new Error("Client is not connected.");
        }

        const time = await this.serverService.getTime();

        if (!isValidAppResponse(time))
            throw new Error(`Failed to get time: ${time}`);

        if (this.time) this.time.update(time.time);
        else this.time = new Time(time.time);

        const serverInfo = await this.serverService.getInfo();

        if (!isValidAppResponse(serverInfo))
            throw new Error(`Failed to get server info: ${serverInfo}`);

        if (this.serverInfo) this.serverInfo.update(serverInfo.info);
        else this.serverInfo = new ServerInfo(serverInfo.info);

        const team = await this.teamService.getInfo();

        if (!isValidAppResponse(team))
            throw new Error(`Failed to get team info: ${team}`);

        if (this.team) this.team.update(team.teamInfo);
        else this.team = new Team(team.teamInfo);
    }
}
