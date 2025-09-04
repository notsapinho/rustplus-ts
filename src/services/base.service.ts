import type { Client } from "@/core/client.core";

export abstract class BaseService {
    constructor(public client: Client) {}
}
