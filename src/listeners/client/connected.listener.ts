import type { ListenerContext } from "@/lib/structures/client/listener/listener.structure";

import { Listener } from "@/lib/structures/client/listener/listener.structure";
import { Events } from "@/lib/types/events.type";

export class ClientListener extends Listener<typeof Events.Connected> {
    public constructor(context: ListenerContext) {
        super(context, { event: Events.Connected, once: true });
    }

    public async run() {
        console.log("Connected to server");

        await this.container.client.startPoolInterval();
    }
}
