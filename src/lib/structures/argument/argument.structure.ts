import type {
    ArgumentError,
    ArgumentErrorOptions
} from "@/lib/errors/argument-error.error";
import type { Result } from "@sapphire/result";
import type { Awaitable } from "@sapphire/utilities";
import type { Command, CommandRunContext } from "../command";

import { AliasPiece } from "@sapphire/pieces";

import { Args } from "@/lib/parsers/args.parser";

export type ArgumentResult<T> = Result<T, ArgumentError<T>>;

export type AwaitableArgumentResult<T> = Awaitable<ArgumentResult<T>>;

export type AsyncArgumentResult<T> = Promise<ArgumentResult<T>>;

export type ArgumentLoaderContext = AliasPiece.LoaderContext<"arguments">;

export interface IArgument<T> {
    readonly name: string;

    run(
        parameter: string,
        context: ArgumentContext<T>
    ): AwaitableArgumentResult<T>;
}

export abstract class Argument<
        T = unknown,
        Options extends ArgumentOptions = ArgumentOptions
    >
    extends AliasPiece<Options, "arguments">
    implements IArgument<T>
{
    public constructor(
        context: ArgumentLoaderContext,
        options: Options = {} as Options
    ) {
        super(context, options);
    }

    public abstract run(
        parameter: string,
        context: ArgumentContext<T>
    ): AwaitableArgumentResult<T>;

    public ok(value: T): ArgumentResult<T> {
        return Args.ok(value);
    }

    public error(
        options: Omit<ArgumentErrorOptions<T>, "argument">
    ): ArgumentResult<T> {
        return Args.error({
            argument: this,
            identifier: this.name,
            ...options
        });
    }
}

export type ArgumentOptions = AliasPiece.Options;

export interface ArgumentContext<T = unknown>
    extends Record<PropertyKey, unknown> {
    argument: IArgument<T>;
    args: Args;
    message: string;
    command: Command;
    commandContext: CommandRunContext;
    minimum?: number;
    maximum?: number;
    inclusive?: boolean;
}
