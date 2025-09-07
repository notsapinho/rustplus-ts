import type { IArgument } from "../structures/argument";
import type { UserErrorOptions } from "./user-error.error";

import { UserError } from "./user-error.error";

export interface ArgumentErrorOptions<T>
    extends Omit<UserErrorOptions, "identifier"> {
    argument: IArgument<T>;
    parameter: string;
    identifier?: string;
}

export class ArgumentError<T = unknown> extends UserError {
    public readonly argument: IArgument<T>;
    public readonly parameter: string;

    public constructor(options: ArgumentErrorOptions<T>) {
        super({
            ...options,
            identifier: options.identifier ?? options.argument.name
        });
        this.argument = options.argument;
        this.parameter = options.parameter;
    }

    public override get name(): string {
        return "ArgumentError";
    }
}
