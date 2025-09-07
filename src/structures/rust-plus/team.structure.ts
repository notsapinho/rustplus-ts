import type {
    AppTeamInfo,
    AppTeamInfo_Member,
    AppTeamInfo_Note
} from "@/lib/interfaces/rustplus";

import { container } from "@sapphire/pieces";

export const TeamEvent = {
    MemberAdd: "memberAdd",
    MemberLeft: "memberLeft",
    MemberDie: "memberDie",
    MemberRespawn: "memberRespawn",
    LeaderChange: "leaderChange",
    LeaderNoteAdd: "leaderNoteAdd",
    LeaderNoteUpdate: "leaderNoteUpdate",
    LeaderNoteRemove: "leaderNoteRemove"
} as const;

export class Team {
    public leaderSteamId: string;
    public leaderMapNotes: AppTeamInfo_Note[] = [];
    public members: AppTeamInfo_Member[] = [];

    public constructor(info: AppTeamInfo) {
        this.leaderSteamId = info.leaderSteamId;
        this.members = info.members;
        this.leaderMapNotes = info.leaderMapNotes;
    }

    public update(newInfo: AppTeamInfo) {
        if (!newInfo) return;

        if (this.leaderSteamId !== newInfo.leaderSteamId) {
            const old = this.leaderSteamId;

            this.leaderSteamId = newInfo.leaderSteamId;

            container.client.emit(
                TeamEvent.LeaderChange,
                old,
                newInfo.leaderSteamId
            );
        }

        for (const newNote of newInfo.leaderMapNotes) {
            const oldNote = this.leaderMapNotes.find(
                (n) => n.x === newNote.x && n.y === newNote.y
            );

            if (!oldNote) {
                container.client.emit(TeamEvent.LeaderNoteAdd, newNote);
            } else if (
                oldNote.label !== newNote.label ||
                oldNote.icon !== newNote.icon
            ) {
                container.client.emit(
                    TeamEvent.LeaderNoteUpdate,
                    oldNote,
                    newNote
                );
            }
        }

        for (const note of this.leaderMapNotes) {
            if (
                !newInfo.leaderMapNotes.find(
                    (n) => n.x === note.x && n.y === note.y
                )
            ) {
                container.client.emit(TeamEvent.LeaderNoteRemove, note);
            }
        }

        for (const newMember of newInfo.members) {
            const oldMember = this.members.find(
                (m) => m.steamId === newMember.steamId
            );

            if (!oldMember) {
                container.client.emit(TeamEvent.MemberAdd, newMember);
            } else if (oldMember && !oldMember.isAlive && newMember.isAlive) {
                container.client.emit(TeamEvent.MemberRespawn, newMember);
            }
        }

        for (const member of this.members) {
            const newMember = newInfo.members.find(
                (m) => m.steamId === member.steamId
            );

            if (!newMember) {
                container.client.emit(TeamEvent.MemberLeft, member);
            } else if (newMember && member.isAlive && !newMember.isAlive) {
                container.client.emit(TeamEvent.MemberDie, member);
            }
        }

        this.leaderSteamId = newInfo.leaderSteamId;
        this.leaderMapNotes = newInfo.leaderMapNotes;
        this.members = newInfo.members;
    }
}
declare module "@/lib/types/events.type" {
    interface ClientEvents {
        [TeamEvent.MemberAdd]: [member: AppTeamInfo_Member];
        [TeamEvent.MemberLeft]: [member: AppTeamInfo_Member];
        [TeamEvent.MemberDie]: [member: AppTeamInfo_Member];
        [TeamEvent.MemberRespawn]: [member: AppTeamInfo_Member];
        [TeamEvent.LeaderChange]: [
            oldNewLeaderSteamId: string,
            newLeaderSteamId: string
        ];
        [TeamEvent.LeaderNoteAdd]: [note: AppTeamInfo_Note];
        [TeamEvent.LeaderNoteUpdate]: [
            oldNote: AppTeamInfo_Note,
            newNote: AppTeamInfo_Note
        ];
        [TeamEvent.LeaderNoteRemove]: [note: AppTeamInfo_Note];
    }
}
