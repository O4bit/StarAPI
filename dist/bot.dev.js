"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

require('dotenv').config();

var _require = require('child_process'),
    exec = _require.exec; // Import exec


var _require2 = require('discord.js'),
    Client = _require2.Client,
    GatewayIntentBits = _require2.GatewayIntentBits,
    REST = _require2.REST,
    Routes = _require2.Routes,
    EmbedBuilder = _require2.EmbedBuilder,
    ActionRowBuilder = _require2.ActionRowBuilder,
    ButtonBuilder = _require2.ButtonBuilder,
    ButtonStyle = _require2.ButtonStyle;

var axios = require('axios');

var client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});
var DISCORD_TOKEN = process.env.DISCORD_TOKEN;
var CLIENT_ID = process.env.CLIENT_ID;
var API_URL = process.env.API_URL;
var CHECK_INTERVAL = 60000; // Check every 60 seconds

var VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID;
client.once('ready', function _callee() {
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          console.log("Logged in as ".concat(client.user.tag, "!"));
          _context.next = 3;
          return regeneratorRuntime.awrap(clearCommands());

        case 3:
          _context.next = 5;
          return regeneratorRuntime.awrap(registerCommands());

        case 5:
          monitorServer();

        case 6:
        case "end":
          return _context.stop();
      }
    }
  });
});
client.on('interactionCreate', function _callee2(interaction) {
  var commandName, token, response, guild, member, role, _response, embed, _response2, tokens, _embed, rows, status, message, logsUrl, command, output, _interaction$customId, _interaction$customId2, action, tokenId;

  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          console.log("Received interaction: ".concat(interaction.commandName));

          if (!(!interaction.isCommand() && !interaction.isButton())) {
            _context2.next = 3;
            break;
          }

          return _context2.abrupt("return");

        case 3:
          commandName = interaction.commandName;

          if (!interaction.isCommand()) {
            _context2.next = 161;
            break;
          }

          if (!(commandName === 'verify')) {
            _context2.next = 42;
            break;
          }

          _context2.next = 8;
          return regeneratorRuntime.awrap(interaction.deferReply());

        case 8:
          token = interaction.options.getString('token');
          console.log("Verifying token: ".concat(token));
          _context2.prev = 10;
          _context2.next = 13;
          return regeneratorRuntime.awrap(verifyToken(token));

        case 13:
          response = _context2.sent;

          if (!response.verified) {
            _context2.next = 31;
            break;
          }

          guild = client.guilds.cache.get(interaction.guildId);
          _context2.next = 18;
          return regeneratorRuntime.awrap(guild.members.fetch(interaction.user.id));

        case 18:
          member = _context2.sent;
          role = guild.roles.cache.get(VERIFIED_ROLE_ID);

          if (!role) {
            _context2.next = 27;
            break;
          }

          _context2.next = 23;
          return regeneratorRuntime.awrap(member.roles.add(role));

        case 23:
          _context2.next = 25;
          return regeneratorRuntime.awrap(interaction.editReply('You have been verified and given access.'));

        case 25:
          _context2.next = 29;
          break;

        case 27:
          _context2.next = 29;
          return regeneratorRuntime.awrap(interaction.editReply('Role not found.'));

        case 29:
          _context2.next = 33;
          break;

        case 31:
          _context2.next = 33;
          return regeneratorRuntime.awrap(interaction.editReply('Invalid token. Verification failed.'));

        case 33:
          _context2.next = 40;
          break;

        case 35:
          _context2.prev = 35;
          _context2.t0 = _context2["catch"](10);
          console.error("Error verifying token: ".concat(_context2.t0.message));
          _context2.next = 40;
          return regeneratorRuntime.awrap(interaction.editReply("Error: ".concat(_context2.t0.message)));

        case 40:
          _context2.next = 159;
          break;

        case 42:
          if (!(commandName === 'neofetch')) {
            _context2.next = 62;
            break;
          }

          _context2.next = 45;
          return regeneratorRuntime.awrap(interaction.deferReply());

        case 45:
          console.log('Running neofetch command');
          _context2.prev = 46;
          _context2.next = 49;
          return regeneratorRuntime.awrap(axios.get("".concat(API_URL, "/neofetch"), {
            headers: {
              Authorization: "Bearer ".concat(process.env.API_TOKEN)
            }
          }));

        case 49:
          _response = _context2.sent;
          embed = new EmbedBuilder().setColor('#0099ff').setTitle('Neofetch').setDescription("```".concat(_response.data.output, "```")).setTimestamp().setFooter({
            text: 'Neofetch Output'
          });
          _context2.next = 53;
          return regeneratorRuntime.awrap(interaction.editReply({
            embeds: [embed]
          }));

        case 53:
          _context2.next = 60;
          break;

        case 55:
          _context2.prev = 55;
          _context2.t1 = _context2["catch"](46);
          console.error("Error running neofetch: ".concat(_context2.t1.message));
          _context2.next = 60;
          return regeneratorRuntime.awrap(interaction.editReply("Error: ".concat(_context2.t1.message)));

        case 60:
          _context2.next = 159;
          break;

        case 62:
          if (!(commandName === 'tokens')) {
            _context2.next = 84;
            break;
          }

          _context2.next = 65;
          return regeneratorRuntime.awrap(interaction.deferReply());

        case 65:
          console.log('Fetching tokens');
          _context2.prev = 66;
          _context2.next = 69;
          return regeneratorRuntime.awrap(axios.get("".concat(API_URL, "/tokens"), {
            headers: {
              Authorization: "Bearer ".concat(process.env.API_TOKEN)
            }
          }));

        case 69:
          _response2 = _context2.sent;
          tokens = _response2.data.tokens;
          _embed = new EmbedBuilder().setColor('#0099ff').setTitle('Token Management').setDescription('List of tokens with options to delete or lock.');
          rows = tokens.map(function (token) {
            return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("delete_".concat(token.id)).setLabel('Delete').setStyle(ButtonStyle.Danger), new ButtonBuilder().setCustomId("lock_".concat(token.id)).setLabel('Lock').setStyle(ButtonStyle.Secondary));
          });
          _context2.next = 75;
          return regeneratorRuntime.awrap(interaction.editReply({
            embeds: [_embed],
            components: rows
          }));

        case 75:
          _context2.next = 82;
          break;

        case 77:
          _context2.prev = 77;
          _context2.t2 = _context2["catch"](66);
          console.error("Error fetching tokens: ".concat(_context2.t2.message));
          _context2.next = 82;
          return regeneratorRuntime.awrap(interaction.editReply("Error: ".concat(_context2.t2.message)));

        case 82:
          _context2.next = 159;
          break;

        case 84:
          if (!(commandName === 'status')) {
            _context2.next = 103;
            break;
          }

          _context2.next = 87;
          return regeneratorRuntime.awrap(interaction.deferReply());

        case 87:
          console.log('Fetching server status');
          _context2.prev = 88;
          _context2.next = 91;
          return regeneratorRuntime.awrap(getServerStatus());

        case 91:
          status = _context2.sent;
          _context2.next = 94;
          return regeneratorRuntime.awrap(interaction.editReply({
            embeds: [status]
          }));

        case 94:
          _context2.next = 101;
          break;

        case 96:
          _context2.prev = 96;
          _context2.t3 = _context2["catch"](88);
          console.error("Error fetching server status: ".concat(_context2.t3.message));
          _context2.next = 101;
          return regeneratorRuntime.awrap(interaction.editReply("Error: ".concat(_context2.t3.message)));

        case 101:
          _context2.next = 159;
          break;

        case 103:
          if (!(commandName === 'reboot')) {
            _context2.next = 122;
            break;
          }

          _context2.next = 106;
          return regeneratorRuntime.awrap(interaction.deferReply());

        case 106:
          console.log('Rebooting server');
          _context2.prev = 107;
          _context2.next = 110;
          return regeneratorRuntime.awrap(rebootServer());

        case 110:
          message = _context2.sent;
          _context2.next = 113;
          return regeneratorRuntime.awrap(interaction.editReply(message));

        case 113:
          _context2.next = 120;
          break;

        case 115:
          _context2.prev = 115;
          _context2.t4 = _context2["catch"](107);
          console.error("Error rebooting server: ".concat(_context2.t4.message));
          _context2.next = 120;
          return regeneratorRuntime.awrap(interaction.editReply("Error: ".concat(_context2.t4.message)));

        case 120:
          _context2.next = 159;
          break;

        case 122:
          if (!(commandName === 'logs')) {
            _context2.next = 141;
            break;
          }

          _context2.next = 125;
          return regeneratorRuntime.awrap(interaction.deferReply());

        case 125:
          console.log('Fetching server logs');
          _context2.prev = 126;
          _context2.next = 129;
          return regeneratorRuntime.awrap(getServerLogs());

        case 129:
          logsUrl = _context2.sent;
          _context2.next = 132;
          return regeneratorRuntime.awrap(interaction.editReply("Logs URL: ".concat(logsUrl)));

        case 132:
          _context2.next = 139;
          break;

        case 134:
          _context2.prev = 134;
          _context2.t5 = _context2["catch"](126);
          console.error("Error fetching server logs: ".concat(_context2.t5.message));
          _context2.next = 139;
          return regeneratorRuntime.awrap(interaction.editReply("Error: ".concat(_context2.t5.message)));

        case 139:
          _context2.next = 159;
          break;

        case 141:
          if (!(commandName === 'console')) {
            _context2.next = 159;
            break;
          }

          _context2.next = 144;
          return regeneratorRuntime.awrap(interaction.deferReply());

        case 144:
          command = interaction.options.getString('command');
          console.log("Executing command: ".concat(command));
          _context2.prev = 146;
          _context2.next = 149;
          return regeneratorRuntime.awrap(executeCommand(command));

        case 149:
          output = _context2.sent;
          _context2.next = 152;
          return regeneratorRuntime.awrap(sendLongMessage(interaction, "```".concat(output, "```")));

        case 152:
          _context2.next = 159;
          break;

        case 154:
          _context2.prev = 154;
          _context2.t6 = _context2["catch"](146);
          console.error("Error executing command: ".concat(_context2.t6.message));
          _context2.next = 159;
          return regeneratorRuntime.awrap(interaction.editReply("Error: ".concat(_context2.t6.message)));

        case 159:
          _context2.next = 192;
          break;

        case 161:
          if (!interaction.isButton()) {
            _context2.next = 192;
            break;
          }

          _interaction$customId = interaction.customId.split('_'), _interaction$customId2 = _slicedToArray(_interaction$customId, 2), action = _interaction$customId2[0], tokenId = _interaction$customId2[1];
          console.log("Button action: ".concat(action, ", tokenId: ").concat(tokenId));

          if (!(action === 'delete')) {
            _context2.next = 179;
            break;
          }

          _context2.prev = 165;
          _context2.next = 168;
          return regeneratorRuntime.awrap(axios["delete"]("".concat(API_URL, "/tokens/").concat(tokenId), {
            headers: {
              Authorization: "Bearer ".concat(process.env.API_TOKEN)
            }
          }));

        case 168:
          _context2.next = 170;
          return regeneratorRuntime.awrap(interaction.reply("Token ".concat(tokenId, " deleted successfully.")));

        case 170:
          _context2.next = 177;
          break;

        case 172:
          _context2.prev = 172;
          _context2.t7 = _context2["catch"](165);
          console.error("Error deleting token: ".concat(_context2.t7.message));
          _context2.next = 177;
          return regeneratorRuntime.awrap(interaction.reply("Error deleting token: ".concat(_context2.t7.message)));

        case 177:
          _context2.next = 192;
          break;

        case 179:
          if (!(action === 'lock')) {
            _context2.next = 192;
            break;
          }

          _context2.prev = 180;
          _context2.next = 183;
          return regeneratorRuntime.awrap(axios.patch("".concat(API_URL, "/tokens/").concat(tokenId, "/lock"), {}, {
            headers: {
              Authorization: "Bearer ".concat(process.env.API_TOKEN)
            }
          }));

        case 183:
          _context2.next = 185;
          return regeneratorRuntime.awrap(interaction.reply("Token ".concat(tokenId, " locked successfully.")));

        case 185:
          _context2.next = 192;
          break;

        case 187:
          _context2.prev = 187;
          _context2.t8 = _context2["catch"](180);
          console.error("Error locking token: ".concat(_context2.t8.message));
          _context2.next = 192;
          return regeneratorRuntime.awrap(interaction.reply("Error locking token: ".concat(_context2.t8.message)));

        case 192:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[10, 35], [46, 55], [66, 77], [88, 96], [107, 115], [126, 134], [146, 154], [165, 172], [180, 187]]);
});

