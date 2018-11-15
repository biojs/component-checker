var request = require('request');

//pass/fail test results are added to this object
var results = {};

var checks = {
  //list all checks here, they'll be executed sequentially.
  hasReadme: function(settings) {
    checkForFile(settings, ["README.md", "README"], null, 'hasReadme');
  }
  // TO CHECK FOR:
  // - CI / tests
  // galaxy config (whatever this means)
  // UI events
  // snippets
}

/**
 * Master function - pass a repo url to this function and it'll run all quality
 * checks on the repo.
 * @param settings {object} a url for the repo to check. syntax {"url" : "someURL"}
 **/
function checkComponent(settings) {
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
    fileToGet = fullGitHubUrl(url);
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
      request(filePath + "/" + fileName)
        .on("response", function(response) {
          if (response.statusCode == 200) {
            console.log("Found " + fileName);
            resolve(response);
          } else {
            console.log("Failed to find " + fileName);
            resolve(false);
          }
        });
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
function convertGitHubToRaw(url) {
  //https://raw.githubusercontent.com/wilzbach/msa/master/README.md
  return url.replace("github.com", "raw.githubusercontent.com");
}

/**
 * in order to GET a file, you'll need a commit hash or branch. For now, we'll assume master must have the files for it to pass the quality check.
 * @param url {string} a GitHub HTTPS url
 * @returns {string} the same URL with a branch name appended (master)
 **/
function fullGitHubUrl(url) {
  return newUrl = convertGitHubToRaw(url) + "/master";
}

(function main() {
  //check if this is a node script and execute with the args.
  if (process) {
    var settings = JSON.parse(process.argv[2]);
    console.log("Using settings: ", settings.url);
    checkComponent(settings);
  }
})();
