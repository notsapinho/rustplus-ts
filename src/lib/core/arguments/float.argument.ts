import type {
    ArgumentContext,
    ArgumentLoaderContext,
    ArgumentResult
} from "@/lib/structures/argument";

import { container } from "@sapphire/pieces";

import { Identifiers } from "@/lib/errors/identifiers";
import { resolveFloat } from "@/lib/resolvers";
import { Argument } from "@/lib/structures/argument";

export class CoreArgument extends Argument<number> {
    private readonly messages = {
        [Identifiers.ArgumentFloatTooSmall]: ({ minimum }: ArgumentContext) =>
            `The given number must be greater than ${minimum}.`,
        [Identifiers.ArgumentFloatTooLarge]: ({ maximum }: ArgumentContext) =>
            `The given number must be less than ${maximum}.`,
        [Identifiers.ArgumentFloatError]: () =>
            "The argument did not resolve to a valid decimal."
    } as const;

    public constructor(context: ArgumentLoaderContext) {
        super(context, { name: "float" });
    }

    public run(
        parameter: string,
        context: ArgumentContext
    ): ArgumentResult<number> {
        const resolved = resolveFloat(parameter, {
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
    name: "float",
    piece: CoreArgument,
    store: "arguments"
});
