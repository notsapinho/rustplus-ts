import { ConsumeTokensError } from "@/errors/consume-tokens.error";
import { BaseService } from "./base.service";

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

export class TeamService extends BaseService {
    public async getTeamInfo() {
        const result = await this.client.consumeTokens(
            TeamServiceCosts.getTeamInfo
        );
        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.client.sendRequestAsync(
            {
                getTeamInfo: {}
            },
            TeamServiceCosts.getTeamInfo.timeout
        );

        return appResponse;
    }

    public async getTeamChat() {
        const result = await this.client.consumeTokens(
            TeamServiceCosts.getTeamChat
        );
        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.client.sendRequestAsync(
            {
                getTeamChat: {}
            },
            TeamServiceCosts.getTeamChat.timeout
        );

        return appResponse;
    }

    public async sendTeamMessage(message: string) {
        const result = await this.client.consumeTokens(
            TeamServiceCosts.sendTeamMessage
        );
        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.client.sendRequestAsync(
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
        const result = await this.client.consumeTokens(
            TeamServiceCosts.promoteToLeader
        );
        if (result !== ConsumeTokensError.NoError) return result;

        const appResponse = await this.client.sendRequestAsync(
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
