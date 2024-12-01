import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { globSync } from 'glob';
import { getFileNameFromPath, cError, cSuccess, tError, cWarning } from "../utils/index.js";
import prompt from 'prompt';
import lodash from 'lodash';

const { merge } = lodash;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class KeymapHelper {
  constructor(program) {
    this.program = program;
    this.cliConfigs = {}
  }

  setCliConfigs(configs) {
    this.cliConfigs = configs;
  }

  exitWithError(error) {
    this.program.error(cError(error));
  }

  readKeymap(name) {
    const _name = name || this.cliConfigs.useKeymap || 'default';
    const keymapPath = path.join(__dirname, 'keymap', `${_name}.json`);
    if (!fs.existsSync(keymapPath)) {
      // if is not exists throw error
      this.exitWithError(`Keymap '${_name}' not found, please use 'lang keymap set' to set a new keymap`);
      return;
    }
    const keymap = JSON.parse(fs.readFileSync(keymapPath, 'utf-8'));
    return keymap
  }

  readKeymapList() {
    if (!fs.existsSync(path.join(__dirname, 'keymap'))) {
      this.exitWithError(`Keymaps not found, please use 'lang keymap set' to set a new keymap`);
      return;
    }
    const keymapFiles = globSync(`${__dirname}/keymap/*.json`)
    return keymapFiles.map(filepath => {
      return getFileNameFromPath(filepath)
    })
  }

  deleteKeymap(name) {
    const keymapPath = path.join(__dirname, 'keymap', `${name}.json`);
    if (!fs.existsSync(keymapPath)) {
      // if is not exists throw error
      this.exitWithError(`Keymap '${name}' not found, please use 'lang keymap list' to list all keymaps`);
      return;
    }
    prompt.get({
      name: 'sure',
      description: `Are you sure to ${tError('delete')} keymap '${name}'(yY/nN)?`,
      type: 'string',
      required: true
    }, (err, result) => {
      if (err) return;
      if (result.sure === 'y' || result.sure === 'Y') {
        fs.unlinkSync(keymapPath);
        console.log(cSuccess(`delete keymap '${name}' success!`));
        return true;
      }
    });
  }

  updateKeymap(name, keymap, { success, error } = {}) {
    const keymapPath = path.join(__dirname, 'keymap', `${name}.json`);
    console.log('update keymap', keymap);
    if (!fs.existsSync(keymapPath)) {
      console.log(cWarning(`Keymap '${name}' not found, auto create a new keymap`));
      this.generateKeymap(name, keymap, false, { success, error });
      success && success();
      return;
    }
    const mergedKeymap = merge(this.readKeymap(name), keymap);
    fs.writeFileSync(keymapPath, JSON.stringify(mergedKeymap, null, 2), 'utf-8');
    console.log(cSuccess(`update keymap '${name}' success!`));
    success && success(mergedKeymap);
    return true;
  }

  useKeymap(name) {
    if (!name) {
      this.exitWithError('Keymap name is required');
      return;
    }
    const keymapPath = path.join(__dirname, 'keymap', `${name}.json`);
    if (!fs.existsSync(keymapPath)) {
      // if is not exists throw error
      this.exitWithError(`Keymap '${name}' not found, please use 'lang keymap set' to set a new keymap`);
      return;
    }
    this.cliConfigs.useKeymap = name;
    fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(this.cliConfigs, null, 2), 'utf-8');
    return true;
  }

  generateKeymap(name, keymap, autoset, { success, error } = {}) {
    const keymapPath = path.join(__dirname, 'keymap', `${name}.json`);
    if (fs.existsSync(keymapPath)) {
      this.exitWithError(`Keymap '${name}' already exists, please use 'lang keymap set' to set a new keymap`);
      error && error();
      return;
    }
    fs.writeFileSync(keymapPath, JSON.stringify(keymap, null, 2), 'utf-8');
    if (autoset) {
      this.useKeymap(name)
    }
    success && success(keymap);
    return true
  }
}

export default KeymapHelper