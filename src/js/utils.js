/**
 * @fileoverview Utils for ESLint HTML reporter
 * @author Evangelia Dendramis
 */
'use strict';

var TeamCityLogger = require('hairballs').TeamCityLogger;

var teamCityLogger = new TeamCityLogger('ESLint');

var errorOccurances = [];
var warningOccurances = [];

// summarize messages
var summary = {
  alerts: {
    errors: 0,
    warnings: 0,
    total: 0
  },
  files: {
    errors: 0,
    warnings: 0,
    clean: 0,
    total: 0
  },
  errorTypes: {}
};

/**
 * Sort files so the ones with the most errors are at the top
 * @param {object} a - Object to compare to b
 * @param {object} b - Object to compare to a
 * @returns {int} - Value used to sort the list of files
 */
exports.sortErrors = function(a, b) {
  if (b.errors === 0 && a.errors === 0) {
    if (b.warnings === 0 && a.warnings === 0) {
      if (a.path < b.path) {
        return -1;
      } else if (a.path > b.path) {
        return 1;
      } else {
        return 0;
      }
    } else {
      return (b.warnings - a.warnings);
    }
  } else {
    if (b.errors === a.errors) {
      return (b.warnings - a.warnings);
    } else {
      return (b.errors - a.errors);
    }
  }
};

exports.sortOccurances = function(a, b) {
  return b.count - a.count;
};

/**
 * Count the occurances of an error
 * @param {string} key - Linting rule
 * @returns {void}
 */
var addErrorOccurance = function(key) {

  var foundOccurance = false;

  for (var x = 0; x < errorOccurances.length; x++) {
    if (errorOccurances[x].name === key) {
      foundOccurance = true;
      errorOccurances[x].count++;
    }
  }

  if (!foundOccurance) {
    errorOccurances.push({ name: key, count: 1});
  }
};


/**
 * Count the occurances of a warning
 * @param {string} key - Linting rule
 * @returns {void}
 */
var addWarningOccurance = function(key) {

  var foundOccurance = false;

  for (var x = 0; x < warningOccurances.length; x++) {
    if (warningOccurances[x].name === key) {
      foundOccurance = true;
      warningOccurances[x].count++;
    }
  }

  if (!foundOccurance) {
    warningOccurances.push({ name: key, count: 1});
  }
};


/**
 * Summarize reported data
 * @param {object} results - Data to parse with Handlebars template
 * @param {boolean} fullReport - Whether or not to print the full report
 * @param {boolean} reportToTeamCity - Whether or not to output TeamCity logs
 * @returns {object} - HTML-formatted report
 */
exports.summarizeData = function(results, fullReport, reportToTeamCity) {

  summary.files.total = results.length;

  teamCityLogger.reportStart();

  var files = [];

  results.forEach(function(result) {

    var messages = result.messages;

    summary.alerts.total += messages.length;

    var file = {
      path: result.filePath,
      errors: 0,
      warnings: 0
    };

    if (fullReport) {
      file.messages = messages;
    }

    teamCityLogger.testStart(result.filePath);

    var messageList = [];

    messages.forEach(function(message) {

      if (message.severity === 2) {
        addErrorOccurance(message.ruleId);

        summary.alerts.errors++;
        file.errors++;

        messageList.push('line ' + message.line + ', col ' + message.column + ', ' + message.message);
      } else if (message.severity === 1) {
        addWarningOccurance(message.ruleId);

        summary.alerts.warnings++;
        file.warnings++;
      }
    });

    if (messageList.length) {
      teamCityLogger.testFailed(result.filePath, messageList);
    }

    teamCityLogger.testEnd(result.filePath);

    if (file.errors) {
      summary.files.errors++;
    } else if (file.warnings) {
      summary.files.warnings++;
    } else {
      summary.files.clean++;
    }

    files.push(file);
  });

  errorOccurances.sort(this.sortOccurances);
  errorOccurances = errorOccurances.slice(0, 5);

  warningOccurances.sort(this.sortOccurances);
  warningOccurances = warningOccurances.slice(0, 5);

  teamCityLogger.reportEnd();

  if (reportToTeamCity) {
    console.log(teamCityLogger.reportOutput.join('\n'));
  }

  files.sort(this.sortErrors);

  return {
    summary: summary,
    files: files,
    fullReport: fullReport,
    errorOccurances: errorOccurances,
    warningOccurances: warningOccurances,
    pageTitle: (fullReport ? 'ESLint Results' : 'ESLint Results (lite)')
  };
};
