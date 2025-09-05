import { container } from "@sapphire/pieces";

import { ConsumeTokensError } from "@/lib/errors/consume-tokens.error";
import { Service } from "@/lib/structures/service";

export const TeamServiceCosts = {
    getTeamInfo: {
        tokens: 1,
        timeout: 10000
    },
    getTeamChat: {
        tokens: 1,
        timeout: 10000
    },
    sendTeamMessage: {
        tokens: 2,
        timeout: 10000
    },
    promoteToLeader: {
        tokens: 1,
        timeout: 10000
    }
};

export class TeamService extends Service {
    public async getInfo() {
        const result = await this.container.client.consumeTokens(
            TeamServiceCosts.getTeamInfo
        );
        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.container.client.sendRequestAsync(
            {
                getTeamInfo: {}
            },
            TeamServiceCosts.getTeamInfo.timeout
        );

        return appResponse;
    }

    public async getChat() {
        const result = await this.container.client.consumeTokens(
            TeamServiceCosts.getTeamChat
        );
        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.container.client.sendRequestAsync(
            {
                getTeamChat: {}
            },
            TeamServiceCosts.getTeamChat.timeout
        );

        return appResponse;
    }

    public async sendMessage(message: string) {
        const result = await this.container.client.consumeTokens(
            TeamServiceCosts.sendTeamMessage
        );
        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.container.client.sendRequestAsync(
            {
                sendTeamMessage: {
                    message: message
                }
            },
            TeamServiceCosts.sendTeamMessage.timeout
        );

        return appResponse;
    }

    public async promoteToLeader(steamId: string) {
        const result = await this.container.client.consumeTokens(
            TeamServiceCosts.promoteToLeader
        );
        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.container.client.sendRequestAsync(
            {
                promoteToLeader: {
                    steamId: steamId
                }
            },
            TeamServiceCosts.promoteToLeader.timeout
        );

        return appResponse;
    }
}
declare module "@/lib/structures/service" {
    interface Services {
        team: TeamService;
    }
}

void container.stores.loadPiece({
    name: "team",
    piece: TeamService,
    store: "services"
});
