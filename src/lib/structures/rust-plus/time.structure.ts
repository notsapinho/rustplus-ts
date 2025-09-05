import type { AppTime } from "@/lib/interfaces/rustplus";

export class Time {
    public startTime: AppTime;

    public constructor(public time: AppTime) {
        this.startTime = time;
    }

    public get isDaytime() {
        return (
            this.time.time >= this.time.sunrise &&
            this.time.time < this.time.sunset
        );
    }

    public get isNighttime() {
        return !this.isDaytime;
    }

    public get timeUntilNighttime() {
        if (this.isNighttime) return 0;

        return this.time.sunset - this.time.time;
    }

    public get timeUntilDaytime() {
        if (this.isDaytime) return 0;

        return this.time.time > this.time.sunrise
            ? 24 - this.time.time + this.time.sunrise
            : this.time.sunrise - this.time.time;
    }

    public update(time: AppTime) {
        this.time = time;
    }
}
