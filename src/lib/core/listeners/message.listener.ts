import type { AppMessage } from "@/lib/interfaces/rustplus";
import type { ListenerContext } from "@/lib/structures/listener";

import { container } from "@sapphire/pieces";
import { Result } from "@sapphire/result";

import { Listener } from "@/lib/structures/listener";
import { Events } from "@/lib/types/events.type";

export class CoreClientListener extends Listener<typeof Events.Message> {
    public constructor(context: ListenerContext) {
        super(context, { event: Events.Message });
    }

    public async run(appMessage: AppMessage) {
        const message = appMessage.broadcast?.teamMessage?.message;

        if (!message) return;

        if (!message.message.startsWith(this.container.client.options.prefix))
            return;

        const prefixLessCommand = message.message
            .slice(this.container.client.options.prefix.length)
            .trim();

        const spaceIndex = prefixLessCommand.indexOf(" ");
        const commandName =
            spaceIndex === -1
                ? prefixLessCommand.toLowerCase()
                : prefixLessCommand.slice(0, spaceIndex).toLowerCase();

        const command = this.container.stores.get("commands").get(commandName);
        const parameters =
            spaceIndex === -1 ? "" : prefixLessCommand.slice(spaceIndex).trim();

        if (!command) return;

        const context = { commandName };

        const args = command.preParse(message.message, parameters, context);

        const result = await Result.fromAsync(async () => {
            this.container.client.emit(Events.CommandRun, message, {
                piece: command
            });

            await command.run?.(
                {
                    content: message.message,
                    authorSteamId: message.steamId,
                    timestamp: message.time * 1000
                },
                args,
                context
            );

            this.container.client.emit(Events.CommandSuccess, message, {
                piece: command
            });
        });

        result.inspectErr((error) =>
            this.container.client.emit(Events.CommandError, error, {
                piece: command
            })
        );
    }
}

void container.stores.loadPiece({
    name: "ClientListener",
    piece: CoreClientListener,
    store: "listeners"
});
