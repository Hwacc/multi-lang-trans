## 多语言转换工具 v1.0.3

一个基于nodejs将多语言xlsx文件转换为json文件的cli工具

> Node.js >= 16

### HOW TO USE

clone后执行:

`npm install -g`

在 cmd命令行中执行:

`lang --version` 或 `lang -V`

查看是否安装成功

### 功能1. 转换json文件

cd 到 xlsx 文件所在目录后执行

`lang trans <filname> --output [output path]` 或 `lang trans <filename> -o [output path]`

`<filename>` ----> xlsx文件名

`[output path]` ----> 输出路径(相对或绝对路径), 默认为当前目录

更多功能参考 `lang trans --help`

> **Upgrade v1.0.2**

现在 `trans`命令支持多张表,  每张表的名字对应生成i18n的namespace,  生成的文件结构符合i18next namespace 要求:

具体参考: [i18n namespace](https://www.i18next.com/principles/namespaces)

> **Upgrade: v1.0.3**

增加 keymap 功能, 可以使用 `lang keymap` 命令来管理本地记录的多张keymap映射文件，处理更多不用项目的多语言文件转换需求

具体使用参考： `lang keymap --help`

### 功能2. 选取翻译行

快速选取多语言xlsx文件中对应key的行数据, 方便复制到另一个xlsx中:

cd 到 xlsx文件所在目录后执行

`lang pick <filename>`

`<filename>` ----> xlsx文件名

后根据提示输入需要选取的key值, enter后会自动复制到剪切板上


> **Upgrade: v1.0.1**

现在 `pick` 命令支持正则表达式, 格式为:

`/your regexp/g,i`

正则表达式必须以 `/`开头并以  `/` 或  `/g` 或  `/i` 结尾

pick 命令可以加入参数 `--key` 或 `-k` 选择是否在选取结果中包含KEY字段列

`lang pick <filename> [--key || -k]`


> **Upgrade: v1.0.2**

现在 `pick` 命令支持在多个表下选择表, 具体命令可以参考cmd输出的提示


### 说明:

#### 转换格式

xlsx文件中,第一列为保留字段KEY列, 其他列可随意组合

| KEY   | ENG   | SPN  | ... |
| ----- | ----- | ---- | --- |
| hello | Hello | Hola | ... |

转换后,

in en.json :

```javascript
{
  "hello": "Hello"
}
```

in es.json:

```javascript
{
  "hello": "Hola"
}
```

支持多级KEY的转换, 其中以 `.` 为分隔符, 例如:

| KEY       | ENG   |
| --------- | ----- |
| a.b.hello | Hello |

转换后:

```javascript
{
  "a": { "b" : "Hello"}
}
```