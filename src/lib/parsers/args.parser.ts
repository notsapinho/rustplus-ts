import type { ArgumentStream, Parameter } from "@sapphire/lexure";
import type { Awaitable } from "@sapphire/utilities";
import type { ArgumentErrorOptions } from "../errors/argument-error.error";
import type {
    ArgumentContext,
    ArgumentResult,
    IArgument
} from "../structures/argument";
import type { Command, CommandRunContext } from "../structures/command";

import { join } from "@sapphire/lexure";
import { container } from "@sapphire/pieces";
import { Option, Result } from "@sapphire/result";

import { ArgumentError, Identifiers, UserError } from "../errors";

export class Args {
    public readonly message: string;
    public readonly command: Command;
    public readonly commandContext: CommandRunContext;
    protected readonly parser: ArgumentStream;
    private readonly states: ArgumentStream.State[] = [];

    public constructor(
        message: string,
        command: Command,
        parser: ArgumentStream,
        context: CommandRunContext
    ) {
        this.message = message;
        this.command = command;
        this.parser = parser;
        this.commandContext = context;
    }

    public start(): Args {
        this.parser.reset();
        return this;
    }

    public async pickResult<T>(
        type: IArgument<T>,
        options?: ArgOptions
    ): Promise<ResultType<T>>;
    public async pickResult<K extends keyof ArgType>(
        type: K,
        options?: ArgOptions
    ): Promise<ResultType<ArgType[K]>>;
    public async pickResult<K extends keyof ArgType>(
        type: K,
        options: ArgOptions = {}
    ): Promise<ResultType<ArgType[K]>> {
        const argument = this.resolveArgument<ArgType[K]>(type);
        if (!argument) return this.unavailableArgument(type);

        const result = await this.parser.singleParseAsync(async (arg) =>
            argument.run(arg, {
                args: this,
                argument,
                message: this.message,
                command: this.command,
                commandContext: this.commandContext,
                ...options
            })
        );
        if (result.isErrAnd((value) => value === null)) {
            return this.missingArguments();
        }

        return result as ResultType<ArgType[K]>;
    }

    public async pick<T>(type: IArgument<T>, options?: ArgOptions): Promise<T>;
    public async pick<K extends keyof ArgType>(
        type: K,
        options?: ArgOptions
    ): Promise<ArgType[K]>;
    public async pick<K extends keyof ArgType>(
        type: K,
        options?: ArgOptions
    ): Promise<ArgType[K]> {
        const result = await this.pickResult(type, options);
        return result.unwrapRaw();
    }

    public async restResult<T>(
        type: IArgument<T>,
        options?: ArgOptions
    ): Promise<ResultType<T>>;
    public async restResult<K extends keyof ArgType>(
        type: K,
        options?: ArgOptions
    ): Promise<ResultType<ArgType[K]>>;
    public async restResult<T>(
        type: keyof ArgType | IArgument<T>,
        options: ArgOptions = {}
    ): Promise<ResultType<T>> {
        const argument = this.resolveArgument(type);
        if (!argument) return this.unavailableArgument(type);
        if (this.parser.finished) return this.missingArguments();

        const state = this.parser.save();
        const data = join(this.parser.many().unwrapOr<Parameter[]>([]));
        const result = await argument.run(data, {
            args: this,
            argument,
            message: this.message,
            command: this.command,
            commandContext: this.commandContext,
            ...options
        });

        return result.inspectErr(() => this.parser.restore(state));
    }

    public async rest<T>(type: IArgument<T>, options?: ArgOptions): Promise<T>;
    public async rest<K extends keyof ArgType>(
        type: K,
        options?: ArgOptions
    ): Promise<ArgType[K]>;
    public async rest<K extends keyof ArgType>(
        type: K,
        options?: ArgOptions
    ): Promise<ArgType[K]> {
        const result = await this.restResult(type, options);
        return result.unwrapRaw();
    }

    public async repeatResult<T>(
        type: IArgument<T>,
        options?: RepeatArgOptions
    ): Promise<ArrayResultType<T>>;
    public async repeatResult<K extends keyof ArgType>(
        type: K,
        options?: RepeatArgOptions
    ): Promise<ArrayResultType<ArgType[K]>>;
    public async repeatResult<K extends keyof ArgType>(
        type: K,
        options: RepeatArgOptions = {}
    ): Promise<ArrayResultType<ArgType[K]>> {
        const argument = this.resolveArgument(type);
        if (!argument) return this.unavailableArgument(type);
        if (this.parser.finished) return this.missingArguments();

        const output: ArgType[K][] = [];

        for (let i = 0, times = options.times ?? Infinity; i < times; i++) {
            const result = await this.parser.singleParseAsync(async (arg) =>
                argument.run(arg, {
                    args: this,
                    argument,
                    message: this.message,
                    command: this.command,
                    commandContext: this.commandContext,
                    ...options
                })
            );

            if (result.isErr()) {
                const error = result.unwrapErr();
                if (error === null) break;

                if (output.length === 0) {
                    return result as Result.Err<
                        UserError | ArgumentError<ArgType[K]>
                    >;
                }

                break;
            }

            output.push(result.unwrap() as ArgType[K]);
        }

        return Result.ok(output);
    }

