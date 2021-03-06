//All DOM manipulation
var createSession = function () {};
var joinSession = function () {};

window.addEventListener("load", function () {
  /*****************************/
  /*      Socket.io logic      */
  /*****************************/
  var socket = io();

  createSession = function (res) {
    console.log("createSession");
    socket.on(res.session.code + "owner", (data) => {
      console.log("received ", data);
      if (data.selectEvent /*&& res.session.lock != "#postPostSelectView"*/) {
        //Rewrite #postSelectContainer in real time for owner if this is an owner initated event
        if ($("#gameUnlock").length == 0) {
          showSelect(data.select, true);
        }
        if (data.curGames) {
          data.curGames.sort(lowerCaseSort());
          updateCurrentGames(data.curGames);
        }
      }
      if (data.startVoting) {
        //Parse the voting data and output
        console.log(data);
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
    setCode(res.session.code);
    setTimeout(function () {
      $("#joinButton").css({
        opacity: "0%",
        transform: "translateX(100vw)",
      });
      $("#codeInputGroup").css({
        opacity: "100%",
        transform: "translateX(0px)",
      });
      $("#createButton").css({
        transform: "translateY(calc(var(--vh) * 10))",
      });
      $("#joinButton").addClass("off");
      $("#codeInputGroup").removeClass("off");
    }, 500);
    if (typeof res.session.phrase == "undefined") {
      setPhrase(
        `<div class="phraseText"></div><div class="owner">👑<div class="tooltip">Owner</div></div><ion-icon name="create-outline"></ion-icon>`
      );
    } else {
      setPhrase(
        `<div class="phraseText">Phrase: ` +
          res.session.phrase +
          `</div><div class="owner">👑<div class="tooltip">Owner</div></div><ion-icon name="create-outline"></ion-icon>`
      );
    }

    $(".phraseDisplay ion-icon").on("click", function () {
      showRenameSession({
        name: $(".phraseDisplay")
          .first()
          .children(".phraseText")
          .first()
          .text()
          .substr(8),
        id: "0000" + $("#code").text(),
      });
    });

    $(".phraseText").on("click", function () {
      createAndShowAlert($(".phraseText").first().text().substr(8));
    });

    $("#postSelectContainer").html("");

    var index = res.session.users.findIndex((obj) => obj.user == res.user);
    var dest = res.session.lock;
    console.log(res.session.users[index].done);
    console.log("dest", dest);
    if (res.session.users[index].done == false && dest == "#postSelectView") {
      dest = "#selectView";
      console.log("changing");
    }
    var toLock = false;
    if (dest == "#postPostSelectView") {
      dest = "#postSelectView";
      toLock = true;
    }
    if (dest == "#postSelectView") {
      goForwardFrom("#homeView", "#postSelectView");
      window.hist = ["#homeView", "#selectView"];
      setBackHome();
    }
    if (dest == "#selectView") {
      dest = "#codeView";
    }
    if (dest == "#voteView" && res.session.users[index].doneVoting) {
      dest = "#postVoteView";
    }
    if (dest == "#voteView") {
      var games = [];
      var votes = res.session.users[index].votes;
      for (var i = 0; i < res.session.votes.length; i++) {
        if (res.session.votes[i].active) {
          games.push({
            game: res.session.votes[i].game,
            name: res.session.votes[i].name,
            votes:
              votes[
                votes.findIndex((obj) => obj.id == res.session.votes[i].game)
              ].vote,
          });
        }
      }
      fillVotes(games);
    }
    if (dest == "#postVoteView") {
      var users = [];
      for (var i = 0; i < res.session.users.length; i++) {
        users.push({
          doneVoting: res.session.users[i].doneVoting,
          name: res.session.users[i].name,
        });
      }
      fillPostVote(users);
    }
    if (dest == "#playView") {
      var games = [];
      for (var i = 0; i < res.session.votes.length; i++) {
        games[i] = {
          name: res.session.votes[i].name,
          votes: 0,
        };
        for (var j = 0; j < res.session.votes[i].voters.length; j++) {
          games[i].votes += res.session.votes[i].voters[j].vote;
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
    console.log("hist after creating: ", window.hist);
    if (toLock) {
      lockGames(res.session.code);
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
  };

  joinSession = function (res) {
    $("#backArrow").removeClass("off"); //Show the back arrow
    setCode(res.code);
    setPhrase(`<div class="phraseText">Session: ` + res.phrase + `</div>`);
    console.log("joinSession: ", res.lock);

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
        setBackNormal();
      case "#postPostSelectView":
        goForwardFrom("#homeView", "#postSelectView");
        //lockback();
        break;
      case "#voteView":
        ttsFetch("/get_votes", { code: $("#code").text() }, (res) => {
          console.log(res);
          fillVotes(res.games);
          goForwardFrom("#homeView", "#voteView");
        });
        break;
      case "#playView":
        ttsFetch("/get_games", { code: $("#code").text() }, (res) => {
          fillGames(res.games);
          goForwardFrom("#homeView", "#playView");
        });
        break;
      case "#codeView":
        if ($(".userName").length > 0) {
          goForwardFrom("#homeView", "#selectView");
        } else {
          goForwardFrom("#homeView", "#postSelectView");
        }
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
      if (data.selectEvent) {
        console.log("SelectEvent: ", data);
        //Rewrite #postSelectContainer in real time for owner
        showSelect(data.select, false);
        data.curGames.sort(lowerCaseSort());
        updateCurrentGames(data.curGames);
      }
      if (data.unlockBack && data.unlock) {
        console.log(data);
        if (data.unlock == "selectView") {
          window.hist = ["#homeView", "#selectView", "#postSelectView"];
          setBackNormal();
        }
        /*goBackFrom(
          window.hist[window.hist.length - 1],
          window.hist[window.hist.length - 2]
        );*/
      }
      if (data.startVoting) {
        console.log("this isn't done yet!");
        //parse the voting data and output
        fillVotes(data.games);
        goForwardFrom(window.hist[window.hist.length - 1], "#voteView");
        window.hist = ["#homeView", "#voteView"];
        setBackHome();
      }
      if (data.play) {
        fillGames(data.games);
        goForwardFrom(window.hist[window.hist.length - 1], "#playView");
        window.hist = ["#homeView", "#playView"];
        setBackHome();
      }
    });
    catchDisplay();
    triggerPostSelectEvent();
  };

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

  //window.addEventListener("resize", getvh);

  /*****************************/
  /*      Set font sizes       */
  /*****************************/

  /*$(window).on(
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
  });*/
  /*$(window).on(
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
  });*/
  /* $(window).on(
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
  cFont({
    data: {
      el: "#addListTitle",
      mHeight: "10",
      mWidth: "10",
      fHeight: "4",
      fWidth: "6",
    },
  });*/

  /*****************************/
  /*      Home Icon Click      */
  /*****************************/
  /*goBackfrom*/
  $(".menuHomeIcon").on("click", function () {
    closeMenu();
    $("#listIcon").addClass("off");
    var from = "";
    $(".main .view").each(function (i, e) {
      if (!$(e).hasClass("off")) {
        console.log($(e), "is the active window");
        from = "#" + $(e).attr("id");
        console.log(from);
      }
      return $(e).hasClass("off");
    });
    if (from != "#homeView" && from != "") {
      window.hist = ["#homeView"];
      setBackNormal();
      $("#homeView").css({ transform: "translateX(-200vw)" });
      $("#homeView").removeClass("off");
      $("#backArrow").addClass("off");
      window.setTimeout(function () {
        $("#homeView").css({ transform: "translateX(0vw)" });
        $(from).css({ transform: "translateX(200vw)" });
      }, 100);
      window.setTimeout(function () {
        $(from).addClass("off");
        catchDisplay();
      }, 1000);
    }
  });

  /*****************************/
  /*         Menu toggle       */
  /*****************************/
  //Close menu

  $("#menuClose").on("click", closeMenu);
  $("#menuCatch").on("click", closeMenu);
  //Open menu
  $("#menuIcon").click(this, function (el) {
    $("#menu").removeClass("off");
    $("#menuCatch").removeClass("off");
    window.setTimeout(function () {
      $("#menu").removeClass("left");
    }, 10);
  });

  /*****************************/
  /*      Close Menu Items     */
  /*****************************/

  function closeAllMenus(open) {
    console.log("Open: ", open);
    $(".pop").each(function (i, e) {
      if ("#" + $(e).attr("id") != open) {
        //console.log("Closing ", "#" + $(e).attr("id"));
        closeMenuItem("#" + $(e).attr("id"));
      }
    });
  }

  /*****************************/
  /*    My Sessions Handler    */
  /*****************************/

  $("#sessionsItem").click(this, function (el) {
    if ($("#sessionsView").hasClass("off")) {
      closeMenu();
      closeAllMenus("#sessionsView");
      window.setTimeout(showMenuItem("#sessionsView"), 600);
      ttsFetch("/get_sessions", {}, (res) => {
        writeSessions(res);
      });
    } else {
      closeMenuItem("#sessionsView");
    }
  });

  $("#sessionsClose").click(this, function (el) {
    closeMenuItem("#sessionsView");
  });

  /*****************************/
  /*      My Games Handler     */
  /*****************************/
  //Populate all games on the first run through
  $("#gamesItem").click(this, function (el) {
    if ($("#gamesView").hasClass("off")) {
      gulp();
      closeAllMenus("#gamesView");
      closeMenu();
      window.setTimeout(showMenuItem("#gamesView"), 600);
    } else {
      closeMenuItem("#gamesView");
    }
  });

  $("#gamesClose").click(this, function (el) {
    closeMenuItem("#gamesView");
  });

  /*****************************/
  /*  Account Handler Handler  */
  /*****************************/
  $("#accountItem").click(this, function (el) {
    if ($("#accountView").hasClass("off")) {
      closeAllMenus("#accountView");
      closeMenu();
      window.setTimeout(showMenuItem("#accountView"), 600);
    } else {
      closeMenuItem("#accountView");
    }
  });

  $("#accountClose").click(this, function (el) {
    closeMenuItem("#accountView");
  });

  $("#accountUsernameField ion-icon").click(this, function (el) {
    showEditMenu("Change Username", "changeUsername");
  });

  /*$("#accountEmailField ion-icon").click(this, function (el) {
    showEditMenu("Change Email", "changeEmail");
  });*/

  $("#accountPwdResetField button").click(this, function (el) {
    pwdReset();
  });

  $("#bggConnectButton").click(this, function (el) {
    showEditMenu("Enter your BGG username", "connectBGG");
  });

  /*****************************/
  /*    FAQ Handler Handler    */
  /*****************************/
  $("#faqItem").click(this, function (el) {
    if ($("#faqView").hasClass("off")) {
      closeAllMenus("#faqView");
      closeMenu();
      window.setTimeout(showMenuItem("#faqView"), 600);
    } else {
      closeMenuItem("#faqView");
    }
  });

  $("#faqClose").click(this, function (el) {
    closeMenuItem("#faqView");
  });

  /*****************************/
  /*    About Handler Handler  */
  /*****************************/
  $("#aboutItem").click(this, function (el) {
    if ($("#aboutView").hasClass("off")) {
      closeAllMenus("#aboutView");
      closeMenu();
      window.setTimeout(showMenuItem("#aboutView"), 600);
    } else {
      closeMenuItem("#aboutView");
    }
  });

  $("#aboutClose").click(this, function (el) {
    closeMenuItem("#aboutView");
  });

  /*****************************/
  /*  Premium Handler Handler  */
  /*****************************/

  $("#premiumItem").click(this, function (el) {
    if ($("#premiumView").hasClass("off")) {
      closeAllMenus("#premiumView");
      closeMenu();
      window.setTimeout(showMenuItem("#premiumView"), 600);
    } else {
      closeMenuItem("#premiumView");
    }
  });

  $("#premiumClose").click(this, function (el) {
    closeMenuItem("#premiumView");
  });

  /*****************************/
  /* Join button click handler */
  /*****************************/
  $("#joinButton").click(this, function () {
    console.log("join clicked");
    joinClick();
  });
  function joinClick() {
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
        transform: "translateY(calc(var(--vh) * 10))",
      });
      window.setTimeout(function () {
        console.log("wait 2");
        $("#joinButton").addClass("off");
      }, 600);
    }, 10);
  }
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

    ttsFetch(
      "/going_back",
      {
        to: window.hist[window.hist.length - 2],
        from: window.hist[window.hist.length - 1],
        code: $("#code").text(),
      },
      () => {}
    );

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
  $("#codeSubmit").click(this, function (e) {
    submitCode(
      $("#codeInput input")
        .val()
        .replace(/&/, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "\\'")
    );
  });

  /*****************************/
  /*   Create Button Handler   */
  /*****************************/
  $("#createButton").click(this, function () {
    window.hist = ["#homeView"];
    setBackHome();
    clearLists();
    ttsFetch("/create_session", {}, (res) => {
      createSession(res.status);
    });
    $("#codeInput .textInput").first().val(window.location.pathname.substr(1));
  });

  /***********************************/
  /*   Copy the code to clipboard    */
  /***********************************/
  $("#copyButton").on("click", function () {
    copyText(
      window.location.origin + "/" + $("#code").html(),
      "Link copied to clipboard"
    );
  });
  $("#codeGroup").on("click", function () {
    copyText($("#code").html(), "Code copied to clipboard.");
  });

  /***********************************/
  /*         Share the code          */
  /*  This won't work without HTTPS  */
  /***********************************/

  document.getElementById("shareButton").addEventListener("click", async () => {
    if (navigator.share) {
      navigator
        .share({
          title: "SelectAGame",
          text: "Join my SelectAGame session! ",
          url:
            "https://selectagame.net/" +
            document.getElementById("code").innerHTML,
        })
        .then(() => console.log("Successful share"))
        .catch((error) => console.log("Error sharing", error));
    } else {
      window.open(
        "mailto:?Subject=Import%20my%20list%20on%20SelectAGame&body=Click this link to join my session on SelectAGame%0D%0A%0D%0A https://selectagame.net/" +
          document.getElementById("code").innerHTML +
          ' %0D%0A%0D%0AIf the above link doesn%27t work, click "Join Game" on the home page and enter this code: ' +
          document.getElementById("code").innerHTML
      );
    }
  });

  /*****************************/
  /* Select button transition  */
  /*****************************/

  //On the first run through, get user lists populated and add them to #selectLists
  gulp();
  $("#selectButton").click(this, function () {
    //$("#backArrow").attr("data-gobackto", "code");

    recheckGreenLists();
    goForwardFrom("#codeView", "#selectView");
  });

  /*****************************/
  /*    Unsorted Game Adder    */
  /*****************************/
  //Add a game to the unsorted list
  //Used in the select view
  //Possible because #addGamesInput is defined in pug file
  //$("#addGamesInput").on("keyup", addGame(event));

  /*****************************/
  /*        List Adder         */
  /*****************************/
  //Add a list
  //Used in #gamesview.pop
  //#addListInput is also defined in pug file
  //setTimeout(function () {
  //  $("#addListInput").on("keyup", console.log(event));
  //}, 2000);
  /*****************************/
  /*Game submit button handler */
  /*****************************/

  $("#gameSubmit").click(function () {
    ttsFetch(
      "/submit_games",
      {
        code: document.getElementById("code").innerHTML,
      },
      (res) => {
        console.log("submit res: ", res);
        //$("#backArrow").attr("data-gobackto", "select");
        goForwardFrom("#selectView", "#postSelectView");
        if ($("#postSelectImg").length == 0 && $("#gameUnlock").length == 0) {
          $("#postSelectView").append('<div id="postSelectImg"></div>');
          $("#postSelectContainer").css("grid-area", "9/2/15/10");
        }
      }
    );
  });
  /* $("#gameSubmit").click(this, function () {
    const gs_options = {
      method: "POST",
      body: JSON.stringify({
        code: document.getElementById("code").innerHTML,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
    startLoader();
    fetch("/submit_games", gs_options).then(function (response) {
      console.log("finished");
      finishLoader();
      return response.json().then((res) => {
        if (res.err) {
          createAndShowAlert(res.err);
        } else {
          console.log("submit res: ", res);
          //$("#backArrow").attr("data-gobackto", "select");
          goForwardFrom("#selectView", "#postSelectView");
          if ($("#postSelectImg").length == 0) {
            $("#postSelectView").append('<div id="postSelectImg"></div>');
            $("#postSelectContainer").css("grid-area", "9/2/15/10");
          }
        }
      });
    });
  }); */

  /*******************************************/
  /* Check if url matches a code and execute */
  /*******************************************/

  console.log(window.location.pathname.substr(1));
  console.log(/^([A-Z0-9]{5})$/.test(window.location.pathname.substr(1)));
  console.log(/^([A-Z0-9]{6})$/.test(window.location.pathname.substr(1)));
  if (
    /^([A-Z0-9]{5})$/.test(window.location.pathname.substr(1)) &&
    !/^([A-Z0-9]{6})$/.test(window.location.pathname.substr(1))
  ) {
    joinClick(); //calls joinSession and therefore join_session
    submitCode(window.location.pathname.substr(1));
  }

  if (/^([A-Z0-9]{6})$/.test(window.location.pathname.substr(1))) {
    runListImport(window.location.pathname.substr(1));
  }

  /* Set up autocomplete */
  getTopList();

  /* Set up BGG account */
  checkBGG();

  /*
   *
   *
   * End of window functions
   * The rest of the content and click handlers are added programmatically
   *
   */
});
//End all DOM manipulation

/***************************************************/
/***************************************************/
/***************************************************/
/***************************************************/
/*                                                 */
/*               Universal Functions               */
/*                                                 */
/***************************************************/
/***************************************************/
/***************************************************/
/***************************************************/

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

function closeMenu() {
  $("#menu").addClass("left");
  $("#menuCatch").addClass("off");
  window.setTimeout(function () {
    $("#menu").addClass("off");
  }, 550);
}

/*****************************/
/*         lockBack()        */
/*****************************/
function lockBack() {
  window.hist = [window.hist[0], window.hist[window.hist.length - 1]];
  setBackHome();
  $("#backArrow").attr("data-gobackto", window.hist[0]);
}

/*****************************/
/*         ttsFetch()        */
/*****************************/
/**
 *
 *
 * @param {String} req Address of POST request beginning with slash
 * @param {Object} body Object to be JSON.stringify'd
 * @param {Function} handler format is (res) => {function body}
 * @param {Function} errorHandler (optional) Error handler
 */
function ttsFetch(req, body, handler, errorHandler) {
  if (body === "") {
    body = {};
  }
  const tts_options = {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  };
  console.trace();
  console.log(tts_options);
  startLoader();
  fetch(req, tts_options).then(function (response) {
    console.log("finished");
    finishLoader();
    return response.json().then((res) => {
      if (res.err) {
        if (errorHandler) {
          errorHandler(res);
        } else {
          createAndShowAlert(res.err);
        }
      } else {
        handler(res);
      }
    });
  });
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
  console.trace();
  if (from != to) {
    if (to == "#selectView" || to == "#postSelectView") {
      window.setTimeout(function () {
        $("#listIcon").removeClass("off"), 1000;
      });
    }
    if (to != "#postSelectView" && to != "#selectView") {
      window.setTimeout(function () {
        $("#listIcon").addClass("off"), 1000;
      });
    }
    if (to == "#postSelectView") {
      triggerPostSelectEvent();
    }
    console.log("going forward from " + from + " to " + to);
    console.log(window.hist);
    if (typeof window.hist == "undefined") {
      window.hist = [from];
    }
    if (from == "#postSelectView" && to == "#voteView") {
      window.hist = ["#homeView"];
    }
    window.hist.push(to);
    $("#backArrow").attr("data-gobackto", window.hist[window.hist.length - 2]);
    if (window.hist.length == 2) {
      setBackHome();
    } else {
      setBackNormal();
    }
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
    if (
      window.hist[window.hist.length - 1] == window.hist[window.hist.length - 2]
    ) {
      window.hist.pop();
    }
  } else {
    console.log("goBackFrom: going back from ", from, " to ", to);
    if (to == "#selectView" || to == "#postSelectView") {
      window.setTimeout(function () {
        $("#listIcon").removeClass("off"), 1000;
      });
    }
    if (
      (from == "#selectView" && to != "#postSelectView") ||
      (from == "#postSelectView" && to != "#selectView")
    ) {
      console.log(
        "turning off listIcon because to is ",
        to,
        " and from is ",
        from
      );
      window.setTimeout(function () {
        $("#listIcon").addClass("off"), 1000;
      });
    }
    if (to == "#postSelectView") {
      triggerPostSelectEvent();
    }
    if (typeof from != "undefined" && typeof to != "undefined") {
      console.log("going back from " + from + " to " + to);
      console.log(window.hist);
      if (from == "#postSelectView" && to == "#selectView") {
        ttsFetch(
          "/going_back",
          {
            code: document.getElementById("code").innerHTML,
            from: from,
            to: to,
          },
          (res) => {
            goBack(from, to);
          }
        );
      } else {
        goBack(from, to);
        catchDisplay();
      }
    }
  }
}

function goBack(from, to) {
  window.hist.pop();
  $("#backArrow").attr("data-gobackto", window.hist[window.hist.length - 2]);
  $(to).css({ transform: "translateX(-200vw)" });
  $(to).removeClass("off");
  if (to == "#homeView") {
    $("#backArrow").addClass("off");
  }
  if (window.hist.length == 2) {
    setBackHome();
  } else {
    setBackNormal();
  }
  console.log("...Going back to " + to + " from " + from);
  window.setTimeout(function () {
    $(to).css({ transform: "translateX(0vw)" });
    $(from).css({ transform: "translateX(200vw)" });
  }, 100);
  window.setTimeout(function () {
    $(from).addClass("off");
    catchDisplay();
  }, 1000);
}

function triggerPostSelectEvent() {
  console.log("triggered");
  ttsFetch("/get_session_post_select", { code: $("#code").text() }, (res) => {
    console.log("triggered socket event for gsps");
  });
}

function setBackHome() {
  $("#backArrow>ion-icon").first().addClass("off");
  $("#backHome").removeClass("off");
}

function setBackNormal() {
  $("#backArrow>ion-icon").first().removeClass("off");
  $("#backHome").addClass("off");
}

/*****************************/
/*       lockGames(code)     */
/*****************************/
/**
 * {lock a user's game}
 *
 * @param {String} code
 */
function lockGames(code) {
  ttsFetch("/lock_games", { code: code }, (res) => {
    $("#backArrow").addClass("off");
    $("#postSelectView").css({
      transform: "translateX(-200vw)",
    });
    window.setTimeout(function () {
      $("#postSelectTitle").html(
        "Edit Games List <div class='menuHomeIcon'></div>"
      );
      $("#postSelectContainer").html();
      $("#postSelectContainer").css("grid-area", "4/2/15/10");
      $("#postSelectContainer").html(res.htmlString);
      sortEditGames();
      $("#postSelectImg").remove();
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
        //$("#backArrow").removeClass("off");
        /*$("#addGroupGamesInput").on("keyup", function (event) {
          // Number 13 is the "Enter" key on the keyboard
          if (event.keyCode === 13) {
            event.preventDefault();
            addGroupGame();
          }
          return false;
        });*/
        $("#gameUnlock").click(this, function () {
          console.log("gameUnlock");
          ttsFetch(
            "/unlock_games",
            {
              code: $("#code").text(),
              unlock: "#selectView",
              unlockBack: true,
            },
            (res) => {
              $("#backArrow").removeClass("off");
              goBackFrom("#postSelectView", "#selectView");
              setTimeout(function () {
                $("#postSelectContainer").html("");
              }, 1000);
            }
          );
        });
      }, 10);
    }, 300);
  });
  /*   const lg_options = {
    method: "POST",
    body: JSON.stringify({ code: code }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  startLoader();
  fetch("/lock_games", lg_options).then(function (lresponse) {
    finishLoader();
    return lresponse.json().then((lres) => {});
  }); */
}

