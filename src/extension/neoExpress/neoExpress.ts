import * as childProcess from "child_process";
import * as vscode from "vscode";
import * as which from "which";

import Log from "../../shared/log";
import posixPath from "../util/posixPath";

type Command =
  | "checkpoint"
  | "contract"
  | "create"
  | "reset"
  | "run"
  | "show"
  | "transfer"
  | "wallet"
  | "-v";

const LOG_PREFIX = "NeoExpress";
const TIMEOUT_IN_MS = 5000;

export default class NeoExpress {
  private readonly binaryPath: string;
  private readonly dotnetPath: string;

  private runLock: boolean;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.binaryPath = posixPath(
      this.context.extensionPath,
      "deps",
      "nxp",
      "tools",
      "net5.0",
      "any",
      "neoxp.dll"
    );
    this.dotnetPath = which.sync("dotnet", { nothrow: true }) || "dotnet";
    this.runLock = false;
  }

  runInTerminal(name: string, command: Command, ...options: string[]) {
    if (!this.checkForDotNet()) {
      return null;
    }
    const dotNetArguments = [this.binaryPath, command, ...options];
    const terminal = vscode.window.createTerminal({
      name,
      shellPath: this.dotnetPath,
      shellArgs: dotNetArguments,
      hideFromUser: false,
    });
    terminal.show();
    return terminal;
  }

  async run(
    command: Command,
    ...options: string[]
  ): Promise<{ message: string; isError?: boolean }> {
    const releaseLock = await this.getRunLock();
    try {
      const startedAt = new Date().getTime();
      const result = await this.runUnsafe(command, ...options);
      const endedAt = new Date().getTime();
      const duration = endedAt - startedAt;
      if (duration > 1000) {
        Log.log(
          LOG_PREFIX,
          `\`neoexp ${command} ${options.join(" ")}\` took ${duration}ms`
        );
      }
      return result;
    } finally {
      releaseLock();
    }
  }

  async runUnsafe(
    command: string,
    ...options: string[]
  ): Promise<{ message: string; isError?: boolean }> {
    if (!this.checkForDotNet()) {
      return { message: "Could not launch Neo Express", isError: true };
    }
    const dotNetArguments = [
      this.binaryPath,
      ...command.split(/\s/),
      ...options,
    ];
    try {
      return new Promise((resolve, reject) => {
        const startedAt = new Date().getTime();
        let complete = false;
        const watchdog = () => {
          if (!complete && new Date().getTime() - startedAt > TIMEOUT_IN_MS) {
            complete = true;
            reject("Operation timed out");
          } else if (!complete) {
            setTimeout(watchdog, 250);
          }
        };
        watchdog();
        const process = childProcess.spawn(this.dotnetPath, dotNetArguments);
        let message = "";
        process.stdout.on(
          "data",
          (d) => (message = `${message}${d.toString()}`)
        );
        process.stderr.on(
          "data",
          (d) => (message = `${message}${d.toString()}`)
        );
        process.on("close", (code) => {
          complete = true;
          resolve({ message, isError: code !== 0 });
        });
        process.on("error", () => {
          complete = true;
          reject();
        });
      });
    } catch (e) {
      return {
        isError: true,
        message:
          e.stderr?.toString() ||
          e.stdout?.toString() ||
          e.message ||
          "Unknown failure",
      };
    }
  }

  private async checkForDotNet() {
    let ok = false;
    try {
      ok =
        parseInt(
          childProcess.execFileSync(this.dotnetPath, ["--version"]).toString()
        ) >= 5;
    } catch (e) {
      Log.error(LOG_PREFIX, "checkForDotNet error:", e.message);
      ok = false;
    }
    if (!ok) {
      const response = await vscode.window.showErrorMessage(
        ".NET 5 or higher is required to use this functionality.",
        "Dismiss",
        "More info"
      );
      if (response === "More info") {
        await vscode.env.openExternal(
          vscode.Uri.parse("https://dotnet.microsoft.com/download")
        );
      }
    }
    return ok;
  }

  private async getRunLock(): Promise<() => void> {
    while (this.runLock) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    this.runLock = true;
    return () => {
      this.runLock = false;
    };
  }
}
