import "dotenv/config";

import { BotClient } from "./structures/";

const bootstrap = async () => {
    const client = new BotClient({
        server: {
            ip: process.env.SERVER_IP,
            port: process.env.SERVER_PORT
        },
        credentials: {
            playerId: process.env.PLAYER_ID,
            playerToken: parseInt(process.env.PLAYER_TOKEN, 10)
        }
    });

    await client.connect();
};

void bootstrap();