//This doesn't appear to be called anymore
function addGroupGame() {
  console.log("submitting new group game");
  var game = addGroupGamesInput.value
    .replace(/&/, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "\\'");
  ttsFetch(
    "/group_game_add",
    { game: game, code: $("#code").text() },
    (res) => {
      $("#editGameList").append(res.status);
      sortEditGames();
      registerEGS();
    },
    (res) => {
      if ((res.err = "added")) {
        $("#addGroupGamesInput").css("color", "var(--main-red)");
        $('input[game_id="' + res.game + '"]').each(function () {
          $(this).parent().parent().parent().css("color", "var(--main-red)");
        });
        $("#addGroupGamesInput").addClass("shake");
        window.setTimeout(function () {
          $("#addGroupGamesInput").css("color", "var(--main-black)");
          $("#addGroupGamesInput").removeClass("shake");
          $('input[game_id="' + res.game + '"]').each(function () {
            $(this)
              .parent()
              .parent()
              .parent()
              .css("color", "var(--main-black)");
          });
        }, 600);
      } else {
        createAndShowAlert(res.err, true);
      }
    }
  );
  return false;
}
//The above doesn't appear to be called anymore

/* const gga_options = {
    method: "POST",
    body: JSON.stringify({ game: game, code: $("#code").text() }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  //add_user_game_unsorted
  startLoader();
  fetch("/group_game_add", gga_options).then(function (response) {
    finishLoader();
    return response.json().then((res) => {
      if (res.err) {
        if ((res.err = "added")) {
          $("#addGroupGamesInput").css("color", "var(--main-red)");
          $('input[game_id="' + res.game + '"]').each(function () {
            $(this).parent().parent().parent().css("color", "var(--main-red)");
          });
          $("#addGroupGamesInput").addClass("shake");
          window.setTimeout(function () {
            $("#addGroupGamesInput").css("color", "var(--main-black)");
            $("#addGroupGamesInput").removeClass("shake");
            $('input[game_id="' + res.game + '"]').each(function () {
              $(this)
                .parent()
                .parent()
                .parent()
                .css("color", "var(--main-black)");
            });
          }, 600);
        } else {
          createAndShowAlert(res.err, true);
        }
      } else {
        $("#editGameList").append(res.status);
        sortEditGames();
        registerEGS();
      }
    }); 
  });
  return false;
}*/