function monitorServer() {
  return regeneratorRuntime.async(function monitorServer$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          setInterval(function _callee3() {
            var status, channel;
            return regeneratorRuntime.async(function _callee3$(_context3) {
              while (1) {
                switch (_context3.prev = _context3.next) {
                  case 0:
                    console.log('Checking server status');
                    _context3.next = 3;
                    return regeneratorRuntime.awrap(getServerStatus());

                  case 3:
                    status = _context3.sent;

                    if (status.description && status.description.includes('down')) {
                      channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);

                      if (channel) {
                        channel.send({
                          embeds: [status]
                        });
                      }
                    }

                  case 5:
                  case "end":
                    return _context3.stop();
                }
              }
            });
          }, CHECK_INTERVAL);

        case 1:
        case "end":
          return _context4.stop();
      }
    }
  });
}

function getServerStatus() {
  var response, uptimeResponse, embed;
  return regeneratorRuntime.async(function getServerStatus$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _context5.prev = 0;
          _context5.next = 3;
          return regeneratorRuntime.awrap(axios.get("".concat(API_URL, "/systeminfo"), {
            headers: {
              Authorization: "Bearer ".concat(process.env.API_TOKEN)
            }
          }));

        case 3:
          response = _context5.sent;
          _context5.next = 6;
          return regeneratorRuntime.awrap(axios.get("".concat(API_URL, "/health"), {
            headers: {
              Authorization: "Bearer ".concat(process.env.API_TOKEN)
            }
          }));

        case 6:
          uptimeResponse = _context5.sent;
          embed = new EmbedBuilder().setColor(0x0099ff).setTitle('Server Status').addFields({
            name: 'CPU',
            value: "".concat(response.data.cpu.manufacturer, " ").concat(response.data.cpu.brand, " ").concat(response.data.cpu.speed, "GHz (").concat(response.data.cpu.cores, " cores)"),
            inline: true
          }, {
            name: 'RAM',
            value: "".concat((response.data.mem.total / 1073741824).toFixed(2), " GB total, ").concat((response.data.mem.free / 1073741824).toFixed(2), " GB free"),
            inline: true
          }, {
            name: 'OS',
            value: "".concat(response.data.osInfo.platform, " ").concat(response.data.osInfo.distro, " ").concat(response.data.osInfo.release, " (Kernel: ").concat(response.data.osInfo.kernel, ")"),
            inline: true
          }, {
            name: 'IP Address',
            value: response.data.networkInterfaces[0].ip4,
            inline: true
          }, {
            name: 'CPU Load',
            value: "".concat(response.data.currentLoad.currentLoad.toFixed(2), "%"),
            inline: true
          }, {
            name: 'Uptime',
            value: uptimeResponse.data.uptime,
            inline: true
          }).setTimestamp().setFooter({
            text: 'Server Status'
          });
          return _context5.abrupt("return", embed);

        case 11:
          _context5.prev = 11;
          _context5.t0 = _context5["catch"](0);
          console.error("Error getting server status: ".concat(_context5.t0.message));
          return _context5.abrupt("return", new EmbedBuilder().setColor(0xff0000).setTitle('Server Status').setDescription('Server is down!').setTimestamp().setFooter({
            text: 'Server Status'
          }));

        case 15:
        case "end":
          return _context5.stop();
      }
    }
  }, null, null, [[0, 11]]);
}

