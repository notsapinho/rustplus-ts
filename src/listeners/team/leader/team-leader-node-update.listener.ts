import { inspect } from "util";
import type { AppTeamInfo_Note } from "@/lib/interfaces/rustplus";
import type { ListenerContext } from "@/lib/structures/listener";

import { Listener } from "@/lib/structures/listener";
import { TeamEvent } from "@/structures";
import { Logger } from "@/utils";

export class TeamListener extends Listener<typeof TeamEvent.LeaderNoteUpdate> {
    public constructor(context: ListenerContext) {
        super(context, {
            event: TeamEvent.LeaderNoteUpdate
        });
    }

    public override async run(
        oldNote: AppTeamInfo_Note,
        newNote: AppTeamInfo_Note
    ) {
        Logger.info(
            `Team leader note updated from ${inspect(oldNote, { depth: 1 })} to ${inspect(newNote, { depth: 1 })}`
        );
    }
}
