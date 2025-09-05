import type { AppTeamInfo_Member } from "@/lib/interfaces/rustplus";
import type { ListenerContext } from "@/lib/structures/listener";

import { Listener } from "@/lib/structures/listener";
import { TeamEvent } from "@/structures";
import { Logger } from "@/utils";

export class TeamListener extends Listener<typeof TeamEvent.MemberDied> {
    public constructor(context: ListenerContext) {
        super(context, {
            event: TeamEvent.MemberDied
        });
    }

    public override async run(member: AppTeamInfo_Member) {
        Logger.info(`Team member died: ${member.steamId}`);
    }
}
