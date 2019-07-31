#!/usr/bin/env node

const axios = require('axios');
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

const {readFiles} = require('./fileReader');

const stockFolder = `${homedir}/.stock/`;
const stockConfigFilePath = `${homedir}/.stock/config.json`;
const temporaryFolder = 'temp';
const archiveSuffix = '/archive/master.zip';
const archiveName = 'stock2-master.zip';

marked.setOptions({
    renderer: new TerminalRenderer()
});

let stockContent = '';
let config;


const downloadRepo = async (githubUrl, token) => {
    try {
        if (!fs.existsSync(stockFolder)) {
            fs.mkdirSync(stockFolder)
        }
        if (!fs.existsSync(stockFolder + temporaryFolder + '/')) {
            fs.mkdirSync(stockFolder + temporaryFolder + '/')
        }
    } catch (err) {
        console.log(err);
    }

    await axios({
        method: "get",
        url:`${githubUrl}` + archiveSuffix,
        responseType: "stream",
        headers: {
            "Authorization": 'token ' + `${token}`
        },
        async: true
    }).then((response) => {
        const tmpZipStream = fs.createWriteStream(stockFolder + temporaryFolder + '/' + archiveName);
        response.data.pipe(tmpZipStream);
        tmpZipStream.on('close', async () => {
            var zip;
            try {
                console.log('Unzip')
                zip = new AdmZip(stockFolder + temporaryFolder + '/' + archiveName);
                await zip.extractAllTo(stockFolder, true);
                console.log('Deleting folder');
                await rimraf.sync(stockFolder + temporaryFolder + '/');
            } catch (e) {
                console.log('Can not create zip, bad data', e);
            }
            console.log('end unzip');
        });
        console.log('end');
    });

};

const readStockContent = async () => {
    const stockPath = `${stockFolder}` + "stock2-master";

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
        await downloadRepo(config.repoUrl, config.token);
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

    clear();

    console.log(
        chalk.yellow(
            figlet.textSync('Store_util', {horizontalLayout: 'full'})
        )
    );

    if (!isRepoExists) {
        const askRepo = prompt({infinite: false});
        const askPrivate = prompt({infinite: false});
        const askToken = prompt({infinite: false});
        const askIsPrivate = definitions.question.clone({
            key: 'isPrivateRepo',
            parameters: [chalk.yellow(
                'Is your repository private?: (Type "y" if yes or "n" if no) '
            )],
            infinite: false,
            required: true,
            repeat: false,
            message: '%s',
            restore: false
        });

        const askForToken = definitions.question.clone({
            key: 'token',
            parameters: [chalk.yellow(
                'Type your personal authorization token: '
            )],
            infinite: false,
            required: true,
            repeat: false,
            message: '%s',
            restore: false
        });

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
            askPrivate.run([askIsPrivate], async (err, res) => {
                if (err) {
                    reject(err);
                }
                if (res && res.map) {
                    const {isPrivateRepo} = res.map;
                    if (isPrivateRepo == 'y') {
                        askRepo.run([githubRepoAsk], async (err, res) => {
                            if (err) {
                                reject(err);
                            }
                            if (res && res.map) {
                                const {githubUrl} = res.map;
                                askToken.run([askForToken], async (err, res) => {
                                    if (err) {
                                        reject(err);
                                    }
                                    if (res && res.map) {
                                        const {token} = res.map;
                                        const status = new Spinner('Downloading stock repository...');

                                        status.start();
                                        const downloading = await new Promise(async (resolve, reject) => {
                                            await downloadRepo(githubUrl, token);
                                            resolve();
                                        });
                                        status.stop();


                                        await readStockContent();


                                        if (!isConfigExists) {
                                            config = {
                                                repoUrl: githubUrl,
                                                token: token
                                            };
                                            fs.writeFileSync(stockConfigFilePath, JSON.stringify(config));
                                        }

                                        resolve();
                                    }
                                });
                            }
                        });


                    } else {
                        askRepo.run([githubRepoAsk], async (err, res) => {
                            if (err) {
                                reject(err);
                            }
                            if (res && res.map) {
                                const {githubUrl} = res.map;
                                const status = new Spinner('Downloading stock repository...\n');

                                status.start();
                                const downloading = await new Promise((resolve, reject) => {
                                    downloadRepo(githubUrl);
                                    resolve();
                                });
                                status.stop();


                                await  readStockContent();



                                if (!isConfigExists) {
                                    config = {
                                        repoUrl: githubUrl,
                                        token: null
                                    };
                                    fs.writeFileSync(stockConfigFilePath, JSON.stringify(config));
                                }

                                resolve();

                            }
                        });
                    }
                }
            });
        });

    }

    const ps = prompt({infinite: true});

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
        if (err) {
            console.error(err);
        }

        if (res && res.map) {
            const val = res.map.type;
            printMatches(val);
        }
    });
};

run();
