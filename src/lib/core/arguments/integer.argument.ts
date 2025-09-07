import type {
    ArgumentContext,
    ArgumentLoaderContext,
    ArgumentResult
} from "@/lib/structures/argument";

import { container } from "@sapphire/pieces";

import { Identifiers } from "@/lib/errors/identifiers";
import { resolveInteger } from "@/lib/resolvers";
import { Argument } from "@/lib/structures/argument";

export class CoreArgument extends Argument<number> {
    private readonly messages = {
        [Identifiers.ArgumentIntegerTooSmall]: ({ minimum }: ArgumentContext) =>
            `The given number must be greater than ${minimum}.`,
        [Identifiers.ArgumentIntegerTooLarge]: ({ maximum }: ArgumentContext) =>
            `The given number must be less than ${maximum}.`,
        [Identifiers.ArgumentIntegerError]: () =>
            "The argument did not resolve to a valid number."
    } as const;

    public constructor(context: ArgumentLoaderContext) {
        super(context, { name: "integer" });
    }

    public run(
        parameter: string,
        context: ArgumentContext
    ): ArgumentResult<number> {
        const resolved = resolveInteger(parameter, {
            minimum: context.minimum,
            maximum: context.maximum
        });
        return resolved.mapErrInto((identifier) =>
            this.error({
                parameter,
                identifier,
                message: this.messages[identifier](context),
                context
            })
        );
    }
}

void container.stores.loadPiece({
    name: "integer",
    piece: CoreArgument,
    store: "arguments"
});