function rebootServer() {
  var response;
  return regeneratorRuntime.async(function rebootServer$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _context6.prev = 0;
          _context6.next = 3;
          return regeneratorRuntime.awrap(axios.post("".concat(API_URL, "/reboot"), {}, {
            headers: {
              Authorization: "Bearer ".concat(process.env.API_TOKEN)
            }
          }));

        case 3:
          response = _context6.sent;
          return _context6.abrupt("return", response.data.message);

        case 7:
          _context6.prev = 7;
          _context6.t0 = _context6["catch"](0);
          console.error("Error rebooting server: ".concat(_context6.t0.message));
          return _context6.abrupt("return", 'Failed to reboot the server!');

        case 11:
        case "end":
          return _context6.stop();
      }
    }
  }, null, null, [[0, 7]]);
}

function getServerLogs() {
  var response;
  return regeneratorRuntime.async(function getServerLogs$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          _context7.prev = 0;
          _context7.next = 3;
          return regeneratorRuntime.awrap(axios.get("".concat(API_URL, "/logs"), {
            headers: {
              Authorization: "Bearer ".concat(process.env.API_TOKEN)
            }
          }));

        case 3:
          response = _context7.sent;
          return _context7.abrupt("return", response.data.url);

        case 7:
          _context7.prev = 7;
          _context7.t0 = _context7["catch"](0);
          console.error("Error getting server logs: ".concat(_context7.t0.message));
          return _context7.abrupt("return", 'Failed to retrieve logs!');

        case 11:
        case "end":
          return _context7.stop();
      }
    }
  }, null, null, [[0, 7]]);
}

