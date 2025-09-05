import "dotenv/config";

import { BotClient } from "./structures/";

const bootstrap = async () => {
    const client = new BotClient({
        server: {
            ip: "131.196.198.41",
            port: "28082"
        },
        credentials: {
            playerId: process.env.PLAYER_ID,
            playerToken: parseInt(process.env.PLAYER_TOKEN, 10)
        }
    });

    await client.connect();
};

void bootstrap();
