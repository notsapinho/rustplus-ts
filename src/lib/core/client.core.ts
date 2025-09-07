import { EventEmitter } from "node:events";
import { resolve } from "node:path";
import type { ServiceRequestCost } from "@/lib/types/cost.type";
import type { ClientEvents } from "@/lib/types/events.type";
import type { StoreRegistry } from "@sapphire/pieces";
import type { AppResponse } from "../interfaces/rustplus";

import { container } from "@sapphire/pieces";
import WebSocket from "ws";

import { ConsumeTokensError } from "@/lib/errors/consume-tokens.error";
import { sleep } from "@/lib/utils";
import { AppMessage, AppRequest } from "../interfaces/rustplus";

import "./services/_load";
import "./listeners/_load";
import "./arguments/_load";

import type { Plugin } from "../structures/plugins";

import { ArgumentStore } from "../structures/argument";
import { CommandStore } from "../structures/command";
import { ListenerStore } from "../structures/listener";
import { PluginHook, PluginManager } from "../structures/plugins";
import { Services, ServiceStore } from "../structures/service";

type CallbackFunction = (appMessage: AppMessage) => void;

export interface ClientOptions {
    server: {
        ip: string;
        port: string;
    };
    credentials: {
        playerId: string;
        playerToken: number;
    };
    prefix?: string;
    useFacepunchProxy?: boolean;
}
export class Client extends EventEmitter<ClientEvents> {
    private static readonly MAX_REQUESTS_PER_IP_ADDRESS = 50;
    private static readonly REQUESTS_PER_IP_REPLENISH_RATE = 15;
    private static readonly MAX_REQUESTS_PER_PLAYER_ID = 25;
    private static readonly REQUESTS_PER_PLAYER_ID_REPLENISH_RATE = 3;
    private static readonly MAX_REQUESTS_FOR_SERVER_PAIRING = 5;
    private static readonly REQUESTS_FOR_SERVER_PAIRING_REPLENISH_RATE = 0.1;
    public static plugins = new PluginManager();

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
    public readonly stores = container.stores;

    constructor(public options: ClientOptions) {
        super();

        this.options.prefix ??= "!";
        this.options.useFacepunchProxy ??= false;

        container.client = this;

        for (const plugin of Client.plugins.values(
            PluginHook.PreInitialization
        )) {
            plugin.hook.call(this);
        }

        this.stores //
            .register(new ServiceStore())
            .register(new ArgumentStore())
            .register(
                new ListenerStore().registerPath(
                    resolve(__dirname, "..", "..", "listeners")
                )
            )
            .register(
                new CommandStore().registerPath(
                    resolve(__dirname, "..", "..", "commands")
                )
            );

        for (const plugin of Client.plugins.values(
            PluginHook.PostInitialization
        )) {
            plugin.hook.call(this);
        }
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
        for (const plugin of Client.plugins.values(PluginHook.PreLogin)) {
            await plugin.hook.call(this);
        }

        if (this.ws !== null) {
            await this.disconnect();
        }

        await Promise.all(
            [...container.stores.values()].map((store) => store.loadAll())
        );

        for (const [name, service] of container.stores
            .get("services")
            .entries()) {
            this.services.exposePiece(name, service);
        }

        this.emit("connecting");

        this.ws = new WebSocket(
            this.options.useFacepunchProxy
                ? `wss://companion-rust.facepunch.com/game/${this.options.server.ip}/${this.options.server.port}`
                : `ws://${this.options.server.ip}:${this.options.server.port}`
        );

        this.ws.on("open", async () => {
            for (const plugin of Client.plugins.values(PluginHook.PostLogin)) {
                await plugin.hook.call(this);
            }

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
                playerId: this.options.credentials.playerId,
                playerToken: this.options.credentials.playerToken,
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

    public static use(plugin: typeof Plugin) {
        this.plugins.use(plugin);
        return this;
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
        commands: CommandStore;
        arguments: ArgumentStore;
    }
}
