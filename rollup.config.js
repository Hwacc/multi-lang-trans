/*
 * @Author: razer.hua
 * @Date: 2023-02-16 17:17:14
 * @Description: 
 */
import json from "@rollup/plugin-json";

export default {
  input: 'index.js',
  output: {
    file: 'dist/index.js',
    format: 'esm',
    banner: '#!/usr/bin/env node'
  },
  plugins: [
    json()
  ]
}