function sortEditGames() {
  $("#editGameList")
    .children()
    .sort(lowerCaseDivSort(".editGame"))
    .appendTo("#editGameList");
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
function addListDisplay(
  theId,
  name,
  dest,
  toggle,
  titleFunc,
  iconFunc,
  ionicon
) {
  var listString = `<li id="` + theId + `">`;
  if (dest == "#gamesContainer") {
    listString +=
      `<div class="menuGamesContainer">` +
      `<div class="listName" onclick="` +
      titleFunc +
      `">` +
      name.replace(/\\/g, "") +
      `
    </div></div>`;
  } else {
    //console.log(dest, name.replace(/\\/g, ""));
    listString +=
      `<div class="listName" onclick="` +
      titleFunc +
      `">` +
      name.replace(/\\/g, "") +
      `
    </div>`;
  }
  if (iconFunc && ionicon) {
    listString +=
      `<div class="listExpand" onclick="` +
      iconFunc +
      `">
          <ion-icon name="` +
      ionicon +
      `"></ion-icon>
      </div>`;
  }
  if (toggle) {
    listString += `<div class='toggle' >
          <label class="switch">
              <input type="checkbox" onclick="toggleFont(this)">
              <span class="slider round"></span>
          </label>
      </div>`;
  }
  listString += `<div class="listGames off"></div>
    </li>`;
  $(dest).append(listString);
}

/**********************************/
/*   Get all of a User's Games    */
/**********************************/
/* function guag() {
  ttsFetch("/get_user_all_games", "", (res) => {
    var htmlString = "";
    res.lists.allGames.sort(lowerCaseNameSort());
    for (var i = 0; i < res.lists.allGames.length; i++) {
      htmlString +=
        `<li id="` +
        res.lists.allGames[i]._id +
        `">` +
        res.lists.allGames[i].name +
        `</li>`;
    }
    //TODO: This doesn't do anything with HTMLString
  }); */
/* 
  const guag_options = {
    method: "POST",
    body: "",
    headers: {
      "Content-Type": "application/json",
    },
  };
  startLoader();
  fetch("/get_user_all_games", guag_options).then(function (response) {
    finishLoader();
    return response.json().then((res) => {
      if (!res.err) {
        var htmlString = "";
        res.lists.allGames.sort(lowerCaseNameSort());
        for (var i = 0; i < res.lists.allGames.length; i++) {
          htmlString +=
            `<li id="` +
            res.lists.allGames[i]._id +
            `">` +
            res.lists.allGames[i].name +
            `</li>`;
        }
      } else {
        createAndShowAlert(res.err, true);
      }
    });
  }); 
} */

/**********************************/
/*  Get a User's Populated Lists  */
/**********************************/

function gulp(showAllGames = false) {
  ttsFetch(
    "/get_user_lists_populated",
    {},
    (res) => {
      console.log("gulp", res);
      $("#gamesContainer").html(" ");
      $("#gamesContextContainer").html(" ");
      $("#listContextContainer").html(" ");
      $("#selectLists").html(" ");
      addListDisplay(
        0,
        "All Games",
        "#selectLists",
        true,
        "listToggle(this.nextElementSibling)",
        "listToggle(this)",
        "chevron-down-outline"
      );
      addListDisplay(
        "games0",
        "All Games",
        "#gamesContainer",
        false,
        "openList($(this).parent().parent().attr('id'))",
        false,
        false
      );
      res.lists.allGames.sort(lowerCaseNameSort());
      for (var i = 0; i < res.lists.allGames.length; i++) {
        var curSession = document.getElementsByTagName("session")[0];
        var checked = "";
        var greenText = "";
        $(curSession)
          .children()
          .each(function (ind, el) {
            if ($(el).attr("id") == res.lists.allGames[i]._id.toString()) {
              checked = " checked";
              greenText = " greenText";
            }
          });
        var htmlString =
          `
            <li>
                <div rating="` +
          res.lists.allGames[i].rating +
          `" owned="` +
          res.lists.allGames[i].owned +
          `" class="gameName` +
          greenText +
          `" game_id="` +
          res.lists.allGames[i]._id +
          `">` +
          res.lists.allGames[i].name.replace(/\\/g, "") +
          `
                </div>
                <div class='toggle'>
                    <label class="switch">
                        <input type="checkbox"` +
          checked +
          ` onclick="toggleFont(this)" game_id="` +
          res.lists.allGames[i]._id +
          `">
                        <span class="slider round"></span>
                    </label>
                </div>
            </li>`;
        var gameString =
          `<li id="` +
          res.lists.allGames[i]._id +
          `" onclick="showGameContext({id:'` +
          res.lists.allGames[i]._id +
          `', name: '` +
          res.lists.allGames[i].name +
          `', list: '0'})">` +
          res.lists.allGames[i].name.replace(/\\/g, "") +
          `</li>`;
        //Append the "All Games" list to the first <li>
        $("li#0").children(".listGames").first().append(htmlString);
        if (showAllGames) {
          listToggle($("#0").children(".listExpand")[0]);
        }
        $("li#games0").children(".listGames").first().append(gameString);
        $("#gamesContextContainer").append(
          `<div class="contextActions off" list="games0" id="context_stage_` +
            res.lists.allGames[i]._id +
            `">` +
            `<div class="contextTitle">` +
            res.lists.allGames[i].name.replace(/\\/g, "") +
            `</div>` +
            `<li class="bggLink">BoardGameGeek Link</li>` +
            `<li onclick="contextCopy([{id: '` +
            res.lists.allGames[i]._id +
            `', name:'` +
            res.lists.allGames[i].name +
            `'}])">Copy</li>` +
            `<li onclick="contextRename({id: '` +
            res.lists.allGames[i]._id +
            `', name:'` +
            res.lists.allGames[i].name +
            `'}, this)">Rename</li>` +
            `<li class="red" onclick="showDeleteGame([{id: '` +
            res.lists.allGames[i]._id +
            `', name:'` +
            res.lists.allGames[i].name +
            `'}], '&quot;` +
            res.lists.allGames[i].name +
            `&quot;')">Delete</li>` +
            `</div>`
        );
      }
      $("#listContextContainer").append(
        writeListContext({
          id: "list0",
          name: "All Games",
        })
      );
      for (var i = 0; i < res.lists.custom.length; i++) {
        var curId = i + 1;
        var curName = res.lists.custom[i].name
          .replace(/&/g, "&amp;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "\\'");
        addListDisplay(
          curId,
          curName,
          "#selectLists",
          true,
          "listToggle(this.nextElementSibling)",
          "listToggle(this)",
          "chevron-down-outline"
        );
        addListDisplay(
          "games" + curId,
          curName,
          "#gamesContainer",
          false,
          "openList($(this).parent().parent().attr('id'))",
          "showGameContext({id: 'list'+$(this).parent().attr('id').substr(5)})",
          "ellipsis-vertical"
        );
        res.lists.custom[i].games.sort(lowerCaseNameSort());
        for (var j = 0; j < res.lists.custom[i].games.length; j++) {
          var htmlString =
            `
            <li>
              <div rating="` +
            res.lists.custom[i].games[j].rating +
            `" owned="` +
            res.lists.custom[i].games[j].owned +
            `" class="gameName` +
            greenText +
            `" game_id="` +
            res.lists.custom[i].games[j]._id +
            `">` +
            res.lists.custom[i].games[j].name.replace(/\\/g, "") +
            `
              </div>
              <div class='toggle'>
                  <label class="switch">
                      <input type="checkbox"` +
            checked +
            ` onclick="toggleFont(this)" game_id="` +
            res.lists.custom[i].games[j]._id +
            `">
                      <span class="slider round"></span>
                  </label>
              </div>
            </li>`;
          var listNum = i + 1;
          var gameString =
            `<li id="` +
            res.lists.custom[i].games[j]._id +
            `" onclick="showGameContext({id: '` +
            res.lists.custom[i].games[j]._id +
            `', name: '` +
            res.lists.custom[i].games[j].name +
            `', list: '` +
            listNum +
            `'})">` +
            res.lists.custom[i].games[j].name.replace(/\\/g, "") +
            `</li>`;

          //Append each custom list the the corresponding li
          $("li#" + curId)
            .children(".listGames")
            .first()
            .append(htmlString);

          $("li#games" + curId)
            .children(".listGames")
            .first()
            .append(gameString);
          $("#gamesContextContainer").append(
            writeGameContext({
              id: res.lists.custom[i].games[j]._id,
              name: res.lists.custom[i].games[j].name,
              list: curId,
            })
          );
        }
        console.log("Writing context: ", res.lists.custom[i].name);
        $("#listContextContainer").append(
          writeListContext({
            id: "list" + curId,
            name: curName,
            listCode: res.lists.custom[i].listCode,
          })
        );
      }

      $("#listsContainer").html(htmlString);
      writeSessions(res);
    },
    (res) => {}
  );
  /* const gulp_options = {
    method: "POST",
    body: "",
    headers: {
      "Content-Type": "application/json",
    },
  };
  startLoader();
  fetch("/get_user_lists_populated", gulp_options).then(function (response) {
    finishLoader();
    //Gets the populated list, which is an object with two arrays,
    //"allGames", which is supposed to have every game, and "custom",
    //which has the user's custom lists. Array elements in allGames
    //are objects which have the properties "rating", "name", and "owned".
    //Array elements in custom are objects which have the properties "games"
    //and "name". "Games" is an array of objects that each have the properties "rating",
    //"name", and "owned".
    return response.json().then((res) => {
      if (!res.err) {
        
      } else {
        if (res.err != ERR_LOGIN_SOFT) createAndShowAlert(res.err, true);
        console.log(res.err);
      }
    });
  }); */
}

/**
 * Hide or show the add game and add list buttons in the menu
 *
 */
function toggleGamesAdder() {
  showAdderMenu();
  /*
  if ($(".gamesAdder").hasClass("off")) {
    $(".gamesAdder").removeClass("off");
    $("#menuAddListContainer").addClass("slideDown");
    $("#menuAddGamesContainer").addClass("slideDown");
    setTimeout(function () {
      $("#menuAddListContainer").addClass("off");
      $("#menuAddGamesContainer").addClass("off");
    }, 501);
    setTimeout(function () {
      $(".gamesAdder").removeClass("slideDown");
      $("#addListButton").addClass("rotated");
    }, 20);
  } else {
    hideGamesAdderButtons();
    $("#addListButton").removeClass("rotated");
  }
  */
}

function hideGamesAdderButtons() {
  $(".gamesAdder").addClass("slideDown");
  setTimeout(function () {
    $(".gamesAdder").addClass("off");
  }, 501);
}

/**
 * Shows the add Game menu in My Games and Lists
 *
 */
function showMenuAddGame() {
  hideGamesAdderButtons();
  $("#menuAddGamesContainer").removeClass("off");
  setTimeout(function () {
    $("#menuAddGamesContainer").removeClass("slideDown");
  }, 5);
}

function showMenuAddList() {
  hideGamesAdderButtons();
  $("#menuAddListContainer").removeClass("off");
  setTimeout(function () {
    $("#menuAddListContainer").removeClass("slideDown");
  }, 5);
}

function openList(list) {
  var games = getListGames(list);
  var htmlString =
    `<div class="listTitle"><ion-icon name="arrow-back-outline" onclick="hideSubList('.listContents')"></ion-icon><div class="listTitleText">` +
    $("#" + list)
      .children(".menuGamesContainer")
      .first()
      .children(".listName")
      .first()
      .html() +
    `</div></div>` +
    createNode("listContents", "", "displayGameContainer", games);
  htmlString +=
    `<div class="bulkSelect off" list="` +
    list +
    `"><ion-icon name="square-outline" onclick="selectAllBulk()"></ion-icon><ion-icon name="checkbox-outline" onclick="closeBulk()" class="off"></ion-icon><div class="blank"></div>`;
  if (list != "games0") {
    htmlString += `<ion-icon name="trash-outline" onclick="deleteRemoveBulk()"></ion-icon><ion-icon name="cut-sharp" onclick="moveBulk()"></ion-icon>`;
  } else {
    htmlString += `<div></div><ion-icon name="trash-outline" onclick="deleteRemoveBulk()"></ion-icon>`;
  }
  htmlString += `<ion-icon name="copy-outline" onclick="copyBulk()"></ion-icon><ion-icon name="close-outline" onclick="closeBulk()"></ion-icon></div>`;
  $("#" + list).after(htmlString);
  showSubList(".listContents");
}

function getListGames(list) {
  console.log("list: ", list);
  var arr = [];
  $("#" + list)
    .children(".listGames")
    .first()
    .children()
    .each(function (ind, el) {
      //console.log("gLg: ", $(el)[0].outerHTML);
      arr.push(
        hashToColor($(el).attr("id").substr(10)) +
          $(el)[0].outerHTML.replace(`id="`, `id="display_`) +
          `<ion-icon name="ellipsis-vertical" onclick="` +
          $(el).attr("onclick") +
          `"></ion-icon>`
      );
    });
  return arr;
}

function bulkSelectGame(el) {
  $(el).toggleClass("flipped");
  $(el).children(".spriteChecked").toggleClass("spriteUnchecked");
  console.log($(el).parent().parent().children().children(".flipped"));
  if ($(el).parent().parent().children().children(".flipped").length > 0) {
    console.log("showing bulk");
    $(".bulkSelect").removeClass("off");
    $(".listContents.slideUp").addClass("bulkShowing");
    if (
      $(el).parent().parent().children().children(".flipped").length ==
      $(el).parent().parent().children().children(".sprite").length
    ) {
      $('.bulkSelect ion-icon[name="square-outline"]').addClass("off");
      $('.bulkSelect ion-icon[name="checkbox-outline"]').removeClass("off");
    } else {
      $('.bulkSelect ion-icon[name="square-outline"]').removeClass("off");
      $('.bulkSelect ion-icon[name="checkbox-outline"]').addClass("off");
    }
  } else {
    console.log("hiding bulk");
    $(".bulkSelect").addClass("off");
    $(".listContents.slideUp").removeClass("bulkShowing");
    $('.bulkSelect ion-icon[name="square-outline"]').removeClass("off");
    $('.bulkSelect ion-icon[name="checkbox-outline"]').addClass("off");
  }
  console.log($(el).children("spriteChecked"));
}

function closeBulk() {
  $(".bulkShowing")
    .children()
    .children(".flipped")
    .each(function () {
      $(this).removeClass("flipped");
      $(this).children(".spriteChecked").first().addClass("spriteUnchecked");
    });
  $(".bulkSelect").addClass("off");
  $(".listContents.slideUp").removeClass("bulkShowing");
  $('.bulkSelect ion-icon[name="square-outline"]').removeClass("off");
  $('.bulkSelect ion-icon[name="checkbox-outline"]').addClass("off");
}

function selectAllBulk() {
  $('.bulkSelect ion-icon[name="square-outline"]').addClass("off");
  $('.bulkSelect ion-icon[name="checkbox-outline"]').removeClass("off");
  $(".bulkShowing")
    .children()
    .children(".sprite")
    .each(function () {
      $(this).addClass("flipped");
      $(this).children(".spriteChecked").first().removeClass("spriteUnchecked");
    });
}

function deleteRemoveBulk() {
  if ($(".bulkSelect").attr("list") == "games0") {
    showDeleteBulk();
  } else {
    showRemoveBulk();
  }
}

function showDeleteBulk() {
  var toDelete = getBulkChecked();
  var text = "games";
  if (toDelete.count == 1) {
    text = "game";
  }
  showDeleteGame(toDelete.games, toDelete.count + " " + text);
}

function getBulkChecked() {
  var games = [];
  var count = 0;
  console.log(games);
  $(".bulkSelect")
    .parent()
    .children(".listContents")
    .first()
    .children()
    .children(".sprite.flipped")
    .each(function () {
      games.push({
        id: $(this).parent().children("li").first().attr("id").substr(8),
        name: $(this).parent().children("li").first().text(),
      });
      count++;
    });
  console.log(games);
  return { games: games, count: count };
}

function showRemoveBulk() {
  var toRemove = "";
  var toRemove = getBulkChecked();
  var list = $(".bulkSelect").attr("list");

  toRemove.games.forEach(function (e, i) {
    toRemove.games[i].list = list;
  });

  var text = "games";
  if (toRemove.count == 1) {
    text = "game";
  }
  contextRemove(toRemove.games, toRemove.count + " " + text);
}

function copyBulk() {
  console.log($(".bulkSelect").first().attr("list"));
  var lists = getMenuLists($(".bulkSelect").first().attr("list"));
  var bc = getBulkChecked();
  var games = bc.games;
  games.forEach(function (e) {
    e.list = $(".bulkSelect").first().attr("list");
  });

  console.log(games);
  displaySubContext(
    "Copying",
    games,
    lists,
    "copyToList",
    $(".bulkSelect").first().attr("list")
  );
}

function moveBulk() {
  var lists = getMenuLists($(".bulkSelect").first().attr("list"));
  var bc = getBulkChecked();
  var games = bc.games;
  games.forEach(function (e) {
    e.list = $(".bulkSelect").first().attr("list");
  });

  console.log(games);
  displaySubContext(
    "Moving",
    games,
    lists,
    "moveToList",
    $(".bulkSelect").first().attr("list")
  );
}

/**
 *
 *
 * @param {String} name
 * @param {String} func
 * @param {Array} classes
 * @returns
 */
function prepareAction(name, func, classes) {
  var htmlString = `<li class="action`;
  if (typeof classes == "object") {
    if (Array.isArray(classes)) {
      for (var i = 0; i < classes.length; i++) {
        htmlString += " " + classes[i];
      }
    }
  }
  htmlString += `" onclick="` + func + `">` + name + `</li>`;
  return htmlString;
}

function createNode(nodeClass, nodeId, subNodeClass, arr) {
  var htmlString = `<div class="` + nodeClass + `" id="` + nodeId + `">`;
  for (var i = 0; i < arr.length; i++) {
    htmlString += `<div class="` + subNodeClass + `">` + arr[i] + `</div>`;
  }
  htmlString += "</div>";
  return htmlString;
}

function showSubList(subList) {
  $(subList).removeClass("off");
  $(".listTitle").removeClass("off");
  setTimeout(function () {
    $(subList).addClass("slideUp");
    $(".listTitle").addClass("slideUp");
  }, 10);
}

function hideSubList(subList) {
  closeBulk();
  $(".bulkSelect").each(function () {
    this.remove();
  });
  $(subList).removeClass("slideUp");
  $(".listTitle").removeClass("slideUp");
  setTimeout(function () {
    $(subList).remove();
    $(".listTitle").remove();
  }, 510);
}

/**
 * {Desc} Shows a menu view
 *
 * @param {*} view
 */
function showMenuItem(view) {
  $(view).removeClass("off");
  window.setTimeout(function () {
    $(view).addClass("showMenuItem");
  }, 10);
}

/**
 * {Desc} Closes a menu view
 *
 * @param {*} view
 */
function closeMenuItem(view) {
  $(view).removeClass("showMenuItem");
  window.setTimeout(function () {
    $(view).addClass("off");
  }, 600);
}

function showAdderMenu() {
  $("body").append(writeAdder("Add a list or game"));
  setTimeout(function () {
    OnClickOutside("#menuAdder", "#menuAdder", ".subContextContainer");
    $("#contextShadow").removeClass("off");
  }, 10);
  $("#menuAdder").removeClass("off");
  $("#menuAdder").addClass("slideUp");
}

function showAdder(item, theId, func, funcArg, prompt) {
  if (funcArg) {
    funcArg = `'` + funcArg + `'`;
  }
  var el =
    `<div class="subContextContainer"><div class="subContextRename" id="subContext_` +
    item +
    `" >`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">` +
    prompt +
    `</div><hr/><div id="renameGameInputCont" class="textInputCont">
  <form onsubmit="return ` +
    func.substr(0, func.length - 1) +
    funcArg +
    `)` +
    `">
    <input class="textInput" type="text" autocomplete="off" id="` +
    theId +
    `">
    <input class="textSubmit" type="submit" value="">
  </form>`;
  $("body").append(el);
  getTopList();
}

function showGameContext(game) {
  if ($("#context_" + game.id).length == 0) {
    if (game.list) {
      $("#context_stage_" + game.id + "[list=games" + game.list + "]")
        .clone(true)
        .prop("id", "context_" + game.id)
        .appendTo($("body"));
      var bggLink = contextBGG(
        ".contextActions.slideUp li.bggLink",
        $(
          "#context_stage_" +
            game.id +
            "[list=games" +
            game.list +
            "] .contextTitle"
        )
          .first()
          .text()
      );
    } else {
      $("#context_stage_" + game.id)
        .clone(true)
        .prop("id", "context_" + game.id)
        .appendTo($("body"));
    }
    setTimeout(function () {
      OnClickOutside(
        "#context_" + game.id,
        "#context_" + game.id,
        ".subContextContainer"
      );
      $("#contextShadow").removeClass("off");
    }, 10);
    $("#context_" + game.id).removeClass("off");
    $("#context_" + game.id).addClass("slideUp");
  } else {
    console.log("already clicked");
  }
}

function contextMove(games) {
  var lists = getMenuLists($(".contextActions.slideUp").first().attr("list"));
  displaySubContext(
    "Moving",
    games,
    lists,
    "moveToList",
    $(".contextActions.slideUp").attr("list")
  );
}

function getMenuLists(fromList) {
  var lists = [];
  console.log("gml ", fromList);
  $("#gamesContainer")
    .children()
    .children()
    .children(".listName")
    .each(function () {
      lists.push({
        name: $(this).text().trim(),
        id: $(this).parent().parent().attr("id"),
      });
    });
  var index = lists.findIndex((obj) => obj.id == fromList);

  //Remove the origin list and All Games

  if (index > 0) {
    lists.splice(index, 1);
  }
  lists.splice(0, 1);
  return lists;
}

function closeSubContext(view) {
  closeMenuItem(view);
  $(view).remove();
}

/**
 *
 *
 * @param {String} text The action
 * @param {Object} game game.name [The subject], game.id [The subject id]
 * @param {Array} items items[i].id [toList], items[i].name [item name]
 * @param {*} fname
 */
function displaySubContext(text, games, items, fname, fromList) {
  console.log("display games, ", games);
  var el = `<div class="subContextContainer"><div class="subContext">`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">` +
    text +
    `</div><hr/>`;
  for (var i = 0; i < items.length; i++) {
    el += `<li onclick="` + fname + `({toList: '` + items[i].id + `', games:[`;
    games.forEach(function (e) {
      el += `'` + e.id + `',`;
    });
    el = el.substr(0, el.length - 1);
    el +=
      `], fromList: '` +
      fromList +
      `'})">` +
      items[i].name.replace(/\\/g, "") +
      `</li>`;
  }
  el += `</div></div>`;
  $("body").append(el);
}

function moveToList(options) {
  console.log(options);
  ttsFetch(
    "/move_to_list",
    {
      code: document.getElementById("code").innerHTML,
      games: options.games,
      toList: options.toList,
      fromList: options.fromList,
    },
    (res) => {
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
      gulp();
    }
  );
}

function contextCopy(games) {
  console.log("gml: ", $(".contextActions.slideUp").first().attr("list"));
  var lists = getMenuLists($(".contextActions.slideUp").first().attr("list"));
  displaySubContext(
    "Copying",
    games,
    lists,
    "copyToList",
    $(".contextActions.slideUp").attr("list")
  );
}

function copyToList(options) {
  ttsFetch(
    "/copy_to_list",
    {
      code: document.getElementById("code").innerHTML,
      games: options.games,
      toList: options.toList,
      fromList: options.fromList,
    },
    (res) => {
      console.log("copied with " + res.errors + " errors");
      $($("#" + options.games))
        .first()
        .clone(true)
        .appendTo("#" + options.toList + " .listGames");
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
      gulp();
    }
  );
}

function contextRename(game) {
  var el =
    `<div class="subContextContainer"><div class="subContextRename" id="subContext_` +
    game.id +
    `" >`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Renaming "` +
    game.name.replace(/\\/g, "") +
    `"</div><hr/><div id="renameGameInputCont" class="textInputCont">
    <form onsubmit="return renameGame(event, this, '` +
    game.id.substr(5 + game.length) +
    `', '` +
    game.name +
    `')" id="renameGameInput"></input>
    <input class="textSubmit" type="submit" value="">` +
    `<input class="textInput" type="text" autocomplete="off"></input>` +
    `</form>`;
  $("body").append(el);
}

function renameGame(event, caller, game, oldGame) {
  console.log($(caller), "Renaming ", game);
  ttsFetch(
    "/rename_game",
    {
      game: game,
      newName: $(caller).children(".textInput").val(),
    },
    (res) => {
      console.log("renamed");
      //$("#" + game).text(res.status.newName);
      $("#gamesContainer")
        .children()
        .children(".listGames")
        .children("li")
        .each(function () {
          if ($(this).text() == oldGame) {
            $(this).text($(caller).val());
            console.log("Renamed ", this);
          }
        });
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
      gulp();
    }
  );
  return false;
}

function showRenameList(list) {
  var el =
    `<div class="subContextContainer"><div class="subContextRename" id="subContext_` +
    list.id +
    `" >`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Renaming list "` +
    list.name.replace(/\\/g, "") +
    `"</div><hr/><div id="renameGameInputCont" class="textInputCont">
    <form onsubmit="return renameList(event, this, '` +
    list.id.substr(4) +
    `')" id="renameGameInput"></input>
    <input class="textInput" type="text" autocomplete="off"></input>
    <input class="textSubmit" type="submit" value="">`;
  $("body").append(el);
}

function renameList(event, caller, list) {
  ttsFetch(
    "/rename_list",
    {
      list: list,
      newName: $(caller).children('input[type="text"]').first().val(),
    },
    (res) => {
      console.log("renamed list");
      //$("#" + game).text(res.status.newName);
      $("#gamesContainer")
        .children("#games" + list)
        .children(".menuGamesContainer")
        .children(".listName")
        .text($(caller).val());
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
      gulp();
    }
  );
  return false;
}

function showDeleteList(list) {
  var el =
    `<div class="subContextContainer"><div class="subContextDelete" id="subContext_` +
    list.id +
    `" >`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Really delete list "` +
    list.name.replace(/\\/g, "") +
    `"?</div><hr/>
  <div class="button greenBtn" id="deleteCancel" onclick="$(this).parent().parent().remove()">Cancel</div>
  <div class="button redBtn" id="deleteConfirm" onclick="deleteList('` +
    list.id +
    `')">Delete</div>`;
  $("body").append(el);
}

function deleteList(list) {
  ttsFetch(
    "/delete_list",
    {
      list: list,
    },
    (res) => {
      $("#gamesContainer")
        .children("#games" + list.substr(4))
        .remove();
      gulp();
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
    }
  );
}

function showShareList(list) {
  var el =
    `<div class="subContextContainer"><div class="subContextDelete" id="subContext_` +
    list.id +
    `" >`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Share this code: ` +
    list.listCode +
    `</div><hr/>
    <div id="listButtonContainer">
    <div id="shareListButton" class="button greenBtn">Share <ion-icon name="share-outline"></ion-icon></div>
    <div id="copyListButton" class="button greenBtn">Copy <ion-icon name="copy-outline"></ion-icon></div></div>`;
  $("body").append(el);
  document
    .getElementById("shareListButton")
    .addEventListener("click", async () => {
      if (navigator.share) {
        navigator
          .share({
            title: list.name,
            text:
              'Link for game list "' +
              list.name.replace(/\\/g, "") +
              '"on selectagame: ',
            url: "https://selectagame.net/" + list.listCode,
          })
          .then(() => console.log("Successful share"))
          .catch((error) => console.log("Error sharing", error));
      } else {
        window.open(
          'mailto:?Subject=Import%20my%20list%20on%20SelectAGame&body=Click this link to import my the list "' +
            list.name.replace(/\\/g, "") +
            '" on SelectAGame.%0D%0A%0D%0A https://selectagame.net/' +
            list.listCode +
            ' %0D%0A%0D%0AIf the above link doesn%27t work, go the Games and Lists menu and click the "Plus" button to Import a list, and use this code: ' +
            list.listCode
        );
      }
    });
  $("#copyListButton").on("click", function () {
    copyText(
      window.location.origin + "/" + list.listCode,
      "Link copied to clipboard"
    );
  });
}

function showDeleteGame(arr, string) {
  var el = `<div class="subContextContainer"><div class="subContextDelete">`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Really delete ` +
    string +
    `?</div><hr/>
  <div class="button greenBtn" id="deleteCancel" onclick="$(this).parent().parent().remove()">Cancel</div>
  <div class="button redBtn" id="deleteConfirm" onclick="deleteGame([`;
  arr.forEach(function (e, i) {
    el += "{id: '" + e.id + "', name: '" + e.name + "'},";
  });
  el = el.substr(0, el.length - 1);
  el += `])">Delete</div>`;
  $("body").append(el);
}

function deleteGame(arr) {
  console.log("arr: ", arr);
  ttsFetch(
    "/delete_game",
    {
      games: arr,
    },
    (res) => {
      res.arr.forEach(function (e, i) {
        $("#gamesContainer")
          .children()
          .children(".listGames")
          .children("li")
          .each(function () {
            if ($(this).text() == e) {
              console.log("removing...");
              console.log(this);
              $(this).remove();
            }
          });
        $("#gamesContainer")
          .children(".listContents")
          .children(".displayGameContainer")
          .children("li")
          .each(function () {
            if ($(this).text() == e) {
              console.log("removing...");
              console.log(this);
              $(this).parent().remove();
            }
          });
      });
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
      gulp();
    }
  );
}

function contextRemove(games, text) {
  var el = `<div class="subContextContainer"><div class="subContextRemove">`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Remove ` +
    text +
    ` from this list?</div><hr/>
  <div class="button greenBtn" id="removeCancel" onclick="$(this).parent().parent().remove()">Cancel</div>
  <div class="button redBtn" id="removeConfirm" onclick="removeGame([`;

  games.forEach(function (e, i) {
    console.log("e: ", e, e.list.substr(e.list.length - 1));
    el +=
      "{game: '" +
      e.id +
      `', name: '` +
      e.name +
      `', list: '` +
      e.list.substr(e.list.length - 1) +
      "'},";
  });
  el = el.substr(0, el.length - 1);
  el += `])">Remove</div>`;
  $("body").append(el);
}

function removeGame(arr) {
  ttsFetch(
    "/remove_game",
    {
      games: arr,
    },
    (res) => {
      res.arr.forEach(function (e) {
        $("#gamesContainer")
          .children()
          .children(".listGames")
          .children("li")
          .each(function () {
            if ($(this).text() == e) {
              $(this).remove();
            }
          });
      });
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
      gulp();
    }
  );
}

function parseBGGThing(id, field) {
  return new Promise(function (resolve, reject) {
    fetch(`https://boardgamegeek.com/xmlapi2/thing?id=` + id)
      .then((response) => response.text())
      .then((data) => {
        var xmlDoc = $.parseXML(data);
        var $xml = $(xmlDoc);
        var $items = $xml.find("items");
        if ($items.attr("total") == 0) {
          reject("Error");
        } else {
          console.log(
            "Items: ",
            $items.children("item").children(field).first().html()
          );
          resolve($items.children("item").children(field).first().html());
        }
      });
  });
}

async function contextBGG(el, game, recur, inexact) {
  if (inexact) {
    var exactStr = "";
  } else {
    var exactStr = "&exact=1";
  }
  game = game.replace("&", "%26").replace(/\\/g, "");
  fetch(
    `https://boardgamegeek.com/xmlapi2/search?query=` +
      game +
      exactStr +
      `&type=boardgame`
  )
    .then((response) => response.text())
    .then((data) => {
      var xmlDoc = $.parseXML(data);
      var $xml = $(xmlDoc);
      var $items = $xml.find("items");
      console.log("items: ", $items);
      console.log($items.attr("total"));
      if ($items.attr("total") == 0) {
        if (typeof recur == "undefined") {
          contextBGG(el, "The " + game, 1);
        }
        if (recur == 1) {
          contextBGG(el, "A " + game.substr(4), 2);
        }
        if (recur == 2) {
          contextBGG(el, "An " + game.substr(2), 3);
        }
        if (recur == 3) {
          //contextBGG(el, game.substr(3), 4, true);
          return "";
        }
        if (recur == 4) {
          return "";
        }
      } else {
        console.log("Found");
        getHighestRatedItem($items).then((id) => {
          var ret = `https://boardgamegeek.com/boardgame/` + id;
          var html = $(el).html();
          $(el).html('<a href="' + ret + `" target="_blank">` + html + `</a>`);
        });
        async function getHighestRatedItem($items) {
          return new Promise((resolve) => {
            if ($items.attr("total") < 1) {
              resolve("Error - no items found");
            } else {
              if ($items.attr("total") == 1) {
                resolve($($items.children("item")[0]).attr("id"));
              } else {
                var ratings = [];
                const fetchRating = function (id) {
                  return new Promise((resolve) => {
                    fetch(
                      `https://boardgamegeek.com/xmlapi2/thing?id=` +
                        id +
                        `&stats=1`
                    )
                      .then((response) => response.text())
                      .then((data) => resolve(data));
                  });
                };
                const getHighestRatingID = async function () {
                  console.log(Number($items.attr("total")) - 1);
                  for (var i = 0; i < Number($items.attr("total")); i++) {
                    console.log(i + ": ");
                    var rating = await fetchRating(
                      $($items.children()[i]).attr("id")
                    );
                    var theRating = $(rating)
                      .children("item")
                      .children("statistics")
                      .children("ratings")
                      .children("ranks")
                      .children("rank[name='boardgame']")
                      .attr("value");
                    if (theRating == "Not Ranked") {
                      theRating = Number.MAX_SAFE_INTEGER;
                    } else {
                      theRating = Number(theRating);
                    }
                    ratings.push({
                      id: $(rating).children("item").attr("id"),
                      rank: theRating,
                    });
                  }
                  ratings.sort(function (a, b) {
                    return a.rank - b.rank;
                  });
                  console.log($items.children()[0]);
                  console.log($items.children()[1]);
                  console.log(ratings);
                  resolve(ratings[0].id);
                };
                getHighestRatingID().then((id) => {
                  resolve(id);
                });
              }
            }
          });
        }
        /*if ($items.attr("total") > 1) {
          var ratings = [];
          var newRating = '';
          for (var i = 0; i < $items.attr("total") - 1; i++) {
            newRating = await fetchRating($($items.children("item")[i]).attr("id"));
            ratings.push(newRating);
          }
          console.log("ratings: ", ratings);
        }
        
        }*/
      }
    });
}

function connectBGG() {
  ttsFetch(
    "/connect_bgg",
    {
      username: $("#accountInputCont form .textInput").val(),
    },
    (res) => {
      checkBGG();
      $(".subContextContainer").remove();
    }
  );
  return false;
}

function OnClickOutside(selector, toHide, extraSelector, hideInstead, hideFn) {
  const outsideClickListener = (event) => {
    const $target = $(event.target);

    /*console.log("clicked outside: ", $target);
    console.log(selector);
    console.log(extraSelector);
    console.log($target.attr("id"));
    console.log($target.closest(extraSelector));
    console.log($(extraSelector).is(":visible"));
    console.log($target.closest(selector));
    console.log($(selector).is(":visible"));
    console.log((!$target.closest(selector).length && $(selector).is(":visible")));*/
    if (
      (!$target.closest(selector).length && $(selector).is(":visible")) ||
      (extraSelector &&
        !$target.closest(extraSelector).length &&
        $(extraSelector).is(":visible")) ||
      (extraSelector && !$(extraSelector).is(":hidden"))
    ) {
      removeClickListener();
      $("#contextShadow").addClass("off");
      if (hideInstead) {
        hideFn($(selector));
      } else {
        $(toHide).remove();
      }
    }
  };

  const removeClickListener = () => {
    document.removeEventListener("click", outsideClickListener);
  };

  document.addEventListener("click", outsideClickListener);
}

function writeAdder(title) {
  //TODO: This whole workflow is ugly.
  var escapeStr = "$(\\&#39;#subContext_import input.textInput\\&#39;).val()";
  var htmlString =
    `<div class="contextActions off" list="menuAdder" id="menuAdder">` +
    `<div class="contextTitle">` +
    title +
    `</div>` +
    `<li onclick="showAdder('import', 'showImportMenu', 'runListImport($(\\&#39;#subContext_import input.textInput\\&#39;).val())', '', 'Import a list')">Import List</li>` +
    `<li onclick="showAdder('list', 'menuAddListInput', 'addList()', '', 'Add new list')">Add List</li>` +
    `<li onclick="showAdder('game', 'menuAddGamesInput', 'textSubmit()', '#menuAddGamesInput', 'Add new game')">Add Game</li>` +
    `</div>`;
  return htmlString;
}

function writeGameContext(contextObj) {
  var co = createContextObjectString(
    contextObj.id,
    contextObj.name,
    contextObj.list
  );
  console.log("contextObj ", contextObj);
  var htmlString =
    `<div class="contextActions off" list="games` +
    contextObj.list +
    `" id="context_stage_` +
    contextObj.id +
    `">` +
    `<div class="contextTitle">` +
    contextObj.name.replace(/\\/g, "") +
    `</div>` +
    `<li class="bggLink">BoardGameGeek Link</li>` +
    `<li onclick="contextMove([` +
    co +
    `])">Move</li>` +
    `<li onclick="contextCopy([` +
    co +
    `])">Copy</li>` +
    `<li onclick="contextRename(` +
    co +
    `, this)">Rename</li>` +
    `<li onclick="contextRemove([` +
    co +
    `], '` +
    contextObj.name +
    `')">Remove</li>` +
    `</div>`;
  return htmlString;
}

function createContextObjectString(id, name, list) {
  return `{id: '` + id + `', name:'` + name + `', list:'` + list + `'}`;
}

/**
 *
 *
 * @param {Object} contextObj id, name
 * @returns
 */
function writeListContext(contextObj) {
  console.log("wLC: ", contextObj);
  if (contextObj.listCode) {
    var shareable =
      `<li onclick="showShareList({id: '` +
      contextObj.id +
      `', name: '` +
      contextObj.name +
      `', listCode: '` +
      contextObj.listCode +
      `'})">Share</li>`;
  } else {
    var shareable = "";
  }
  var htmlString =
    `<div class="contextActions off" list="` +
    contextObj.id +
    `"id="context_stage_` +
    contextObj.id +
    `">` +
    `<div class="contextTitle">` +
    contextObj.name.replace(/\\/g, "") +
    `</div>` +
    shareable +
    `<li onclick="showRenameList({id: '` +
    contextObj.id +
    `', name: '` +
    contextObj.name +
    `'})">Rename</li>` +
    `<li onclick="showDeleteList({id: '` +
    contextObj.id +
    `', name: '` +
    contextObj.name +
    `'})">Delete</li>` +
    `</div>`;
  return htmlString;
}

function writeSessionContext(code, name, owned) {
  if (typeof name == "undefined") {
    name = code;
  }
  var htmlString =
    `<div class="contextActions off" class="sessionContext ` +
    code +
    `" id="context_stage_` +
    code +
    `">` +
    `<div class="contextTitle">` +
    name +
    `</div>` +
    `<li onclick="menuSubmitCode('` +
    code +
    `')">Open</li><li `;
  if ($("#" + code + " .owner").length > 0 || owned == true) {
    htmlString +=
      `onclick="showRenameSession({name: '` +
      name +
      `', id:'0000` +
      code +
      `'})"`;
  } else {
    htmlString += `class="grey"`;
  }
  htmlString +=
    `>Rename</li>` +
    `<li onclick="showDeleteSession({id: '` +
    code +
    `', name: '` +
    name +
    `'})">Delete</li>` +
    `</div>`;
  return htmlString;
}

/**
 * {Desc} Takes the sessions object from /get_sessions and fills #sessionsContainer
 *
 * @param {Object} res
 */
function writeSessions(res) {
  var htmlString = "";
  if (res.sessions) {
    console.log("Writing sessions");
    for (var i = 0; i < res.sessions.length; i++) {
      var usersplural = setPlural(res.sessions[i].users, " user, ", " users, ");
      var gamesplural = setPlural(res.sessions[i].games, " game", " games");
      /*if (typeof res.sessions[i].note == "undefined") {
      res.sessions[i].note = "";
    }*/
      htmlString += `<li><div class="sessionsCheck"><input type="checkbox"></div>`;
      if (typeof res.sessions[i].phrase != "undefined") {
        htmlString +=
          `<div class="sessionTitle ` +
          res.sessions[i].code +
          `" onclick="menuSubmitCode('` +
          res.sessions[i].code +
          `')">` +
          res.sessions[i].phrase +
          `</div>`;
      }
      htmlString +=
        `<div id="` +
        res.sessions[i].code +
        `" class="sessionCode ` +
        res.sessions[i].code +
        `" onclick="menuSubmitCode('` +
        res.sessions[i].code +
        `')">Code: ` +
        res.sessions[i].code;
      if (res.sessions[i].owned) {
        htmlString += `👑`;
      }
      htmlString +=
        `</div><div class="sessionDetails ` +
        res.sessions[i].code +
        `" onclick="menuSubmitCode('` +
        res.sessions[i].code +
        `')">` +
        res.sessions[i].users +
        usersplural +
        res.sessions[i].games +
        gamesplural +
        `</div><div class="sessionEdit ` +
        res.sessions[i].code +
        `"><ion-icon name="ellipsis-vertical" onclick="showGameContext({id: '` +
        res.sessions[i].code +
        `'})"></ion-icon>` +
        `</div></li>`;
      /*+`<ion-icon class="` +
      res.sessions[i].code +
      `" name="document-text-outline" onclick="$('.` +
      res.sessions[i].code +
      `.sessionNote').toggleClass('off')"></ion-icon></li>` +
      `<div class="` +
      res.sessions[i].code +
      ` sessionNote off">` +
      res.sessions[i].note +
      `</div>`;*/
      htmlString += writeSessionContext(
        res.sessions[i].code,
        res.sessions[i].phrase,
        res.sessions[i].owned
      );
    }
  } else {
    createAndShowAlert("Log in to save sessions", true);
  }
  $("#sessionsContainer").html(htmlString);
  $('.sessionsCheck input[type="checkbox"]').on("click", checkSessionBoxes());
  $(".sessionsCheck").on("click", function () {
    var $el = $(this).children('input[type="checkbox"]').first();
    //$el.prop("checked", !$el.prop("checked"))
    checkSessionBoxes();
  });
}

function checkSessionBoxes() {
  if ($('.sessionsCheck input[type="checkbox"]:checked').length > 0) {
    $("#sessionsContainer").removeClass("slideUp");
    if (
      $('.sessionsCheck input[type="checkbox"]:checked').length ==
      $('.sessionsCheck input[type="checkbox"]').length
    ) {
      selectAllSessions();
    }
  } else {
    closeBulkSessions();
  }
}

function selectAllSessions() {
  $('.sessionsCheck input[type="checkbox"]').prop("checked", true);
  $('ion-icon[name="square-outline"]').addClass("off");
  $('ion-icon[name="checkbox-outline"]').removeClass("off");
}

function closeBulkSessions() {
  $('.sessionsCheck input[type="checkbox"]').prop("checked", false);
  $('ion-icon[name="square-outline"]').removeClass("off");
  $('ion-icon[name="checkbox-outline"]').addClass("off");
  $("#sessionsContainer").addClass("slideUp");
}

function showBulkDeleteSessions() {
  var sessionsCount = $('.sessionsCheck input[type="checkbox"]:checked').length;
  var plural = "";
  if (sessionsCount > 1) {
    plural = "s";
  }
  var el = `<div class="subContextContainer"><div class="subContextDelete" id="subContext_bulkSessions" >`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Really delete ` +
    sessionsCount +
    ` session` +
    plural +
    `?</div><hr/>
    <div class="button greenBtn" id="deleteCancel" onclick="$(this).parent().parent().remove()">Cancel</div>
    <div class="button redBtn" id="deleteConfirm" onclick="bulkDeleteSessions()">Delete</div>`;
  $("body").append(el);
}

function bulkDeleteSessions() {
  var arr = [];
  $('.sessionsCheck input[type="checkbox"]:checked').each(function (i, e) {
    if (
      //$(e).parent().parent().children(".sessionCode").text().substr(-2) == "👑"
      true
    ) {
      arr.push(
        $(e).parent().parent().children(".sessionCode").text().substr(6, 5)
      );
      $(e).parent().parent().remove();
    }
  });
  ttsFetch("/delete_bulk_sessions", { sessions: arr }, (res) => {
    $(".subContextContainer").each(function () {
      $(this).remove();
    });
  });
}

function showRenameSession(session) {
  var el =
    `<div class="subContextContainer"><div class="subContextRename" id="subContext_` +
    session.id +
    `" >`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Renaming session "` +
    session.name.replace(/\\/g, "") +
    `"</div><hr/><div id="renameGameInputCont" class="textInputCont">
    <form onsubmit="return renameSession(event, this, '` +
    session.id.substr(4) +
    `')" id="renameGameInput"></input>
    <input class="textInput" type="text" autocomplete="off"></input>
    <input class="textSubmit" type="submit" value="">`;
  $("body").append(el);
}

function renameSession(event, caller, code) {
  var newName = $(caller).children('input[type="text"]').first().val();
  var oldName = $(".sessionTitle." + code).text();
  ttsFetch(
    "/rename_session",
    {
      code: code,
      newName: $(caller).children('input[type="text"]').first().val(),
    },
    (res) => {
      if ($(".phraseDisplay .owner").length > 0) {
        //Renaming the current session
        $(".phraseDisplay").each(function () {
          $(this).html(
            `<div class="phraseText">Session: ` +
              newName +
              `</div><div class="owner">👑<div class="tooltip">Owner</div></div><ion-icon name="create-outline"></ion-icon>`
          );
        });
      }
      if ($(".sessionTitle." + code).length == 0) {
        $("#" + code)
          .parent()
          .prepend(
            `<div class="sessionTitle ` + code + `">` + newName + `</div>`
          );
      } else {
        $(".sessionTitle." + code).text(newName);
      }
    }
  );

  $(".subContextContainer").each(function () {
    $(this).remove();
  });
  return false;
}

function showDeleteSession(session) {
  var el =
    `<div class="subContextContainer"><div class="subContextDelete" id="subContext_` +
    session.id +
    `" >`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Really delete session "` +
    session.name.replace(/\\/g, "") +
    `"?</div><hr/>
    <div class="button greenBtn" id="deleteCancel" onclick="$(this).parent().parent().remove()">Cancel</div>
    <div class="button redBtn" id="deleteConfirm" onclick="deleteSession('` +
    session.id +
    `')">Delete</div>`;
  $("body").append(el);
}

function deleteSession(code) {
  ttsFetch(
    "/delete_session",
    {
      code: code,
    },
    (res) => {
      console.log(code);
      if (code) {
        $("#" + code)
          .parent()
          .remove();
      }
      gulp();
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
    }
  );
}

function menuSubmitCode(code) {
  closeMenuItem("#sessionsView");
  if ($("#homeView").hasClass("off") && window.hist) {
    goBack(window.hist[window.hist.length - 1], "#homeView");
    window.hist = ["#homeView"];
    setBackHome();
  }
  $("#contextShadow").addClass("off");
  $(".contextActions.slideUp").remove();
  submitCode(code);
}

function submitCode(code) {
  clearLists(); //Clear any lists in #selectView
  window.hist = ["#homeView"];
  setBackHome();
  $(".errorText").removeClass("shake"); //Stop shaking if started
  ttsFetch("/join_session", { code: code }, (res) => {
    if (res.owned) {
      createSession(res.status);
    } else {
      joinSession(res.status);
    }
  });
  $("#codeInput .textInput").first().val(window.location.pathname.substr(1));
}

/** setPlural(countable, singular, plural)
 * {Desc} Returns singular if countable is singular, plural if otherwise
 *
 * @param {Number} countable
 * @param {String} singular
 * @param {String} plural
 * @returns {String} Singluar or plural
 */
function setPlural(countable, singular, plural) {
  if (countable == 1) {
    return singular;
  }
  return plural;
}

/**
 * Adds a game to user, unsorted
 *
 * @param {*} event
 */
function addNewGame(el) {
  console.log("submitting new game ", $(el));
  console.log(
    $(el)
      .val()
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "\\'")
  );
  var game = $(el)
    .val()
    .replace(/&/, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "\\'");
  $(el).val("");
  ttsFetch("/game_add", { game: game }, (res) => {
    //TODO: This doesn't get called at all in the event of an error?
    console.log(res);
    var htmlString =
      `<li>
                <div rating="` +
      res.status.rating +
      `" owned="` +
      res.status.owned +
      `" class="gameName" game_id="` +
      res.status._id +
      `">` +
      res.status.name.replace(/\\/g, "") +
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
    if (el == "#addGamesInput" || el == "#hitMeGame") {
      var toAdd = $('.listGames input[game_id="' + res.status._id + '"]');
      toAdd.prop("checked", true);
      toggleFont(toAdd);
    } else {
      gulp(true);
      recheckGreenLists();
    }
  });
}

/**
 * Adds a list to a user
 *
 * @param {*} event
 */
function addList() {
  // Number 13 is the "Enter" key on the keyboard
  console.log("addList");
  //if (event.keyCode === 13) {
  console.log("submitting new game");
  //event.preventDefault();
  var list = menuAddListInput.value
    .replace(/&/, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "\\'");
  ttsFetch("/list_add", { list: list }, (res) => {
    var gamesNum = $("#gamesView #gamesContainer").children("li").length;
    $("#gamesView #gamesContainer").append(
      `<li id="games` +
        gamesNum +
        `">` +
        `<div class="menuGamesContainer">
              <div class="listName" onclick="openList($(this).parent().parent().attr('id'))">` +
        list.replace(/\\/g, "") +
        `
              </div>
            </div>
            <div class="listExpand" onclick="showGameContext({id: 'list'+$(this).parent().attr('id').substr(5)})"> 
              <ion-icon name="ellipsis-vertical"></ion-icon> 
            </div>
            <div class="listGames off"></div>
        </li>`
    );
    $("#listContextContainer").append(
      writeListContext({
        id: "list" + gamesNum,
        name: list,
        listCode: res.listCode,
      })
    );
    $(".subContextContainer").remove();
  });
  return false;
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
          /*console.log(
            count,
            $(ele).children(".listGames").first().children("li").length
          );*/
        }
      });
    var theCount = $(ele).children(".listGames").first().children("li").length;
    if (count == theCount && theCount > 0) {
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
  //console.log("initGreenLists");
  var sessionGames = [];
  $("session")
    .children()
    .each(function (i, e) {
      sessionGames.push($(e).attr("id"));
    });
  //console.log(sessionGames);

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
          //console.log(count + " ," + $(e).parent().children().length);
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
  ttsFetch(
    "/modify_edit_list",
    {
      gamesToAdd: gamesToAdd,
      gamesToRemove: gamesToRemove,
      code: document.getElementById("code").innerHTML,
    },
    (res) => {
      var htmlString = "";
      var isChecked = "";
      console.log("modify res:", res);
      for (var i = 0; i < res.status.length; i++) {
        res.status[i].active ? (isChecked = " checked") : (isChecked = " ");
        htmlString +=
          `<li><div class="editGame">` +
          res.status[i].name.replace(/\\/g, "") +
          `</div>` +
          `<div class='toggle'>
          <label class="switch">
              <input type="checkbox"` +
          isChecked +
          ` onclick="toggleEdit(this)" game_id="` +
          res.status[i].id +
          `">
              <span class="slider round"></span>
          </label>
      </div></li>`;
      }
      $("#editGameList").html(htmlString);
      sortEditGames();
      registerEGS();
    }
  );
}

