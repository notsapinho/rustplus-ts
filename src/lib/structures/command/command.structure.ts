import type { Message } from "@/lib/types/message.type";
import type { AliasPieceOptions, LoaderPieceContext } from "@sapphire/pieces";
import type { Awaitable } from "@sapphire/utilities";

import { AliasPiece } from "@sapphire/pieces";

export type CommandOptions = AliasPieceOptions;
export type CommandContext = LoaderPieceContext<"commands">;

export interface CommandRunContext extends Record<PropertyKey, unknown> {
    commandName: string;
}

export class Command<
    Options extends CommandOptions = CommandOptions
> extends AliasPiece<Options, "commands"> {
    public constructor(
        context: CommandContext,
        options: Options = {} as Options
    ) {
        const name = options.name ?? context.name;

        super(context, { ...options, name: name.toLowerCase() });
    }

    public run?(
        message: Message,
        context: CommandRunContext
    ): Awaitable<unknown>;
}
