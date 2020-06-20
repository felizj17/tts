//All DOM manipulation
window.addEventListener("load", function () {
  /*****************************/
  /*      Socket.io logic      */
  /*****************************/
  var socket = io();

  /*****************************/
  /*     Set History State     */
  /*****************************/
  //Set an extra history state to prevent back button from closing the page
  window.history.pushState({ page: "home", noBackExitsApp: true }, "");
  window.addEventListener("popstate", function (event) {
    if (event.state && event.state.noBackExitsApp) {
      window.history.pushState({ noBackExitsApp: true }, "");
    }
  });

  /*****************************/
  /*      Set Window Height    */
  /*****************************/

  window.addEventListener("resize", getvh);

  /*****************************/
  /*      Set font sizes       */
  /*****************************/
  function cFont(e) {
    var iH = window.innerHeight;
    var iW = window.innerWidth;
    var fS =
      iW / (100 / e.data.fWidth) > iH / (100 / e.data.fHeight)
        ? "calc(var(--vh, 1vh) * " + e.data.fHeight + ")"
        : e.data.fWidth + "vw";
    $(e.data.el).css("font-size", fS);
    /*console.log(
      "width: " +
        iW / (100 / e.data.fWidth) +
        ", height: " +
        iH / (100 / e.data.fHeight) +
        ", result: " +
        fS
    );*/
  }
  $(window).on(
    "resize",
    {
      el: ".pageTitle",
      mHeight: "10",
      mWidth: "10",
      fHeight: "8",
      fWidth: "10",
    },
    cFont
  );
  cFont({
    data: {
      el: ".pageTitle",
      mHeight: "10",
      mWidth: "10",
      fHeight: "8",
      fWidth: "10",
    },
  });
  $(window).on(
    "resize",
    { el: ".login", mHeight: "10", mWidth: "10", fHeight: "4", fWidth: "6" },
    cFont
  );
  cFont({
    data: {
      el: ".login",
      mHeight: "10",
      mWidth: "10",
      fHeight: "4",
      fWidth: "6",
    },
  });
  $(window).on(
    "resize",
    {
      el: "#addGamesTitle",
      mHeight: "10",
      mWidth: "10",
      fHeight: "4",
      fWidth: "6",
    },
    cFont
  );
  cFont({
    data: {
      el: "#addGamesTitle",
      mHeight: "10",
      mWidth: "10",
      fHeight: "4",
      fWidth: "6",
    },
  });

  /*****************************/
  /*         Menu toggle       */
  /*****************************/
  //Close menu
  function closeMenu() {
    $("#menu").css("transform", "translateX(-60vh)");
    $("#menuCatch").addClass("off");
    window.setTimeout(function () {
      $("#menu").addClass("off");
    }, 550);
  }
  $("#menuClose").on("click", closeMenu);
  $("#menuCatch").on("click", closeMenu);
  //Open menu
  $("#menuIcon").click(this, function (el) {
    $("#menu").removeClass("off");
    $("#menuCatch").removeClass("off");
    window.setTimeout(function () {
      $("#menu").css("transform", "translateX(0vh)");
    }, 10);
  });

  /*****************************/
  /* Join button click handler */
  /*****************************/
  $("#joinButton").click(this, function (el) {
    console.log("join click");
    var oldCode = $("#code").html();
    if (oldCode != false) {
      socket.off(oldCode + "select");
    }
    $("#code").html("");
    $("#postSelectContainer").html("");
    $("#codeInputGroup").removeClass("off");
    window.setTimeout(function () {
      console.log("wait 1");
      $("#joinButton").css({
        opacity: "0%",
        transform: "translateX(100vw)",
      });
      $("#codeInputGroup").css({
        opacity: "100%",
        transform: "translateX(0px)",
      });
      $("#createButton").css({
        transform: "translateY(12vh)",
      });
      window.setTimeout(function () {
        console.log("wait 2");
        $("#joinButton").addClass("off");
      }, 600);
    }, 10);
  });

  /*****************************/
  /*  Text input clear button  */
  /*****************************/
  $(".textClear").click(this, function (el) {
    if ($(this).parent().children("input").first().val() == "") {
      $("#joinButton").removeClass("off");
      window.setTimeout(function () {
        console.log("wait 1");
        $("#joinButton").css({
          opacity: "100%",
          transform: "translateX(0vw)",
        });
        $("#codeInputGroup").css({
          opacity: "0%",
          transform: "translateX(-100vw)",
        });
        $("#createButton").css({
          transform: "translateY(0vh)",
        });
        window.setTimeout(function () {
          console.log("wait 2");
          $("#codeInputGroup").addClass("off");
          $(".errorText").addClass("off");
        }, 600);
      }, 10);
    } else {
      $(this).parent().children("input").first().val("");
      console.log($(this).parent().children("input").first().val());
    }
  });

  /*****************************/
  /*     Back arrow handler    */
  /*****************************/
  $("#backArrow").click(this, function (el) {
    //Going to have to notify the server so that the owner of a session
    //can know that someone went back to a previous step

    var dest = $("#backArrow").attr("data-gobackto");

    const gb_options = {
      method: "POST",
      body: JSON.stringify({
        to: dest,
        from: window.hist[window.hist.length - 1],
        code: $("#code").text(),
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
    fetch("/going_back", gb_options);

    goBackFrom(
      window.hist[window.hist.length - 1],
      window.hist[window.hist.length - 2]
    );
  });

  /*****************************/
  /*   Submit button handler   */
  /* Checks user inputted code */
  /*    Calls join_session     */
  /*****************************/
  $("#codeSubmit").click(this, function (el) {
    clearLists(); //Clear any lists in #selectView
    $(".errorText").removeClass("shake"); //Stop shaking if started
    const js_options = {
      method: "POST",
      body: JSON.stringify({ code: $("#codeInput input").val() }),
      headers: {
        "Content-Type": "application/json",
      },
    };
    fetch("/join_session", js_options).then(function (response) {
      return response.json().then((res) => {
        console.log("join session ", res);
        if (res.err) {
          //If there is no session to join, tell the user
          window.setTimeout(function () {
            $(".errorText").removeClass("off").addClass("shake");
          }, 5);
          //Move the create button out of the way of the error text:
          $("#createButton").css({
            transform: "translateY(14vh)",
          });
        } else {
          //If the session join was successful:
          $("#backArrow").removeClass("off"); //Show the back arrow
          setCode(res.code);
          console.log(res.lock);

          var sessionGames = "<session>";
          for (var i = 0; i < res.games.length; i++) {
            sessionGames +=
              '<sessionGame id="' + res.games[i].game + '"></sessionGame>';
          }
          $("#sessionContainer").html(sessionGames);

          console.log("initGreenLists");
          initGreenLists();

          var isLockBack = false;
          switch (res.lock) {
            case "#postSelectView":
              goForwardFrom("#homeView", "#postSelectView");
              window.hist = ["#homeView", "#selectView", "#postSelectView"];
            case "#postPostSelectView":
              goForwardFrom("#homeView", "#postSelectView");
              //lockback();
              break;
            case "#voteView":
              const gv_options = {
                method: "POST",
                body: JSON.stringify({ code: $("#code").text() }),
                headers: {
                  "Content-Type": "application/json",
                },
              };
              fetch("/get_votes", gv_options).then(function (response) {
                return response.json().then((res) => {
                  console.log(res);
                  fillVotes(res.games);
                  goForwardFrom("#homeView", "#voteView");
                });
              });
              break;
            case "#playView":
              const gg_options = {
                method: "POST",
                body: JSON.stringify({ code: $("#code").text() }),
                headers: {
                  "Content-Type": "application/json",
                },
              };
              fetch("/get_games", gg_options).then(function (response) {
                return response.json().then((res) => {
                  fillGames(res.games);
                  goForwardFrom("#homeView", "#playView");
                });
              });
              break;
            default:
              goForwardFrom("#homeView", res.lock);
              //lockBack()
              break;
          }
          /*******************************************/
          /* Subscribe to the code+"client" event, where if lockBack==true and unlock is set,*/
          /* it will lock the back arrow to home and move the client ahead to the session lock.*/
          /* The owner can also unlock by passing unlockBack==true and setting unlock to either*/
          /* a string or an array of history states which the client will have access to.*/
          /*******************************************/
          console.log("Setting up client event with " + res.code);
          socket.on(res.code + "client", (data) => {
            console.log("Got client event", data);
            if (data.lockBack && data.lock) {
              goForwardFrom(window.hist[window.hist.length - 1], data.lock);
              lockBack();
            }
            if (data.unlockBack && data.unlock) {
              console.log(data);
              if (data.unlock == "selectView") {
                window.hist = ["#homeView", "#selectView", "#postSelectView"];
              }
              goBackFrom(
                window.hist[window.hist.length - 1],
                window.hist[window.hist.length - 2]
              );
            }
            if (data.startVoting) {
              console.log("this isn't done yet!");
              //parse the voting data and output
              fillVotes(data.games);
            }
            if (data.play) {
              fillGames(data.games);
              goForwardFrom("#postVoteView", "#playView");
            }
          });
        }
      });
    });
  });

  /*****************************/
  /*   Create Button Handler   */
  /*****************************/
  $("#createButton").click(this, function () {
    console.log("create");
    clearLists();
    const cs_options = {
      method: "POST",
      body: "",
      headers: {
        "Content-Type": "application/json",
      },
    };
    fetch("/create_session", cs_options).then(function (response) {
      return response.json().then((res) => {
        console.log(!res.err, " create_session res: ", res);
        if (!res.err) {
          socket.on(res.status.code + "owner", (data) => {
            if (data.selectEvent) {
              //Rewrite #postSelectContainer in real time for owner
              showSelect(data.select);
            }
            if (data.startVoting) {
              //Parse the voting data and output
              fillVotes(data.games);
            }
            if (data.voteSubmit) {
              //Rewrite the voting status screen in real time
              fillPostVote(data.users);
            }
            if (data.play) {
              //Fill the final list of games to play
              fillGames(data.games);
            }
          });
          $("#backArrow").removeClass("off");
          setCode(res.status.code);
          var index = res.status.users.findIndex((obj) => obj.user == res.user);
          var dest = res.status.lock;
          if (
            res.status.users[index].done == false &&
            dest == "#postSelectView"
          ) {
            dest = "#selectView";
            console.log("changing");
          }
          var toLock = false;
          if (dest == "#postPostSelectView") {
            dest = "#postSelectView";
            toLock = true;
          }
          if (dest == "#selectView") {
            dest = "#codeView";
          }
          if (dest == "#voteView") {
            var games = [];
            for (var i = 0; i < res.status.votes.length; i++) {
              if (res.status.votes[i].active) {
                games.push({
                  game: res.status.votes[i].game,
                  name: res.status.votes[i].name,
                });
              }
            }
            fillVotes(games);
          }
          if (dest == "#postVoteView") {
            var users = [];
            for (var i = 0; i < res.status.users.length; i++) {
              users.push({
                doneVoting: res.status.users[i].doneVoting,
                name: res.status.users[i].name,
              });
            }
            fillPostVote(users);
          }
          if (dest == "#playView") {
            var games = [];
            for (var i = 0; i < res.status.votes.length; i++) {
              games[i] = { name: res.status.votes[i].name, votes: 0 };
              for (var j = 0; j < res.status.votes[i].voters.length; j++) {
                games[i].votes += res.status.votes[i].voters[j].vote;
              }
            }
            games.sort(function (a, b) {
              var x = a.votes;
              var y = b.votes;
              return x < y ? 1 : x > y ? -1 : 0;
            });
            fillGames(games);
          }
          console.log("dest: " + dest);
          goForwardFrom("#homeView", dest);
          // Here we need to be sure to add all the intermediate steps to window.hist so user can backtrack as appropriate when reconnecting
          window.hist = ["#homeView", "#codeView"];
          switch (dest) {
            case "#postSelectView":
            case "#selectView":
            case "#playView":
              window.hist.push(dest);
              break;
            case "#voteView":
              window.hist.pop();
              window.hist.push("#voteView");
          }
          console.log("hist after creating: ", window.hist);
          if (toLock) {
            lockGames(res.status.code);
          }
          var sessionGames = "<session>";
          if (res.games) {
            for (var i = 0; i < res.games.length; i++) {
              sessionGames +=
                '<sessionGame id="' + res.games[i].game + '"></sessionGame>';
            }
          }
          document.getElementById("sessionContainer").innerHTML = sessionGames;
          console.log("initGreenLists");
          initGreenLists();
        }
      });
    });
  });

  /***********************************/
  /*   Copy the code to clipboard    */
  /***********************************/
  $("#copyButton").on("click", function () {
    $("#copiedAlert").css({ opacity: 1 });
    var copyText = document.getElementById("code").innerHTML;
    const el = document.createElement("textarea");
    el.value = copyText;
    document.body.appendChild(el);

    /* Select the text field */
    el.select();
    el.setSelectionRange(0, 99999); /*For mobile devices*/

    /* Copy the text inside the text field */
    document.execCommand("copy");
    document.body.removeChild(el);

    window.setTimeout(function () {
      $("#copiedAlert").css({ opacity: 0 });
    }, 1000);
  });

  /***********************************/
  /*         Share the code          */
  /*  This won't work without HTTPS  */
  /***********************************/

  document.getElementById("shareButton").addEventListener("click", async () => {
    var resultPara = "";
    var shareData =
      "Join my TidySquirrel session! Our code is " +
      document.getElementById("code").innerHTML;
    try {
      await navigator.share(shareData);
      resultPara.textContent = "MDN shared successfully";
      console.log(resultPara.textContent);
    } catch (err) {
      if (resultPara) {
        resultPara.textContent = "Error: " + err;
        console.log(resultPara.textContent);
      } else {
        console.log("didn't work");
      }
    }
  });

  function lockGames(code) {
    const lg_options = {
      method: "POST",
      body: JSON.stringify({ code: code }),
      headers: {
        "Content-Type": "application/json",
      },
    };
    fetch("/lock_games", lg_options).then(function (lresponse) {
      return lresponse.json().then((lres) => {
        console.log(lres);
        $("#backArrow").addClass("off");
        $("#postSelectView").css({
          transform: "translateX(-200vw)",
        });
        window.setTimeout(function () {
          $("#postSelectTitle").html("Edit Games List 🐿️");
          $("#postSelectContainer").html(lres.htmlString);
          registerEGS();
          $("#postSelectView").css({ transition: "transform 0s" });
          $("#postSelectView").css({
            transform: "translateX(200vw)",
          });
          window.setTimeout(function () {
            $("#postSelectView").css({ transition: "transform 1s" });
            $("#postSelectView").css({
              transform: "translateX(-0vw)",
            });
            var addGamesInput = document.getElementById("addGroupGamesInput");
            addGamesInput.addEventListener("keyup", function (event) {
              // Number 13 is the "Enter" key on the keyboard
              if (event.keyCode === 13) {
                console.log("submitting new group game");
                event.preventDefault();
                var game = addGroupGamesInput.value;
                const options = {
                  method: "POST",
                  body: JSON.stringify({ game: game, code: $("#code").text() }),
                  headers: {
                    "Content-Type": "application/json",
                  },
                };
                //add_user_game_unsorted
                fetch("/group_game_add", options).then(function (response) {
                  return response.json().then((res) => {
                    if (res.err) {
                      console.log(res);
                      if ((res.err = "added")) {
                        $("#addGroupGamesInput").css(
                          "color",
                          "var(--main-red)"
                        );
                        $('input[game_id="' + res.game + '"]').each(
                          function () {
                            $(this)
                              .parent()
                              .parent()
                              .parent()
                              .css("color", "var(--main-red)");
                          }
                        );
                        $("#addGroupGamesInput").addClass("shake");
                        window.setTimeout(function () {
                          $("#addGroupGamesInput").css(
                            "color",
                            "var(--main-black)"
                          );
                          $("#addGroupGamesInput").removeClass("shake");
                          $('input[game_id="' + res.game + '"]').each(
                            function () {
                              $(this)
                                .parent()
                                .parent()
                                .parent()
                                .css("color", "var(--main-black)");
                            }
                          );
                        }, 600);
                      }
                    } else {
                      $("#editGameList").append(res.status);
                      registerEGS();
                    }
                  });
                });
              }
            });

            $("#gameUnlock").click(this, function () {
              console.log("gameUnlock");
              const ug_options = {
                method: "POST",
                body: JSON.stringify({
                  code: $("#code").text(),
                  unlock: "selectView",
                  unlockBack: true,
                }),
                headers: {
                  "Content-Type": "application/json",
                },
              };
              fetch("/unlock_games", ug_options).then(function (uresponse) {
                return uresponse.json().then((ures) => {
                  $("#backArrow").removeClass("off");
                  goBackFrom("#postSelectView", "#selectView");
                  console.log(ures);
                });
              });
            });
          }, 10);
        }, 300);
      });
    });
  }

  /*****************************/
  /* Select button transition  */
  /*****************************/

  $("#selectButton").click(this, function () {
    //$("#backArrow").attr("data-gobackto", "code");
    goForwardFrom("#codeView", "#selectView");
  });

  /**********************************/
  /*  Get a User's Populated Lists  */
  /**********************************/
  function gulp() {
    const gulp_options = {
      method: "POST",
      body: "",
      headers: {
        "Content-Type": "application/json",
      },
    };
    fetch("/get_user_lists_populated", gulp_options).then(function (response) {
      //Gets the populated list, which is an object with two arrays,
      //"allGames", which is supposed to have every game, and "custom",
      //which has the user's custom lists. Array elements in allGames
      //are objects which have the properties "rating", "name", and "owned".
      //Array elements in custom are objects which have the properties "games"
      //and "name". "Games" is an array of objects that each have the properties "rating",
      //"name", and "owned".
      return response.json().then((res) => {
        if (!res.err) {
          console.log("gulp", res);
          addListDisplay(0, "All Games");
          for (var i = 0; i < res.allGames.length; i++) {
            var curSession = document.getElementsByTagName("session")[0];
            var checked = "";
            var greenText = "";
            $(curSession)
              .children()
              .each(function (ind, el) {
                if ($(el).attr("id") == res.allGames[i]._id.toString()) {
                  checked = " checked";
                  greenText = " greenText";
                }
              });
            var htmlString =
              `
            <li>
                <div rating="` +
              res.allGames[i].rating +
              `" owned="` +
              res.allGames[i].owned +
              `" class="gameName` +
              greenText +
              `" game_id="` +
              res.allGames[i]._id +
              `">` +
              res.allGames[i].name +
              `
                </div>
                <div class='toggle'>
                    <label class="switch">
                        <input type="checkbox"` +
              checked +
              ` onclick="toggleFont(this)" game_id="` +
              res.allGames[i]._id +
              `">
                        <span class="slider round"></span>
                    </label>
                </div>
            </li>`;
            $("li#0").children(".listGames").first().append(htmlString);
          }
          for (var i = 0; i < res.custom.length; i++) {
            var curId = i + 1;
            addListDisplay(curId, res.custom[i].name);
            for (var j = 0; j < res.custom[i].games.length; j++) {
              var htmlString =
                `
            <li>
              <div rating="` +
                res.custom[i].games[j].rating +
                `" owned="` +
                res.custom[i].games[j].owned +
                `" class="gameName` +
                greenText +
                `" game_id="` +
                res.custom[i].games[j]._id +
                `">` +
                res.custom[i].games[j].name +
                `
              </div>
              <div class='toggle'>
                  <label class="switch">
                      <input type="checkbox"` +
                checked +
                ` onclick="toggleFont(this)" game_id="` +
                res.custom[i].games[j]._id +
                `">
                      <span class="slider round"></span>
                  </label>
              </div>
            </li>`;
              $("li#" + curId)
                .children(".listGames")
                .first()
                .append(htmlString);
            }
          }
          document.getElementById("listsContainer").innerHTML = htmlString;
        } else {
          console.log(res.err);
        }
      });
    });
  }
  gulp();

  /*****************************/
  /*    Unsorted Game Adder    */
  /*****************************/
  //Add a game to the unsorted list
  //Used in the select view
  var addGamesInput = document.getElementById("addGamesInput");

  addGamesInput.addEventListener("keyup", function (event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
      console.log("submitting new game");
      event.preventDefault();
      var game = addGamesInput.value;
      const options = {
        method: "POST",
        body: JSON.stringify({ game: game }),
        headers: {
          "Content-Type": "application/json",
        },
      };
      //add_user_game_unsorted
      fetch("/game_add", options).then(function (response) {
        return response.json().then((res) => {
          if (!res.err) {
            console.log(res);
            //if (obj.err) {console.log('add_games err: ' + obj.err ); }

            var htmlString =
              `
              <li>
                  <div rating="` +
              res.status.rating +
              `" owned="` +
              res.status.owned +
              `" class="gameName" game_id="` +
              res.status._id +
              `">` +
              res.status.name +
              `
                  </div>
                  <div class='toggle'>
                      <label class="switch">
                          <input type="checkbox" onclick="toggleFont(this)" game_id="` +
              res.status._id +
              `">
                          <span class="slider round"></span>
                      </label>
                  </div>
              </li>`;
            $("li#0").children(".listGames").first().append(htmlString);
          } else {
            console.log(res.err);
          }
        });
      });
    }
  });

  /*****************************/
  /*Game submit button handler */
  /*****************************/
  $("#gameSubmit").click(this, function () {
    const gs_options = {
      method: "POST",
      body: JSON.stringify({
        code: document.getElementById("code").innerHTML,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
    fetch("/submit_games", gs_options).then(function (response) {
      return response.json().then((res) => {
        console.log("submit res: ", res);
        //$("#backArrow").attr("data-gobackto", "select");
        goForwardFrom("#selectView", "#postSelectView");
      });
    });
  });

  /*
   *
   *
   * End of window functions
   *
   *
   */
});
//End all DOM manipulation

/***************************************************/
/*                                                 */
/*               Universal Functions               */
/*                                                 */
/***************************************************/

/*****************************/
/*         lockBack()        */
/*****************************/
function lockBack() {
  window.hist = [window.hist[0], window.hist[window.hist.length - 1]];
  $("#backArrow").attr("data-gobackto", window.hist[0]);
}

/*****************************/
/*  goForwardFrom(from, to)  */
/*****************************/
//
/**
 * {move forwards from one view to another arbitrary view}
 *
 * @param {String} from
 * @param {String} to
 */
function goForwardFrom(from, to) {
  if (from != to) {
    console.log("going forward from " + from + " to " + to);

    if (typeof window.hist == "undefined") {
      window.hist = [from];
    }
    window.hist.push(to);
    $("#backArrow").attr("data-gobackto", window.hist[window.hist.length - 2]);
    $(to).css({ transform: "translateX(200vw)" });
    $(to).removeClass("off");

    window.setTimeout(function () {
      $(to).css({ transform: "translateX(0vw)" });
      $(from).css({ transform: "translateX(-200vw)" });
    }, 100);
    window.setTimeout(function () {
      $(from).addClass("off");
      catchDisplay();
    }, 1000);
  }
}

/*****************************/
/*    goBackFrom(from, to)   */
/*****************************/
/**
 * {move backwards from one view to another arbitrary view}
 *
 * @param {String} from
 * @param {String} to
 */
function goBackFrom(from, to) {
  if (from == to) {
    if ($("#backArrow").attr("data-gobackto") == from) {
      if (
        window.hist[window.hist.length - 1] ==
        window.hist[window.hist.length - 2]
      ) {
        window.hist.pop();
      }
    }
  } else {
    if (typeof from != "undefined" && typeof to != "undefined") {
      console.log("going back from " + from + " to " + to);
      const gb_options = {
        method: "POST",
        body: JSON.stringify({
          code: document.getElementById("code").innerHTML,
          from: from,
          to: to,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      };
      fetch("/going_back", gb_options).then(function (response) {
        return response.json().then((res) => {
          console.log(res);
          window.hist.pop();
          $("#backArrow").attr(
            "data-gobackto",
            window.hist[window.hist.length - 2]
          );
          $(to).css({ transform: "translateX(-200vw)" });
          $(to).removeClass("off");
          if (to == "#homeView") {
            $("#backArrow").addClass("off");
          }
          console.log("888:Going back to " + to + " from " + from);
          window.setTimeout(function () {
            $(to).css({ transform: "translateX(0vw)" });
            $(from).css({ transform: "translateX(200vw)" });
          }, 100);
          window.setTimeout(function () {
            $(from).addClass("off");
            catchDisplay();
          }, 1000);
        });
      });
      catchDisplay();
    }
  }
}

/********************************/
/*       addListDisplay()       */
/*    Add initial list names    */
/*       to #selectgames        */
/********************************/
/**
 *
 *
 * @param {String} theId
 * @param {String} name
 */
function addListDisplay(theId, name) {
  var listString =
    `<li id="` +
    theId +
    `">
      <div class="listName">` +
    name +
    `
      </div>
      <div class="listExpand" onclick="listToggle(this)">
          <ion-icon name="chevron-down-outline"></ion-icon>
      </div>
      <div class='toggle' >
          <label class="switch">
              <input type="checkbox" onclick="toggleFont(this)">
              <span class="slider round"></span>
          </label>
      </div>
      <div class="listGames off"></div>
    </li>`;
  $("#selectLists").append(listString);
}

function recheckGreenLists() {
  console.log("recheck");
  $("#selectLists>li").each(function (ind, ele) {
    var count = 0;
    $(ele)
      .children(".listGames")
      .first()
      .children("li")
      .each(function (i, e) {
        if ($(e).children(".gameName").first().hasClass("greenText")) {
          count++;
          console.log(
            count,
            $(ele).children(".listGames").first().children("li").length
          );
        }
      });
    if (count == $(ele).children(".listGames").first().children("li").length) {
      $(ele).children(".listName").first().addClass("greenText");
      $(ele)
        .children(".toggle")
        .children(".switch")
        .children("input")
        .prop("checked", true);
      console.log("checked one box");
    } else {
      $(ele).children(".listName").first().removeClass("greenText");
      $(ele)
        .children(".toggle")
        .first()
        .children(".switch")
        .children("input")
        .prop("checked", false);
      console.log("unchecked!");
    }
  });
}

//Check list boxes and change text to green on first display
//by getting the list of games already added to the session
//and checking to see if every game in a list has been added
function initGreenLists() {
  console.log("initGreenLists");
  var sessionGames = [];
  $("session")
    .children()
    .each(function (i, e) {
      sessionGames.push($(e).attr("id"));
    });
  console.log(sessionGames);

  $("#selectLists li").each(function (ind, ele) {
    var count = 0;
    $(ele)
      .children(".listGames")
      .first()
      .children("li")
      .each(function (i, e) {
        var eID = $(e).children(".gameName").first().attr("game_id");
        if (sessionGames.findIndex((item) => item == eID) > -1) {
          count++;
          console.log(count + " ," + $(e).parent().children().length);
          var toggle = $(e)
            .children(".toggle")
            .children(".switch")
            .children("input");
          $(toggle).attr("onclick", "");
          $(toggle).prop("checked", true);
          $(e).children(".gameName").first().addClass("greenText");
          $(toggle).attr("onclick", "toggleFont(this)");
        } else {
          var toggle = $(e)
            .children(".toggle")
            .children(".switch")
            .children("input");
          $(toggle).attr("onclick", "");
          $(toggle).prop("checked", false);
          $(e).children(".gameName").first().removeClass("greenText");
          $(toggle).attr("onclick", "toggleFont(this)");
        }
        if (count == $(e).parent().children().length) {
          $(e)
            .parent()
            .parent()
            .children(".listName")
            .first()
            .addClass("greenText");
          $(e)
            .parent()
            .parent()
            .children(".toggle")
            .first()
            .children(".switch")
            .children("input")
            .first()
            .prop("checked", true);
        }
      });
  });
}

/***********************************/
/* Change Font color of game names */
/* and handle category checking    */
/***********************************/

function makeGreenSelect(id) {
  $('.gameName[game_id="' + id + '"]').each(function (i, e) {
    $(e).addClass("greenText");
    $(e)
      .parent()
      .children(".toggle")
      .children(".switch")
      .children("input")
      .first()
      .prop("checked", true);
  });
  //recheckGreenLists();
}
function unMakeGreenSelect(id) {
  console.log("unmake " + id);
  $('.gameName[game_id="' + id + '"]').each(function (i, e) {
    $(e).removeClass("greenText");
    $(e)
      .parent()
      .children(".toggle")
      .children(".switch")
      .children("input")
      .first()
      .prop("checked", false);
  });
  //recheckGreenLists();
}

/***********************************/
/*       Clear all checkboxes      */
/***********************************/
function clearLists() {
  console.log("clearing...");
  $("selectLists")
    .children()
    .each(function (i) {
      $(this)
        .children(".listGames")
        .first()
        .children("li")
        .each(function (j) {
          var el = $(this)
            .children(".toggle")
            .first()
            .children(".switch")
            .first()
            .children("input")
            .first();
          el.attr("onclick", "");
          el.prop("checked", false);
          el.attr("onclick", "toggleFont(this)");
          console.log("cleared: ", el);
        });
    });
}

function toggleEdit(check) {
  var el = $(check).parent().parent().parent().children(".editGame").first();
  var gamesToAdd = [];
  var gamesToRemove = [];
  if ($(check).is(":checked")) {
    el.addClass("greenText");
    gamesToAdd.push($(check).attr("game_id"));
  } else {
    el.removeClass("greenText");
    gamesToRemove.push($(check).attr("game_id"));
  }
  const mel_options = {
    method: "POST",
    body: JSON.stringify({
      gamesToAdd: gamesToAdd,
      gamesToRemove: gamesToRemove,
      code: document.getElementById("code").innerHTML,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch("/modify_edit_list", mel_options).then(function (response) {
    return response.json().then((res) => {
      if (!res.err) {
        var htmlString = "";
        for (var i = 0; i < res.status.length; i++) {
          htmlString +=
            `<li><div class="editGame">` +
            res.status[i].name +
            `</div>` +
            `<div class='toggle'>
          <label class="switch">
              <input type="checkbox" checked onclick="toggleEdit(this)" game_id="` +
            res.status[i].id +
            `">
              <span class="slider round"></span>
          </label>
      </div></li>`;
        }
        $("#editGameList").html = htmlString;
        registerEGS();
      } else {
        console.log(res.err);
      }
    });
  });
}

function registerEGS() {
  $("#editGameSubmit").click(this, function () {
    const egs_options = {
      method: "POST",
      body: JSON.stringify({
        code: document.getElementById("code").innerHTML,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
    fetch("/start_voting", egs_options).then(function (response) {
      return response.json().then((res) => {
        console.log("starting voting: ", res);
        goForwardFrom("#postSelectView", "#voteView");
      });
    });
  });
}

function toggleFont(check) {
  var el = $(check).parent().parent().parent().children(".gameName").first();
  var gamesToAdd = [];
  var gamesToRemove = [];
  if (el.length > 0) {
    if ($(check).is(":checked")) {
      el.addClass("greenText");
      gamesToAdd.push($(check).attr("game_id"));
      makeGreenSelect($(check).attr("game_id"));
    } else {
      el.removeClass("greenText");
      gamesToRemove.push($(check).attr("game_id"));
      unMakeGreenSelect($(check).attr("game_id"));
    }
  } else {
    $(check)
      .parent()
      .parent()
      .parent()
      .children(".listName")
      .first()
      .toggleClass("greenText");
    var el = $(check)
      .parent()
      .parent()
      .parent()
      .children(".listGames")
      .children("li");
    if ($(check).is(":checked")) {
      el.each(function (i) {
        if (
          !$(this)
            .children(".toggle")
            .children()
            .children("input")
            .is(":checked")
        ) {
          gamesToAdd.push($(this).children(".gameName").attr("game_id"));
          makeGreenSelect($(this).children(".gameName").attr("game_id"));
        }
        $(this)
          .children(".toggle")
          .children()
          .children("input")
          .prop("checked", true);
        $(this).children(".gameName").addClass("greenText");
      });
    } else {
      el.each(function (i) {
        if (
          $(this)
            .children(".toggle")
            .children()
            .children("input")
            .is(":checked")
        ) {
          gamesToRemove.push($(this).children(".gameName").attr("game_id"));
          unMakeGreenSelect($(this).children(".gameName").attr("game_id"));
        }
        $(this)
          .children(".toggle")
          .children()
          .children("input")
          .prop("checked", false);
        $(this).children(".gameName").removeClass("greenText");
      });
    }
    console.log("Add: ", gamesToAdd);
    console.log("Remove: ", gamesToRemove);
  }
  const agts_options = {
    method: "POST",
    body: JSON.stringify({
      gamesToAdd: gamesToAdd,
      gamesToRemove: gamesToRemove,
      code: document.getElementById("code").innerHTML,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch("/add_game_to_session", agts_options).then(function (response) {
    return response.json().then((res) => {
      if (!res.err) {
        console.log(res);
      } else {
        console.log(res.err);
      }
    });
  });
  recheckGreenLists();
}

/*****************************/
/*        listToggle(el)     */
/*****************************/
/**
 * {refresh the displayed view after an interval}
 *
 */
function catchDisplay() {
  window.setTimeout(function () {
    $("#mainView")
      .children(".view")
      .each(function () {
        if ("#" + $(this).attr("id") == window.hist[window.hist.length - 1]) {
          $(this).removeClass("off");
        } else {
          $(this).addClass("off");
        }
      });
  }, 3000);
}

/*****************************/
/*        listToggle(el)     */
/*****************************/
/**
 * {Display or remove a particular list of games in the select view}
 *
 * @param {*} el
 */
function listToggle(el) {
  $(el).toggleClass("expanded");
  $(el).parent().children(".listGames").first().toggleClass("off");
}

/*****************************/
/*       setCode(code)       */
/*****************************/
/*
 * Desc: Display the session code in correct places
 *
 * @param {Array} select
 */
function setCode(code) {
  $("#code").html(code);
  $("#selectCodeDisplay").html("Your Code: " + code);
}

/*****************************/
/*     showSelect(data)    */
/*****************************/
/*
 * Desc: Update user selections in real time
 *
 * @param {Array} select
 */
function showSelect(data) {
  console.log("received select event ", data);
  htmlString = "";
  var connecting = "";
  var plural = "s";
  $.each(data, function (key, value) {
    console.log("User object: ", key, value);
    if (value.done) {
      connecting = "done";
    } else {
      value.num > 0 ? (connecting = "selecting") : (connecting = "connecting");
    }
    value.num == 1 ? (plural = "") : (plural = "s");
    htmlString +=
      `<div class="conUser ` +
      connecting +
      `">User ` +
      value.name +
      ` has selected ` +
      value.num +
      ` game` +
      plural +
      `...</div>`;
  });
  htmlString += `<div class="button greenBtn" id="gameLock" type="submit">Lock Game List 🔒</div>`;
  $("#postSelectContainer").html(htmlString);
  $("#gameLock").click(this, function () {
    lockGames($("#code").text());
  });
}

/*****************************/
/*      fillVotes(games)     */
/*****************************/
/*
 * Desc: Create the voting html
 *
 * @param {Array} games
 */
function fillVotes(games) {
  var htmlString = `<div id="voteInfo">Drag the slider for each game to vote! All the way to the right means you ABSOLUTELY have to play the game, all the way to the left means you can't stand the idea of playing the game.</div><ul>`;
  for (var i = 0; i < games.length; i++) {
    htmlString +=
      `<li><div class="voteLabel"><label for="` +
      games[i].game +
      `">` +
      games[i].name +
      `</label></div>`;
    htmlString +=
      `<input type='range' min='1' max='1000' value='500' step='1' id="` +
      games[i].game +
      `"/></li>`;
  }
  htmlString += `</ul><div class="submitButton button greenBtn" id="voteButton">Submit Votes</div>`;
  console.log("The string: ", htmlString);
  $("#voteContainer").html(htmlString);
  $("#voteButton").on("click", function () {
    var theCode = $("#code").text();
    var voteArray = [];
    var theVotes = $("#voteContainer ul").children();
    for (var i = 0; i < theVotes.length; i++) {
      voteArray.push({
        game: $(theVotes[i]).children("input").first().attr("id"),
        vote: $(theVotes[i]).children("input").first().val(),
      });
    }
    console.log("voteArray", voteArray);
    const sv_options = {
      method: "POST",
      body: JSON.stringify({
        code: theCode,
        voteArray: voteArray,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
    fetch("/submit_votes", sv_options).then(function (response) {
      return response.json().then((res) => {
        goForwardFrom("#voteView", "#postVoteView");
        window.hist = ["#homeView", "#codeView", "#postVoteView"];
      });
    });
  });
  goForwardFrom("#postSelectView", "#voteView");
}

/*****************************/
/*    fillPostVote(users)    */
/*****************************/
function fillPostVote(users) {
  var htmlString = ``;
  var votedText = "";
  var votedClass = "";
  for (var i = 0; i < users.length; i++) {
    if (users[i].doneVoting) {
      votedText = " has finished voting";
      votedClass = " voted";
    } else {
      votedText = " is still voting";
      votedClass = " voting";
    }
    htmlString +=
      `<div class="voteUser` +
      votedClass +
      `">` +
      users[i].name +
      votedText +
      `</div>`;
  }
  htmlString += `<div id="endVoteButton" class="submitButton button greenBtn bottomBtn">End Voting</div>`;
  $("#postVoteContainer").html(htmlString);

  $("#endVoteButton").click(this, function (el) {
    var theCode = $("#code").text();
    const ev_options = {
      method: "POST",
      body: JSON.stringify({
        code: theCode,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
    fetch("/end_vote", ev_options).then(function (response) {
      return response.json().then((res) => {
        goForwardFrom("#postVoteView", "#playView");
        //window.hist = ["#homeView", "#codeView", "#playView"];
      });
    });
  });
}

function fillGames(games) {
  var htmlString = ``;
  for (var i = 0; i < games.length; i++) {
    if (!$.isEmptyObject(games[i])) {
      htmlString += `<div class="playGame">` + games[i].name + `</div>`;
    }
  }
  $("#playContainer").html(htmlString);
  goForwardFrom("#postVoteView", "#playView");
}

/*****************************/
/*          getvh()          */
/*****************************/
/**
 * {Sets viewport height variables, --vh, --vh5, --vh10, etc}
 *
 */
function getvh() {
  // First we get the viewport height and we multiple it by 1% to get a value for a vh unit
  let vh = window.innerHeight * 0.01;
  // Then we set the value in the --vh custom property to the root of the document
  document.documentElement.style.setProperty("--vh", `${vh}px`);
  document.documentElement.style.setProperty("--vh10", `${vh * 10}px`);
  document.documentElement.style.setProperty("--vh20", `${vh * 20}px`);
  document.documentElement.style.setProperty("--vh30", `${vh * 30}px`);
  document.documentElement.style.setProperty("--vh40", `${vh * 40}px`);
  document.documentElement.style.setProperty("--vh50", `${vh * 50}px`);
  document.documentElement.style.setProperty("--vh60", `${vh * 60}px`);
  document.documentElement.style.setProperty("--vh70", `${vh * 70}px`);
  document.documentElement.style.setProperty("--vh80", `${vh * 80}px`);
  document.documentElement.style.setProperty("--vh90", `${vh * 90}px`);
  document.documentElement.style.setProperty("--vh100", `${vh * 100}px`);
  document.documentElement.style.setProperty("--vh5", `${vh * 5}px`);
  document.documentElement.style.setProperty("--vh15", `${vh * 15}px`);
  document.documentElement.style.setProperty("--vh25", `${vh * 25}px`);
  document.documentElement.style.setProperty("--vh75", `${vh * 75}px`);
}
getvh();
