import type { CommandContext } from "@/lib/structures/command";

import { Command } from "@/lib/structures/command";
import { decimalToHHMM, minutesToMMSS } from "@/lib/utils";

export class UtilCommand extends Command {
    public constructor(context: CommandContext) {
        super(context, {
            name: "time"
        });
    }

    public override async run() {
        await this.container.client.services.team.sendMessage(
            `It's now ${decimalToHHMM(this.container.client.time.time)} | ${
                this.container.client.time.isDaytime
                    ? `${minutesToMMSS(this.container.client.time.realPerHour * this.container.client.time.inGameTimeUntilNighttime)} until nightfall.`
                    : `${minutesToMMSS(
                          this.container.client.time.realPerHour *
                              this.container.client.time.inGameTimeUntilDaytime
                      )} until daytime.`
            }`
        );
    }
}
