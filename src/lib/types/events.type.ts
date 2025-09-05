import type { AppMessage, AppRequest } from "@/lib/interfaces/rustplus";
import type { Listener } from "@/lib/structures/client/listener/listener.structure";

export const Events = {
    Connecting: "connecting",
    Connected: "connected",
    Message: "message",
    Request: "request",
    Disconnected: "disconnected",
    Error: "error",

    ListenerError: "listenerError"
} as const;

export interface ClientEvents {
    [Events.Connecting]: [];
    [Events.Connected]: [];
    [Events.Message]: [appMessage: AppMessage, handled: boolean];
    [Events.Request]: [appRequest: AppRequest];
    [Events.Disconnected]: [];
    [Events.Error]: [error: Error];

    [Events.ListenerError]: [error: unknown, context: { piece: Listener }];
}
