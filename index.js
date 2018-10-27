#!/usr/bin/env node

const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const CLI = require('clui');
const figures = require('figures');
const Spinner = CLI.Spinner;
const marked = require('marked');
const TerminalRenderer = require('marked-terminal');
const download = require('download');
const fs = require('fs');
const rimraf = require('rimraf');
const argv = require('minimist')(process.argv.slice(2));
const AdmZip = require('adm-zip');
const prompt = require('cli-input');
const sets = prompt.sets;
const definitions = sets.definitions;
const homedir = require('os').homedir();

const { readFiles } = require('./fileReader');

const stockFolder = `${homedir}/.stock/`;
const stockConfigFilePath = `${homedir}/.stock/config.json`;
const temporaryFolder = 'temp';

marked.setOptions({
  renderer: new TerminalRenderer()
});

let stockContent = '';
let config;


const downloadRepo = async (githubUrl) => {
  const archiveUrl = `${githubUrl}/archive/master.zip`;
  const archiveName = githubUrl.split('/').pop();

  await download(archiveUrl, temporaryFolder);

  const archivePath = `${temporaryFolder}/${archiveName}-master.zip`;
  const zip = new AdmZip(archivePath);

  await zip.extractAllTo(stockFolder, true);

  // remove temporary folder
  await rimraf.sync(temporaryFolder);
};

const readStockContent = async () => {
  const repoName = 'stock2';
  const stockPath = `${stockFolder}${repoName}-master`;

  stockContent = await readFiles(stockPath);
};

const printMatches = (val) => {
  const regexp = new RegExp("\\[tags\\]: <> (.*" + val + ".*)", 'g');
  let match, matches = [];

  while ((match = regexp.exec(stockContent)) !== null) {
    matches.push(match.index);
  }

  matches.forEach((matchIdx) => {
    const endIdx = stockContent.substr(matchIdx, stockContent.length).indexOf('[tags-end]');
    console.log(`${marked(stockContent.substr(matchIdx, endIdx))}`)
  });
};

const run = async () => {
  clear();

  console.log(
    chalk.yellow(
      figlet.textSync('Store_util', { horizontalLayout: 'full' })
    )
  );

  const isRepoExists = fs.existsSync(stockFolder);
  const isConfigExists = fs.existsSync(stockFolder);
  const isUpdateRepo = argv.update;

  if (isUpdateRepo && isRepoExists) {
    const status = new Spinner('Updating stock repository...');

    if (!isConfigExists) {
      console.log(`Config folder not found.`);
      process.exit();
    } else {
      config = JSON.parse(fs.readFileSync(stockConfigFilePath));
    }

    status.start();
    await downloadRepo(config.repoUrl);
    status.stop();
  }

  if (isRepoExists) {
    await readStockContent();
  }

  // search notes by tags and exit
  const tags = argv._ ? argv._.join(' ') : '';
  if (tags) {
    printMatches(tags);
    process.exit();
  }

  if (!isRepoExists) {
    const askRepo = prompt({ infinite: false });
    const githubRepoAsk = definitions.question.clone(
      {
        key: 'githubUrl',
        parameters: [chalk.yellow(
          'Type github stock url: '
        )],
        infinite: false,
        required: true,
        repeat: false,
        message: '%s',
        restore: false
      }
    );

    await new Promise((resolve, reject) => {
      askRepo.run([githubRepoAsk], async (err, res) => {
        if (err) {
          reject(err);
        }

        if (res && res.map) {
          const { githubUrl } = res.map;

          const status = new Spinner('Downloading stock repository...');

          status.start();
          await downloadRepo(githubUrl);
          status.stop();

          await readStockContent();


          if (!isConfigExists) {
            config = {
              repoUrl: githubUrl
            };
            fs.writeFileSync(stockConfigFilePath, JSON.stringify(config));
          }

          resolve();
        }
      });
    });
  }

  const ps = prompt({ infinite: true });

  ps.run([definitions.question.clone(
    {
      key: 'type',
      parameters: [chalk.yellow(
        figures.pointer
      )],
      required: true,
      repeat: false,
      message: '%s',
      restore: false
    }
  )], (err, res) => {
    if(err) {
      console.error(err);
    }

    if(res && res.map) {
      const val = res.map.type;
      printMatches(val);
    }
  });
};

run();
