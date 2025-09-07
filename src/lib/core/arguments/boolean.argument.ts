import type {
    ArgumentContext,
    ArgumentLoaderContext,
    ArgumentResult
} from "@/lib/structures/argument";

import { container } from "@sapphire/pieces";

import { resolveBoolean } from "@/lib/resolvers";
import { Argument } from "@/lib/structures/argument";

export interface BooleanArgumentContext extends ArgumentContext {
    readonly truths?: string[];
    readonly falses?: string[];
}

export class CoreArgument extends Argument<boolean> {
    public constructor(context: ArgumentLoaderContext) {
        super(context, { name: "boolean" });
    }

    public run(
        parameter: string,
        context: BooleanArgumentContext
    ): ArgumentResult<boolean> {
        const resolved = resolveBoolean(parameter, {
            truths: context.truths,
            falses: context.falses
        });
        return resolved.mapErrInto((identifier) =>
            this.error({
                parameter,
                identifier,
                message: "The argument did not resolve to a boolean.",
                context
            })
        );
    }
}

void container.stores.loadPiece({
    name: "boolean",
    piece: CoreArgument,
    store: "arguments"
});
