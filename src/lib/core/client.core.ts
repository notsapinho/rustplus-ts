import { EventEmitter } from "node:events";
import { resolve } from "node:path";
import type { ServiceRequestCost } from "@/lib/types/cost.type";
import type { ClientEvents } from "@/lib/types/events.type";
import type { StoreRegistry } from "@sapphire/pieces";
import type { AppResponse } from "../interfaces/rustplus";

import { container } from "@sapphire/pieces";
import WebSocket from "ws";

import { ConsumeTokensError } from "@/lib/errors/consume-tokens.error";
import { Camera, ServerInfo, Team, Time } from "@/lib/structures/rust-plus";
import { isValidAppResponse } from "@/lib/utils/is-app-response.util";
import { sleep } from "@/lib/utils/sleep.util";
import { AppMessage, AppRequest } from "../interfaces/rustplus";
import { ListenerStore, Services, ServiceStore } from "../structures";

import "../services/_load";

type CallbackFunction = (appMessage: AppMessage) => void;

export class Client extends EventEmitter<ClientEvents> {
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
    public readonly services = new Services();

    private poolInterval: NodeJS.Timeout | null = null;
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

        container.client = this;

        container.stores //
            .register(
                new ListenerStore().registerPath(
                    resolve(__dirname, "..", "..", "listeners")
                )
            )
            .register(new ServiceStore());
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
        await Promise.all(
            [...container.stores.values()].map((store) => store.loadAll())
        );

        for (const [name, service] of container.stores
            .get("services")
            .entries()) {
            this.services.exposePiece(name, service);
        }

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
            this.emit("error", e);
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
        }, 5000);
    }

    private async pool() {
        if (!this.isConnected) {
            throw new Error("Client is not connected.");
        }

        const time = await this.services.server.getTime();

        if (!isValidAppResponse(time))
            throw new Error(`Failed to get time: ${time}`);

        if (this.time) this.time.update(time.time);
        else this.time = new Time(time.time);

        const serverInfo = await this.services.server.getInfo();

        if (!isValidAppResponse(serverInfo))
            throw new Error(`Failed to get server info: ${serverInfo}`);

        if (this.serverInfo) this.serverInfo.update(serverInfo.info);
        else this.serverInfo = new ServerInfo(serverInfo.info);

        const team = await this.services.team.getInfo();

        if (!isValidAppResponse(team))
            throw new Error(`Failed to get team info: ${team}`);

        if (this.team) this.team.update(team.teamInfo);
        else this.team = new Team(team.teamInfo);
    }
}

declare module "@sapphire/pieces" {
    interface Container {
        client: Client;
        stores: StoreRegistry;
    }

    interface StoreRegistryEntries {
        listeners: ListenerStore;
        services: ServiceStore;
    }
}
