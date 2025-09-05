import { Store } from "@sapphire/pieces";

import { ListenerLoaderStrategy } from "./listener-loader.strategy";
import { Listener } from "./listener.structure";

export class ListenerStore extends Store<Listener> {
    public constructor() {
        super(Listener, {
            name: "listeners",
            strategy: new ListenerLoaderStrategy()
        });
    }
}
