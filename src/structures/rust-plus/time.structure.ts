import type { AppTime } from "@/lib/interfaces/rustplus";

import { Logger } from "@/utils";

const mod24 = (x: number) => ((x % 24) + 24) % 24;

type RateSample = { rate: number; at: number };

export class Time {
    public startTime: number;
    public time: number;
    public sunrise: number;
    public sunset: number;
    public dayLengthMinutes: number;
    public timeScale: number;

    public windowSec = 60;
    public minSamples = 3;
    public trimFrac = 0.2;
    public nightMinutesDefault = 10;

    private previousSampleUnixMs?: number;
    private previousSampleGameHour?: number;
    private previousSampleWasDaytime?: boolean;

    private dayPhaseRateSamples: RateSample[] = [];
    private nightPhaseRateSamples: RateSample[] = [];

    constructor(appTime: AppTime) {
        this.startTime = appTime.time;
        this.time = appTime.time;
        this.sunrise = appTime.sunrise;
        this.sunset = appTime.sunset;
        this.dayLengthMinutes = appTime.dayLengthMinutes;
        this.timeScale = appTime.timeScale;
    }

    private get dayHours() {
        const dh = mod24(this.sunset - this.sunrise);
        return dh === 0 ? 24 : dh;
    }
    private get nightHours() {
        return 24 - this.dayHours;
    }

    private isDaytimeAt(t: number) {
        const x = mod24(t);
        const sr = mod24(this.sunrise);
        const ss = mod24(this.sunset);
        if (sr <= ss) return x >= sr && x < ss;
        return x >= sr || x < ss;
    }

    public get isDaytime() {
        return this.isDaytimeAt(this.time);
    }
    public get isNighttime() {
        return !this.isDaytime;
    }

    public get inGameTimeUntilNighttime() {
        if (this.isNighttime) return 0;
        return this.sunset - this.time;
    }

    public get inGameTimeUntilDaytime() {
        if (this.isDaytime) return 0;
        return this.time > this.sunrise
            ? 24 - this.time + this.sunrise
            : this.sunrise - this.time;
    }

    public update(appTime: AppTime) {
        if (!appTime) {
            Logger.warn("Received invalid time update from app.");

            return;
        }

        const nowUnixMs = Date.now();

        if (
            this.previousSampleUnixMs != null &&
            this.previousSampleGameHour != null &&
            this.previousSampleWasDaytime != null
        ) {
            const deltaMinutesReal =
                (nowUnixMs - this.previousSampleUnixMs) / 60000;
            const deltaGameHours = mod24(
                appTime.time - this.previousSampleGameHour
            );
            const wasDaytime = this.isDaytimeAt(this.previousSampleGameHour);
            const isDaytimeNow = this.isDaytimeAt(appTime.time);
            const crossedPhase = wasDaytime !== isDaytimeNow;

            if (!crossedPhase && deltaMinutesReal > 0 && deltaGameHours > 0) {
                const minutesPerGameHour = deltaMinutesReal / deltaGameHours;
                const bucket = isDaytimeNow
                    ? this.dayPhaseRateSamples
                    : this.nightPhaseRateSamples;
                bucket.push({ rate: minutesPerGameHour, at: nowUnixMs });
            }
        }

        this.previousSampleUnixMs = nowUnixMs;
        this.previousSampleGameHour = appTime.time;
        this.previousSampleWasDaytime = this.isDaytimeAt(appTime.time);

        this.time = appTime.time;
        this.sunrise = appTime.sunrise;
        this.sunset = appTime.sunset;
        this.dayLengthMinutes = appTime.dayLengthMinutes;
        this.timeScale = appTime.timeScale;

        const cutoff = nowUnixMs - this.windowSec * 1000;

        this.dayPhaseRateSamples = this.dayPhaseRateSamples
            .filter((s) => s.at >= cutoff)
            .slice(-200);
        this.nightPhaseRateSamples = this.nightPhaseRateSamples
            .filter((s) => s.at >= cutoff)
            .slice(-200);
    }

    private dayFallbackMinutesPerGameHour() {
        return this.dayLengthMinutes / this.dayHours / this.timeScale;
    }
    private nightFallbackMinutesPerGameHour() {
        return this.nightMinutesDefault / this.nightHours / this.timeScale;
    }

    private estimateLocalMinutesPerGameHour(isDayPhase: boolean): number {
        const phaseRates = (
            isDayPhase ? this.dayPhaseRateSamples : this.nightPhaseRateSamples
        )
            .map((s) => s.rate)
            .filter((x) => Number.isFinite(x) && x > 0);

        if (phaseRates.length < this.minSamples)
            return isDayPhase
                ? this.dayFallbackMinutesPerGameHour()
                : this.nightFallbackMinutesPerGameHour();

        phaseRates.sort((a, b) => a - b);

        const trimCount = Math.floor(phaseRates.length * this.trimFrac);
        const core = phaseRates.slice(trimCount, phaseRates.length - trimCount);
        const average = core.reduce((a, b) => a + b, 0) / core.length;

        return average;
    }

    private nextPhaseBoundary(from: number) {
        const x = mod24(from);
        const boundaryHour = this.isDaytimeAt(from)
            ? this.sunset
            : this.sunrise;
        const b = mod24(boundaryHour);
        const delta = x <= b ? b - x : 24 - x + b;
        return from + delta;
    }

    public realMinutesBetween(t1: number, t2: number) {
        let a = mod24(t1);
        const target = mod24(t2);
        let remaining = mod24(target - a);
        let minutes = 0;

        while (remaining > 1e-9) {
            const boundary = this.nextPhaseBoundary(a);
            const stepHours = Math.min(remaining, boundary - a);
            const mph = this.isDaytimeAt(a)
                ? this.estimateLocalMinutesPerGameHour(true)
                : this.estimateLocalMinutesPerGameHour(false);
            minutes += stepHours * mph;
            a = mod24(a + stepHours);
            remaining -= stepHours;
        }
        return minutes;
    }

    public realUntilNightfall() {
        return this.isNighttime
            ? 0
            : this.realMinutesBetween(this.time, this.sunset);
    }

    public realUntilDaytime() {
        if (this.isDaytime) return 0;
        const target =
            this.time <= this.sunrise ? this.sunrise : this.sunrise + 24;
        return this.realMinutesBetween(this.time, target);
    }
}
