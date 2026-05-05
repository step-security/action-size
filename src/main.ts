import * as core from '@actions/core';
import * as fs from 'fs';
import {Processor, ProcessorOptions} from './Processor';
import axios from 'axios';

async function validateSubscription(): Promise<void> {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  let repoPrivate: boolean | undefined;

  if (eventPath && fs.existsSync(eventPath)) {
    const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    repoPrivate = eventData?.repository?.private;
  }

  const upstream = 'actions-ecosystem/action-size';
  const action = process.env.GITHUB_ACTION_REPOSITORY;
  const docsUrl =
    'https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions';

  core.info('');
  core.info('\u001b[1;36mStepSecurity Maintained Action\u001b[0m');
  core.info(`Secure drop-in replacement for ${upstream}`);
  if (repoPrivate === false)
    core.info('\u001b[32m\u2713 Free for public repositories\u001b[0m');
  core.info(`\u001b[36mLearn more:\u001b[0m ${docsUrl}`);
  core.info('');

  if (repoPrivate === false) return;

  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
  const body: Record<string, string> = {action: action || ''};
  if (serverUrl !== 'https://github.com') body.ghes_server = serverUrl;
  try {
    await axios.post(
      `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
      body,
      {timeout: 3000}
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      core.error(
        '\u001b[1;31mThis action requires a StepSecurity subscription for private repositories.\u001b[0m'
      );
      core.error(
        `\u001b[31mLearn how to enable a subscription: ${docsUrl}\u001b[0m`
      );
      process.exit(1);
    }
    core.info('Timeout or API not reachable. Continuing to next step.');
  }
}

async function run(): Promise<void> {
  try {
    await validateSubscription();

    const args = getAndValidateArgs();

    const processor: Processor = new Processor(args);
    processor.process();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.error(message);
    core.setFailed(message);
  }
}

function getAndValidateArgs(): ProcessorOptions {
  const args: ProcessorOptions = {
    sizeXSLabel: core.getInput('size_xs_label'),
    sizeSLabel: core.getInput('size_s_label'),
    sizeMLabel: core.getInput('size_m_label'),
    sizeLLabel: core.getInput('size_l_label'),
    sizeXLLabel: core.getInput('size_xl_label'),
    sizeXXLLabel: core.getInput('size_xxl_label'),

    sizeSThreshold: parseInt(core.getInput('size_s_threshold')),
    sizeMThreshold: parseInt(core.getInput('size_m_threshold')),
    sizeLThreshold: parseInt(core.getInput('size_l_threshold')),
    sizeXLThreshold: parseInt(core.getInput('size_xl_threshold')),
    sizeXXLThreshold: parseInt(core.getInput('size_xxl_threshold'))
  };

  for (const numberInput of [
    'size_s_threshold',
    'size_m_threshold',
    'size_l_threshold',
    'size_xl_threshold',
    'size_xxl_threshold'
  ]) {
    if (isNaN(parseInt(core.getInput(numberInput)))) {
      throw Error(`input ${numberInput} did not parse to a valid integer`);
    }
  }

  return args;
}

run();
