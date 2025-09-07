import type { AppTeamMessage } from "@/lib/interfaces/rustplus";
import type { Command } from "@/lib/structures/command";
import type { ListenerContext } from "@/lib/structures/listener";

import chalk from "chalk";

import { Listener } from "@/lib/structures/listener";
import { Events } from "@/lib/types/events.type";
import { Logger } from "@/utils";

export class ClientListener extends Listener<typeof Events.CommandRun> {
    public constructor(context: ListenerContext) {
        super(context, { event: Events.CommandRun });
    }

    public async run(message: AppTeamMessage, { piece }: { piece: Command }) {
        Logger.info(
            chalk`{rgb(255,165,0) [Command]} "${message.name}" ran command "${piece.name}" with message: "${message.message}"`
        );
    }
}