function registerEGS() {
  console.log("egs");
  $("#editGameSubmit").off();
  $("#editGameSubmit").on("click", function () {
    console.log("egs fired");
    ttsFetch(
      "/start_voting",
      {
        code: document.getElementById("code").innerHTML,
      },
      (res) => {
        console.log("starting voting: ", res);
        goForwardFrom("#postSelectView", "#voteView");
      }
    );
  });
}

function toggleFont(check) {
  console.log("toggleFont");
  var el = $(check).parent().parent().parent().children(".gameName").first();
  console.log(check);
  console.log(el);
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
  ttsFetch(
    "/add_game_to_session",
    {
      gamesToAdd: gamesToAdd,
      gamesToRemove: gamesToRemove,
      code: document.getElementById("code").innerHTML,
    },
    () => {
      recheckGreenLists();
    }
  );
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
  history.pushState(
    {},
    "SelectAGame",
    window.location.origin + "/" + $("#code").html()
  );
  $(".codeDisplay").each(function () {
    $(this).html("Your Code: " + code);
  });
  $(".codeDisplay").click(function () {
    copyText(
      window.location.origin + "/" + $("#code").html(),
      "Link copied to clipboard"
    );
  });
  $("#codeInput .textInput").first().val(code);
}

/*****************************/
/*     setPhrase(phrase)     */
/*****************************/
/*
 * Desc: Display the session phrase in correct places
 *
 * @param {Array} select
 */
