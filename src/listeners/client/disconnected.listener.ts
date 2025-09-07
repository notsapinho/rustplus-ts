import type { ListenerContext } from "@/lib/structures/listener";

import { Listener } from "@/lib/structures/listener";
import { Events } from "@/lib/types/events.type";
import { Logger } from "@/utils";

export class ClientListener extends Listener<typeof Events.Disconnected> {
    public constructor(context: ListenerContext) {
        super(context, { event: Events.Disconnected, once: true });
    }

    public async run() {
        Logger.warn(
            "Disconnected from Rust+ server, attempting to reconnect..."
        );

        await this.container.client.connect();
    }
}
