// library imports
const Discord = require('discord.io');
const logger = require('winston');
const low = require('lowdb');
const moment = require('moment');
const _ = require('lodash');

// config imports
const auth = require('./auth.json');
const users = require('./users.json');

// db config settings
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)

// set db default structure
db.defaults({ messages: [], gvg: [] })
  .write()

// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});

bot.on('ready', function (evt) {
    console.log(new Date() + ' - Kbot is ready');
});

function isUserAnAdmin(userToTest) {
    let isAdmin = false;
    for (let user of users.admins) {
        if (user === userToTest) {
            isAdmin = true;
            break;
        }
    }
    return isAdmin;
}

/**
* Handles set command requests. This is use for setting new commands.
* user - the user
* bot - the bot reference
* channelID - the id of the channel
* message - The message with the following sample format: eat I am eating
*/
function processSet(bot, channelID, channelUser, message) {
    if (!message) {
        return;
    }

    if (!isUserAnAdmin(channelUser)) {
        bot.sendMessage({
            to: channelID,
            message: 'You are not allowed to do that `' + channelUser + '`!'
        });
        return;
    }

    const command = message.split(' ')[0];
    const actualMessage = message.substr(message.indexOf(" ") + 1);

    if (command && actualMessage && actualMessage !== '!set' && isUserAnAdmin(channelUser)) {
        db.get('messages')
          .remove({ command: command })
          .write()

        db.get('messages')
          .push({ command: command, data: actualMessage })
          .write()

        bot.sendMessage({
            to: channelID,
            message: '`!' + command + '`' +
                     ' has been assigned with `' + actualMessage +  '`'
        });
    }
}

/**
* Handles delete command requests.
* user - the user
* bot - the bot reference
* channelID - the id of the channel
* message - The command ie unset eat
*/
function processUnset(bot, channelID, channelUser, message) {
    if (!message) {
        return;
    }

    const command = message.split(' ')[0];
    const commandToDelete = message.substr(message.indexOf(" ") + 1);

    if (command && commandToDelete && isUserAnAdmin(channelUser)) {
        const storedMessages = db.get('messages');
        for (let message of storedMessages) {
            if (message.command === commandToDelete) {
                db.get('messages')
                  .remove({ command: command })
                  .write()

                bot.sendMessage({
                    to: channelID,
                    message: '`!' + command + '` has been deleted!'
                });
                break;
            }
        }
    }

    if (!isUserAnAdmin(channelUser)) {
        bot.sendMessage({
            to: channelID,
            message: 'You are not allowed to do that `' + channelUser + '`!'
        });
    }
}

/**
* Handles commands.
*
* bot - the bot reference
* channelID - the id of the channel
* command - The command ie eat
*/
function processCommands(bot, channelID, command) {
    if (!command) {
        return;
    }

    if (command) {
        const storedMessages = db.get('messages');
        for (let message of storedMessages) {
            if (message.command === command) {
                bot.sendMessage({
                    to: channelID,
                    message: message.data
                });
                break;
            }
        }
    }
}

/**
* Handles help request.
*
* bot - the bot reference
* channelID - the id of the channel
*/
function processHelp(bot, channelID) {
    const setMessage = "To set a custom command (admins only), type `!set <command> <messsage>`. For example: `!set eat I eat dog food`\n\n";
    const readMessage = "To run a custom command, type `!<command>`. For example: `!eat`\n\n";
    const allCommandsMessage = "To see all custom commands type `!commands`\n\n";
    const showAdminMessage = "To see all KB Bot admins `!admins`\n\n";
    const gvgRequestMessage = "To request for GvG, type `!gvg-need`\n\n";
    const gvgRemoveMeMessage = "To remove yourself from the GvG list, type `!gvg-removeme`\n\n";
    const gvgListMessage = "To see list of players looking for GvG, type `!gvg-list`\n\n";
    const gvgClearListMessage = "To clear GvG list (admins only), type `!gvg-clear-list` or `!gvg-clear`\n\n";

    bot.sendMessage({
        to: channelID,
        message: setMessage +
                readMessage +
                allCommandsMessage +
                showAdminMessage +
                gvgRequestMessage +
                gvgListMessage +
                gvgRemoveMeMessage +
                gvgClearListMessage
    });
}

/**
* Handles show all command request.
*
* bot - the bot reference
* channelID - the id of the channel
*/
function processShowAllCommands(bot, channelID) {
    const storedMessages = db.get('messages');
    const availableCommands = [];
    for (let message of storedMessages) {
        availableCommands.push(' !' + message.command + ' ');
    }

    bot.sendMessage({
        to: channelID,
        message: 'Available custom commands are: `'+ availableCommands + '`'
    });
}


