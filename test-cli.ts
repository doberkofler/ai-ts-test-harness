import {Command} from 'commander';

const program = new Command();
program.option('--foo <bar>', 'foo option');

let command = 'both';

program.command('run').action(() => {
	command = 'run';
});
program.command('report').action(() => {
	command = 'report';
});

program.action(() => {
	// root action
	console.log('root action triggered');
});

program.parse(process.argv);

console.log('command:', command);
console.log('foo:', program.opts().foo);