function setPhrase(phrase) {
  $(".phraseDisplay").each(function () {
    console.log("Phrase: ", phrase);
    if (typeof phrase == "undefined") {
      $(this).html();
    } else {
      $(this).html(phrase);
    }
  });
}

/*****************************/
/*    copyText(codeArea)     */
/*****************************/
/**
 * {Desc} Copy text from the codeArea to the clipboard
 *
 * @param {*} codeArea
 */
function copyText(copy, text) {
  createAndShowAlert(text);
  const el = document.createElement("textarea");
  el.value = copy;
  document.body.appendChild(el);

  /* Select the text field */
  el.select();
  el.setSelectionRange(0, 99999); /*For mobile devices*/

  /* Copy the text inside the text field */
  document.execCommand("copy");
  document.body.removeChild(el);
}

function showAlert(alert) {
  $(alert).css({ opacity: 1, "z-index": 11 });
  setTimeout(function () {
    $(alert).css({ opacity: 0 });
    setTimeout(function () {
      $(alert).css({ "z-index": 0 });
    }, 1000);
  }, 1000);
}

function createAndShowAlert(alert, error = false) {
  var red = "";
  if (error) {
    red = " red";
  }
  $("body").append(
    '<div id="tempAlert" class="tempAlert' + red + '">' + alert + "</div>"
  );
  $("#tempAlert").css({ opacity: 1, "z-index": 101 });
  setTimeout(function () {
    $("#tempAlert").css({ opacity: 0 });
    setTimeout(function () {
      $("#tempAlert").remove();
    }, 3000);
  }, 3000);
}

