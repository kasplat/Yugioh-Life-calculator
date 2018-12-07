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
    var data = getData(agent);
    let player = agent.parameters.number;
    let damage = agent.parameters.number1;
    let player_won = false;
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
    setLife(agent, data.p1.life, data.p2.life);
    player_won ? agent.add(winningText(agent)) : agent.add(makeLifeText(agent));

    agent.add('Dealt ' + damage + ' damage to Player ' + player + ".");
    agent.add(new Suggestion('Undo'));
  }

  function init_game(agent){
    let p1 = {};
    let p2 = {};
    p1.life = 8000;
    p2.life = 8000;
    let context = {'name': 'life_context', 'lifespan': 1000000, 'parameters': {'p1': p1, 'p2': p2}};
    agent.context.set(context);
  }
  
  /**
   * creates a card that has the life text on it. Assumes that the agent's context has the life in it
   */
  function makeLifeText(agent){
    var data = getData(agent);
    return new Card({
      title: `Current Life Points`,
      imageUrl: 'https://vignette.wikia.nocookie.net/yugioh/images/e/e5/Back-EN.png/revision/latest?cb=20100726082133',
      text: `Player 1: ` + data.p1.life + " Player 2: " + data.p2.life,
    });
  }
  
  function winningText(agent){
    var data = getData(agent);
    let winner = data.p1.life === 0 ? 2 : 1;  // if p1 life is at 0, player 2 wins
    agent.add(new Suggestion('Start a new game.'));
    agent.add(new Suggestion('Undo'));
    return new Card({
        title: 'Good Game!',
        imageUrl: 'https://i.kym-cdn.com/photos/images/original/001/315/229/850.jpg',
        text: 'Player ' + winner + ' wins! Congratulations.',
    });
  }

  function getData(agent){
    if (!agent.context.get('life_context')){
      init_game(agent);
    }
    return agent.context.get('life_context').parameters;
  }
  
  function rollDice(agent){
    let out = rollDie(agent.parameters.number);
    agent.add('Rolled a ' + out);
  }
  
  function rollDie(sides){
    if(!sides) sides = 20;
    return 1 + Math.floor(Math.random() * sides);
  }
  
  function playerGainsLife(agent){
    var data = getData(agent);
    let player = agent.parameters.number;
    let gain = agent.parameters.number1;
    if (player == 1){ 
      data.p1.life += gain;
    }
    else {
      data.p2.life += gain;
    }
    setLife(agent, data.p1.life, data.p2.life);
    agent.add(makeLifeText(agent));
    agent.add('Player '  + player + ' gained ' + gain + " points.");
    agent.add(new Suggestion('Undo'));
  }

  /**
   * Sets the life. Also sets the previous life for the undo method.
   * @param {agent} agent 
   * @param {int} p1_life 
   * @param {int} p2_life 
   */
  function setLife(agent, p1_life, p2_life){
    var parameters = getData(agent);  // get old data to be manipulated
    let undo = {'old_p1' : parameters['p1']['life'], 'old_p2' : parameters['p2']['life']};
    parameters['p1']['life'] = p1_life;
    parameters['p2']['life'] = p2_life;
    parameters['undo'] = undo;
    let context = {'name': 'life_context', 'lifespan': 1000000, 'parameters': parameters};
    agent.context.set(context);
  }

  function undoAction(agent){
    var parameters = getData(agent);  // get old data to be manipulated
    if (!parameters['undo']){
      agent.add('No action to undo.');
    }
    else{
      parameters['p1']['life'] = parameters['undo']['old_p1'];
      parameters['p2']['life'] = parameters['undo']['old_p2'];
      delete parameters['undo']; 
      let context = {'name': 'life_context', 'lifespan': 1000000, 'parameters': parameters};
      agent.context.set(context);
    }
    agent.add(makeLifeText(agent));
    agent.add('Undid most recent action');
  }
      
  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Play Game', startGame);
  intentMap.set('Player Takes Damage', dealDamageToPlayer);
  intentMap.set('Roll Dice', rollDice);
  intentMap.set('Player Gains Life', playerGainsLife);
  intentMap.set('Undo', undoAction);
  agent.handleRequest(intentMap);
});
