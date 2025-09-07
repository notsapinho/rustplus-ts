import type {
    AppMessage,
    AppRequest,
    AppTeamMessage
} from "@/lib/interfaces/rustplus";
import type { Command } from "../structures/command";
import type { Listener } from "../structures/listener";

export const Events = {
    Connecting: "connecting",
    Connected: "connected",
    Message: "message",
    Request: "request",
    Disconnected: "disconnected",
    Error: "error",

    ListenerError: "listenerError",
    CommandError: "commandError",
    CommandRun: "commandRun",
    CommandSuccess: "commandSuccess"
} as const;

export interface ClientEvents {
    [Events.Connecting]: [];
    [Events.Connected]: [];
    [Events.Message]: [appMessage: AppMessage, handled: boolean];
    [Events.Request]: [appRequest: AppRequest];
    [Events.Disconnected]: [];
    [Events.Error]: [error: Error];

    [Events.ListenerError]: [error: unknown, context: { piece: Listener }];
    [Events.CommandError]: [error: unknown, context: { piece: Command }];
    [Events.CommandRun]: [message: AppTeamMessage, context: { piece: Command }];
    [Events.CommandSuccess]: [
        message: AppTeamMessage,
        context: { piece: Command }
    ];
}
