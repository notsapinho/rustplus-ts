import chalk from "chalk";

export class Logger {
    public static tag = chalk`{rgb(206,66,43).bold [RUST+]}`;

    public static info = (...text: string[]): void =>
        console.log(
            chalk`${Logger.tag} {rgb(66,135,245) [INFO] ${text.join(" ")}}`
        );

    public static error = (...text: string[]): void =>
        console.log(
            chalk`${Logger.tag} {rgb(245,66,66) [ERROR] ${text.join(" ")}}`
        );

    public static success = (...text: string[]): void =>
        console.log(
            chalk`${Logger.tag} {rgb(66,245,135) [SUCCESS] ${text.join(" ")}}`
        );

    public static warn = (...text: string[]): void =>
        console.log(
            chalk`${Logger.tag} {rgb(245,221,66) [WARN] ${text.join(" ")}}`
        );

    public static centerText = (text: string, space?: number): string =>
        text
            .split(/\r?\n/)
            .map(
                (line, _, lines) =>
                    " ".repeat(
                        space ??
                            (process.stdout.columns -
                                Logger.removeColors(
                                    lines[Math.floor(lines.length / 2)]
                                ).length) /
                                2
                    ) + line
            )
            .join("\n");

    public static fadeText = (
        text: string,
        startColor: { r: number; g: number; b: number },
        increment: number
    ): string =>
        text
            .split(/\r?\n/)
            .map(
                (line, i) =>
                    `\x1b[38;2;${Math.min(
                        startColor.r + increment * i,
                        255
                    )};${Math.min(
                        startColor.g + increment * i,
                        255
                    )};${Math.min(
                        startColor.b + increment * i,
                        255
                    )}m${line}\x1b[0m`
            )
            .join("\n");

    public static removeColors = (text: string): string =>
        // eslint-disable-next-line no-control-regex
        text.replace(/\x1b[^m]*m/g, "");
}
