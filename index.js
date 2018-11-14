var request = require('request');

//check for tests -> package json?
//  - check for passing
//  - check for CI?

//check for uievents

//results format - json

var results = {};



var checks = {
  //list checks here
  hasReadme: function(settings) {
    checkForFile(settings, ["README.md", "README"], null , 'hasReadme');
  }
  // TO CHECK FOR:
  // - CI / tests
  // galaxy config (whatever this means)
  // snippets
}

var checkComponent = function(settings) {

  //map through checks and run all.

}

// settings:
// {
//  dir : "/path/to/package"
//  url : "http://www.some.url/to/package"
// }

function checkForFile(settings, fileNames, currentFile, checkName) {
  var currentFile = currentFile || 0;

  if (settings.url) {
    var fileToGet = settings.url;
    if(isGitHub(settings.url)) {
      fileToGet = fullGitHubUrl(settings.url);
      fetchFile(fileToGet, fileNames[currentFile])
      .then(function(response){
        if (!response) {
          //are there any more files to check for?
          var nextFileIndex = currentFile + 1
          if(fileNames.length > nextFileIndex) {
            checkForFile(settings, fileNames, nextFileIndex, checkName);
          }
          results[checkName] = false;
        } else {
          results[checkName] = true;
        }
        console.log(results);

      })
    }

  } else {
    //TODO LOCAL file access.
    return "TODO";
  }
}

function fetchFile(filePath, fileName) {
  var theFile = new Promise(function(resolve, reject) {
      try {
        argh = request(filePath + "/" + fileName)
        .on("response", function(response) {
          console.log(response.body);
          console.log("Found " + fileName );
          if (response.statusCode == 200) {
            resolve(response);
          } else {
            resolve(false);
          }
        });
      } catch (e) {
        console.log(e);
      }
  });
  return theFile;
}

checks.hasReadme({
  url: "https://github.com/wilzbach/msa"
});


function isGitHub(url) {
  return url.indexOf("https://github.com") == 0;
}
function convertGitHubToRaw(url) {
  //https://raw.githubusercontent.com/wilzbach/msa/master/README.md
return url.replace("github.com","raw.githubusercontent.com");
}

function fullGitHubUrl(url) {
  return newUrl = convertGitHubToRaw(url) + "/master";
}

//tings to do:
// get files
// file exists
