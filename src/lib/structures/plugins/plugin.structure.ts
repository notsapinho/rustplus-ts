import type { Client } from "@/lib/core";
import type { Awaitable } from "@sapphire/utilities";

import {
    postInitialization,
    postLogin,
    preInitialization,
    preLogin
} from "./symbols";

export abstract class Plugin {
    public static [preInitialization]?: (this: Client) => void;
    public static [postInitialization]?: (this: Client) => void;
    public static [preLogin]?: (this: Client) => Awaitable<void>;
    public static [postLogin]?: (this: Client) => Awaitable<void>;
}
