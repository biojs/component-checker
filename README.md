# BioJS component quality checker

## Purpose
 This package iterates through desirable qualities in a BioJS component repo,
 checking what is present (or missing). Currently in very early stages - see todos below

## Usage

Right now, this is designed to be run on the command line.

1. Clone this repo
2. `cd component-checker`
3. `node index.js '{"url" : "https://github.com/my-org/my-biojs-repo"}'` where the value of the url arg points to your biojs component online. 

This will print the results to the console.

## TODOs

- parse local files (for dev users on local systems)
- understand git:// repo urls
- work with node package urls
- modularise these files and export vars properly.
- add all checks listed above in index.js as comments
- generate docs
- return results rather than printing to console
