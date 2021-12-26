import { spawn } from "child_process";
import chokidar = require("chokidar");
import { Command, Option } from "clipanion";
import { debounce } from "lodash";
import * as t from "typanion";
enum colors {
  FgBlack = "\x1b[30m",
  FgRed = "\x1b[31m",
  FgGreen = "\x1b[32m",
  FgYellow = "\x1b[33m",
  FgBlue = "\x1b[34m",
  FgMagenta = "\x1b[35m",
  FgCyan = "\x1b[36m",
  FgWhite = "\x1b[37m",
  Reset = "\x1b[0m",
  Bright = "\x1b[1m",
  Dim = "\x1b[2m",
  Underscore = "\x1b[4m",
  Blink = "\x1b[5m",
  Reverse = "\x1b[7m",
  Hidden = "\x1b[8m",
}

const chalk = {
  green: (str: string) => colors.FgGreen + str + colors.Reset,
  yellow: (str: string) => colors.FgYellow + str + colors.Reset,
};

export class MainCommand extends Command {
  glob = Option.String({ validator: t.isString() });
  ignoreExit = Option.Boolean("--ignore-exit", true);
  run = Option.Rest();

  spawned: ReturnType<typeof spawn> | undefined;
  spawning = false;

  killedByUs = false;

  restartChild = debounce(
    async () => {
      if (this.spawning) {
        return;
      }
      this.spawning = true;
      const spawnNext = () => {
        const toSpawn = Array.from(this.run.values());
        this.context.stdout.write(`\nRunning "${toSpawn}"\n`);
        // execSync(`kill $(lsof -t -i:3000) | exit 0`)
        // this.context.stdout.write(process.cwd())
        this.spawned = spawn(toSpawn[0], toSpawn.slice(1), {
          stdio: [0, 1, 2],
          env: process.env,
        });
        this.spawned.on("exit", () => {
          if (!this.killedByUs) {
            if (this.ignoreExit) {
              this.context.stdout.write(
                chalk.green(
                  "\nProcess exited, but --ignore-exit was set to true"
                )
              );
            } else {
              this.context.stdout.write(
                chalk.green("\nProcess exited, restart hawk to restart")
              );
              process.exit();
            }
          }
          if (this.spawned?.killed) {
            this.spawned.kill();
          }
          this.spawned = undefined;
        });
        this.spawning = false;
        this.killedByUs = false;
        // this.context.stdout.write(`Child process id is ${spawned.pid}`)
      };
      if (this.spawned) {
        this.killedByUs = true;
        this.spawned.on("exit", () => {
          spawnNext();
        });
        this.spawned.kill();
      } else {
        spawnNext();
      }
    },
    1000,
    { leading: true, trailing: true }
  );

  async execute() {
    this.killedByUs = false;

    const toWatch = this.glob;
    this.context.stdout.write(`\nWatching ${toWatch}`);

    chokidar
      .watch(toWatch, {
        ignoreInitial: true,
      })
      .on("all", (_event, path) => {
        this.context.stdout.write(
          `\n${chalk.green("Restarting because of")} ${chalk.yellow(path)}`
        );
        this.restartChild();
      });

    this.restartChild();
  }
}