function updateCurrentGames(curGames) {
  var htmlString = ``;
  curGames.forEach(function (e) {
    htmlString += `<div class="curGameItem">` + e.replace(/\\/g, "") + `</div>`;
  });
  $("#currentGames").html(htmlString);
  $("#listNotify").html("<span>" + curGames.length + "</span>");
}

/*****************************/
/*     showSelect(data)    */
/*****************************/
/*
 * Desc: Update user selections in real time
 *
 * @param {Array} select
 */
function showSelect(data, isOwner) {
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
  if (isOwner) {
    htmlString += `<div class="button greenBtn bottomBtn" id="gameLock" type="submit">Lock Game List 🔒</div>`;
  }
  $("#postSelectContainer").html(htmlString);
  console.log("registered lockGames");
  //Is this setting up too many events?
  $("#gameLock").click(this, function () {
    console.log("clicked gameLock");
    lockGames($("#code").text());
  });
}

/*****************************/
/*      showToolTip()     */
/*****************************/

/**
 *
 *
 * @param {*} thumb jQuery element to toggle class showVoteThumb on
 * @param {*} container jQuery element (toolTipContainer) to call function showVoteThumb on
 */
function showToolTip(thumb, container) {
  if ($(".toolTipContainer.showToolTip").length === 0) {
    $(thumb).toggleClass("showVoteThumb");
    showVoteThumb(container);
    setTimeout(function () {
      $(container).toggleClass("showToolTip");
      OnClickOutside(
        ".showToolTip",
        ".showToolTip",
        undefined,
        true,
        closeToolTipClickOutside
      );
    }, 10);
  }
}

function closeToolTipClickOutside(el) {
  closeToolTip($(el).children().first());
}

/*****************************/
/*      closeToolTip()     */
/*****************************/
/*
 * Desc: Close the game tooltip
 *
 * @param {*} el Tooltip Container
 */
function closeToolTip(el) {
  console.log(el);
  $(el).parent().removeClass("showToolTip");
  setTimeout(function () {
    console.log($(el));
    $(el).parent().parent().parent().removeClass("showVoteThumb");
  }, 251);
}

/*****************************/
/*      showVoteThumb()     */
/*****************************/
/*
 * Desc: Get the game thumbnail and description from BGG
 *
 * @param {*} el Tooltip Container
 */
function showVoteThumb(el) {
  console.log("Mouseover: ", $(el));
  var $el = $(el);
  if ($el.children(".BGGDesc").length == 0) {
    $el.append(`<div class="BGGDesc"></div>`);
    var id = $el.children(".voteSubTitle").children("a").attr("href");
    if (id) {
      id = id.substr(id.lastIndexOf("/") + 1);
      parseBGGThing(id, "thumbnail").then(function (res) {
        $el
          .children(".BGGDesc")
          .prepend(`<div class="BGGThumb"><img src="` + res + `"></img></div>`);
      });
      parseBGGThing(id, "description").then(function (res) {
        res = htmlDecode(res);
        console.log(res.substr(0, 200));
        if (res.length > 200) {
          res = reduceUntilNextWordEnd(res.substr(0, 200));
          res =
            res +
            `...<a target="_blank" href="` +
            $el.children(".voteSubTitle").children("a").attr("href") +
            `">[Read More<ion-icon name="open-outline"></ion-icon>]</a>`;
        }
        console.log(res);
        $el
          .children(".BGGDesc")
          .append(`<div class="BGGDescText">` + res + `</div>`);
      });
    }
  }
}

function reduceUntilNextWordEnd(input, found = false) {
  var end = input.substr(-1);
  //console.log(end, ": ", input);
  if (end.search(/[a-zA-Z0-9]/) > -1) {
    //Last character is a letter or number
    if (found) {
      //Last character is a letter or number and the previously removed character was not
      //console.log(input);
      return input;
    } else {
      return reduceUntilNextWordEnd(input.substr(0, input.length - 1));
    }
  } else {
    //Found the potential end, unless there's still a space or punctuation to discover
    //
    return reduceUntilNextWordEnd(input.substr(0, input.length - 1), true);
  }
}

function htmlDecode(input) {
  return $("<div />").html(input).text();
}

/*******************************/
/* sortObjectArray(obj, field) */
/*******************************/
/**
 *
 *
 * @param {Array} arr Array of objects to sort
 * @param {String} field Field to sort by
 * @returns {Array} sorted array
 */
