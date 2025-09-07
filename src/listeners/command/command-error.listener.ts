import type { Command } from "@/lib/structures/command";
import type { ListenerContext } from "@/lib/structures/listener";

import { ArgumentError, Identifiers, UserError } from "@/lib/errors";
import { Listener } from "@/lib/structures/listener";
import { Events } from "@/lib/types/events.type";

export class ClientListener extends Listener<typeof Events.CommandError> {
    public constructor(context: ListenerContext) {
        super(context, { event: Events.CommandError });
    }

    public async run(error: Error, { piece }: { piece: Command }) {
        if (error instanceof UserError) {
            if (
                error instanceof ArgumentError ||
                (error.identifier as Identifiers) === Identifiers.ArgsMissing
            ) {
                await this.container.client.services.team.sendMessage(
                    `Usage: ${this.container.client.options.prefix}${piece.name} ${piece.usage}`
                );
                return;
            } else {
                await this.container.client.services.team.sendMessage(
                    error.message
                );
            }
        } else {
            console.error(error);
        }
    }
}
