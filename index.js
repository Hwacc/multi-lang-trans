/*
 * @Author: hua
 * @Date: 2023-02-15 16:55:26
 * @Description: 
 */
import { Command } from 'commander';
import isAbsolute from 'is-absolute';
import fs from 'node:fs';
import path from 'node:path';
import xlsx from 'node-xlsx';
import KeymapHelper from './helpers/keymapHelper.js';
import TransHelper from './helpers/transHelper.js';
import prompt from 'prompt';
import pkg from './package.json';
import lodash from 'lodash';
import { DEFAULT_KEYMAP } from './constants.js';
import { fileURLToPath } from 'node:url';
import { cError, cSuccess, parseKeymapString2Object, tSuccess } from "./utils/index.js";
import { colorize as jsonColorize } from 'json-colorizer';


const { isEmpty } = lodash;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwd = process.cwd();
const program = new Command();
const keymapHelper = new KeymapHelper(program);
const transHelper = new TransHelper(program);

const resolve = (...dir) => {
  return path.resolve(cwd, ...dir);
}

let cliConfigs = {
  useKeymap: 'default',
}
const init = () => {
  // init cli config files
  if (!fs.existsSync(resolve(__dirname, 'keymap'))) {
    fs.mkdirSync(resolve(__dirname, 'keymap'), { recursive: false, mode: 0o777 });
  }
  if (!fs.existsSync(resolve(__dirname, 'keymap', 'default.json'))) {
    fs.writeFileSync(resolve(__dirname, 'keymap', 'default.json'), JSON.stringify(DEFAULT_KEYMAP, null, 2), 'utf-8');
  }
  if (!fs.existsSync(resolve(__dirname, 'config.json'))) {
    fs.writeFileSync(resolve(__dirname, 'config.json'), JSON.stringify(cliConfigs, null, 2), 'utf-8')
  } else {
    cliConfigs = JSON.parse(fs.readFileSync(resolve(__dirname, 'config.json'), 'utf-8'));
    keymapHelper.setCliConfigs(cliConfigs);
  }
}

const handleTransInputFile = (filename, outputPath, options) => {
  if (!/(.xlsx)$/.test(filename)) {
    filename = filename + '.xlsx';
  }
  let stat = {}
  try {
    stat = fs.statSync(resolve(filename))
  } catch (error) {
    program.error(cError(`file '${filename}' not found`));
    return;
  }
  const sheets = xlsx.parse(filename);
  if (isEmpty(sheets)) return;

  const isAbPath = process.platform === 'win32' ? isAbsolute.win32(outputPath) : isAbsolute(outputPath);
  if (!isAbPath) {
    outputPath = resolve(outputPath);
  }
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: false, mode: 0o777 });
  }
  if (sheets.length === 1) {  // 只有一个sheet, 进入no namespace 模式
    transHelper.handleTableTrans2Object(sheets[0].data, (name, data) => {
      return new Promise((resolve, reject) => {
        const keymap = keymapHelper.readKeymap();
        fs.writeFile(`${outputPath}/${keymap[name]}.json`, JSON.stringify(data, null, 4), { mode: 0o777 }, err => {
          if (err) reject(err);
          console.log(`build ${keymap[name]}.json success!`)
          resolve(true);
        });
      });
    }, options);
  } else { // 多个sheet, 进入 namespace 模式
    sheets.forEach(sheet => {
      transHelper.handleTableTrans2Object(sheet.data, (name, data) => {
        const keymap = keymapHelper.readKeymap();
        const ns = keymap[name];
        const nsOutputPath = `${outputPath}/${ns}`;
        if (!fs.existsSync(nsOutputPath)) {
          fs.mkdirSync(nsOutputPath, { recursive: false, mode: 0o777 });
        }
        return new Promise((resolve, reject) => {
          fs.writeFile(`${nsOutputPath}/${sheet.name}.json`, JSON.stringify(data, null, 4), { mode: 0o777 }, err => {
            if (err) reject(err);
            console.log(`build ${ns}:${sheet.name}.json success!`)
            resolve(true);
          });
        });
      }, options);
    });
  }
}

const handlePickInputFile = (filename, includeKey) => {
  if (!/(.xlsx)$/.test(filename)) {
    filename = filename + '.xlsx';
  }
  let stat = {}
  try {
    stat = fs.statSync(resolve(filename))
  } catch (error) {
    program.error(cError(`file '${filename}' not found`));
    return;
  }
  const sheets = xlsx.parse(filename);
  if (isEmpty(sheets)) {
    program.error('empty sheets');
    return;
  }
  const executePickRow = (sheet, multi) => {
    prompt.get({
      name: 'key',
      description: `Which key you want to pick?\n${multi && '(type !b to back)\n'}(type !q to exit)`,
      type: 'string',
      required: true
    }, async (err, result) => {
      if (err || result.key === '!q') {
        prompt.stop();
        return;
      }
      if (multi && result.key === '!b') {
        multi();
        return;
      }
      let res = false
      try {
        res = await transHelper.handleTablePickRow(sheet.data, result.key, includeKey);
      } catch (error) {
        console.error('Pick row error: ', error);
      }
      res ? console.log('Success! auto copy to clipboard') : console.error(`Fail! cannot find key ${result.key}`);
      executePickRow(sheet, multi);
    });
  }
  if (sheets.length === 1) {
    const pickSheet = sheets[0];
    prompt.start();
    executePickRow(pickSheet);
  } else {
    let pickSheet = sheets[0];
    const pickSheetCommand = {
      name: 'sheetName',
      description: 'There are more than 1 sheets in the file, which one (sheet name) do you wanna pick?\n(type !l to list those sheet names)\n(type !q to exit)',
      message: 'Please confirm the sheet name',
      require: true,
      conform: sheetName => {
        if (sheetName === '!l') {
          sheets.forEach(sheet => {
            console.log(sheet.name);
          });
          prompt.get(pickSheetCommand);
          return true;
        }
        if (sheetName === '!q') {
          prompt.stop();
          return true;
        }
        pickSheet = sheets.find(sheet => sheet.name === sheetName);
        if (isEmpty(pickSheet)) return false;
        executePickRow(pickSheet, () => { prompt.get(pickSheetCommand) });
        return true;
      }
    }
    prompt.get(pickSheetCommand);
    prompt.start();
  }
}

