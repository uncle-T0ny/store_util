const dir = require('node-dir');


module.exports = {
  readFiles: async (dirPath) => {
    return new Promise((resolve, reject) => {
      let resContent = '';
      dir.readFiles(dirPath,
        {
          match: /.md$/
        },
        (err, content, next) => {
          if (err) {
            reject(err);
          }
          resContent += content;
          next();
        },
        (err, files) => {
          if (err) {
            reject(err);
          }
          resolve(resContent);
        });
    });
  }
};
