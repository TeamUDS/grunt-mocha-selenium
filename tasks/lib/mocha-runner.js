var Mocha = require('mocha');
var Module = require('module');
var path = require('path');

require('mocha-as-promised')();

module.exports = function(options, browser, grunt, wd, fileGroup){

  // Set up the mocha instance with options and files.
  // This is copied from Mocha.prototype.run
  // We need to do this because we need the runner, and the runner
  //  is only held in that closure, not assigned to any instance properties.
  var mochaAsPromised = require("mocha-as-promised");
  var mocha = new Mocha(options);
  var browserName = 'Unknown';
  var testFile = 'Unknown File';
  var screenshotNumber = 0;

  mocha.suite.on('pre-require', function (context, file, m) {
    browser.setImplicitWaitTimeout(options.implicitWaitTimeout || 100);
    browser.setAsyncScriptTimeout(options.asyncScriptTimeout || 5000);
    browser.sessionCapabilities().then(function(c) { 
        browserName = c.browserName;
    });
    screenshotNumber = 0;

    this.ctx.browser = browser;
    this.ctx.Asserter = wd.Asserter;
    this.ctx.asserters = wd.asserters; 
    this.ctx.KEYS = wd.SPECIAL_KEYS;
    this.ctx.Q = wd.Q;
    this.ctx.wd = wd;
  });

  if (options.screenshotAfterEach && options.screenshotDir) {
      if (!grunt.file.exists(options.screenshotDir)) {
          grunt.file.mkdir(options.screenshotDir);
      }

      mocha.suite.afterEach(function() {
         var number = screenshotNumber++;
         var filename = [
             testFile, 
             ((number + '').length === 1 ? '0' : '') + ('' + number),
             this.currentTest.title.replace(/[^a-zA-Z0-9 ]+/g, '').replace(/(^\s*|\s*$)/g, '').replace(/\s+/g, '_').substring(0, 200),
             browserName
         ].join('-');
         return browser.saveScreenshot(options.screenshotDir + '/' + filename.substring(0,250) + ".png")
      });
  }

  grunt.file.expand({filter: 'isFile'}, fileGroup.src).forEach(function (f) {
    var filePath = path.resolve(f);
    if (Module._cache[filePath]) {
      delete Module._cache[filePath];
    }
    mocha.addFile(filePath);
  });

  if (mocha.files.length){
    mocha.loadFiles();
  }

  var suite = mocha.suite;
  options = mocha.options;
  var runner = new Mocha.Runner(suite);
  var reporter = new mocha._reporter(runner);

  runner.on('suite', function(suite){
      testFile = suite.title;
      screenshotNumber = 0;
  });
  
  runner.ignoreLeaks = options.ignoreLeaks;
  runner.asyncOnly = options.asyncOnly;

  if (options.grep) runner.grep(options.grep, options.invert);
  if (options.globals) runner.globals(options.globals);
  if (options.growl) mocha._growl(runner, reporter);
  // Sigh.

  return runner;
};
