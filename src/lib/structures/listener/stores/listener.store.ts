import { Store } from "@sapphire/pieces";

import { ListenerLoaderStrategy } from "../strategies";
import { Listener } from "../structures/listener.structure";

export class ListenerStore extends Store<Listener> {
    public constructor() {
        super(Listener, {
            name: "listeners",
            strategy: new ListenerLoaderStrategy()
        });
    }
}
