import type {
    ArgumentContext,
    ArgumentLoaderContext,
    ArgumentResult
} from "@/lib/structures/argument";

import { container } from "@sapphire/pieces";

import { Identifiers } from "@/lib/errors/identifiers";
import { resolveNumber } from "@/lib/resolvers/number.resolver";
import { Argument } from "@/lib/structures/argument";

export class CoreArgument extends Argument<number> {
    private readonly messages = {
        [Identifiers.ArgumentNumberTooSmall]: ({ minimum }: ArgumentContext) =>
            `The given number must be greater than ${minimum}.`,
        [Identifiers.ArgumentNumberTooLarge]: ({ maximum }: ArgumentContext) =>
            `The given number must be less than ${maximum}.`,
        [Identifiers.ArgumentNumberError]: () =>
            "The argument did not resolve to a valid number."
    } as const;

    public constructor(context: ArgumentLoaderContext) {
        super(context, { name: "number" });
    }

    public run(
        parameter: string,
        context: ArgumentContext
    ): ArgumentResult<number> {
        const resolved = resolveNumber(parameter, {
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
    name: "number",
    piece: CoreArgument,
    store: "arguments"
});
