require("dotenv").config();
const express = require("express");
const router = express.Router();
var cfenv = require("cfenv");
var mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
var User = require("../models/users.js");
var Game = require("../models/games.js");
var Session = require("../models/sessions.js");
var socketAPI = require("../socketAPI");

//CF variables
var appEnv = cfenv.getAppEnv();
console.log(appEnv);

var sURL = appEnv.getServiceURL("ad_16459ca7380ad71");
if (appEnv.port == 6002) {
  var baseURL = appEnv.url.slice(0, appEnv.url.length - 4) + 3000;
} else {
  var baseURL = appEnv.url;
}

var mongoDB = process.env.mongo;
mongoose.connect(mongoDB, { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

// Home page
router.get("/", (req, res) => {
  socketAPI.sendNotification("Reloading...");
  res.render("index", {
    appEnv: appEnv,
    redirect_uri: baseURL + "/users/callback",
  });
});

// Get notified when the user is navigating back
router.post("/going_back", function (req, res) {
  console.log(req.body.dest);
  if (req.body.from == "#postSelectView" && req.body.to == "#selectView") {
    Session.findOne({ code: req.body.code }).exec(function (err, curSession) {
      var index = curSession.users.findIndex((obj) => obj.user == req.user.id);
      curSession.users[index].done = false;
      if (req.user.id == curSession.owner) {
        switch (req.body.dest) {
          case "#selectView":
          case "#codeView":
          case "#homeView":
            curSession.lock = "#selectView";
            break;
          case "#postSelectView":
            curSession.lock = "#postSelectView";
        }
      }
      curSession.save().then(function (err, status) {
        socketAPI.addGame({ code: req.body.code });
        res.send({ status: "User editing again" });
      });
    });
  } else {
    res.send({ status: "Thank you for traveling with TTS Airlines" });
  }
});

//Get current user's complete list object
router.post("/get_user_lists_populated", (req, res) => {
  if (req.user) {
    User.findOne({ profile_id: req.user.id })
      .populate("lists.allGames")
      .populate("lists.custom.games")
      .exec(function (err, curUser) {
        if (curUser) {
          if (curUser.lists) {
            res.send(curUser.lists);
          } else {
            newUser = {
              profile_id: req.user.id,
              name: req.user.profile.firstName,
              lists: { allGames: [], custom: [] },
            };
            curUser = new User(newUser);
            curUser.save();
            res.send(curUser.lists);
          }
        } else {
          newUser = {
            profile_id: req.user.id,
            name: req.user.profile.firstName,
            lists: { allGames: [], custom: [] },
          };
          curUser = new User(newUser);
          curUser.save();
          res.send(curUser.lists);
        }
      });
  } else {
    res.send({ err: "Log in before populating user object" });
  }
});

//Get current user's  lists
router.post("/get_user_lists", (req, res) => {
  if (req.user) {
    User.findOne({ profile_id: req.user.id }).exec(function (err, curUser) {
      var resLists = curUser.lists.custom;
      var resArray = [];
      for (var i = 0; i < resLists.length; i++) {
        resArray.push(resLists[i].name);
      }
      //var resLists = ["Test List"];
      Array.prototype.unshift.apply(resArray, ["All Games"]);

      console.log(resArray);

      res.send(resArray);
    });
  } else {
    res.send({ err: "Log in first!!!" });
  }
});

//Get games from a user's single list
router.post("/get_user_list_games", (req, res) => {
  if (req.user) {
    User.findOne({ profile_id: req.user.id })
      .populate("lists.allGames")
      .exec(function (err, curUser) {});
  }
});

//Add a game to a user's "All Games" list
router.post("/game_add", function (req, res) {
  if (req.user) {
    console.log("User2: " + req.user.profile.firstName);
    var upsertOptions = { new: true, upsert: true };
    Game.findOneAndUpdate(
      {
        name: req.body.game,
      },
      { name: req.body.game },
      upsertOptions,
      function (err, game) {
        if (!game.rating) {
          game.rating = 0;
        }
        if (!game.owned) {
          game.owned = 0;
        }
        console.log(game);
        game.save().then(function (game) {
          User.findOneAndUpdate(
            {
              profile_id: req.user.id,
              name: req.user.profile.firstName,
            },
            { profile_id: req.user.id },
            upsertOptions,
            function (err, curUser) {
              //if game and user both exist, add the game unless it's already added
              function findGame(checkGame) {
                return checkGame.toString() == game._id.toString();
              }
              var gamesList = curUser.lists.allGames;
              theGame = gamesList.find(findGame);

              if (theGame) {
                //if it's already in the array, do nothing
                //Here's how to get the game's name
                Game.findById(theGame, "name", function (err, gameToReport) {
                  console.log("Game name: " + gameToReport.name);
                });
                res.send({ err: theGame + " has already been added" });
              } else {
                //if it's not, push it to the array and save the user
                curUser.lists.allGames.push(game._id);
                console.log("theGame: ", theGame);
                curUser.save().then(function (theUser) {
                  Game.findById(game._id, "name", function (err, gameToReport) {
                    if (gameToReport) {
                      console.log("Game name: " + gameToReport.name);
                      res.send({ status: gameToReport });
                    } else {
                      res.send({
                        err:
                          "Error: game not added, maybe you checked too early.",
                      });
                    }
                  });
                });
              }
            }
          );
        });
      }
    );
  } else {
    res.send({ err: "Log in first!!" });
  }
});

function gameCreate(name) {
  var gamedetail = { name: name, rating: 0, owned: 0 };
  var game = new Game(gamedetail);
  return game;
}

function userCreate(id, name) {
  var userdetail = {
    profile_id: id,
    name: name,
    games: [],
    lists: [],
  };
  var user = new User(userdetail);
  return user;
}

router.post("/join_session", function (req, res) {
  Session.findOne({ code: req.body.code }).exec(function (err, curSession) {
    console.log(curSession);
    if (!curSession) {
      console.log("Error: ", err);
      console.log("Session: ", curSession);
      res.send({ err: "No such session" });
    } else {
      var sendGames = checkIfAddedByUser(curSession, req.user.id);
      var newUser = true;
      var lock = curSession.lock;
      if (lock == "codeView") {
        lock = "selectView";
      }
      for (var i = 0; i < curSession.users.length; i++) {
        if (curSession.users[i].user == req.user.id) {
          newUser = false;
          console.log(curSession.users[i]);
          if (curSession.users[i].done) {
            lock = "postSelectView";
          }
        }
      }
      console.log("newUser ", newUser);
      if (newUser) {
        curSession.users.push({ user: req.user.id, done: false });
        curSession.save().then(function () {
          socketAPI.addGame({
            code: req.body.code,
          });
        });
      }
      res.send({
        code: curSession.code,
        lock: lock,
        games: sendGames,
      });
    }
  });
});

function checkIfAddedByUser(theSession, userId) {
  var ret = [];
  console.log(theSession.games.length);
  for (var i = 0; i < theSession.games.length; i++) {
    function isAddedBy(toCheck) {
      return toCheck.toString() == userId;
    }
    if (theSession.games[i].addedBy.findIndex(isAddedBy) > -1) {
      ret.push(theSession.games[i]);
    }
  }
  return ret;
}

router.post("/create_session", function (req, res) {
  if (req.user) {
    Session.findOne({ owner: req.user.id }).exec(function (err, curSession) {
      console.log(curSession);

      function makeid(length) {
        var result = "";
        var characters =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
          result += characters.charAt(
            Math.floor(Math.random() * charactersLength)
          );
        }
        return result;
      }

      var theCode = makeid(5);

      if (!curSession) {
        var sessiondetail = {
          owner: req.user.id,
          code: theCode,
          games: [],
          users: [{ user: req.user.id, done: false }],
          lock: "codeView",
        };
        var session = new Session(sessiondetail);
        session.save().then(function (theSession) {
          socketAPI.sendNotification("Session created...");
          socketAPI.addGame({
            code: theCode,
          });
          res.send({ status: theSession, user: req.user.id });
        });
      } else {
        var sendGames = checkIfAddedByUser(curSession, req.user.id);
        var tosave = false;
        for (var i = 0; i < curSession.games.length; i++) {
          if (curSession.games[i].addedBy.length == 0) {
            curSession.games[i].addedBy = curSession.owner;
            tosave = true;
          }
          console.log(curSession.games[i], tosave);
          if (tosave) {
            curSession.save();
          }
        }
        socketAPI.sendNotification("Session already created...");
        socketAPI.addGame({
          code: curSession.code,
        });
        res.send({ status: curSession, games: sendGames, user: req.user.id });
      }
    });
  } else {
    res.send({ err: "No user" });
  }
});

router.post("/add_game_to_session", function (req, res) {
  if (req.user) {
    Session.findOne({ code: req.body.code }).exec(function (err, curSession) {
      var results = [];

      if (req.body.gamesToAdd.length > 0) {
        for (var i = 0; i < req.body.gamesToAdd.length; i++) {
          var numGames = 0;
          //1. Has the game already been added to the session?
          //2. Is the user's id already in the list of owners?
          var id = mongoose.Types.ObjectId(req.body.gamesToAdd[i]);
          var gameAdded = false;
          var ownedBy = false;
          var index = -1;
          for (var j = 0; j < curSession.games.length; j++) {
            if (curSession.games[j].game.toString() == req.body.gamesToAdd[i]) {
              gameAdded = true;
              index = j;
              if (curSession.games[j].addedBy.includes(req.user.id)) {
                ownedBy = true;
                console.log(numGames);
              }
            }
            if (curSession.games[j].addedBy.includes(req.user.id)) {
              numGames++;
            }
          }
          if (gameAdded) {
            if (ownedBy) {
              results.push({ err: "Already added by this user" });
            } else {
              console.log(numGames);
              curSession.games[index].addedBy.push(req.user.id);
              results.push({
                status:
                  "Added " +
                  req.user.id +
                  " to the list of owners for " +
                  req.body.gamesToAdd[i],
              });
              socketAPI.sendNotification(
                "A user added a game that someone else already added..." +
                  numGames
              );
            }
          } else {
            curSession.games.push({ game: id, addedBy: [req.user.id] });
            results.push({
              status:
                "Added " +
                req.body.gamesToAdd[i] +
                "to the list with owner " +
                req.user.id,
            });
            socketAPI.sendNotification("A user added a new game..." + numGames);
          }
        }

        curSession.save().then(function () {
          socketAPI.addGame({
            code: req.body.code,
          });
        });
        res.send(results);
      } else {
        if (req.body.gamesToRemove.length > 0) {
          //Find the game to remove, then remove the owner from the addedBy array
          for (var i = 0; i < req.body.gamesToRemove.length; i++) {
            var numGames = 0;
            var gameAdded = false;
            var ownedBy = false;
            var index = -1;
            var game = curSession.games.findIndex(
              (obj) => obj.game.toString() == req.body.gamesToRemove[i]
            );
            //console.log("game: ", game);
            if (game > -1) {
              //console.log(curSession.games[game]);
              var toRemove = curSession.games[game].addedBy.findIndex(
                (obj) => obj == req.user.id
              );
              //console.log("toRemove: ", toRemove);
              if (toRemove > -1) {
                curSession.games[game].addedBy.splice(toRemove, 1);
                socketAPI.sendNotification("A user removed a game...");
              }
            }
          }
          for (var i = 0; i < curSession.games.length; i++) {
            console.log(
              curSession.games[i].addedBy[0],
              "|",
              req.user.id.toString()
            );
            if (
              curSession.games[i].addedBy.findIndex(
                (obj) => obj == req.user.id.toString()
              ) > -1
            ) {
              numGames++;
            }
          }
          console.log("numGamestoRemove: ", numGames);

          curSession.save().then(function () {
            socketAPI.addGame({
              code: req.body.code,
            });
          });
        }
      }
    });
  } else {
    res.send({ err: "Must log in to add games" });
  }
});

router.post("/submit_games", function (req, res) {
  if (req.user) {
    Session.findOne({ code: req.body.code }).exec(function (err, curSession) {
      socketAPI.sendNotification("A user finished adding games...");
      var index = curSession.users.findIndex((obj) => obj.user == req.user.id);
      curSession.users[index].done = true;
      curSession.save().then(function () {
        socketAPI.addGame({ code: req.body.code });
      });
      if (curSession.owner == req.user.id.toString()) {
        var htmlString =
          '<div id="postSelectLoadingMessage"><p>There are ' +
          curSession.users.length +
          " users connected:</p>";
        for (var i = 0; i < curSession.users.length; i++) {
          htmlString += "<p>" + curSession.users[i] + "</p>";
        }
        res.send({ status: htmlString });
      } else {
        var htmlString = `
        <img class="loader" src="/img/loading.gif">
        <div class="loadingMessage" id="postSelectLoadingMessage">Please wait...</div>
        `;
        res.send({ status: htmlString });
      }
    });
  } else {
    res.send({ err: "Not logged in." });
  }
});

router.post("/lock_games", function (req, res) {
  if (req.user) {
    Session.findOne({ code: req.body.code }).exec(function (err, curSession) {
      socketAPI.lockGames({ code: req.body.code });
      var gameList = [];
      for (var i = 0; i < curSession.games.length; i++) {
        gameList.push(mongoose.Types.ObjectId(curSession.games[i].game));
        console.log(curSession.games[i].game);
      }
      curSession.votes = [];
      Game.find({ _id: { $in: gameList } }).exec(function (err, games) {
        console.log(games);
        var gameArray = [];
        for (var i = 0; i < games.length; i++) {
          gameArray.push(games[i].name);
        }
        var htmlString =
          `<div class="button lightGreyBtn" id="gameUnlock" type="submit">Unlock Game List</div>` +
          `<div id="addGroupGamesContainer">` +
          `<div id="addGroupGamesTitle">Add Games to Session:</div>` +
          `<div class="textInputCont" id="addGamesInputCont">` +
          `<input class="textInput" type="text" id="addGamesInput">` +
          `<div class="textClear"></div>` +
          `</div>` +
          `</div>` +
          `<div id="editGameList">`;
        for (var i = 0; i < gameArray.length; i++) {
          curSession.votes.push({
            game: mongoose.Types.ObjectId(gameList[i]._id),
            voters: [],
          });
          htmlString +=
            `<li><div class="editGame">` +
            gameArray[i] +
            `</div>` +
            `<div class='toggle'>
          <label class="switch">
              <input type="checkbox" checked onclick="toggleEdit(this)" game_id="` +
            gameList[i]._id +
            `">
              <span class="slider round"></span>
          </label>
      </div></li>`;
        }

        htmlString +=
          `</div>` +
          `<div class="button greenBtn" id="editGameSubmit">Begin Voting</div>`;
        curSession.save();
        res.send({ status: "locked games", htmlString: htmlString });
      });
    });
  } else {
    res.send({ err: "Not logged in" });
  }
});

router.post("/modify_edit_list", function (req, res) {
  if (req.user) {
    Session.findOne({ code: req.body.code }).exec(function (err, curSession) {
      if (typeof curSession.votes == "undefined") {
        curSession.votes = [];
      }
      if (req.body.gamesToAdd.length > 0) {
        for (var i = 0; i < req.body.gamesToAdd.length; i++) {
          var index = curSession.games.findIndex(
            (obj) => obj.game.toString() == req.body.gamesToAdd[i]
          );
          if (index > -1) {
            var indexa = curSession.votes.findIndex(
              (obj) => obj.game.toString() == req.body.gamesToAdd[i]
            );
            if (indexa == -1) {
              //If the game has already been removed from voting array, add it back
              curSession.votes.push({
                game: mongoose.Types.ObjectId(req.body.gamesToAdd[i]),
                voters: [],
              });
            }
          } else {
            res.send({
              err: "Couldn't find game to add: " + req.body.gamesToAdd[i],
            });
          }
        }
      } else {
        if (req.body.gamesToRemove.length > 0) {
          for (var i = 0; i < req.body.gamesToRemove.length; i++) {
            var index = curSession.games.findIndex(
              (obj) => obj.game.toString() == req.body.gamesToRemove[i]
            );
            if (index > -1) {
              var indexa = curSession.votes.findIndex(
                (obj) => obj.game.toString() == req.body.gamesToRemove[i]
              );
              if (indexa > -1) {
                curSession.votes.splice(indexa, 1); //Remove the item from voting consideration
              }
              console.log(indexa, " Removed: ", curSession.games[index]);
            } else {
              res.send({
                err:
                  "Couldn't find game to remove: " + req.body.gamesToRemove[i],
              });
            }
          }
        } else {
          res.send({ err: "No games to add or remove passed" });
        }
      }
      curSession.save().then(function (error) {
        console.log("Error: ", error);
        var gameList = [];
        var ret = [];
        for (var i = 0; i < curSession.games.length; i++) {
          gameList.push(mongoose.Types.ObjectId(curSession.games[i].game));
        }
        Game.find({ _id: { $in: gameList } }).exec(function (err, games) {
          for (var i = 0; i < games.length; i++) {
            ret[i] = { name: games[i].name, id: games[i]._id };
          }
          res.send({ status: ret });
        });
      });
    });
  } else {
    res.send({ err: "Not logged in" });
  }
});

router.post("/unlock_games", function (req, res) {
  if (req.user) {
    var data = {
      code: req.body.code,
      unlock: req.body.unlock,
      user: req.user.id,
    };

    socketAPI.unlockGames(data);
    res.send({ status: "Unlocking..." });
  } else {
    res.send({ err: "Not logged in" });
  }
});

module.exports = router;
