import type { Client } from "@/core/client.core";

export abstract class BaseService {
    public constructor(public client: Client) {}
}
