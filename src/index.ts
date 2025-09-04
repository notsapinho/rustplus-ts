import { inspect } from "util";

//TODO: Type this properly
import PushReceiverClient from "@liamcottle/push-receiver/src/client";

import { RustPlus } from "./core/rustplus";

const gcmAndroidId = "";
const gcmSecurityToken = "";
const serverIp = "131.196.198.41";
const serverPort = "28082";

const bootstrap = async () => {
    const push = new PushReceiverClient(gcmAndroidId, gcmSecurityToken, []);

    // TODO: Type this properly
    push.on("ON_DATA_RECEIVED", (data: any) => {
        console.log("Push data received:", inspect(data, { depth: null }));
    });

    const client = new RustPlus(serverIp, serverPort);

    client.on("connected", async () => {
        console.log("Connected to server");
    });
    client.on("message", (message) => {
        console.log("Message:", message);
    });

    client.on("error", async (errorType, error: any) => {
        console.log(`Type: ${errorType}, Error: ${error.message}`);
    });

    await client.connect();
};

void bootstrap();