/**
* Show chat KB bot admins
*
* bot - the bot reference
* channelID - the id of the channel
*/
function processAdmins(bot, channelID) {
    bot.sendMessage({
        to: channelID,
        message: 'KB Bot admins are `'+ users.admins + '`. These are not necessarily Discord admins.'
    });
}

function processDate(bot, channelID) {
    bot.sendMessage({
        to: channelID,
        message: 'The server date is `' + new Date() + '`'
    });
}

function processGvGNeed(bot, channelID, user) {
    if (!user) {
        return;
    }

    const userGvGlist = db.get('gvg');
    let userIsInTheList = false;
    for (let userGvG of userGvGlist) {
        if (userGvG.name === user) {
            userIsInTheList = true;
            break;
        }
    }

    if (!userIsInTheList) {
        db.get('gvg')
          .push({ name: user, timestamp: moment() })
          .write()

        bot.sendMessage({
            to: channelID,
            message: '`' + user + '`' +
                     ' is looking for a GvG team!'
        });
    } else {
        bot.sendMessage({
            to: channelID,
            message: '`' + user + '`' +
                     ' is already in the list!' +
                     ' Someone team up with ' +
                     '`' + user + '`!'
        });
    }
}

function processGvGRemoveMe(bot, channelID, user) {
    if (!user) {
        return;
    }
    const userGvGlist = db.get('gvg');
    for (let userGvG of userGvGlist) {
        if (userGvG.name === user) {
            db.get('gvg')
              .remove({ name: user })
              .write()

            bot.sendMessage({
                to: channelID,
                message: '`' + user + '` has been removed from the GvG list'
            });
            break;
        }
    }
}

function processGvGList(bot, channelID) {
    const usersLookingForGvG = db.get('gvg');
    let gvgList = '';

    const unsortedUsers = [];
    for (let user of usersLookingForGvG) {
        unsortedUsers.push(user)
    }
    const sortedUsers = _.orderBy(unsortedUsers, ['timestamp'], ['asc'])

    for (let user of sortedUsers) {
        const now = moment();
        const timestamp = user.timestamp ? moment(user.timestamp): moment();
        const waitTimeInMinutes = now.diff(timestamp, 'minutes');
        gvgList += (user.name + ' (' + waitTimeInMinutes + ' mins)' + ' \n');
    }

    let message = 'Players looking for GvG with waiting times are \n`' + gvgList + '`';
    if (gvgList.length === 0) {
        message = 'No players are looking for GvG. All good!';
    }
    bot.sendMessage({
        to: channelID,
        message: message
    });
}

function processGvGClearList(bot, channelID, channelUser) {
    if (!isUserAnAdmin(channelUser)) {
        bot.sendMessage({
            to: channelID,
            message: 'You are not allowed to do that `' + channelUser + '`!'
        });
    } else {
        const usersLookingForGvG = db.get('gvg');

        for (let user of usersLookingForGvG) {
            db.get('gvg')
              .remove({ name: user.name })
              .write()
        }

        bot.sendMessage({
            to: channelID,
            message: 'GvG list has been cleared!'
        });
    }
}

bot.on('message', function (user, userID, channelID, commandAndMessage, evt) {
    // bot will process all commands that start exclamation mark `!`
    if (commandAndMessage.substring(0, 1) == '!') {

        const args = commandAndMessage.substring(1).split(' ');
        const command = args[0];
        const message = commandAndMessage.substr(commandAndMessage.indexOf(" ") + 1);

        switch(command) {
            case 'set':
                processSet(bot, channelID, user, message);
                break;
            case 'unset':
                processUnset(bot, channelID, user, message);
                break;
            case 'help':
                processHelp(bot, channelID);
                break;
            case 'admins':
                processAdmins(bot, channelID);
                break;
            case 'date':
                processDate(bot, channelID);
                break;
            case 'commands':
                processShowAllCommands(bot, channelID);
                break;
            case 'gvg-need':
                processGvGNeed(bot, channelID, user);
                break;
            case 'gvg-removeme':
                processGvGRemoveMe(bot, channelID, user);
                break;
            case 'gvg-list':
                processGvGList(bot, channelID);
                break;
            case 'gvg-clear-list':
                processGvGClearList(bot, channelID, user);
                break;
            case 'gvg-clear':
                processGvGClearList(bot, channelID, user);
                break;
            default:
                processCommands(bot, channelID, command);
         }
     }
});
