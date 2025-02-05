"use strict";

document.addEventListener('DOMContentLoaded', function () {
  fetchServerStatus();
  fetchTokens();
});

function fetchServerStatus() {
  var response, data;
  return regeneratorRuntime.async(function fetchServerStatus$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _context.next = 3;
          return regeneratorRuntime.awrap(fetch('/health', {
            headers: {
              'Authorization': "Bearer ".concat(localStorage.getItem('apiToken'))
            }
          }));

        case 3:
          response = _context.sent;
          _context.next = 6;
          return regeneratorRuntime.awrap(response.json());

        case 6:
          data = _context.sent;
          document.getElementById('status-content').innerHTML = "\n            <p>Uptime: ".concat(data.uptime, "</p>\n            <p>Status: ").concat(data.status, "</p>\n        ");
          _context.next = 14;
          break;

        case 10:
          _context.prev = 10;
          _context.t0 = _context["catch"](0);
          console.error('Error fetching server status:', _context.t0);
          document.getElementById('status-content').innerHTML = '<p>Error fetching server status</p>';

        case 14:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 10]]);
}

function fetchTokens() {
  var response, data, tokensContent;
  return regeneratorRuntime.async(function fetchTokens$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          _context2.next = 3;
          return regeneratorRuntime.awrap(fetch('/tokens', {
            headers: {
              'Authorization': "Bearer ".concat(localStorage.getItem('apiToken'))
            }
          }));

        case 3:
          response = _context2.sent;
          _context2.next = 6;
          return regeneratorRuntime.awrap(response.json());

        case 6:
          data = _context2.sent;
          tokensContent = document.getElementById('tokens-content');
          tokensContent.innerHTML = '';
          data.tokens.forEach(function (token) {
            var tokenElement = document.createElement('div');
            tokenElement.className = 'token';
            tokenElement.innerHTML = "\n                <p>ID: ".concat(token.id, "</p>\n                <p>Locked: ").concat(token.locked, "</p>\n                <button onclick=\"deleteToken('").concat(token.id, "')\">Delete</button>\n                <button onclick=\"lockToken('").concat(token.id, "')\">Lock</button>\n            ");
            tokensContent.appendChild(tokenElement);
          });
          _context2.next = 16;
          break;

        case 12:
          _context2.prev = 12;
          _context2.t0 = _context2["catch"](0);
          console.error('Error fetching tokens:', _context2.t0);
          document.getElementById('tokens-content').innerHTML = '<p>Error fetching tokens</p>';

        case 16:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[0, 12]]);
}

function deleteToken(id) {
  return regeneratorRuntime.async(function deleteToken$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          _context3.next = 3;
          return regeneratorRuntime.awrap(fetch("/tokens/".concat(id), {
            method: 'DELETE',
            headers: {
              'Authorization': "Bearer ".concat(localStorage.getItem('apiToken'))
            }
          }));

        case 3:
          fetchTokens();
          _context3.next = 9;
          break;

        case 6:
          _context3.prev = 6;
          _context3.t0 = _context3["catch"](0);
          console.error('Error deleting token:', _context3.t0);

        case 9:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[0, 6]]);
}

function lockToken(id) {
  return regeneratorRuntime.async(function lockToken$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.prev = 0;
          _context4.next = 3;
          return regeneratorRuntime.awrap(fetch("/tokens/".concat(id, "/lock"), {
            method: 'PATCH',
            headers: {
              'Authorization': "Bearer ".concat(localStorage.getItem('apiToken'))
            }
          }));

        case 3:
          fetchTokens();
          _context4.next = 9;
          break;

        case 6:
          _context4.prev = 6;
          _context4.t0 = _context4["catch"](0);
          console.error('Error locking token:', _context4.t0);

        case 9:
        case "end":
          return _context4.stop();
      }
    }
  }, null, null, [[0, 6]]);
}