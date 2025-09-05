import { Store } from "@sapphire/pieces";

import { Service } from "../structures";

export class ServiceStore extends Store<Service> {
    public constructor() {
        super(Service, {
            name: "services"
        });
    }
}
