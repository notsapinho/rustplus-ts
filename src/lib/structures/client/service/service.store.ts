import { Store } from "@sapphire/pieces";

import { Service } from "./service.structure";

export class ServiceStore extends Store<Service> {
    public constructor() {
        super(Service, {
            name: "services"
        });
    }
}
