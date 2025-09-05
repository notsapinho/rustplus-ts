import type { Client } from "@/lib/core";
import type { Awaitable } from "@sapphire/utilities";
import type { Plugin } from "./plugin.structure";

import {
    PluginHook,
    postInitialization,
    postLogin,
    preInitialization,
    preLogin
} from "./symbols";

export type AsyncPluginHooks = PluginHook.PreLogin | PluginHook.PostLogin;
export type ClientPluginAsyncHook = (this: Client) => Awaitable<unknown>;

export type SyncPluginHooks = Exclude<PluginHook, AsyncPluginHooks>;
export type ClientPluginHook = (this: Client) => unknown;

export interface ClientPluginHookEntry<
    T = ClientPluginHook | ClientPluginAsyncHook
> {
    hook: T;
    type: PluginHook;
    name?: string;
}

export class PluginManager {
    public readonly registry = new Set<ClientPluginHookEntry>();

    public registerHook(
        hook: ClientPluginHook,
        type: SyncPluginHooks,
        name?: string
    ): this;
    public registerHook(
        hook: ClientPluginAsyncHook,
        type: AsyncPluginHooks,
        name?: string
    ): this;
    public registerHook(
        hook: ClientPluginHook | ClientPluginAsyncHook,
        type: PluginHook,
        name?: string
    ): this {
        if (typeof hook !== "function")
            throw new TypeError(
                `The provided hook ${name ? `(${name}) ` : ""}is not a function`
            );
        this.registry.add({ hook, type, name });
        return this;
    }

    public registerPreInitializationHook(
        hook: ClientPluginHook,
        name?: string
    ) {
        return this.registerHook(hook, PluginHook.PreInitialization, name);
    }

    public registerPostInitializationHook(
        hook: ClientPluginHook,
        name?: string
    ) {
        return this.registerHook(hook, PluginHook.PostInitialization, name);
    }

    public registerPreLoginHook(hook: ClientPluginAsyncHook, name?: string) {
        return this.registerHook(hook, PluginHook.PreLogin, name);
    }

    public registerPostLoginHook(hook: ClientPluginAsyncHook, name?: string) {
        return this.registerHook(hook, PluginHook.PostLogin, name);
    }

    public use(plugin: typeof Plugin) {
        const possibleSymbolHooks: [symbol, PluginHook][] = [
            [preInitialization, PluginHook.PreInitialization],
            [postInitialization, PluginHook.PostInitialization],
            [preLogin, PluginHook.PreLogin],
            [postLogin, PluginHook.PostLogin]
        ];
        for (const [hookSymbol, hookType] of possibleSymbolHooks) {
            const hook = Reflect.get(plugin, hookSymbol) as
                | ClientPluginHook
                | ClientPluginAsyncHook;
            if (typeof hook !== "function") continue;
            this.registerHook(hook, hookType as any);
        }
        return this;
    }

    public values(): Generator<ClientPluginHookEntry, void, unknown>;
    public values(
        hook: SyncPluginHooks
    ): Generator<ClientPluginHookEntry<ClientPluginHook>, void, unknown>;
    public values(
        hook: AsyncPluginHooks
    ): Generator<ClientPluginHookEntry<ClientPluginAsyncHook>, void, unknown>;
    public *values(
        hook?: PluginHook
    ): Generator<ClientPluginHookEntry, void, unknown> {
        for (const plugin of this.registry) {
            if (hook && plugin.type !== hook) continue;
            yield plugin;
        }
    }
}
