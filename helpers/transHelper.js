import clipboard from 'clipboardy';
import lodash from 'lodash';

const { isEmpty, defaultsDeep, cloneDeep, tail } = lodash;

class TransHelper {
  constructor(program) {
    this.program = program;
  }

  async handleTableTrans2Object(table, callback, options = {}) {
    if (isEmpty(table)) return null;

    const keyRow = table[0];
    if (isEmpty(keyRow) || keyRow[0].toLowerCase() !== 'key') {
      this.program.error('Exit: must have key column');
      return null;
    }
    if (table.length <= 1 || keyRow.length <= 1) {
      this.program.error('Exit: table length <= 1 || key row length <= 1');
      return null;
    }

    let langTree = {};
    const parsedKeyArr = [];
    // 扫描key列, 生成langTree
    for (let i = 1; i < table.length; i++) {
      const keyStr = table[i][0];
      if (!keyStr) {
        console.warn(`Empty key name at row: ${i}, please checkout your excel file`);
        continue;
      };
      if (keyStr.indexOf('.') < 0 || options.flat) {
        // 如果key不包含.，或者是flat模式
        langTree[keyStr] = i;
      } else if (keyStr.indexOf('.') === 0) {
        // 层级模式下，如果key的第一个字符是'.'，不合法
        console.warn(`Illegal key name at row: ${i}, key: ${keyStr}`);
        continue;
      } else {
        const keyArr = keyStr.split('.');
        let point = keyArr.length - 1;
        let temp = {};
        while (point >= 0) {
          if (point == keyArr.length - 1) {
            temp = { [keyArr[point]]: i }
          } else {
            temp = { [keyArr[point]]: temp }
          }
          point--;
        }
        parsedKeyArr.push(temp);
        langTree = defaultsDeep(langTree, ...parsedKeyArr);
      }
    }

    const fillLangTree = (tree, col) => {
      for (let key in tree) {
        const row = tree[key];
        if (typeof row !== 'object') {
          if (table[row][col]) {
            tree[key] = table[row][col]
          } else {
            if(options.placeholder) {
              tree[key] = options.placeholder || null
            } else {
              delete tree[key];
            }
          }
        } else {
          fillLangTree(row, col);
        }
      }
    }

    // 扫描列
    for (let col = 1; col < keyRow.length; col++) {
      const langTreeCopy = cloneDeep(langTree);
      fillLangTree(langTreeCopy, col);
      try {
        await callback(keyRow[col], langTreeCopy);
      } catch (error) {
        continue;
      }
    }
    return;
  }


  handleTablePickRow(table, key, includeKey) {
    return new Promise((resolve, reject) => {
      if (key.startsWith('/')) {
        // 判断是否是正则表达式
        let regstr = '';
        let regOpt = '';
        if (key.endsWith('/')) {
          regstr = key.slice(1, key.length - 1)
        } else if (key.endsWith('/g') || key.endsWith('/i')) {
          regstr = key.slice(1, key.length - 2);
          regOpt = key.slice(key.length - 1, key.length);
        } else {
          reject(new Error('Regex error: Incorrect RegExp'));
          return;
        }
        const inputReg = new RegExp(regstr, regOpt);
        const foundArr = [];
        table.forEach((row, index) => {
          const rowKey = row[0];
          if (inputReg.test(rowKey)) {
            console.log(`Found ${rowKey} in No.${index + 1} row`);
            foundArr.push(includeKey ? row.join('	') : tail(row).join('	'));
          }
        });
        if (isEmpty(foundArr)) {
          reject(new Error(`Cannot find any keys`));
          return;
        }
        const foundStr = foundArr.join('\n');
        clipboard.writeSync(foundStr);
        resolve(true);
      } else {
        let foundStr = ''
        const found = table.some((row, index) => {
          const rowKey = row[0];
          if (rowKey === key) {
            console.log(`Found key ${rowKey} in No.${index + 1} row`);
            foundStr = includeKey ? row.join('	') : tail(row).join('	');
            return true;
          }
          return false;
        });
        if (!found) {
          reject(new Error(`Cannot find key: ${rowKey} row`));
          return;
        }
        clipboard.writeSync(foundStr);
        resolve(found);
      }
    });
  }
}

export default TransHelper;