function executeCommand(command) {
  return regeneratorRuntime.async(function executeCommand$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          return _context8.abrupt("return", new Promise(function (resolve, reject) {
            exec(command, function (error, stdout, stderr) {
              if (error) {
                console.error("Error executing command: ".concat(stderr));
                reject(new Error(stderr));
              } else {
                resolve(stdout);
              }
            });
          }));

        case 1:
        case "end":
          return _context8.stop();
      }
    }
  });
}

function sendLongMessage(interaction, message) {
  var maxLength, parts, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, part;

  return regeneratorRuntime.async(function sendLongMessage$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          maxLength = 2000;

          if (!(message.length <= maxLength)) {
            _context9.next = 6;
            break;
          }

          _context9.next = 4;
          return regeneratorRuntime.awrap(interaction.editReply(message));

        case 4:
          _context9.next = 33;
          break;

        case 6:
          parts = message.match(new RegExp(".{1,".concat(maxLength, "}"), 'g'));
          _iteratorNormalCompletion = true;
          _didIteratorError = false;
          _iteratorError = undefined;
          _context9.prev = 10;
          _iterator = parts[Symbol.iterator]();

        case 12:
          if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
            _context9.next = 19;
            break;
          }

          part = _step.value;
          _context9.next = 16;
          return regeneratorRuntime.awrap(interaction.followUp(part));

        case 16:
          _iteratorNormalCompletion = true;
          _context9.next = 12;
          break;

        case 19:
          _context9.next = 25;
          break;

        case 21:
          _context9.prev = 21;
          _context9.t0 = _context9["catch"](10);
          _didIteratorError = true;
          _iteratorError = _context9.t0;

        case 25:
          _context9.prev = 25;
          _context9.prev = 26;

          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }

        case 28:
          _context9.prev = 28;

          if (!_didIteratorError) {
            _context9.next = 31;
            break;
          }

          throw _iteratorError;

        case 31:
          return _context9.finish(28);

        case 32:
          return _context9.finish(25);

        case 33:
        case "end":
          return _context9.stop();
      }
    }
  }, null, null, [[10, 21, 25, 33], [26,, 28, 32]]);
}