function sortObjectArray(arr, field) {
  arr.sort(lowerCaseFieldSort(field));
  return arr;
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
  games = games.sort(lowerCaseFieldSort("name"));
  console.log("FillVotes: ", games);
  var htmlString = `<div id="voteInfo">Drag the slider for each game to vote! All the way to the right means you ABSOLUTELY have to play the game, all the way to the left means you can't stand the idea of playing the game.</div><div class="voteList">`;
  for (var i = 0; i < games.length; i++) {
    if (typeof games[i].votes == "undefined") {
      games[i].votes = 500;
    }
    htmlString +=
      `<div class="voteItem"><div class="voteLabel"><label for="` +
      games[i].game +
      `">` +
      games[i].name.replace(/\\/g, "") +
      `</label><div class="voteToolTip">
          <ion-icon name="help-circle-outline"></ion-icon>
          <div class="toolTipContainer"><div class="voteSubTitle">` +
      games[i].name.replace(/\\/g, "") +
      `</div>
        </div>
      </div></div>`;
    htmlString +=
      `<input type='range' min='1' max='1000' value='` +
      games[i].votes +
      `' step='1' id="` +
      games[i].game +
      `"/></div>`;
  }
  htmlString += `</div><div class="submitButton button greenBtn bottomBtn" id="voteButton">Submit Votes</div>`;
  //console.log("The string: ", htmlString);
  $("#voteContainer").html(htmlString);
  var voteIncrementer = 0;
  $("input[type=range]").on("change", function () {
    var arr = [];
    voteIncrementer++;
    $("input[type=range").each(function (i, e) {
      arr.push({ id: $(e).prop("id"), vote: $(e).val() });
    });
    ttsFetch(
      "save_votes",
      { votes: arr, incrementer: voteIncrementer, code: $("#code").text() },
      () => {}
    );
  });
  //sortVotes();
  for (var i = 0; i < games.length; i++) {
    contextBGG($(".voteToolTip .voteSubTitle")[i], games[i].name);
    console.log("context for " + games[i].name.replace(/\\/g, ""));
  }
  //$(".voteSubX").on("click", function() {closeToolTip(this)});
  $(".voteLabel label").on("click", function () {
    showToolTip(
      $(this).parent(),
      $(this).parent().children(".voteToolTip").children(".toolTipContainer")
    );
  });
  $(".voteToolTip>ion-icon").on("click", function () {
    showToolTip(
      $(this).parent().parent(),
      $(this).parent().children(".toolTipContainer")
    );
  });
  $("#voteButton").on("click", function () {
    var theCode = $("#code").text();
    var voteArray = [];
    $(".voteItem").each((i, e) => {
      voteArray.push({
        game: $(e).children("input")[0].id,
        vote: $(e).children("input").val(),
      });
    });
    console.log("voteArray", voteArray);
    ttsFetch(
      "/submit_votes",
      {
        code: theCode,
        voteArray: voteArray,
      },
      (res) => {
        goForwardFrom("#voteView", "#postVoteView");
        window.hist = ["#homeView", "#postVoteView"];
        setBackHome();
      }
    );
  });
}

function sortVotes() {
  console.log("sorting");
  console.log($("#voteContainer .voteList").first().children(".voteItem"));
  $("#voteContainer .voteList")
    .first()
    .children(".voteItem")
    .sort(lowerCaseDivSort(".voteLabel", "label"))
    .appendTo("#voteContainer .voteList")
    .first();
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
    ttsFetch(
      "/end_vote",
      {
        code: theCode,
      },
      (res) => {
        goForwardFrom("#postVoteView", "#playView");
      }
    );
  });
}

function textSubmit(el) {
  addNewGame(el);
  $("#addGamesInputCont .textSubmit").first().addClass("green");
  setTimeout(function () {
    $("#addGamesInputCont .textSubmit").first().removeClass("green");
  }, 1000);
  $(".subContextContainer").remove();
  return false;
}

function toggleWeight(el) {
  if ($(el).parent().children(".voteWeight").length > 0) {
    $(el).parent().children(".voteWeight").remove();
  } else {
    $(el)
      .parent()
      .append(
        "<div class='voteWeight'>" +
          $(el).parent().attr("data-content") +
          "</div>"
      );
  }
}

function fillGames(games) {
  var htmlString = ``;
  var bottom = games[games.length - 1].votes;
  var top = games[0].votes - bottom;
  for (var i = 0; i < games.length; i++) {
    games[i].weight = ((games[i].votes - bottom) / top) * 100;
    games[i].weight = games[i].weight.toString().substr(0, 4);
  }
  for (var i = 0; i < games.length; i++) {
    if (!$.isEmptyObject(games[i])) {
      htmlString +=
        `<div class="playGame"` +
        ` id="play` +
        i +
        `"><div class="playGameTitle">` +
        games[i].name.replace(/\\/g, "") +
        `</div><div class="voteWeight">(` +
        games[i].weight +
        `)</div><div class="playBGGLink button greenBtn">View on BGG</div></div>`;
    }
  }
  $("#playContainer").html(htmlString);
  $(".playGameTitle").click(function () {
    $(this).parent().children(".playBGGLink").toggleClass("showBGGLink");
  });
  $(".playGameTitle").each(function (i, e) {
    contextBGG($(e).parent().children(".playBGGLink"), $(e).text());
    console.log($(e).parent().children(".playBGGLink"), $(e).text());
  });
  for (var i = 0; i < games.length; i++) {
    contextBGG($(".voteSubTitle")[i], games[i].name);
  }
  console.log("fillgames");
}

function playShare() {
  if (navigator.share) {
    navigator
      .share({
        title: "SelectAGame",
        text: "View our SelectAGame playlist at ",
        url:
          "https://selectagame.net/" +
          document.getElementById("code").innerHTML,
      })
      .then(() => console.log("Successful share"))
      .catch((error) => console.log("Error sharing", error));
  } else {
    var games = "";
    $(".playGame").each(function (i, e) {
      games +=
        i +
        1 +
        ": " +
        $(e).children(".playGameTitle").first().text() +
        "%0D%0A";
    });
    window.open(
      "mailto:?Subject=SelectAGame%20Playlist%20" +
        document.getElementById("code").innerHTML +
        "&body=Click this link to view our playlist on SelectAGame%0D%0A%0D%0Ahttps://selectagame.net/" +
        document.getElementById("code").innerHTML +
        '%0D%0A%0D%0AIf the above link doesn%27t work, click "Join Game" on the home page and enter this code: ' +
        document.getElementById("code").innerHTML +
        "%0D%0A%0D%0AHere%27s our playlist: %0D%0A%0D%0A" +
        games
    );
  }
}

function showListSettings(el) {
  console.log(el);
  if ($(el).hasClass("listExpanded")) {
    console.log($(el).children(".listSettings"));
    $(el).next().children(".listSettings").remove();
    $(el).toggleClass("listExpanded");
  } else {
    htmlString =
      `<div class="listSettings">` +
      `<div id="listMove" onclick="listRename(this)">Move</div>` +
      `<div id="listRename" onclick="listRename(this)">Rename</div>` +
      `<div id="listDelete" onclick="listRename(this)">Delete</div>` +
      `</div>`;
    $(el).next().append(htmlString);
    $(el).toggleClass("listExpanded");
  }
}

function editList(list) {
  ttsFetch(
    "/edit_list",
    {
      gamesToAdd: gamesToAdd,
      gamesToRemove: gamesToRemove,
      code: document.getElementById("code").innerHTML,
    },
    (res) => {
      //console.log("Success");
    }
  );
}

function getTopList() {
  ttsFetch("/get_top_list", { code: code }, (res) => {
    if (document.getElementById("menuAddGamesInput") != null) {
      autocomplete(document.getElementById("menuAddGamesInput"), res.games);
    }
    if (document.getElementById("addGamesInput") != null) {
      autocomplete(document.getElementById("addGamesInput"), res.games);
    }
    var htmlString = `<div id="topList" class="off">`;
    res.games.forEach(function (e, i) {
      htmlString += `<li>` + e + `</li>`;
    });
    $("body").append(htmlString + `</div>`);
    console.log("added Autocomplete");
  });
}

function hitMe() {
  var arr = [];
  for (var i = 0; i < $("#games0 .listGames").children().length; i++) {
    if (
      !$(
        "#0 .listGames input[game_id='" +
          $($("#games0 .listGames").children()[i]).attr("id") +
          "']"
      ).prop("checked")
    ) {
      arr.push($($("#games0 .listGames").children()[i]).attr("id"));
    }
  }
  if (arr.length > 0) {
    var num = Math.floor(Math.random() * arr.length);
    var game = arr[num];
    console.log(arr.length, num, game, arr);
    /*$("body").append(
    `<input id="hitMeGame" value="` + game + `" class="off"></input>`
  );*/
    /*if (
    $("#0 .gameName").filter(function () {
      return $(this).text().toLowerCase().trim() == game.toLowerCase();
    }) == 0
  ) {*/
    var el = ".listGames li .toggle .switch input[game_id='" + game + "']";
    $(el).prop("checked", true);
    console.log($(el).prop("checked"));
    //debugger;
    toggleFont(el);
    $("#tempAlert").remove();
    createAndShowAlert("Added " + $("#" + game).text());
  } else {
    createAndShowAlert("No games to add! Add more games first.");
  }
  //$("#hitMeGame").remove();
  /*} else {
  //Add game to session
  }*/
}

function checkBGG() {
  ttsFetch(
    "/check_bgg",
    {
      code: document.getElementById("code").innerHTML,
    },
    (res) => {
      if (res.success) {
        var htmlString = `<div id="accountbggConnectTitle" class="title">BoardGameGeek Account</div>
        <div id="accountbggConnectField" class="field">
          <button id="bggConnectButton">Reconnect</button> 
        </div>
        <div id="accountbggCollImportTitle" class="title">BoardGameGeek Collection</div>
        <div id="accountbggCollImportField" class="field">
          <button id="bggCollImportButton">Import</button>
        </div>
        <div id="bggCollection" class="off">`;
        res.success.forEach(function (e) {
          htmlString += `<div class="bggGame">`;
          $.each(e, function (i, el) {
            htmlString += `<div class="` + i + `">` + el + `</div>`;
          });
          htmlString += `</div>`;
        });
        htmlString += `</div>`;
        $("#accountbggConnectTitle").remove();
        $("#accountbggConnectField").remove();
        $("#bggConnected").html(htmlString);
        $("#bggConnectButton").on("click", function () {
          showEditMenu("Enter your BGG username", "connectBGG");
        });
        $("#bggCollImportButton").on("click", function () {
          showBGGImport();
        });
      }
    },
    (res) => {}
  );
}

function showBGGImport() {
  var htmlString = `<div class="bggImport">
      <div class="closeButton" id="bggClose"><ion-icon name="close-outline"></ion-icon></div>
      <div class="bggImportTitle">
        <div class="bggImportTitleText">Select Games to Import</div>
      </div>
      <button class="bggFilterButton button greenBtn" id="bggFilterButton">Show Filters</button>
      <div class="bggFilters off">
        <div class="bggFilterLabel">Num. players:</div>
        <input class="bggFilterInput" id="bfNumP" type="number">
        <div class="bggFilterLabel">Min rank:</div>
        <input class="bggFilterInput" id="bfRank" type="number">
        <div class="bggFilterLabel">Min time:</div>
        <input class="bggFilterInput" id="bfMinT" type="number">
        <div class="bggFilterLabel">Max time:</div>
        <input class="bggFilterInput" id="bfMaxT" type="number">
        <div class="bggFilterLabel">Min plays:</div>
        <input class="bggFilterInput" id="bfMinX" type="number">
        <div class="bggFilterLabel">Max plays:</div>
        <input class="bggFilterInput" id="bfMaxX" type="number">
        <div class="bggFilterLabel">Owned:</div>
        <select class="bggFilterInput" id="bfOwned">
          <option value="b">Both</option>
          <option value="y">Yes</option>
          <option value="n">No</option>
        </select>
        <div class="bggFilterLabel">Wishlist:</div>
        <select class="bggFilterInput" id="bfWish">
          <option value="b">Both</option>
          <option value="y">Yes</option>
          <option value="n">No</option>
        </select>
        <div class="bggFilterLabel">Want to play:</div>
        <select class="bggFilterInput" id="bfWtp">
          <option value="b">Both</option>
          <option value="y">Yes</option>
          <option value="n">No</option>
        </select>
        <div class="bggFilterLabel">Want to buy:</div>
        <select class="bggFilterInput" id="bfWtb">
          <option value="b">Both</option>
          <option value="y">Yes</option>
          <option value="n">No</option>
        </select>
      </div>
      <div id="bggSelectAll"><label><input type="checkbox" onclick="bggSelectAll()"><div class="off">Select All</div></label></div>
      <div id="bggImportList"></div>
      <div class="bggListName">
        <div class="bggListNameTitle">Import into:</div>
        <select id="bggListSelect">`;
  $("#gamesContainer>li").each(function (i, e) {
    htmlString +=
      `<option value="` +
      i +
      `">` +
      $(e).children(".menuGamesContainer").children(".listName").first().text();
    htmlString += `</option>`;
  });
  htmlString += `</select></div>
      <button id="importBGG" class="button greenBtn" onclick="importBGG()">Import</button> 
    </div>`;
  $("body").append(htmlString);
  $("#bggFilterButton").on("click", function () {
    $(".bggFilters").toggleClass("off");
  });
  updateFilters();
  $(".bggFilterInput").on("change", function () {
    updateFilters();
  });
  $(".bggImport .closeButton").on("click", function () {
    $(this).parent().remove();
  });
}

function bggSelectAll() {
  var checked = $("#bggSelectAll label input").first().prop("checked");
  $("#bggImportList li").each(function (i, e) {
    $(e).parent().children("input").first().prop("checked", checked);
  });
}

function updateFilters() {
  var htmlString = ``;
  $("#bggCollection")
    .children(".bggGame")
    .each(function (i, e) {
      if (
        compBool(e, "bfNumP", "lt", "maxplayers") &&
        compBool(e, "bfNumP", "gt", "minplayers") &&
        compBool(e, "bfRank", "gt", "rank") &&
        compBool(e, "bfMinT", "lt", "playingtime") &&
        compBool(e, "bfMaxT", "gt", "playingtime") &&
        compBool(e, "bfMinX", "lt", "plays") &&
        compBool(e, "bfMaxX", "gt", "plays") &&
        compFlex(e, "bfOwned", "own") &&
        compFlex(e, "bfWish", "wishlist") &&
        compFlex(e, "bfWtp", "wanttoplay") &&
        compFlex(e, "bfWtb", "wanttobuy")
      ) {
        htmlString +=
          `<label><input type="checkbox" id="bggImport` +
          i +
          `"></input><li>` +
          getGameVal(e, "name") +
          `</li></label>`;
      }
    });
  $("#bggImportList").html(htmlString);
}

function compFlex(e, filterVal, gameVal) {
  var f = getFilterVal(filterVal);
  var g = getGameVal(e, gameVal);
  if (f != "" && typeof f != "undefined") {
    if (f == "b") {
      return true;
    }
    if (f == "y") {
      return Number(g);
    }
    if (f == "n") {
      return !Number(g);
    }
    return "Error: filterVal must equal b, y, or n";
  }
}

function compBool(e, filterVal, op, gameVal) {
  var f = Number(getFilterVal(filterVal));
  var g = Number(getGameVal(e, gameVal));
  /*console.log(
    getGameVal(e, "name"),
    ", ",
    filterVal,
    ", f: ",
    f != "" && typeof f != "undefined",
    f,
    "g: ",
    g
  );*/
  if (f != "" && typeof f != "undefined") {
    if (op == "lt") {
      return f <= g;
    }
    if (op == "gt") {
      return f >= g;
    }
    return 'Error, op must be "lt" or "gt"';
  } else {
    return true;
  }
}

function getFilterVal(val) {
  return $("#" + val).val();
}

