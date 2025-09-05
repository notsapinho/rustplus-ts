import type { ListenerContext } from "@/lib/structures/listener";

import { Listener } from "@/lib/structures/listener";
import { TeamEvent } from "@/structures";
import { Logger } from "@/utils";

export class TeamListener extends Listener<typeof TeamEvent.LeaderChange> {
    public constructor(context: ListenerContext) {
        super(context, {
            event: TeamEvent.LeaderChange
        });
    }

    public override async run(
        oldNewLeaderSteamId: string,
        newLeaderSteamId: string
    ) {
        Logger.info(
            `Team leader changed from ${oldNewLeaderSteamId} to ${newLeaderSteamId}`
        );
    }
}
