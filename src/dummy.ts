class Apple {
  constructor(public color = 'red') {
  }
}

console.log('Look, I am a happy TypeScript file running away.');
console.log('I\'ve got class ' + Apple);
var apple = new Apple();
console.log('I\'ve created an instance of it: ', apple);
apple.color = 'green';
console.log('I\'ve changed its colour: ', apple);