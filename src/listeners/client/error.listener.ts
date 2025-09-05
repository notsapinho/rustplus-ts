import type { ListenerContext } from "@/lib/structures/listener";

import { Listener } from "@/lib/structures/listener";
import { Events } from "@/lib/types/events.type";

export class ClientListener extends Listener<typeof Events.Error> {
    public constructor(context: ListenerContext) {
        super(context, { event: Events.Error });
    }

    public async run(error: Error) {
        console.log(error);
    }
}
