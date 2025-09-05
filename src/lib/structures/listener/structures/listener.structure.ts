import type { Client } from "@/lib/core/client.core";
import type { ClientEvents } from "@/lib/types/events.type";
import type { EventEmitter } from "node:events";

import { Piece } from "@sapphire/pieces";
import { Result } from "@sapphire/result";

import { Events } from "@/lib/types/events.type";

export type ListenerContext = Piece.LoaderContext<"listeners">;

export abstract class Listener<
    E extends keyof ClientEvents | symbol = symbol,
    Options extends ListenerOptions = ListenerOptions
> extends Piece<Options, "listeners"> {
    public readonly emitter: EventEmitter | null;
    public readonly event: string | symbol;
    public readonly once: boolean;

    public _listener: ((...args: any[]) => void) | null;

    public constructor(
        context: ListenerContext,
        options: Options = {} as Options
    ) {
        super(context, options);

        this.emitter =
            typeof options.emitter === "undefined"
                ? this.container.client
                : ((typeof options.emitter === "string"
                      ? (Reflect.get(
                            this.container.client,
                            options.emitter
                        ) as EventEmitter)
                      : (options.emitter as EventEmitter)) ?? null);
        this.event = options.event ?? this.name;
        this.once = options.once ?? false;

        this._listener =
            this.emitter && this.event
                ? this.once
                    ? this._runOnce.bind(this)
                    : this._run.bind(this)
                : null;

        // If there's no emitter or no listener, disable:
        if (this.emitter === null || this._listener === null)
            this.enabled = false;
    }

    public abstract run(
        ...args: E extends keyof ClientEvents ? ClientEvents[E] : unknown[]
    ): unknown;

    public override toJSON(): ListenerJSON {
        return {
            ...super.toJSON(),
            once: this.once,
            event: this.event
        };
    }

    private async _run(...args: unknown[]) {
        const result = await Result.fromAsync(() =>
            this.run(
                ...(args as E extends keyof ClientEvents
                    ? ClientEvents[E]
                    : unknown[])
            )
        );
        result.inspectErr((error) =>
            this.container.client.emit(Events.ListenerError, error, {
                piece: this
            })
        );
    }

    private async _runOnce(...args: unknown[]) {
        await this._run(...args);
        await this.unload();
    }
}

export interface ListenerOptions extends Piece.Options {
    readonly emitter?: keyof Client | EventEmitter;
    readonly event?: string | symbol;
    readonly once?: boolean;
}

export interface ListenerJSON extends Piece.JSON {
    event: string | symbol;
    once: boolean;
}
