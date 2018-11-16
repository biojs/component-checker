var request = require('request');

var config = {
  cdn: "cdn.jsdelivr.net/gh",
  travis: "https://api.travis-ci.org/repo/"
}

//pass/fail test results are added to this object
var results = {
  warnings: []
};

var allChecks = [];

var checks = {
  //list all checks here, they'll be executed sequentially.
  hasReadme: function(settings) {
    return checkForFile(settings, ["README.md", "README"], 'hasReadme');
  },
  hasSnippets: function(settings) {
    packageJsonChecks.checkForSnippets(settings);
  },
  hasBuiltDistFiles: function(settings) {
    packageJsonChecks.checkForBuiltCSSandJS(settings);
  },
  hasCI: function(settings) {
    return ci.checkCI(settings);
  }
  // TO CHECK FOR:
  // galaxy config (whatever this means)
  // UI events
}

var ci = {
  checkCI: function(settings) {
    //theoretically we can add other CIs, too.
    var ciPromise = new Promise(function(resolve, reject) {
      ci.checkTravis(settings).then(function() {
        resolve(true);
      });
    });
    return ciPromise;
  },
  checkTravis: function(settings) {
    var travis = new Promise(function(resolve, reject) {
      packageJsonChecks.getPackageJson(settings).then(function() {
        //get git repo url. //TODO if not present, try using settings.url.
        var slug = getRepoSlug(settings.url);
        var requestOptions = {
          url: config.travis + encodeURIComponent(slug) + "/builds?limit=1",
          headers: {
            "Travis-API-Version": 3
          }
        }
        request(requestOptions, function(error, response, body) {
          if (response.statusCode == 200) {
            results["travis"] = {
              present: true,
              state: JSON.parse(response.body).builds[0].state
            }
            resolve(response);
          } else {
            console.log("Failed to find travis");
            resolve(false);
          }
        })
      });
    });
    return travis;
  }
};

var packageJsonChecks = {
  packageJson: null,
  checkForSnippets: function(settings) {
    packageJsonChecks.getPackageJson(settings).then(function(packageJson) {
      results["hasSnippets"] = false;
      if (packageJson.sniper) {
        if (packageJson.sniper.snippets) {
          results["hasSnippets"] = true;
        }
      }
    });
  },
  checkForBuiltCSSandJS: function(settings) {
    return new Promise(function(resolve) {
      packageJsonChecks.getPackageJson(settings).then(function(packageJson) {
        results["hasBuiltDistFiles"] = false;
        if (packageJson.sniper) {
          //I see you thinking "this should be refactored" but seriously, unless we
          // have more than two deprecated options that would be overengineering.
          if (packageJson.sniper.js) {
            results["warnings"].push("The sniper 'js' property is deprecated. Please use 'buildJS' instead - https://edu.biojs.net/details/package_json/");
          }
          if (packageJson.sniper.css) {
            results["warnings"].push("The sniper 'css' property . Please use 'buildCSS' instead - https://edu.biojs.net/details/package_json/");
          }
          if (packageJson.sniper.buildCSS && packageJson.sniper.buildJS) {
            results["hasBuiltDistFiles"] = true;
          }
        }
        resolve();
      });
    });
  },
  getPackageJson: function(settings) {
    return new Promise(function(resolve, reject) {
      var url = settings.url;
      if (packageJsonChecks.packageJson) {
        resolve(packageJsonChecks.packageJson);
      } else {
        if (isGitHub(url)) {
          fileToGet = convertGitHubToCDN(url);
        }
        fetchFile(fileToGet, "package.json").then(function(res) {
          packageJsonChecks.packageJson = JSON.parse(res.body);
          resolve(packageJsonChecks.packageJson);
        });
      }
    });
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
    runningChecks.push(checks[checkName](settings));
  });
  return Promise.all(runningChecks);
}

/**
 * Checks for a given file and sets the results property to true if it exists
 * @param settings {object} see example.settings.js for options.
 * @param fileNames {array} file names to check for, eg. "README.md"
 * @param checkName {string} the name of the property to set once the check is complete
 **/
function checkForFile(settings, fileNames, checkName) {
  return new Promise(function(resolve) {
    if (settings.url) {
      console.log("|- checking", checkName);
      checkForFileWeb(settings.url, fileNames, checkName).then(resolve);
    } else {
      //TODO LOCAL file access.
      resolve(true);
    }
  });
}

function checkForFileWeb(url, fileNames, checkName, currentFile) {
  var fileToGet = url;
  var currentFile = currentFile || 0;
  return new Promise(function(resolve) {
    if (isGitHub(url)) {
      fileToGet = convertGitHubToCDN(url);
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
            resolve();
          }
        });
    }
  });
}

/**

**/
function fetchFile(filePath, fileName) {
  var theFile = new Promise(function(resolve, reject) {
    try {
      request(filePath + "/" + fileName, function(error, response, body) {
        if (response.statusCode == 200) {
          console.log("|---Found " + fileName);
          resolve(response);
        } else {
          console.log("|-x-Failed to find " + fileName);
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

function getRepoSlug(url) {
  //this will fail interestingly on urls that aren't a github repo and/or have subpaths.
  var regex = "(?:https:\/\/github\.com\/)([A-Za-z-_\.]+\/[A-Za-z-_\.]+)";
  return url.match(regex)[1];
}

/**
 * Given a GitHub repo HTTPS URL, we'll convert it to URL we can GET the file from
 * @param url {string} a GitHub HTTPS url
 * @returns {string} the same URL converted to a url where a file from the repo is served
 **/
function convertGitHubToCDN(url) {
  //https://cdn.jsdelivr.net/gh/jquery/jquery/
  //todo, work with gitlab, npm - probably a simple regex?
  return url.replace("github.com", config.cdn);
}


(function main() {
  //check if this is a node script and execute with the args.
  if (process) {
    var settings = JSON.parse(process.argv[2]);
    checkComponent(settings).then(function(){
      console.log("|========= Check results:");
      console.log(results);
    });
  }
})();
