import { Cli } from "clipanion";

import { MainCommand } from "./MainCommand";
import packageJson = require("../package.json");
const [node, app, ...args] = process.argv;

const cli = new Cli({
  binaryLabel: `Hawk`,
  binaryName: `${node} ${app}`,
  binaryVersion: packageJson.version,
});

cli.register(MainCommand);
cli.runExit(args);
