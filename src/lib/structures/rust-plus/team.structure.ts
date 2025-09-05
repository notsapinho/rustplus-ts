import EventEmitter from "node:events";
import type {
    AppTeamInfo,
    AppTeamInfo_Member,
    AppTeamInfo_Note
} from "@/lib/interfaces/rustplus";
import type TypedEventEmitter from "typed-emitter";

type TeamEvents = {
    memberAdded: (member: AppTeamInfo_Member) => void;
    memberLeft: (member: AppTeamInfo_Member) => void;
    memberDied: (member: AppTeamInfo_Member) => void;
    memberRespawned: (member: AppTeamInfo_Member) => void;
    leaderChanged: (newLeaderSteamId: string) => void;
    leaderNoteAdded: (note: AppTeamInfo_Note) => void;
    leaderNoteRemoved: (note: AppTeamInfo_Note) => void;
};

export class Team extends (EventEmitter as new () => TypedEventEmitter<TeamEvents>) {
    public leaderSteamId: string;
    public leaderMapNotes: AppTeamInfo_Note[] = [];
    public members: AppTeamInfo_Member[] = [];

    public constructor(info: AppTeamInfo) {
        super();

        this.leaderSteamId = info.leaderSteamId;
        this.members = info.members;
        this.leaderMapNotes = info.leaderMapNotes;
    }

    public update(newInfo: AppTeamInfo) {
        if (this.leaderSteamId !== newInfo.leaderSteamId) {
            this.leaderSteamId = newInfo.leaderSteamId;

            this.emit("leaderChanged", newInfo.leaderSteamId);
        }

        for (const newNote of newInfo.leaderMapNotes) {
            if (!this.leaderMapNotes.find((n) => n === newNote)) {
                this.leaderMapNotes.push(newNote);
                this.emit("leaderNoteAdded", newNote);
            }
        }

        for (const note of this.leaderMapNotes) {
            if (!newInfo.leaderMapNotes.find((n) => n === note)) {
                this.leaderMapNotes = this.leaderMapNotes.filter(
                    (n) => n !== note
                );
                this.emit("leaderNoteRemoved", note);
            }
        }

        for (const newMember of newInfo.members) {
            const oldMember = this.members.find(
                (m) => m.steamId === newMember.steamId
            );

            if (!oldMember) {
                this.members.push(newMember);

                this.emit("memberAdded", newMember);
            }

            if (oldMember && !oldMember.isAlive && newMember.isAlive) {
                this.emit("memberRespawned", newMember);
            }
        }

        for (const member of this.members) {
            const newMember = newInfo.members.find(
                (m) => m.steamId === member.steamId
            );

            if (!newMember) {
                this.members = this.members.filter(
                    (m) => m.steamId !== member.steamId
                );
                this.emit("memberLeft", member);
            }

            if (newMember && member.isAlive && !newMember.isAlive) {
                this.emit("memberDied", member);
            }
        }

        this.members = newInfo.members;
    }
}