const handleSetKeymap = () => {
  prompt.get([
    {
      name: 'name',
      description: 'Creat a new keymap, please input keymap name',
      type: 'string',
      required: true
    },
    {
      name: 'content',
      description: 'Please input keymap key-value({KEY_IN_EXCEL}={OUTPUT_JSON_KEY} and split with "," or blank) example: ENG=en,CHS=zh or ENG=en CHS=zh',
      type: 'string',
      required: true
    },
    {
      name: 'autouse',
      description: 'Set this keymap as cli default keymap(yY/nN)?',
      type: 'string',
      required: true
    }
  ], (err, result) => {
    if (err) return;
    let keymap = {}
    try {
      keymap = parseKeymapString2Object(result.content);
    } catch (error) {
      console.error(cError('Parse keymap content error, please check'));
      return;
    }
    keymapHelper.generateKeymap(
      result.name,
      keymap,
      result.autouse === 'y' || result.autouse === 'Y',
      {
        success: () => {
          console.log(cSuccess(`Set keymap ${result.name} success!`));
          console.log(jsonColorize(keymap));
        }
      }
    );
  })
}

const handleUpdateKeymap = () => {
  prompt.get([
    {
      name: 'name',
      description: 'Update keymap key-value by name',
      type: 'string',
      required: true
    },
    {
      name: 'content',
      description: 'Please input keymap content({KEY_IN_EXCEL}={OUTPUT_JSON_NAME} and split with "," or blank) eg: ENG=en,CHS=zh or ENG=en CHS=zh',
      type: 'string',
      required: true
    }
  ], (err, result) => {
    if (err) return;
    let keymap = {}
    try {
      keymap = parseKeymapString2Object(result.content);
    } catch (error) {
      console.error(cError('Parse keymap key-value error, please check'));
      return;
    }
    keymapHelper.updateKeymap(result.name, keymap, {
      success: (mergedKeymap) => {
        console.log(`Update keymap ${result.name} success!`);
        console.log(jsonColorize(mergedKeymap));
      }
    });
  })
}

init();

program
  .name('lang-util')
  .description('CLI to trans xlsx file to json files')
  .version(pkg.version)

const keymap = program.command('keymap')
keymap.command('use')
  .argument('<name>', 'Use a keymap file')
  .description('Use a keymap file')
  .action((name) => {
    const success = keymapHelper.useKeymap(name);
    if (success) console.log(cSuccess(`use keymap '${name}' success!`));
  })

keymap.command('list', { isDefault: true })
  .description('List keymap files')
  .action(() => {
    const keymaps = keymapHelper.readKeymapList();
    console.log('\n' + keymaps.map(name => {
      if (name === cliConfigs.useKeymap) return `${tSuccess(name)} <--`;
      return name
    }).join('\n'));
  })

keymap.command('set')
  .description('Set a new keymap')
  .action(() => {
    handleSetKeymap();
  })

keymap.command('update')
  .description('Update a keymap key-value')
  .action(() => {
    handleUpdateKeymap();
  })

keymap.command('print')
  .argument('<name>', 'Print a keymap key-value by name, default is current keymap')
  .description('Print keymap key-value')
  .action((name) => {
    const keymap = keymapHelper.readKeymap(name);
    console.log('keymap name: ', tSuccess(name || 'default'), '\n');
    console.log(jsonColorize(keymap));
  })

keymap.command('delete')
  .argument('<name>', 'Delete a keymap file')
  .description('Delete a keymap file')
  .action((name) => {
    const success = keymapHelper.deleteKeymap(name);
    if (success) console.log(cSuccess(`Delete keymap '${name}' success!`));
  })

program
  .command('trans')
  .description('Trans a xlsx file to json files')
  .argument('filename <string>', 'filename which you want to trans')
  .option('-f, --flat', 'Flat the key, not set will use the tree structure mode will parsed with "." as separator')
  .option('-o, --output <string>', 'Path where to save, default is current path')
  .option('-p, --placeholder <string>', 'When meet empty content, default is delete the empty content row, if placeholder is settled, it will use placeholder instead the empty content')
  .option('-u, --use <string>', 'Use a special keymap')
  .action((filename, options) => {
    console.log('options', options);
    handleTransInputFile(filename, options.output || cwd, options);
  });

program
  .command('pick')
  .description('Pick a row from the xlsx file and auto copy to clipboard, its easy to copy rows to another xlsx files')
  .argument('filename <string>', 'filename which you want to pick')
  .option('-k, --key', 'Result include key column ?')
  .action((filename, options) => {
    handlePickInputFile(filename, options.key)
  })

program.parse();
