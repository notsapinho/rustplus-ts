import { AliasStore } from "@sapphire/pieces";

import { Command } from "../command.structure";

export class CommandStore extends AliasStore<Command, "commands"> {
    public constructor() {
        super(Command, { name: "commands" });
    }
}
