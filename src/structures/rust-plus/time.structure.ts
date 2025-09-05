import type { AppTime } from "@/lib/interfaces/rustplus";

export class Time {
    public startTime: number;
    public time: number;
    public sunrise: number;
    public sunset: number;

    public constructor(appTime: AppTime) {
        this.startTime = appTime.time;
        this.time = appTime.time;
        this.sunrise = appTime.sunrise;
        this.sunset = appTime.sunset;
    }

    public get isDaytime() {
        return this.time >= this.sunrise && this.time < this.sunset;
    }

    public get isNighttime() {
        return !this.isDaytime;
    }

    public get timeUntilNighttime() {
        if (this.isNighttime) return 0;

        return this.sunset - this.time;
    }

    public get timeUntilDaytime() {
        if (this.isDaytime) return 0;

        return this.time > this.sunrise
            ? 24 - this.time + this.sunrise
            : this.sunrise - this.time;
    }

    public update(appTime: AppTime) {
        this.time = appTime.time;
        this.sunrise = appTime.sunrise;
        this.sunset = appTime.sunset;
    }
}
