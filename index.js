#!/usr/bin/env node

const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const inquirer = require('inquirer');
const CLI = require('clui');
const highlight = require('cli-highlight').highlight
const Spinner = CLI.Spinner;


const questions = [
  {
    name: 'word',
    type: 'input',
    message: 'Enter any word:',
    validate: function( value ) {
      if (value.length) {
        return true;
      } else {
        return 'Please enter any word.';
      }
    }
  }
];

const run = async () => {
  clear();

  console.log(
    chalk.yellow(
      figlet.textSync('Store_util', { horizontalLayout: 'full' })
    )
  );

  const prompt1 = await inquirer.prompt(questions);

  const status = new Spinner('Generating interaction...');

  status.start();

  await new Promise((resolve) => setTimeout(resolve, 2000));

  status.stop();

  console.log(
    chalk.yellow(
      figlet.textSync(prompt1.word, { horizontalLayout: 'full' })
    )
  );

  console.log(highlight(`
    function (a, b) {
      const result = a + b;
      return  result;
    }
  `, {language: 'javascript', ignoreIllegals: true}));
};

run();