import type { AppMessage } from "@/lib/interfaces/rustplus";
import type { ListenerContext } from "@/lib/structures/client/listener/listener.structure";

import { Listener } from "@/lib/structures/client/listener/listener.structure";
import { Events } from "@/lib/types/events.type";
import { decimalToHoursMinutes } from "@/lib/utils/decimals-to-hours-minutes.util";

export class ClientListener extends Listener<typeof Events.Message> {
    public constructor(context: ListenerContext) {
        super(context, { event: Events.Message });
    }

    public async run(message: AppMessage) {
        if (
            !message.broadcast?.teamMessage?.message ||
            !this.container.client.team
        )
            return;

        switch (message.broadcast.teamMessage.message.message) {
            case "!tempo":
                {
                    if (!this.container.client.time) return;

                    console.log(this.container.client.time.time);

                    await this.container.client.services.team.sendMessage(
                        `Agora são ${decimalToHoursMinutes(this.container.client.time.time.time)}.
                        ${
                            this.container.client.time.isDaytime
                                ? `${decimalToHoursMinutes(this.container.client.time.timeUntilNighttime)} até o anoitecer`
                                : `${decimalToHoursMinutes(
                                      this.container.client.time
                                          .timeUntilDaytime
                                  )} até o amanhecer`
                        }`
                    );
                }
                break;
        }
    }
}
