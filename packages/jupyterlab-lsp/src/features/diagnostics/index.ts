import { ILSPFeatureManager, PLUGIN_ID } from '../../tokens';
import { FeatureSettings, IFeatureCommand } from '../../feature';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  diagnostics_panel,
  DiagnosticsCM,
  diagnosticsIcon
} from './diagnostics';
import { ITranslator, TranslationBundle } from '@jupyterlab/translation';

export const FEATURE_ID = PLUGIN_ID + ':diagnostics';

const COMMANDS = (trans: TranslationBundle): IFeatureCommand[] => [
  {
    id: 'show-diagnostics-panel',
    execute: ({ app, features, adapter }) => {
      let diagnostics_feature = features.get(FEATURE_ID) as DiagnosticsCM;
      diagnostics_feature.switchDiagnosticsPanelSource();

      if (!diagnostics_panel.is_registered) {
        diagnostics_panel.register(app);
      }

      const panel_widget = diagnostics_panel.widget;
      if (!panel_widget.isAttached) {
        app.shell.add(panel_widget, 'main', {
          ref: adapter.widget_id,
          mode: 'split-bottom'
        });
      }
      app.shell.activateById(panel_widget.id);
    },
    is_enabled: context => {
      return context.app.name != 'JupyterLab Classic';
    },
    label: trans.__('Show diagnostics panel'),
    rank: 3,
    icon: diagnosticsIcon
  }
];

export const DIAGNOSTICS_PLUGIN: JupyterFrontEndPlugin<void> = {
  id: FEATURE_ID,
  requires: [ILSPFeatureManager, ISettingRegistry, ITranslator],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    featureManager: ILSPFeatureManager,
    settingRegistry: ISettingRegistry,
    translator: ITranslator
  ) => {
    const settings = new FeatureSettings(settingRegistry, FEATURE_ID);
    const trans = translator.load('jupyterlab-lsp');

    featureManager.register({
      feature: {
        editorIntegrationFactory: new Map([
          ['CodeMirrorEditor', DiagnosticsCM]
        ]),
        id: FEATURE_ID,
        name: 'LSP Diagnostics',
        settings: settings,
        commands: COMMANDS(trans)
      }
    });
  }
};
