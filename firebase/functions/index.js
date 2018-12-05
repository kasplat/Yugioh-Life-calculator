'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');

var life_dict = {};
 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.ygo_calc = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }

  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }

  function startGame(agent) {
    agent.add(`Starting a new duel.`);
    var life = {};
    life_dict[agent.session] = life;
    life.p1 = 8000;
    life.p2 = 8000;
    agent.add(makeLifeText(agent));
    agent.add(new Suggestion(`Roll a die`));
    agent.add(new Suggestion('Deal 1000 damage to player 2'));
    agent.add(new Suggestion('Player 1 gains 1000 life points'));
  }
  
  function dealDamageToPlayer(agent){
    var player = agent.parameters.number;
    var damage = agent.parameters.number1;
    var life = getLife(agent);
    var player_won = false;
    if (player == 1){ 
        life.p1 -= damage;
        if (life.p1 < 0){ life.p1 = 0;}
        if (life.p1 === 0){ player_won = true;} 
    }
    else {
        life.p2 -= damage;
        if (life.p2 < 0){ life.p2 = 0;}
        if (life.p2 === 0){ player_won = true;}
    }
    player_won ? agent.add(winningText(agent)) : agent.add(makeLifeText(agent));
      
    agent.add('Dealt ' + damage + ' damage to Player ' + player + ".");
  }
  
  function makeLifeText(agent){
      var life = getLife(agent);
      return new Card({
        title: `Current Life Points`,
        imageUrl: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
        text: `Player 1: ` + life.p1 + " Player 2: " + life.p2,
      });
  }
  
  function winningText(agent){
      var life = getLife(agent);
      var winner = life.p1 === 0 ? 2 : 1;  // if p1 life is at 0, player 2 wins
      agent.add(new Suggestion('Start a new game.'));
      return new Card({
          title: 'Good Game!',
          text: 'Player ' + winner + ' wins! Congratulations.',
      });
  }
  
  function getLife(agent){
      console.log(agent.session);
      console.log(life_dict[agent.session]);
      return life_dict[agent.session];
  }
  
  function rollDice(agent){
      var result = Math.random();
      var out = rollDie(agent.parameters.number);
      agent.add('Rolled a ' + out);
  }
  
  function rollDie(sides){
      if(!sides) sides = 20;
      return 1 + Math.floor(Math.random() * sides);
  }
  
  function playerGainsLife(agent){
      var life = getLife(agent);
      var player = agent.parameters.number;
      var gain = agent.parameters.number1;
      player == 1 ? life.p1 += gain : life.p2 += gain;
      agent.add(makeLifeText(agent));
      agent.add('Player '  + player + ' gained ' + gain + " points.");
  }
      
  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('Play Game', startGame);
  intentMap.set('Deal Damage to a Player', dealDamageToPlayer);
  intentMap.set('Roll Dice', rollDice);
  intentMap.set('Player Gains Life', playerGainsLife);
  agent.handleRequest(intentMap);
});
