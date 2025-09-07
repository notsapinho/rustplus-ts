import type {
    ArgumentContext,
    ArgumentLoaderContext,
    ArgumentResult
} from "@/lib/structures/argument";

import { container } from "@sapphire/pieces";

import { Identifiers } from "@/lib/errors/identifiers";
import { resolveDate } from "@/lib/resolvers";
import { Argument } from "@/lib/structures/argument";

export class CoreArgument extends Argument<Date> {
    private readonly messages = {
        [Identifiers.ArgumentDateTooEarly]: ({ minimum }: ArgumentContext) =>
            `The given date must be after ${new Date(minimum).toISOString()}.`,
        [Identifiers.ArgumentDateTooFar]: ({ maximum }: ArgumentContext) =>
            `The given date must be before ${new Date(maximum).toISOString()}.`,
        [Identifiers.ArgumentDateError]: () =>
            "The argument did not resolve to a date."
    } as const;

    public constructor(context: ArgumentLoaderContext) {
        super(context, { name: "date" });
    }

    public run(
        parameter: string,
        context: ArgumentContext
    ): ArgumentResult<Date> {
        const resolved = resolveDate(parameter, {
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
    name: "date",
    piece: CoreArgument,
    store: "arguments"
});
