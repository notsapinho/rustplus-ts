import type { ListenerContext } from "@/lib/structures/client/listener/listener.structure";

import { Listener } from "@/lib/structures/client/listener/listener.structure";
import { Events } from "@/lib/types/events.type";

export class ListenerListener extends Listener<typeof Events.ListenerError> {
    public constructor(context: ListenerContext) {
        super(context, { event: Events.ListenerError });
    }

    public async run(error: Error) {
        console.log(error);
    }
}
