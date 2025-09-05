export const Constants = {
    CARGO_SHIP_EGRESS_TIME: 50 * 60 * 1000 /* 50 min */,
    OIL_RIG_LOCKED_CRATE_UNLOCK_TIME: 15 * 60 * 1000 /* 15 min */,

    PATROL_HELI_DOWNED_RADIUS: 400,
    OIL_RIG_CH47_MAX_SPAWN_DISTANCE: 550,
    HARBOR_DOCK_DISTANCE: 100
} as const;

export const MonumentTokens = {
    SMALL_OIL_RIG: "oil_rig_small",
    LARGE_OIL_RIG: "oil_rig_large",
    HARBOR: "harbor_display_name",
    HARBOR_2: "harbor_2_display_name"
};
