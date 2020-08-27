import * as vscode from "vscode";

import BlockchainsExplorer from "./views/blockchainsExplorer";
import NeoExpress from "./neoExpress/neoExpress";
import TrackerPanelController from "./panelControllers/trackerPanelController";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      "neo3-visual-devtracker.blockchainsExplorer",
      new BlockchainsExplorer()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("neo3-visual-tracker.helloWorld", () => {
      new TrackerPanelController(context);
    })
  );

  const neoExpress = new NeoExpress(context);
  //console.log(neoExpress.runSync("create"));
}

export function deactivate() {}
