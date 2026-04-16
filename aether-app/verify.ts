import { createProjectRepository } from './electron/db.js';

const dbPath = process.env.AETHER_DB_PATH || 'test-db/aether.db';
let repo = createProjectRepository(dbPath);

console.log('--- FIRST LAUNCH ---');
let projects = repo.listProjects();
console.log('Projects on start:', projects.map(p => p.name));

console.log('Creating "TEST PROJECT"...');
repo.createProject({ name: 'TEST PROJECT', type: 'novel' });
projects = repo.listProjects();
console.log('Projects after create:', projects.map(p => p.name));

console.log('--- CLOSING APP ---');
// simulating closing app

console.log('--- SECOND LAUNCH ---');
repo = createProjectRepository(dbPath);
projects = repo.listProjects();
console.log('Projects on reopen:', projects.map(p => p.name));

console.log('--- CLOSING APP ---');
console.log('--- THIRD LAUNCH ---');
repo = createProjectRepository(dbPath);
projects = repo.listProjects();
console.log('Projects on second reopen:', projects.map(p => p.name));
