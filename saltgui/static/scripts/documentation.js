// documentation utilities

// for INTERNAL DOCUMENTATION:
// VOID

// for ONLINE DOCUMENTATION:
const DOCUMENTATION_URL = "https://docs.saltstack.com/en/latest/ref/";
const EXTERNAL_LINK = "&nbsp;<img src='static/images/externallink.png' style='width:12px'>";

class Documentation {

  // formatting of the documentation is done as a regular output type
  // that is therefore in output.js

  constructor (commandbox) {
    Documentation.commandbox = commandbox;

    commandbox.menu.addMenuItem(
      Documentation.manualRunMenuSysDocPrepare,
      Documentation.manualRunMenuSysDocRun);
    commandbox.menu.addMenuItem(
      Documentation.manualRunMenuHtmlDocPrepare,
      Documentation.manualRunMenuHtmlDocRun);
  }

  // INTERNAL DOCUMENTATION

  static manualRunMenuSysDocPrepare(menuitem) {
    let target = document.querySelector(".run-command #target").value;
    target = target ? "target" : "all minions";
    let command = document.querySelector(".run-command #command").value;
    // remove the command arguments
    command = command.trim().replace(/ .*/, "");
    command = command.trim().replace(/[.]*$/, "");
    if(!command.match(/^[a-z_][a-z0-9_.]*$/i)) {
      // When it is not a command, don't treat it as a command.
      // This RE still allows some illegal command formats, but
      // that is something that sys.doc/runners.doc can handle.
      menuitem.style.display = "none";
    } else if(!command) {
      // this spot was reserved for `sys.doc` without parameters
      // but that is far too slow for normal use
      menuitem.style.display = "none";
    } else if(command === "runners" || command.startsWith("runners.")) {
      // actually "command" is not passed, but we select that part of the actual result
      // because `runners.doc.runner` always returns all documentation for "runners"
      command = command.substring(8);
      if(command) command = " " + command;
      menuitem.innerText = "Run 'runners.doc.runner" + command + "'";
      menuitem.style.display = "block";
    } else if(command === "wheel" || command.startsWith("wheel.")) {
      // actually "command" is not passed, but we select that part of the actual result
      // because `runners.doc.wheel` always returns all documentation for "wheel"
      command = command.substring(6);
      if(command) command = " " + command;
      menuitem.innerText = "Run 'runners.doc.wheel" + command + "'";
      menuitem.style.display = "block";
    } else {
      menuitem.innerText = "Run 'sys.doc " + command + "' on " + target;
      menuitem.style.display = "block";
    }
  }

  static manualRunMenuSysDocRun() {
    const button = document.querySelector(".run-command input[type='submit']");
    if(button.disabled) return;
    const output = document.querySelector(".run-command pre");

    let target = document.querySelector(".run-command #target").value;
    // the help text is taken from the first minion that answers
    // when no target is selected, just ask all minions
    if(target === "") target = "*";

    // do not use the command-parser
    let command = document.querySelector(".run-command #command").value;
    // remove arguments
    command = command.trim().replace(/ .*/, "");
    // remove trailing dots
    command = command.trim().replace(/[.]*$/, "");
    // command can be empty here (but the gui prevents that)

    button.disabled = true;
    output.innerText = "Loading...";

    let docCommand;
    let dummyCommand;
    if(command === "runners" || command.startsWith("runners.")) {
      // runners command. docCommand is WITHOUT further arguments
      docCommand = "runners.doc.runner";
      dummyCommand = "runners.doc.runner " + command;
    } else if(command === "wheel" || command.startsWith("wheel.")) {
      // wheel command. docCommand is WITHOUT further arguments
      docCommand = "runners.doc.wheel";
      dummyCommand = "runners.doc.wheel " + command;
    } else {
      // regular command. docCommand is WITH further argument
      docCommand = "sys.doc " + command;
      dummyCommand = "sys.doc " + command;
    }

    const tgtType = TargetType.menuTargetType._value;

    this.commandbox._getRunParams(tgtType, target, docCommand).then(
      response => this.commandbox._onRunReturn(response.return[0], dummyCommand)
    );
  }

  // ONLINE DOCUMENTATION

