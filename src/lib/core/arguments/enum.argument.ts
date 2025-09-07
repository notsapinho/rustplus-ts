import type {
    ArgumentContext,
    ArgumentLoaderContext,
    ArgumentResult
} from "@/lib/structures/argument";

import { container } from "@sapphire/pieces";

import { resolveEnum } from "@/lib/resolvers";
import { Argument } from "@/lib/structures/argument";

export interface EnumArgumentContext extends ArgumentContext {
    readonly enum?: string[];
    readonly caseInsensitive?: boolean;
}

export class CoreArgument extends Argument<string> {
    public constructor(context: ArgumentLoaderContext) {
        super(context, { name: "enum" });
    }

    public run(
        parameter: string,
        context: EnumArgumentContext
    ): ArgumentResult<string> {
        const resolved = resolveEnum(parameter, {
            enum: context.enum,
            caseInsensitive: context.caseInsensitive
        });

        return resolved.mapErrInto((identifier) =>
            this.error({
                parameter,
                identifier,
                message: `The argument must have one of the following values: ${context.enum?.join(", ")}`,
                context
            })
        );
    }
}

void container.stores.loadPiece({
    name: "enum",
    piece: CoreArgument,
    store: "arguments"
});