function getGameVal(e, val) {
  return $(e)
    .children("." + val)
    .first()
    .text();
}

function importBGG() {
  var arr = [];
  $("#bggImportList li").each(function (i, e) {
    if ($(e).parent().children("input").first().prop("checked")) {
      arr.push($(e).text());
    }
  });
  ttsFetch(
    "/game_add_bulk",
    {
      games: arr,
      list: $("#bggListSelect").val(),
    },
    (res) => {
      console.log(res);
      createAndShowAlert("Imported Games");
    }
  );
}

function showCurrentGames() {
  if ($("#currentGames").hasClass("off")) {
    $("#currentGames").removeClass("off");
    $("#contextShadow").removeClass("off");
    $("#contextShadow").addClass("desktopAlwaysOff");
    $("#curGamesClose").removeClass("off");
  } else {
    closeCurrentGames();
  }
}

function closeCurrentGames() {
  $("#currentGames").addClass("off");
  $("#contextShadow").addClass("off");
  $("#contextShadow").removeClass("desktopAlwaysOff");
  $("#curGamesClose").addClass("off");
}

function startLoader() {
  console.log("startLoader");
  console.trace();
  $(".preloader").fadeIn(1500);
}

function finishLoader() {
  $(".preloader").fadeOut(200);
  //this should somehow resolve a promise since it's Async. Instead it's turning the loader off before start can turn it on.
}

function showEditMenu(text, fn) {
  var htmlString =
    `` +
    `<div class="subContextContainer">
    <div class="subContextAccount" id="accountRename">
      <div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()">
        <ion-icon name="close-outline" role="img" class="md hydrated" aria-label="close outline"></ion-icon>
      </div>
      <div class="subContextTitle">` +
    text +
    `</div>
      <hr>
      <div id="accountInputCont" class="textInputCont">
        <form onsubmit="return ` +
    fn +
    `()" id="accountInput">
          <input class="textSubmit" type="submit" value="">
          <input class="textInput" type="text" autocomplete="off">
        </form>
      </div>
    </div>
  </div>`;
  $("body").append(htmlString);
}

function changeUsername() {
  ttsFetch(
    "/change_username",
    {
      newName: $("#accountInput input.textInput")
        .val()
        .replace(/&/, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "\\'"),
    },
    (res) => {
      console.log(res);
      $("#hContainer .login .userNameContainer .userName span").text(
        "Hello, " + res.name
      );
      $("#accountUsernameField").html(
        res.name +
          $("#accountUsernameField")
            .html()
            .substr($("#accountUsernameField").text().length)
      );
      $("#accountUsernameField ion-icon").click(this, function (el) {
        showEditMenu("Change Username", "changeUsername");
      });
      $(".subContextContainer").remove();
    }
  );
  return false;
}

/*function changeEmail() {
  const ce_options = {
    method: "POST",
    body: JSON.stringify({
      newEmail: $("#accountInput input.textInput").val(),
    }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  startLoader();
  fetch("/change_email", ce_options).then(function (response) {
    finishLoader();
    return response.json().then((res) => {
      console.log(res);
      $("#accountEmailField").html(
        res.name +
          $("#accountEmailField")
            .html()
            .substr($("#accountEmailField").text().length)
      );
      $("#accountEmailField ion-icon").click(this, function (el) {
        showEditMenu("Email", "changeEmail");
      });
      $(".subContextContainer").remove();
    });
  });
  return false;
}
*/

function pwdReset() {
  ttsFetch(
    "/reset_password",
    {
      email: $("#accountEmailField").text(),
    },
    (res) => {
      if (res.status) {
        createAndShowAlert(res.status);
      }
    }
  );
}

function showError(err) {
  console.log("Error: ", err);
  $el = $("#errorAlert");
  $el.html(err);
  $el.removeClass("off");
  setTimeout(function () {
    $el.css("opacity", 1);
    $el.css("z-index", 999);
    setTimeout(function () {
      $el.css("opacity", 0);
      $el.css("z-index", -1);
      setTimeout(function () {
        $el.addClass("off");
      }, 510);
    }, 2000);
  }, 10);
}

function runListImport(code) {
  ttsFetch(
    "/get_list_code_info",
    { code: code },
    (res) => {
      if (res.list.err) {
        createAndShowAlert(res.list.err);
      } else {
        console.log(res);
        if (!res.overwrite) {
          var overwrite = ' class="off"';
        } else {
          var overwrite = "";
        }
        console.log("Overwrite: ", overwrite);
        var el =
          `<div class="subContextContainer"><div class="subContextImport" id="subContext_` +
          res.list.id +
          `" >`;
        el +=
          `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
          `<div class="subContextTitle">Import list "` +
          res.list.name.replace(/\\/g, "") +
          `" with ` +
          res.list.games.length +
          ` games?</div><hr/>
      <div id="importDuplicate"` +
          overwrite +
          `>
      <div id="importOverwrite"><input type="radio" name="duplicate" id="importOverwriteCheckbox" name="import" checked="true"><label for="importOverwriteCheckbox"> Overwrite?</label></div>
      <div id="importRename"><input type="radio" name="duplicate" id="importRenameCheckbox" name="import" ><label for="importRenameCheckbox"> Rename?</label><input type="text" id="importRenameText" class="off"></input></div>
      </div>
      <div class="importContainer"><div class="button redBtn" id="importCancel" onclick="$(this).parent().parent().remove()">Cancel</div>
  <div class="button greenBtn" id="importConfirm" onclick="performListImport('` +
          res.list.listCode +
          `')">Import</div></div>`;
        $("body").append(el);
      }
    },
    (res) => {
      $("body").append(
        `<div class="listImportCatch" onclick="$(this).next().remove(); $(this).remove();"></div>
    <div class="listImportError"><div class="closeButton" onclick="$(this).parent().prev().remove(); $(this).parent().remove();">
    <ion-icon name="close-outline"></ion-icon></div><div class="listImportErrorMsg">` +
          res.err +
          `</div><div class="listImportLogin"><button class="button blueBtn" onclick="window.location.href='/login';">Login/Sign Up</div></div>
    `
      );
    }
  );
  return false;
}

function performListImport(code) {
  if ($("#importRename input").prop("checked")) {
    var rename = $("#importRenameCheckbox").prop("checked");
    var oldListName = $(".subContextTitle")
      .text()
      .substring(13, $(".subContextTitle").text().lastIndexOf('"'));
    $(".subContextImport").first().remove();
    $(".subContextContainer")
      .first()
      .append(
        `<div class="subContextRename" id="renameImportList" >` +
          `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
          `<div class="subContextTitle">Renaming "` +
          oldListName +
          `"</div><hr/><div id="renameImportInputCont" class="textInputCont">
    <form onsubmit="return renameAndImportList({code: '` +
          code +
          `', name: $('#renameImportInputCont .textInput').first().val()})" id="renameImportListInput">
    <input class="textSubmit" type="submit" value="">` +
          `<input class="textInput" type="text" autocomplete="off"></input>` +
          `</form>` +
          `</div></div>`
      );
  } else {
    if ($("#importOverWriteCheckbox").prop("checked")) {
      ttsFetch("/get_list_from_code", { code: code }, (res) => {
        gulp();
        createAndShowAlert("List successfully added!");
      });
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
    } else {
      createAndShowAlert(
        "List already exists. Select overwrite or rename to add."
      );
    }
  }
}

function renameAndImportList(data) {
  console.log(data);
  ttsFetch(
    "/get_list_from_code",
    { code: data.code, name: data.name },
    (res) => {
      gulp();
      createAndShowAlert("List successfully added!");
    }
  );
  $(".subContextContainer").each(function () {
    $(this).remove();
  });
  return false;
}

/*****************************/
/*          getvh()          */
/*****************************/
/**
 * {Sets viewport height variables, --vh, --vh5, --vh10, etc}
 *
 */
function getvh() {
  console.log("getvh");
  console.log(this);
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

function hashToColor(game) {
  var htmlString =
    `<div class="sprite" onclick="bulkSelectGame(this)" id="sprite_` +
    game +
    `"><div class="spriteChecked spriteUnchecked">✓</div>`;
  for (var i = 0; i < 16; i++) {
    htmlString +=
      `<div class="spriteCell" style="background-color: #` +
      murmurhash3_32_gc(game, i).toString(16).substr(0, 6) +
      `"></div>`;
  }
  htmlString += `</div>`;
  return htmlString;
}

/**
 * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
 *
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 *
 * @param {string} key ASCII only
 * @param {number} seed Positive integer only
 * @return {number} 32-bit positive integer hash
 */

function murmurhash3_32_gc(key, seed) {
  var remainder, bytes, h1, h1b, c1, c1b, c2, c2b, k1, i;

  remainder = key.length & 3; // key.length % 4
  bytes = key.length - remainder;
  h1 = seed;
  c1 = 0xcc9e2d51;
  c2 = 0x1b873593;
  i = 0;

  while (i < bytes) {
    k1 =
      (key.charCodeAt(i) & 0xff) |
      ((key.charCodeAt(++i) & 0xff) << 8) |
      ((key.charCodeAt(++i) & 0xff) << 16) |
      ((key.charCodeAt(++i) & 0xff) << 24);
    ++i;

    k1 =
      ((k1 & 0xffff) * c1 + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 =
      ((k1 & 0xffff) * c2 + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1b =
      ((h1 & 0xffff) * 5 + ((((h1 >>> 16) * 5) & 0xffff) << 16)) & 0xffffffff;
    h1 = (h1b & 0xffff) + 0x6b64 + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16);
  }

  k1 = 0;

  switch (remainder) {
    case 3:
      k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    case 2:
      k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
    case 1:
      k1 ^= key.charCodeAt(i) & 0xff;

      k1 =
        ((k1 & 0xffff) * c1 + ((((k1 >>> 16) * c1) & 0xffff) << 16)) &
        0xffffffff;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 =
        ((k1 & 0xffff) * c2 + ((((k1 >>> 16) * c2) & 0xffff) << 16)) &
        0xffffffff;
      h1 ^= k1;
  }

  h1 ^= key.length;

  h1 ^= h1 >>> 16;
  h1 =
    ((h1 & 0xffff) * 0x85ebca6b +
      ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) &
    0xffffffff;
  h1 ^= h1 >>> 13;
  h1 =
    ((h1 & 0xffff) * 0xc2b2ae35 +
      ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16)) &
    0xffffffff;
  h1 ^= h1 >>> 16;
  var consoleval = h1;
  return h1 >>> 0;
}

/* Autocomplete function lifted from W3Schools because why not */
/* Usage: autocomplete(document.getElementById("myInput"), countries); */

function autocomplete(inp, arr) {
  /*the autocomplete function takes two arguments,
  the text field element and an array of possible autocompleted values:*/
  var currentFocus;
  /*execute a function when someone writes in the text field:*/
  inp.addEventListener("input", function (e) {
    var a,
      b,
      i,
      val = this.value;
    /*close any already open lists of autocompleted values*/
    closeAllLists();
    if (!val) {
      return false;
    }
    currentFocus = -1;
    /*create a DIV element that will contain the items (values):*/
    a = document.createElement("DIV");
    a.setAttribute("id", this.id + "autocomplete-list");
    a.setAttribute("class", "autocomplete-items");
    /*append the DIV element as a child of the autocomplete container:*/
    this.parentNode.appendChild(a);
    console.log("appended:");
    console.log(a);
    /*for each item in the array...*/
    for (i = 0; i < arr.length; i++) {
      /*check if the item starts with the same letters as the text field value:*/
      if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
        /*create a DIV element for each matching element:*/
        b = document.createElement("DIV");
        /*make the matching letters bold:*/
        b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
        b.innerHTML += arr[i].substr(val.length);
        /*insert a input field that will hold the current array item's value:*/
        b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
        /*execute a function when someone clicks on the item value (DIV element):*/
        b.addEventListener("click", function (e) {
          /*insert the value for the autocomplete text field:*/
          inp.value = this.getElementsByTagName("input")[0].value;
          /*close the list of autocompleted values,
              (or any other open lists of autocompleted values:*/
          closeAllLists();
        });
        a.appendChild(b);
      }
    }
  });
  /*execute a function presses a key on the keyboard:*/
  inp.addEventListener("keydown", function (e) {
    var x = document.getElementById(this.id + "autocomplete-list");
    if (x) x = x.getElementsByTagName("div");
    if (e.keyCode == 40) {
      /*If the arrow DOWN key is pressed,
        increase the currentFocus variable:*/
      currentFocus++;
      /*and and make the current item more visible:*/
      addActive(x);
    } else if (e.keyCode == 38) {
      //up
      /*If the arrow UP key is pressed,
        decrease the currentFocus variable:*/
      currentFocus--;
      /*and and make the current item more visible:*/
      addActive(x);
    } else if (e.keyCode == 13) {
      /*If the ENTER key is pressed, prevent the form from being submitted,*/
      e.preventDefault();
      if (currentFocus > -1) {
        /*and simulate a click on the "active" item:*/
        if (x) x[currentFocus].click();
      }
    }
  });
  function addActive(x) {
    /*a function to classify an item as "active":*/
    if (!x) return false;
    /*start by removing the "active" class on all items:*/
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = x.length - 1;
    /*add class "autocomplete-active":*/
    x[currentFocus].classList.add("autocomplete-active");
  }
  function removeActive(x) {
    /*a function to remove the "active" class from all autocomplete items:*/
    for (var i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
  }
  function closeAllLists(elmnt) {
    /*close all autocomplete lists in the document,
    except the one passed as an argument:*/
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
      if (elmnt != x[i] && elmnt != inp) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }
  /*execute a function when someone clicks in the document:*/
  document.addEventListener("click", function (e) {
    closeAllLists(e.target);
  });
}

function lowerCaseSort() {
  return function (a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
  };
}

function lowerCaseNameSort() {
  return function (a, b) {
    return a.name
      .replace(/\\/g, "")
      .toLowerCase()
      .localeCompare(b.name.toLowerCase());
  };
}

function lowerCaseFieldSort(field) {
  return function (a, b) {
    return a[field].toLowerCase().localeCompare(b[field].toLowerCase());
  };
}

function lowerCaseDivSort() {
  var arr = arguments;
  return function (a, b) {
    for (var i = 0; i < arr.length; i++) {
      a = $(a).children(arr[i]);
    }
    a = $(a).first();
    for (var i = 0; i < arr.length; i++) {
      b = $(b).children(arr[i]);
    }
    b = $(b).first();
    //console.log("Comparing: ", a, b);
    return $(a).text().toLowerCase().localeCompare($(b).text().toLowerCase());
  };
}
