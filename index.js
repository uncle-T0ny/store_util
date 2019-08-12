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
const archiveNameSuffix = '-master.zip';
const folderNameSuffix = '-master';
const githubNativeUrl = 'https://github.com/';

marked.setOptions({
    renderer: new TerminalRenderer()
});

let stockContent = '';
let config;

const initFolders = () => {
    if (!fs.existsSync(stockFolder)) {
        fs.mkdirSync(stockFolder)
    }
    if (!fs.existsSync(stockFolder + temporaryFolder + '/')) {
        fs.mkdirSync(stockFolder + temporaryFolder + '/')
    }
}

const sendRequest = async (githubUrl, token) => {
    let fullUrl = `${githubUrl}${archiveSuffix}`;
    console.log(`Current repo URL: ${fullUrl}`);

    if (token) {
        console.log('Token is:' + `token ${token}`);
        return axios({
            method: 'get',
            url: fullUrl,
            responseType: 'stream',
            headers: {
                'Authorization': `token ${token}`
            }
        });
    }
    return axios({
        method: 'get',
        url: fullUrl,
        responseType: 'stream'
    });
}

const downloadRepo = async (githubUrl, token, archiveName) => {
    let archivePath = `${stockFolder}${temporaryFolder}/${archiveName}${archiveNameSuffix}`;
    console.log(`Archive path is : ${archivePath}`);
    let tmpZipStream = fs.createWriteStream(archivePath);
    const response = await sendRequest(githubUrl, token);
    response.data.pipe(tmpZipStream);
    return new Promise((resolve, reject) => {
        tmpZipStream.on('finish', async () => {
            resolve();
        })
    });
}

const unzip = async (archiveName) => {
    const zipPath = `${stockFolder}${temporaryFolder}/${archiveName}${archiveNameSuffix}`;
    console.log(`Zip archive: ${zipPath}`);
    const zip = new AdmZip(zipPath);
    await zip.extractAllTo(stockFolder, true);
    await rimraf.sync(`${stockFolder}${temporaryFolder}/`);
}

const getRepositoryFromGit = async (githubUrl, token, archiveName) => {
    initFolders();
    await downloadRepo(githubUrl, token, archiveName);
    await unzip(archiveName);
}

const readStockContent = async (archiveName) => {
    const stockPath = `${stockFolder}${archiveName}${folderNameSuffix}`;
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

const getConfig = function (isConfigExists) {
    if (!isConfigExists) {
        console.log(`Config folder not found.`);
        process.exit();
    } else {
        config = JSON.parse(fs.readFileSync(stockConfigFilePath));
    }
}

const run = async () => {

    const isRepoExists = fs.existsSync(stockFolder);
    const isConfigExists = fs.existsSync(stockFolder);
    const isUpdateRepo = argv.update;

    if (isUpdateRepo && isRepoExists) {
        const status = new Spinner('Updating stock repository...');

        getConfig(isConfigExists);
        const archiveName = getArchiveName(config.repoUrl);
        status.start();
        await getRepositoryFromGit(config.repoUrl, config.token, archiveName);
        status.stop();
    }

    if (isRepoExists) {
        getConfig(isConfigExists);
        await readStockContent(getArchiveName(config.repoUrl));
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
        const ask = prompt({infinite: false});
        const gitQuestions = initBasicQuestions();


        await new Promise((resolve, reject) => {
            ask.run(gitQuestions, async (err, res) => {
                if (err) {
                    reject();
                }
                const {githubUrl} = res.map;
                const {isPrivate} = res.map;

                try {
                    if (isPrivate == 'y') {
                        await downloadPrivateRepository(resolve, reject, githubUrl, isConfigExists, ask);
                    } else {
                        await downloadAndSave(githubUrl, null, isConfigExists);
                        resolve();
                    }
                } catch (e) {
                    console.log('Error:' + e);
                    process.exit();
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

const downloadPrivateRepository = async (resolve, reject, githubUrl, isConfigExists, ask) => {
    const askToken = initTokenQuestion();
    ask.run([askToken], async (err, res) => {
        if (err) {
            reject();
        }
        if (res && res.map) {
            const {token} = res.map;
            await downloadAndSave(githubUrl, token, isConfigExists);
            resolve();
        }
    });
}

const downloadAndSave = async (url, token, isConfigExists) => {
    const status = new Spinner('Downloading stock repository...\n');
    const archiveName = getArchiveName(url);
    status.start();
    await getRepositoryFromGit(url, token, archiveName);
    status.stop();

    await readStockContent(archiveName);

    if (!isConfigExists) {
        config = {
            repoUrl: url,
            token: token
        };
        fs.writeFileSync(stockConfigFilePath, JSON.stringify(config));
    }
}

const getArchiveName = function (githubUrl) {
    return githubUrl.replace(githubNativeUrl).replace(/[^/]*/, "").replace(/[/]/, "");
}

const initBasicQuestions = function () {
    return [
        definitions.question.clone(
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
        ),
        definitions.question.clone({
            key: 'isPrivate',
            parameters: [chalk.yellow(
                'Is your repository private?: (Type "y" if yes or "n" if no) '
            )],
            choices: ['y', 'n'],
            infinite: false,
            required: true,
            repeat: false,
            message: '%s',
            restore: false,
            type: 'checkbox'
        })
    ];
}

const initTokenQuestion = function () {
    return definitions.question.clone({
        key: 'token',
        parameters: [chalk.yellow(
            'Type your personal authorization token: '
        )],
        infinite: false,
        required: true,
        repeat: false,
        message: '%s',
        restore: false
    })
}

run();

