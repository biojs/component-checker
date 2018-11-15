var request = require('request');

//pass/fail test results are added to this object
var results = {
  warnings: []
};

var checks = {
  //list all checks here, they'll be executed sequentially.
  hasReadme: function(settings) {
    checkForFile(settings, ["README.md", "README"],'hasReadme');
  },
  hasSnippets: function(settings) {
    config.checkForSnippets(settings);
  },
  hasBuiltDistFiles: function(settings){
    config.checkForBuiltCSSandJS(settings);
  }
  // TO CHECK FOR:
  // - CI / tests
  // path to built file
  // galaxy config (whatever this means)
  // UI events
}

var config = {
  packageJson: null,
  checkForSnippets: function(settings) {
    config.getPackageJson(settings).then(function(packageJson) {
      results["hasSnippets"] = false;
      if (packageJson.sniper) {
        if (packageJson.sniper.snippets) {
            results["hasSnippets"] = true;
        }
      }
      console.log(results);
    });
  },
  checkForBuiltCSSandJS: function(settings, thisPromise) {
    config.getPackageJson(settings).then(function(packageJson) {
      results["hasBuiltDistFiles"] = false;
      if (packageJson.sniper) {
        //I see you thinking "this should be refactored" but seriously, unless we
        // have more than two deprecated options this would be overengineering.
        if (packageJson.sniper.js) {
            results["warnings"].push("sniper.js is deprecated. Please use buildJS instead - https://edu.biojs.net/details/package_json/");
        }
        if (packageJson.sniper.css) {
            results["warnings"].push("sniper.css is deprecated. Please use buildCSS instead - https://edu.biojs.net/details/package_json/");
        }
        if (packageJson.sniper.buildCSS && packageJson.sniper.buildJS) {
            results["hasBuiltDistFiles"] = true;
        }
      }
//      thisPromise.resolve(true);
      console.log(results);
    });
  },
  getPackageJson: function(settings) {
    var packageJsonPromise = new Promise(function(resolve, reject) {

        var url = settings.url;
        if (config.packageJson) {
          resolve(config.packageJson);
        } else {
          if (isGitHub(url)) {
            fileToGet = convertGitHubToJsDelivr(url);
          }
          fetchFile(fileToGet, "package.json").then(function(res) {
            config.packageJson = JSON.parse(res.body);
            resolve(config.packageJson);
          });
        }
    });
    return packageJsonPromise;
  }
}

/**
 * Master function - pass a repo url to this function and it'll run all quality
 * checks on the repo.
 * @param settings {object} a url for the repo to check. syntax {"url" : "someURL"}
 **/
function checkComponent(settings) {
  var runningChecks = [];
  Object.keys(checks).map(function(checkName) {
    checks[checkName](settings);
  });
  //TODO - process all promises and return the results object
}

/**
 * Checks for a given file and sets the results property to true if it exists
 * @param settings {object} see example.settings.js for options.
 * @param fileNames {array} file names to check for, eg. "README.md"
 * @param checkName {string} the name of the property to set once the check is complete
 **/
function checkForFile(settings, fileNames, checkName) {
  if (settings.url) {
    console.log("checking",checkName);

    checkForFileWeb(settings.url, fileNames, checkName);
  } else {
    //TODO LOCAL file access.
    return "TODO";
  }
}

function checkForFileWeb(url, fileNames, checkName, currentFile) {
  var fileToGet = url;
  var currentFile = currentFile || 0;
  if (isGitHub(url)) {
    fileToGet = convertGitHubToJsDelivr(url);
    fetchFile(fileToGet, fileNames[currentFile])
      .then(function(response) {
        if (!response) {
          //are there any more files to check for?
          var nextFileIndex = currentFile + 1
          if (fileNames.length > nextFileIndex) {
            checkForFileWeb(url, fileNames, checkName, nextFileIndex);
          }
          results[checkName] = false;
        } else {
          results[checkName] = true;
        }
      });
  }
}

/**

**/
function fetchFile(filePath, fileName) {
  var theFile = new Promise(function(resolve, reject) {
    try {
        request(filePath + "/" + fileName, function(error, response, body) {
        if (response.statusCode == 200) {
          console.log("Found " + fileName);
          resolve(response);
        } else {
          console.log("Failed to find " + fileName);
          resolve(false);
        }
      })
    } catch (e) {
      console.log(e);
    }
  });
  return theFile;
}

/**
 * A github repo url is reasonable to provide, but needs to be modified if we want to GET files to check for their existence (need to add branch, can't GET a file directly from the webui). This checks if we need to do anything funky to the URL or not.
 * @param url {string} a url. Any URL.
 * @returns {boolean} whether or not this is a github repo url.
 **/
function isGitHub(url) {
  return url.indexOf("https://github.com") == 0;
}

/**
 * Given a GitHub repo HTTPS URL, we'll convert it to URL we can GET the file from
 * @param url {string} a GitHub HTTPS url
 * @returns {string} the same URL converted to a url where a file from the repo is served
 **/
function convertGitHubToJsDelivr(url) {
  //https://cdn.jsdelivr.net/gh/jquery/jquery/
  return url.replace("github.com", "cdn.jsdelivr.net/gh");
}

(function main() {
  //check if this is a node script and execute with the args.
  if (process) {
    var settings = JSON.parse(process.argv[2]);
    console.log("Using settings: ", settings.url);
    checkComponent(settings);
  }
})();