function verifyToken(token) {
  var response;
  return regeneratorRuntime.async(function verifyToken$(_context10) {
    while (1) {
      switch (_context10.prev = _context10.next) {
        case 0:
          _context10.prev = 0;
          _context10.next = 3;
          return regeneratorRuntime.awrap(axios.post("".concat(API_URL, "/verify"), {
            token: token
          }, {
            headers: {
              Authorization: "Bearer ".concat(process.env.API_TOKEN)
            }
          }));

        case 3:
          response = _context10.sent;
          return _context10.abrupt("return", response.data);

        case 7:
          _context10.prev = 7;
          _context10.t0 = _context10["catch"](0);
          console.error("Error verifying token: ".concat(_context10.t0.message));
          throw new Error('Verification failed.');

        case 11:
        case "end":
          return _context10.stop();
      }
    }
  }, null, null, [[0, 7]]);
}

function clearCommands() {
  var rest, commands, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, command;

  return regeneratorRuntime.async(function clearCommands$(_context11) {
    while (1) {
      switch (_context11.prev = _context11.next) {
        case 0:
          rest = new REST({
            version: '9'
          }).setToken(DISCORD_TOKEN);
          _context11.prev = 1;
          console.log('Started clearing application (/) commands.');
          _context11.next = 5;
          return regeneratorRuntime.awrap(rest.get(Routes.applicationCommands(CLIENT_ID)));

        case 5:
          commands = _context11.sent;
          _iteratorNormalCompletion2 = true;
          _didIteratorError2 = false;
          _iteratorError2 = undefined;
          _context11.prev = 9;
          _iterator2 = commands[Symbol.iterator]();

        case 11:
          if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
            _context11.next = 18;
            break;
          }

          command = _step2.value;
          _context11.next = 15;
          return regeneratorRuntime.awrap(rest["delete"](Routes.applicationCommand(CLIENT_ID, command.id)));

        case 15:
          _iteratorNormalCompletion2 = true;
          _context11.next = 11;
          break;

        case 18:
          _context11.next = 24;
          break;

        case 20:
          _context11.prev = 20;
          _context11.t0 = _context11["catch"](9);
          _didIteratorError2 = true;
          _iteratorError2 = _context11.t0;

        case 24:
          _context11.prev = 24;
          _context11.prev = 25;

          if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
            _iterator2["return"]();
          }

        case 27:
          _context11.prev = 27;

          if (!_didIteratorError2) {
            _context11.next = 30;
            break;
          }

          throw _iteratorError2;

        case 30:
          return _context11.finish(27);

        case 31:
          return _context11.finish(24);

        case 32:
          console.log('Successfully cleared application (/) commands.');
          _context11.next = 38;
          break;

        case 35:
          _context11.prev = 35;
          _context11.t1 = _context11["catch"](1);
          console.error("Error clearing commands: ".concat(_context11.t1.message));

        case 38:
        case "end":
          return _context11.stop();
      }
    }
  }, null, null, [[1, 35], [9, 20, 24, 32], [25,, 27, 31]]);
}

