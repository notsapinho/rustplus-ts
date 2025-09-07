import type { AppTeamInfo_Member } from "@/lib/interfaces/rustplus";
import type { ListenerContext } from "@/lib/structures/listener";

import { Listener } from "@/lib/structures/listener";
import { getGridLabelByXY } from "@/lib/utils";
import { TeamEvent } from "@/structures";
import { Logger } from "@/utils";

export class TeamListener extends Listener<typeof TeamEvent.MemberRespawn> {
    public constructor(context: ListenerContext) {
        super(context, {
            event: TeamEvent.MemberRespawn
        });
    }

    public override async run(member: AppTeamInfo_Member) {
        Logger.info(`Team member respawned: ${member.steamId}`);

        await this.container.client.services.team.sendMessage(
            `"${member.name}" respawned @ ${getGridLabelByXY(
                member.x,
                member.y,
                this.container.client.serverInfo.mapSize
            )}.`
        );
    }
}
