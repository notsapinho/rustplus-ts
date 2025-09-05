import type { PieceOptions } from "@sapphire/pieces";

import { Piece } from "@sapphire/pieces";

export type ServiceContext = Piece.LoaderContext<"services">;
export type ServiceOptions = PieceOptions;

export abstract class Service extends Piece<ServiceOptions, "services"> {
    public constructor(context: ServiceContext, options: ServiceOptions = {}) {
        super(context, options);
    }
}
