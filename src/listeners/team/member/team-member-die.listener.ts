import type { AppTeamInfo_Member } from "@/lib/interfaces/rustplus";
import type { ListenerContext } from "@/lib/structures/listener";

import { Listener } from "@/lib/structures/listener";
import { getGridLabelByXY } from "@/lib/utils";
import { TeamEvent } from "@/structures";
import { Logger } from "@/utils";

export class TeamListener extends Listener<typeof TeamEvent.MemberDie> {
    public constructor(context: ListenerContext) {
        super(context, {
            event: TeamEvent.MemberDie
        });
    }

    public override async run(member: AppTeamInfo_Member) {
        Logger.info(`Team member died: ${member.steamId}`);

        await this.container.client.services.team.sendMessage(
            `"${member.name}" foi de beise no ${getGridLabelByXY(
                member.x,
                member.y,
                this.container.client.serverInfo.mapSize
            )}.`
        );
    }
}
