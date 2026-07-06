const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.error("Usage: node sdd-helper.js [task-brief|review-package] [args]");
  process.exit(1);
}

const sddDir = __dirname;

if (command === 'task-brief') {
  if (args.length < 3) {
    console.error("Usage: node sdd-helper.js task-brief PLAN_FILE TASK_NUMBER");
    process.exit(1);
  }
  const planFile = path.resolve(args[1]);
  const taskNum = args[2];
  
  if (!fs.existsSync(planFile)) {
    console.error(`Plan file not found: ${planFile}`);
    process.exit(1);
  }

  const content = fs.readFileSync(planFile, 'utf8');
  const lines = content.split(/\r?\n/);
  
  let inTask = false;
  let taskLines = [];
  let inFence = false;
  
  for (let line of lines) {
    if (line.startsWith('```')) {
      inFence = !inFence;
    }
    
    if (!inFence) {
      const match = line.match(/^#+\s+Task\s+(\d+)\b/i);
      if (match) {
        const foundNum = match[1];
        if (foundNum === taskNum) {
          inTask = true;
        } else if (inTask) {
          // Found the next task header, stop collecting
          break;
        }
      }
    }
    
    if (inTask) {
      taskLines.push(line);
    }
  }
  
  if (taskLines.length === 0) {
    console.error(`Task ${taskNum} not found in plan.`);
    process.exit(1);
  }
  
  const outFile = path.join(sddDir, `task-${taskNum}-brief.md`);
  fs.writeFileSync(outFile, taskLines.join('\n'));
  console.log(`wrote ${outFile}: ${taskLines.length} lines`);
} 

else if (command === 'review-package') {
  if (args.length < 3) {
    console.error("Usage: node sdd-helper.js review-package BASE HEAD");
    process.exit(1);
  }
  const base = args[1];
  const head = args[2];
  
  try {
    const baseShort = execSync(`git rev-parse --short ${base}`, { encoding: 'utf8' }).trim();
    const headShort = execSync(`git rev-parse --short ${head}`, { encoding: 'utf8' }).trim();
    
    const log = execSync(`git log --oneline ${base}..${head}`, { encoding: 'utf8' });
    const stat = execSync(`git diff --stat ${base}..${head}`, { encoding: 'utf8' });
    const diff = execSync(`git diff -U10 ${base}..${head}`, { encoding: 'utf8' });
    
    const outFile = path.join(sddDir, `review-${baseShort}..${headShort}.diff`);
    
    const outContent = [
      `# Review package: ${base}..${head}`,
      ``,
      `## Commits`,
      log,
      ``,
      `## Files changed`,
      stat,
      ``,
      `## Diff`,
      diff
    ].join('\n');
    
    fs.writeFileSync(outFile, outContent);
    const byteCount = Buffer.byteLength(outContent, 'utf8');
    const commitCount = log.trim().split('\n').filter(Boolean).length;
    console.log(`wrote ${outFile}: ${commitCount} commit(s), ${byteCount} bytes`);
  } catch (err) {
    console.error("Failed to generate review package:", err.message);
    process.exit(1);
  }
} 

else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}
