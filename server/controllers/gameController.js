// @ts-nocheck
import { GamePlan } from "../db/dbConnection.js";
import { Game } from "../db/dbConnection.js";
import { Player } from "../db/dbConnection.js";
import { ArchivedGame } from "../db/dbConnection.js";
import ActiveGame from "../classes/ActiveGame.js";
import moment from "moment";

let client_url = "http://localhost:5173";
if (process.env.NODE_ENV === "production") {
  client_url = "http://quizgame.eu-4.evennode.com/";
}

export async function activateGame(req, res) {
  try {
    const { gamePlanId, gameEndTime } = req.body;
    let foundGamePlan = await GamePlan.findOne({ _id: gamePlanId });
    if (foundGamePlan) {
      let currentGame = new ActiveGame(foundGamePlan, gameEndTime);
      //make this link a QR code for the game master in the client
      console.log("Game activated");
      res.status(200).send({
        joinUrl: client_url + "/#/player-start/" + currentGame.gameCode,
      });
    } else {
      res.status(404).send({ error: "Game Plan not found" });
    }
  } catch (error) {
    res.status(500).send({ error: error });
  }
}

export async function startGame(req, res) {
  const filter = { gameCode: req.params.id, gameStatus: "activated" };
  const now = moment();
  const update = {
    gameStartTime: now,
    gameStatus: "started",
  };
  const options = { sort: { _id: 1 }, new: true };
  try {
    const updatedGame = await Game.findOneAndUpdate(filter, update, options);
    console.log("Game started");
    res.status(200).send({ updatedGame: updatedGame });
  } catch (error) {
    res.status(500).send({ error: error });
  }
}

export async function shareJoinLink(req, res) {
  try {
    const { gameCode } = req.body;
    let foundGame = await Game.findOne({ gameCode: gameCode });
    if (foundGame) {
      res.status(200).send({
        joinUrl: client_url + "/#/player-start/" + foundGame.gameCode,
      });
    } else {
      res.status(404).send({ error: "Game not found" });
    }
  } catch (error) {
    res.status(500).send({ error: error });
  }
}

export async function getGame(req, res) {
  try {
    const filter = { gameCode: req.params.id };
    let currentGame = await Game.findOne(filter);
    if (currentGame) {
      res.status(200).send({ currentGame: currentGame });
    } else {
      res.status(404).send({ error: "Game not found" });
    }
  } catch (error) {
    res.status(500).send({ error: error });
  }
}

export async function getGames(req, res) {
  try {
    const filter = { gameOwnerId: req.params.id };
    let currentGames = await Game.find(filter);
    if (currentGames.length > 0) {
      res.status(200).send({ currentGames: currentGames });
    } else {
      res.status(404).send({ error: "No games found" });
    }
  } catch (error) {
    res.status(500).send({ error: error });
  }
}

//Fix this
export async function playerJoin(req, res) {
  const { name } = req.body;
  const { gameCode } = req.body;
  console.log("name", name);
  console.log("gameCode", gameCode);
  try {
    if (name && gameCode) {
      const newPlayer = {
        gameCode: gameCode,
        name: name,
        pointsTotal: 0,
        markersFound: 0,
      };
      const player = await Player.create(newPlayer);
      console.log("player", player);

      if (player) {
        const filter = { gameCode: gameCode };
        const update = {
          $push: {
            players: player._id,
          },
        };
        const options = { sort: { _id: 1 }, new: true };
        const currentGame = await Game.findOneAndUpdate(
          filter,
          update,
          options
        );
        console.log("player added to currentGame ", currentGame.players);
      }
      res.status(200).send({
        player: player,
      });
    } else {
      res.status(404).send({ error: "No active game with this Id" });
    }
  } catch (error) {
    res.status(500).send({ error: error });
  }
}

export async function getPlayers(req, res) {
  try {
    const filter = { gameCode: req.params.id };
    let players = await Player.find(filter).sort({ pointsTotal: -1 });
    res.status(200).send({ players: players });
  } catch (error) {
    res.status(500).send({ error: error });
  }
}

//BROKEN
export async function endGame(req, res) {
  try {
    const filter = { gameCode: req.params.id, gameStatus: "started" };
    const update = {
      gameStatus: "archived",
    };
    const options = { sort: { _id: 1 }, new: true };
    const endedGame = await Game.findOneAndUpdate(filter, update, options);

    const finalPlayerStats = await Player.find({
      gameCode: endedGame.gameCode,
    });

    const gamePlan = {
      gameTitle: endedGame.gamePlan.gameTitle,
      gameMap: endedGame.gamePlan.gameMap,
      ownerId: endedGame.gamePlan.ownerId,
      markers: endedGame.gamePlan.markers,
    };

    //prepare to create achived game
    const archivedGameData = {
      gamePlan: gamePlan,
      gameCode: endedGame.gameCode,
      gameOwnerId: endedGame.gamePlan.ownerId,
      gameStartTime: endedGame.gameStartTime,
      gameEndTime: endedGame.gameEndTime,
      playersStats: finalPlayerStats,
    };
    console.log("archivedGameData ", archivedGameData);

    const archivedGame = await ArchivedGame.create(archivedGameData);

    //delete the endedGame from Games

    //deleting the game
    const deleteFilter = { gameCode: req.params.id, gameStatus: "archived" };
    const result = await Game.deleteOne(deleteFilter);
    if (result.deletedCount === 0) {
      res.status(403).send({ message: "Game not found" });
    }
    res.status(200).send({ archivedGame: archivedGame });
  } catch (error) {
    res.status(500).send({ error: error });
  }
}
