import * as vscode from "vscode";

import AutoComplete from "../autoComplete";
import BlockchainMonitorPool from "../blockchainMonitor/blockchainMonitorPool";
import BlockchainsTreeDataProvider from "../vscodeProviders/blockchainsTreeDataProvider";
import { CommandArguments } from "../commandArguments";
import ContractPanelController from "../panelControllers/contractPanelController";
import IoHelpers from "../util/ioHelpers";
import TrackerPanelController from "../panelControllers/trackerPanelController";

export default class TrackerCommands {
  static async openContract(
    context: vscode.ExtensionContext,
    autoComplete: AutoComplete,
    commandArguments: CommandArguments
  ) {
    const autoCompleteData = autoComplete.data;
    let hash = commandArguments.hash;
    if (!hash) {
      if (!!Object.keys(autoCompleteData.contractNames).length) {
        const selection = await IoHelpers.multipleChoice(
          "Select a contract",
          ...Object.keys(autoCompleteData.contractNames).map(
            (_) => `${_} - ${autoCompleteData.contractNames[_]}`
          )
        );
        if (selection) {
          hash = selection.split(" ")[0];
        }
      } else {
        vscode.window.showInformationMessage(
          "No N3 contracts are available to display"
        );
      }
    }
    if (hash) {
      new ContractPanelController(context, hash, autoComplete);
    }
  }

  static async openTracker(
    context: vscode.ExtensionContext,
    autoComplete: AutoComplete,
    blockchainMonitorPool: BlockchainMonitorPool,
    blockchainsTreeDataProvider: BlockchainsTreeDataProvider,
    commandArguments: CommandArguments
  ) {
    const identifier =
      commandArguments?.blockchainIdentifier ||
      (await blockchainsTreeDataProvider.select());
    if (!identifier) {
      return;
    }
    const rpcUrl = await identifier.selectRpcUrl();
    if (rpcUrl) {
      new TrackerPanelController(
        context,
        rpcUrl,
        autoComplete,
        blockchainMonitorPool
      );
    }
  }
}
