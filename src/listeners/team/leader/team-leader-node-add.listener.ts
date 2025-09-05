import { inspect } from "util";
import type { AppTeamInfo_Note } from "@/lib/interfaces/rustplus";
import type { ListenerContext } from "@/lib/structures/listener";

import { Listener } from "@/lib/structures/listener";
import { TeamEvent } from "@/structures";
import { Logger } from "@/utils";

export class TeamListener extends Listener<typeof TeamEvent.LeaderNoteAdd> {
    public constructor(context: ListenerContext) {
        super(context, {
            event: TeamEvent.LeaderNoteAdd
        });
    }

    public override async run(note: AppTeamInfo_Note) {
        Logger.info("Team leader note add", inspect(note, { depth: 1 }));
    }
}
