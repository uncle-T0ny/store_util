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

const { readFiles } = require('./fileReader');

const stockFolder = '/tmp/stock/';
const temporaryFolder = 'temp';

marked.setOptions({
  renderer: new TerminalRenderer()
});

let stockContent = '';

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

const run = async () => {
  clear();

  console.log(
    chalk.yellow(
      figlet.textSync('Store_util', { horizontalLayout: 'full' })
    )
  );

  const isRepoExists = fs.existsSync(stockFolder);
  const isUpdateRepo = argv.update;

  if (isUpdateRepo && isRepoExists) {
    const status = new Spinner('Updating stock repository...');

    status.start();
    await downloadRepo('https://github.com/uncle-T0ny/stock2');
    status.stop();
  }

  if (isRepoExists) {
    await readStockContent();
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
      const idx = stockContent.indexOf(`[tags]: <> (${val}`);
      const endIdx = stockContent.substr(idx, stockContent.length).indexOf('[tags-end]');
      console.log(`${marked(stockContent.substr(idx, endIdx))}`);
    }
  });
};

run();