  static updateProviders(data) {
    const providerlists = data.return[0];
    for(const host in providerlists) {

      // did we (not) get an answer from the minion?
      if(!providerlists[host]) {
        continue;
      }

      const providerlist = providerlists[host];
      for(let key in providerlist) {

        const value = providerlist[key];

        // Some Windows minions report module names
        // with this extra part, remove it
        if(key.endsWith(".cpython-35")) {
          key = key.substring(0, key.length - 11);
        }

        // This seems to be returned for the 'vsphere' module.
        // That is clearly a wrong answer, fix it.
        // See also https://github.com/saltstack/salt/issues/49332.
        if(key === "__init__" && value === "vsphere") {
          key = "vsphere";
        }

        // This is sometimes returned for the 'win_pkg' module.
        // That is clearly a wrong answer, fix it.
        if(key === "functools" && value === "pkg") {
          key = "win_pkg";
        }

        // This is sometimes returned for the 'win_lgpo' module.
        // That is clearly a wrong answer, fix it.
        if(key === "configparser" && value === "lgpo") {
          key = "win_lgpo";
        }

        // This is seems to be returned for the 'travisci' module.
        // That is clearly a wrong answer, fix it.
        if((key === "parse" || key === "urlparse") && value === "travisci") {
          key = "travisci";
        }

        // create an initial empty mapping
        if(!Documentation.PROVIDERS[value]) {
          Documentation.PROVIDERS[value] = [ ];
        }

        // add the new mapping, prevent duplicates as
        // multiple minions provide (almost) the same answers
        if(Documentation.PROVIDERS[value].indexOf(key) < 0) {
          Documentation.PROVIDERS[value].push(key);
        }
      }
    }
  }

  static getKeywordFragments() {
    let command = document.querySelector(".run-command #command").value;
    // remove the command arguments
    command = command.trim().replace(/ .*/, "");
    // remove trailing ".", typically found between categoryname and function name
    // but user wants to lookup the commands from the category
    command = command.trim().replace(/[.]*$/, "");
    let cmd = command.split(".");

    // re-organize the command with its formal category
    switch(cmd[0]){
    case "":
      cmd = ["modules"];
      break;
    case "runners":
      // we recognize this category
      break;
    case "wheel":
      // we recognize this category
      break;
    case "modules":
      // we recognize this category
      break;
    default:
      // all unknown categories are actually modules
      cmd.unshift("modules");
    }

    return cmd;
  }

  static manualRunMenuHtmlDocPrepare(menuitem) {
    const cmd = Documentation.getKeywordFragments();
    menuitem.innerHTML = "Online&nbsp;reference for '" + cmd.join(".").replace(/^modules[.]/, "") +"'";
  }