    public async repeat<T>(
        type: IArgument<T>,
        options?: RepeatArgOptions
    ): Promise<T[]>;
    public async repeat<K extends keyof ArgType>(
        type: K,
        options?: RepeatArgOptions
    ): Promise<ArgType[K][]>;
    public async repeat<K extends keyof ArgType>(
        type: K,
        options?: RepeatArgOptions
    ): Promise<ArgType[K][]> {
        const result = await this.repeatResult(type, options);
        return result.unwrapRaw();
    }

    public async peekResult<T>(
        type: () => ArgumentResult<T>
    ): Promise<ResultType<T>>;
    public async peekResult<K extends keyof ArgType>(
        type: (() => Awaitable<ArgumentResult<ArgType[K]>>) | K,
        options?: ArgOptions
    ): Promise<ResultType<ArgType[K]>>;
    public async peekResult<K extends keyof ArgType>(
        type: (() => Awaitable<ArgumentResult<ArgType[K]>>) | K,
        options: ArgOptions = {}
    ): Promise<ResultType<ArgType[K]>> {
        this.save();
        const result =
            typeof type === "function"
                ? await type()
                : await this.pickResult(type, options);
        this.restore();
        return result;
    }

    public async peek<T>(type: () => ArgumentResult<T>): Promise<T>;
    public async peek<T>(type: IArgument<T>, options?: ArgOptions): Promise<T>;
    public async peek<K extends keyof ArgType>(
        type: (() => ArgumentResult<ArgType[K]>) | K,
        options?: ArgOptions
    ): Promise<ArgType[K]>;
    public async peek<K extends keyof ArgType>(
        type: (() => ArgumentResult<ArgType[K]>) | K,
        options?: ArgOptions
    ): Promise<ArgType[K]> {
        const result = await this.peekResult(type, options);
        return result.unwrapRaw();
    }

    public nextMaybe(): Option<string>;
    public nextMaybe<T>(cb: ArgsNextCallback<T>): Option<T>;
    public nextMaybe<T>(cb?: ArgsNextCallback<T>): Option<T | string> {
        return Option.from<T | string>(
            typeof cb === "function"
                ? this.parser.singleMap(cb)
                : this.parser.single()
        );
    }

    public next(): string;
    public next<T>(cb: ArgsNextCallback<T>): T;
    public next<T>(cb?: ArgsNextCallback<T>): T | string | null {
        const value = cb
            ? this.nextMaybe<T | string | null>(cb)
            : this.nextMaybe();
        return value.unwrapOr(null);
    }

    public getFlags(...keys: readonly string[]): boolean {
        return this.parser.flag(...keys);
    }

    public getOptionResult(...keys: readonly string[]): Option<string> {
        return this.parser.option(...keys);
    }

    public getOption(...keys: readonly string[]): string | null {
        return this.parser.option(...keys).unwrapOr(null);
    }

    public getOptionsResult(
        ...keys: readonly string[]
    ): Option<readonly string[]> {
        return this.parser.options(...keys);
    }

    public getOptions(...keys: readonly string[]): readonly string[] | null {
        return this.parser.options(...keys).unwrapOr(null);
    }

    public save(): void {
        this.states.push(this.parser.save());
    }

    public restore(): void {
        if (this.states.length !== 0) this.parser.restore(this.states.pop());
    }

    public get finished(): boolean {
        return this.parser.finished;
    }

    public toJSON(): ArgsJson {
        return {
            message: this.message,
            command: this.command,
            commandContext: this.commandContext
        };
    }

    protected unavailableArgument<T>(
        type: string | IArgument<T>
    ): Result.Err<UserError> {
        const name = typeof type === "string" ? type : type.name;
        return Result.err(
            new UserError({
                identifier: Identifiers.ArgsUnavailable,
                message: `O argumento "${name}" não foi encontrado.`,
                context: { name, ...this.toJSON() }
            })
        );
    }

    protected missingArguments(): Result.Err<UserError> {
        return Result.err(
            new UserError({
                identifier: Identifiers.ArgsMissing,
                message: "Argumentos insuficientes foram fornecidos.",
                context: this.toJSON()
            })
        );
    }

    private resolveArgument<T>(
        arg: keyof ArgType | IArgument<T>
    ): IArgument<T> | undefined {
        if (typeof arg === "object") return arg;
        return container.stores.get("arguments").get(arg as string) as
            | IArgument<T>
            | undefined;
    }

    public static make<T>(cb: IArgument<T>["run"], name = ""): IArgument<T> {
        return { run: cb, name };
    }

    public static ok<T>(value: T): Result.Ok<T> {
        return Result.ok(value);
    }

    public static error<T>(
        options: ArgumentErrorOptions<T>
    ): Result.Err<ArgumentError<T>> {
        return Result.err(new ArgumentError<T>(options));
    }
}

export interface ArgsJson {
    message: string;
    command: Command;
    commandContext: CommandRunContext;
}

export interface ArgType {
    boolean: boolean;
    date: Date;
    float: number;
    integer: number;
    number: number;
    string: string;
    enum: string;
}

export type ArgOptions = Omit<ArgumentContext, "message" | "command">;

export interface RepeatArgOptions extends ArgOptions {
    times?: number;
}

export type ArgsNextCallback<T> = (value: string) => Option<T>;

export type ResultType<T> = Result<T, UserError | ArgumentError<T>>;
export type ArrayResultType<T> = Result<T[], UserError | ArgumentError<T>>;
