import type { Args } from "@/lib/parsers/args.parser";
import type { CommandContext } from "@/lib/structures/command";
import type { Message } from "@/lib/types/message.type";

import { AppMarkerType } from "@/lib/interfaces/rustplus";
import { Command } from "@/lib/structures/command";
import { getGridLabelByXY, sleep } from "@/lib/utils";
import items from "../../../assets/items.json";

export class UtilCommand extends Command {
    public constructor(context: CommandContext) {
        super(context, {
            name: "shop",
            usage: "<buy|sell> <item name>"
        });
    }

    public override async run(message: Message, args: Args) {
        const action = await args.pick("enum", {
            enum: ["buy", "sell"]
        });
        const itemName = await args.rest("string");

        const item = items.find(
            (i) =>
                i.shortname.toLowerCase() === itemName.toLowerCase() ||
                i.Name.toLowerCase() === itemName.toLowerCase()
        );

        if (!item) {
            await this.container.client.services.team.sendMessage(
                `No item named "${itemName}" was found.`
            );

            return;
        }

        const vendingShops = this.container.client.mapMarkers.markers.filter(
            (marker) => marker.type === AppMarkerType.VendingMachine
        );

        if (vendingShops.length === 0) {
            await this.container.client.services.team.sendMessage(
                "No vending shops were found on the map."
            );

            return;
        }

        const shops = vendingShops
            .map((shop) => {
                const sellOrders = shop.sellOrders
                    .filter((sellOrder) => {
                        if (action === "buy") {
                            return sellOrder.itemId === item.itemid;
                        } else {
                            return sellOrder.currencyId === item.itemid;
                        }
                    })
                    .sort((a, b) => {
                        if (action === "buy") {
                            return a.costPerItem - b.costPerItem;
                        } else {
                            return b.quantity - a.quantity;
                        }
                    });

                return {
                    shop,
                    sellOrders
                };
            })
            .filter((s) => s.sellOrders.length > 0);

        if (shops.length === 0) {
            await this.container.client.services.team.sendMessage(
                `No shops were found that ${action === "buy" ? "selling" : "buying"} "${
                    item.Name
                }".`
            );

            return;
        }

        const shopOrders = shops
            .flatMap((s) =>
                s.sellOrders.flatMap((order) => {
                    const grid = getGridLabelByXY(
                        s.shop.x,
                        s.shop.y,
                        this.container.client.serverInfo.mapSize
                    );

                    if (action === "buy") {
                        return {
                            message: `Buy ${order.quantity}x :${item.shortname}: for ${order.costPerItem} :${
                                items.find((i) => i.itemid === order.currencyId)
                                    ?.shortname
                            }: @ ${grid}`,
                            order
                        };
                    } else {
                        return {
                            message: `Sell ${order.costPerItem}x :${item.shortname}: for ${order.quantity} :${
                                items.find((i) => i.itemid === order.itemId)
                                    ?.shortname
                            }: @ ${grid}`,
                            order
                        };
                    }
                })
            )
            .sort((a, b) =>
                action === "buy"
                    ? a.order.costPerItem - b.order.costPerItem
                    : b.order.quantity - a.order.quantity
            );

        await this.container.client.services.team.sendMessage(
            `Found ${shopOrders.length} shop(s) that are ${action === "buy" ? "selling" : "buying"} "${
                item.Name
            }"`
        );

        for (let i = 0; i < shopOrders.length; i += 3) {
            const chunk = shopOrders.slice(i, i + 3);

            for (const order of chunk) {
                await this.container.client.services.team.sendMessage(
                    order.message
                );
            }

            await sleep(500);
        }
    }
}
