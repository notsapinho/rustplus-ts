export class IndexGenerator {
    private state: number;

    public constructor(e: number) {
        this.state = 0 | e;
        this.nextState();
    }

    public nextInt(e: number): number {
        let t = ((this.nextState() * (e | 0)) / 4294967295) | 0;
        if (t < 0) t = e + t - 1;
        return t | 0;
    }

    private nextState(): number {
        let e = this.state;
        const t = e;
        e =
            ((e = ((e = (e ^ ((e << 13) | 0)) | 0) ^ ((e >>> 17) | 0)) | 0) ^
                ((e << 5) | 0)) |
            0;
        this.state = e;
        return t >= 0 ? t : 4294967295 + t - 1;
    }
}
