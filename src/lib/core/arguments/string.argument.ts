import type {
    ArgumentContext,
    ArgumentLoaderContext,
    ArgumentResult
} from "@/lib/structures/argument";

import { container } from "@sapphire/pieces";

import { Identifiers } from "@/lib/errors/identifiers";
import { resolveString } from "@/lib/resolvers";
import { Argument } from "@/lib/structures/argument";

export class CoreArgument extends Argument<string> {
    private readonly messages = {
        [Identifiers.ArgumentStringTooShort]: ({ minimum }: ArgumentContext) =>
            `The argument must be longer than ${minimum} characters.`,
        [Identifiers.ArgumentStringTooLong]: ({ maximum }: ArgumentContext) =>
            `The argument must be shorter than ${maximum} characters.`
    } as const;

    public constructor(context: ArgumentLoaderContext) {
        super(context, { name: "string" });
    }

    public run(
        parameter: string,
        context: ArgumentContext
    ): ArgumentResult<string> {
        const resolved = resolveString(parameter, {
            minimum: context?.minimum,
            maximum: context?.maximum
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
    name: "string",
    piece: CoreArgument,
    store: "arguments"
});