  static manualRunMenuHtmlDocRun(menuitem) {
    const cmd = Documentation.getKeywordFragments();

    // title line
    let html = "";
    html += "<h3>Documentation for '" + cmd.join(".").replace(/^modules[.]/, "") + "'</h3>";

    // level 0
    html += "<p><a href='" + DOCUMENTATION_URL + "' target='_blank'>Salt Module Reference" + EXTERNAL_LINK + "</a></p>";

    // level 1
    // Function getKeywordFragments makes sure that
    // the cmd array has at least one element.
    // The default is "modules"
    let pageTitle = "All '" + cmd[0] + "' modules";
    if(cmd[0] === "modules") {
      // the page title is different for this page
      // the link to the page must use the same title
      pageTitle = "All 'execution' modules";
    }
    html += "<p><a href='" + DOCUMENTATION_URL + cmd[0] + "/all/index.html' target='_blank'>" + pageTitle + EXTERNAL_LINK + "</a></p>";

    // When the module is a virtual module, we want
    // to show all relevant concrete modules
    // only 'modules' can have virtual modules as these
    // are implemented on the minions and can be different
    // per minion. RUNNERS and WHEEL run on the master
    // and have no naming tricks.
    // Also note that some commands are named differently
    // in their implementation. e.g. "cmd.run" is actually "cmdmod.run".
    // This translation serves both purposes.
    let concreteModules = [ ];
    if(cmd.length >= 2) {

      // only 'modules' has a translation table
      // other categories are taken literal
      if(cmd[0] === "modules") {
        concreteModules = Documentation.PROVIDERS[cmd[1]];
        if(!concreteModules) concreteModules = [ ];
      } else {
        concreteModules = [cmd[1]];
      }

      if(Object.keys(Documentation.PROVIDERS).length == 0) {
        html += "<p>The documentation index has not been retrieved yet. We'll just assume this is a regular command.</p>";
        concreteModules = [cmd[1]];
      }

      switch(concreteModules.length) {
      case 0:
        html += "<p>'" + cmd[1] + "' is an unknown module name. We'll just assume it actually exists. But the links below might not work.</p>";
        break;
      case 1:
        // simple modules case
        // wheel/runners cases are always simple
        if(cmd[0] !== "modules") {
          html += "<p>Module-name '" + cmd[0] + "." + cmd[1] + "' cannot be verified. We'll just assume it actually exists. But the links below might not work.</p>";
        } else if(cmd[1] !== concreteModules[0]) {
          html += "<p>The internal name for '" + cmd[1] + "' is slightly different than the salt command itself.</p>";
        }
        break;
      default:
        html += "<p>" + concreteModules.length + " variations of this module seem to be used. These all listed below.</p>";
      }
    }

    // provide remarks about function names at this point because multiple
    // function alternatives may be shown
    if(cmd.length >= 3) {
      html += "<p>Function-name '" + cmd[2] + "' cannot be verified here. We'll just assume it actually exists. But the links below might not work.</p>";
    }

    // See https://docs.saltstack.com/en/latest/ref/modules/all/index.html
    const knownVirtualModules = [
      "group",
      "kernelpkg",
      "pkg",
      "service",
      "shadow",
      "user",
    ];

    let indent = "";
    if(concreteModules.length > 1) {
      // only useful to indent level 3 information
      // when there are multiple instances available
      indent = "&nbsp;&nbsp;";
    }

    for(const m of concreteModules) {

      // level 2
      if(cmd.length >= 2)
        html += "<p><a href='" + DOCUMENTATION_URL + cmd[0] + "/all/salt." + cmd[0] + "." + m + ".html' target='_blank'>Module '" + (cmd[0] + "." + m).replace(/^modules[.]/, "") + "'" + EXTERNAL_LINK + "</a></p>";

      // level 3
      if(cmd.length >= 3)
        html += "<p>" + indent + "<a href='" + DOCUMENTATION_URL + cmd[0] + "/all/salt." + cmd[0] + "." + m + ".html#salt." + cmd[0] + "." + m + "." + cmd[2] + "' target='_blank'>Function '" + (cmd[0] + "." + m + "." + cmd[2]).replace(/^modules[.]/, "") + "'" + EXTERNAL_LINK + "</a></p>";
    }

    if(cmd.length >= 2 && cmd[0] === "modules" && knownVirtualModules.indexOf(cmd[1]) >= 0) {
      html += "<p>The link below is the overview page of all related virtual package modules.</p>";
      html += "<p><a href='" + DOCUMENTATION_URL + cmd[0] + "/all/salt." + cmd[0] + "." + cmd[1] + ".html' target='_blank'>'" + cmd[0] + "." + cmd[1] + "' modules" + EXTERNAL_LINK + "</a></p>";
    }

    // grains?

    if(cmd.length >= 2 && cmd[0] === "modules" && cmd[1] === "grains") {
      html += "<p>It looks you are using grains. The link below gives the overview of the grains modules. </p>";
      html += "<p><a href='" + DOCUMENTATION_URL + "grains/all/index.html' target='_blank'>Grains Modules" + EXTERNAL_LINK + "</a></p>";
    }

    // pillars?

    if(cmd.length >= 2 && cmd[0] === "modules" && cmd[1] === "pillar") {
      html += "<p>It looks you are using pillars. The link below gives the overview of the pillar modules. </p>";
      html += "<p><a href='" + DOCUMENTATION_URL + "pillar/all/index.html' target='_blank'>Pillar Modules" + EXTERNAL_LINK + "</a></p>";
    }

    // states?

    if(cmd.length >= 2 && cmd[0] === "modules" && cmd[1] === "state") {
      html += "<p>It looks you are using states. The link below gives the overview of the state modules. </p>";
      html += "<p><a href='" + DOCUMENTATION_URL + "states/all/index.html' target='_blank'>State Modules" + EXTERNAL_LINK + "</a></p>";
    }

    // cloud?

    if(cmd.length >= 2 && cmd[0] === "modules" && cmd[1] === "cloud") {
      html += "<p>It looks you are using cloud. The link below gives the overview of the cloud modules. </p>";
      html += "<p><a href='" + DOCUMENTATION_URL + "clouds/all/index.html' target='_blank'>Cloud Modules" + EXTERNAL_LINK + "</a></p>";
    }

    // beacons?

    if(cmd.length >= 2 && cmd[0] === "modules" && cmd[1] === "beacons") {
      html += "<p>It looks you are using beacons. The link below gives the overview of the beacons modules. </p>";
      html += "<p><a href='" + DOCUMENTATION_URL + "beacons/all/index.html' target='_blank'>Beacon Modules" + EXTERNAL_LINK + "</a></p>";
    }

    const output = document.querySelector(".run-command pre");
    output.innerHTML = html;
  }

}

// for unit tests
if(typeof module !== "undefined") module.exports = Documentation;

// Do the static initialisation
Documentation.PROVIDERS = { };
