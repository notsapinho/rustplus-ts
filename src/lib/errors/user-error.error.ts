export interface UserErrorOptions {
    identifier: string;
    message?: string;
    context?: unknown;
}

export class UserError extends Error {
    public readonly identifier: string;

    public readonly context: unknown;

    public constructor(options: UserErrorOptions) {
        super(options.message);

        this.identifier = options.identifier;
        this.context = options.context ?? null;
    }

    public override get name(): string {
        return "UserError";
    }
}
