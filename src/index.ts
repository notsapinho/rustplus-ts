import "dotenv/config";

import { Client } from "@/lib/core";

const bootstrap = async () => {
    const serverIp = "131.196.198.41";
    const serverPort = "28082";

    const client = new Client(
        serverIp,
        serverPort,
        process.env.PLAYER_ID,
        parseInt(process.env.PLAYER_TOKEN, 10)
    );

    await client.connect();
};

void bootstrap();
