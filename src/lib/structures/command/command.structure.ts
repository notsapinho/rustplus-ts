import type { Message } from "@/lib/types/message.type";
import type { AliasPieceOptions, LoaderPieceContext } from "@sapphire/pieces";
import type { Awaitable } from "@sapphire/utilities";

import { ArgumentStream, EmptyStrategy, Lexer, Parser } from "@sapphire/lexure";
import { AliasPiece } from "@sapphire/pieces";

import { Args } from "@/lib/parsers/args.parser";

export type CommandOptions = AliasPieceOptions & {
    usage?: string | null;
};
export type CommandContext = LoaderPieceContext<"commands">;

export interface CommandRunContext extends Record<PropertyKey, unknown> {
    commandName: string;
}

export class Command<
    Options extends CommandOptions = CommandOptions
> extends AliasPiece<Options, "commands"> {
    public strategy = new EmptyStrategy();
    public lexer = new Lexer();
    public usage: string | null = null;

    public constructor(
        context: CommandContext,
        options: Options = {} as Options
    ) {
        const name = options.name ?? context.name;

        super(context, { ...options, name: name.toLowerCase() });

        this.usage = options.usage ?? null;
    }

    public preParse(
        message: string,
        parameters: string,
        context: CommandRunContext
    ) {
        const parser = new Parser(this.strategy);
        const args = new ArgumentStream(parser.run(this.lexer.run(parameters)));
        return new Args(message, this, args, context);
    }

    public run?(
        message: Message,
        args: Args,
        context: CommandRunContext
    ): Awaitable<unknown>;
}
