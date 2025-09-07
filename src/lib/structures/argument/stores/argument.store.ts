import { AliasStore } from "@sapphire/pieces";

import { Argument } from "../argument.structure";

export class ArgumentStore extends AliasStore<Argument, "arguments"> {
    public constructor() {
        super(Argument, { name: "arguments" });
    }
}
