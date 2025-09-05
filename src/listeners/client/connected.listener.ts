import type { ListenerContext } from "@/lib/structures/listener";

import { Listener } from "@/lib/structures/listener";
import { Events } from "@/lib/types/events.type";
import { Logger } from "@/utils";

export class ClientListener extends Listener<typeof Events.Connected> {
    public constructor(context: ListenerContext) {
        super(context, { event: Events.Connected, once: true });
    }

    public async run() {
        Logger.info("Connected to the server");

        await this.container.client.startPoolInterval();
    }
}
