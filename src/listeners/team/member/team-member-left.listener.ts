import type { AppTeamInfo_Member } from "@/lib/interfaces/rustplus";
import type { ListenerContext } from "@/lib/structures/listener";

import { Listener } from "@/lib/structures/listener";
import { TeamEvent } from "@/structures";
import { Logger } from "@/utils";

export class TeamListener extends Listener<typeof TeamEvent.MemberLeft> {
    public constructor(context: ListenerContext) {
        super(context, {
            event: TeamEvent.MemberLeft
        });
    }

    public override async run(member: AppTeamInfo_Member) {
        Logger.info(`Team member left: ${member.steamId}`);
    }
}
