const { readline } = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Enter first number: ', (num1) => {
  const num2 = parseInt(rl.question('Enter second number: '));
  console.log(`The sum is: ${num1 + num2}`);
});