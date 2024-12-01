import chalk from "chalk";
export const getFileNameFromPath = (filePath) => {
  const fileName = filePath.split('\\').pop().split('/').pop();
  return fileName.split('.').shift();
}

export const cError = (error) => {
  return `${chalk.bgRed('Error')}: ${error}`
}

export const cSuccess = (success) => {
  return `${chalk.bgGreen('Success')}: ${success}`
}

export const cWarning = (warning) => {
  return `${chalk.bgYellow('Warning')}: ${warning}`
}

export const tSuccess = (text) => {
  return chalk.green(text);
}

export const tError = (text) => {
  return chalk.red(text);
}

export const tWarning = (text) => {
  return chalk.yellow(text);
}

export const parseKeymapString2Object = (inputString) => {
  if (!inputString || typeof inputString !== 'string') {
    throw new Error('Invalid input string');
  }

  const result = {};
  const pairs = inputString.split(/,|\s/);
  for (const pair of pairs) {
    if (pair.trim() === '') {
      continue;
    }
    const [key, value] = pair.split('=');
    if (!key || !value) {
      throw new Error('Invalid key-value pair');
    }
    result[key.trim()] = value.trim();
  }
  return result;
}