function registerCommands() {
  var commands, rest;
  return regeneratorRuntime.async(function registerCommands$(_context12) {
    while (1) {
      switch (_context12.prev = _context12.next) {
        case 0:
          commands = [{
            name: 'status',
            description: 'Get the server status'
          }, {
            name: 'reboot',
            description: 'Reboot the server'
          }, {
            name: 'logs',
            description: 'Get the server logs'
          }, {
            name: 'console',
            description: 'Execute a command on the server',
            options: [{
              name: 'command',
              type: 3,
              // STRING
              description: 'The command to execute',
              required: true
            }]
          }, {
            name: 'verify',
            description: 'Verify your account with a bearer token',
            options: [{
              name: 'token',
              type: 3,
              // STRING
              description: 'The bearer token',
              required: true
            }]
          }, {
            name: 'neofetch',
            description: 'Run neofetch and display the output'
          }, {
            name: 'tokens',
            description: 'Manage tokens'
          }];
          rest = new REST({
            version: '9'
          }).setToken(DISCORD_TOKEN);
          _context12.prev = 2;
          console.log('Started refreshing application (/) commands.');
          _context12.next = 6;
          return regeneratorRuntime.awrap(rest.put(Routes.applicationCommands(CLIENT_ID), // Register global commands
          {
            body: commands
          }));

        case 6:
          console.log('Successfully reloaded application (/) commands.');
          _context12.next = 12;
          break;

        case 9:
          _context12.prev = 9;
          _context12.t0 = _context12["catch"](2);
          console.error("Error registering commands: ".concat(_context12.t0.message));

        case 12:
        case "end":
          return _context12.stop();
      }
    }
  }, null, null, [[2, 9]]);
}

client.login(DISCORD_TOKEN);