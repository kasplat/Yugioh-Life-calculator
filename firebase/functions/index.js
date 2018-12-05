'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.ygo_calc = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

  function startGame(agent) {
    agent.add(`Starting a new duel.`);
    init_game(agent);
    agent.add(makeLifeText(agent));
    agent.add(new Suggestion(`Roll a die`));
    agent.add(new Suggestion('Deal 1000 damage to player 2'));
    agent.add(new Suggestion('Player 1 gains 1000 life points'));
  }
  
  /**
   * deal a specified amount of damage to a specified player.
   */
  function dealDamageToPlayer(agent){
    data = agent.getContext('life_context').data;
    if (!data){
      init_game(agent);
    }
    var player = agent.parameters.number;
    var damage = agent.parameters.number1;
    var data = getData(agent);
    var player_won = false;
    if (player == 1){ 
        data.p1.life -= damage;
        if (data.p1.life < 0){ data.p1.life = 0;}
        if (data.p1.life === 0){ player_won = true;} 
    }
    else {
        data.p2.life -= damage;
        if (data.p2.life < 0){ data.p2.life = 0;}
        if (data.p2.life === 0){ player_won = true;}
    }
    player_won ? agent.add(winningText(agent)) : agent.add(makeLifeText(agent));
      
    agent.add('Dealt ' + damage + ' damage to Player ' + player + ".");
  }

  function init_game(agent){
    let p1 = {};
    let p2 = {};
    p1.life = 8000;
    p2.life = 8000;
    let context = {'name': 'life_context', 'lifespan': 10000, 'data': {'p1': p1, 'p2': p2}};
    agent.setContext(context);
  }
  
  /**
   * creates a card that has the life text on it. Assumes that the agent's context has the life in it
   */
  function makeLifeText(agent){
      data = getData(agent);
      return new Card({
        title: `Current Life Points`,
        imageUrl: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
        text: `Player 1: ` + data.p1.life + " Player 2: " + data.p2.life,
      });
  }
  
  function winningText(agent){
      var data = getData(agent);
      var winner = data.p1.life === 0 ? 2 : 1;  // if p1 life is at 0, player 2 wins
      agent.add(new Suggestion('Start a new game.'));
      return new Card({
          title: 'Good Game!',
          text: 'Player ' + winner + ' wins! Congratulations.',
      });
  }

  function getData(agent){
    return agent.getContext('life_context').data;
  }
  
  function rollDice(agent){
      var out = rollDie(agent.parameters.number);
      agent.add('Rolled a ' + out);
  }
  
  function rollDie(sides){
      if(!sides) sides = 20;
      return 1 + Math.floor(Math.random() * sides);
  }
  
  function playerGainsLife(agent){
      var data = getData(agent);
      var player = agent.parameters.number;
      var gain = agent.parameters.number1;
      player == 1 ? data.p1.life += gain : data.p2.life += gain;
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
