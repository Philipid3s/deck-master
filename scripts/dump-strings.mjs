import { collectAll } from './extract-strings.mjs';
const { content, ui, all } = await collectAll();
process.stderr.write(`content=${content.size} ui=${ui.size} total=${all.size}\n`);
process.stdout.write(JSON.stringify([...all].sort(), null, 2));
