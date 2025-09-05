export const preInitialization: unique symbol = Symbol(
    "PluginsPreInitialization"
);
export const postInitialization: unique symbol = Symbol(
    "PluginsPostInitialization"
);
export const preLogin: unique symbol = Symbol("PluginsPreLogin");
export const postLogin: unique symbol = Symbol("PluginsPostLogin");

export enum PluginHook {
    PreInitialization = "preInitialization",
    PostInitialization = "postInitialization",
    PreLogin = "preLogin",
    PostLogin = "postLogin"
}
