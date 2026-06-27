import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface PipelineResult {
  success: boolean;
  stdout: string;
  stderr: string;
  outputDir: string;
  message: string;
}

function resolveScriptsDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'scripts'),
    path.resolve(process.cwd(), '../scripts'),
    path.resolve(__dirname, '../../../scripts'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'run_macro_agent.py'))) return dir;
    if (fs.existsSync(path.join(dir, 'run_weekly_fetch.py'))) return dir;
  }
  throw new Error('Could not find scripts/run_macro_agent.py');
}

export function isPythonPipelineAvailable(): boolean {
  try {
    resolveScriptsDir();
    return true;
  } catch {
    return false;
  }
}

export function runMacroAgentPipeline(
  week: number,
  options: { noPush?: boolean } = {}
): Promise<PipelineResult> {
  const scriptsDir = resolveScriptsDir();
  const outputDir = path.join(scriptsDir, 'output');

  const scriptName = fs.existsSync(path.join(scriptsDir, 'run_macro_agent.py'))
    ? 'run_macro_agent.py'
    : 'run_weekly_fetch.py';

  const args = [path.join(scriptsDir, scriptName), '--week', String(week)];

  if (options.noPush !== false) {
    args.push('--no-push');
  }

  const localRepo = process.env.LOCAL_GROUP_REPO_PATH?.trim();
  if (localRepo && fs.existsSync(localRepo)) {
    args.push('--repo', localRepo);
  }

  return runPythonScript(scriptsDir, args, outputDir, week);
}

export function runWeeklyPythonPipeline(
  week: number,
  options: { noPush?: boolean; backendUrl?: string } = {}
): Promise<PipelineResult> {
  return runMacroAgentPipeline(week, options);
}

function runPythonScript(
  scriptsDir: string,
  args: string[],
  outputDir: string,
  week: number
): Promise<PipelineResult> {
  return new Promise((resolve) => {
    const proc = spawn('python3', args, {
      cwd: scriptsDir,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        stdout,
        stderr,
        outputDir,
        message:
          code === 0
            ? `Macro Agent script completed for week ${week}`
            : `Macro Agent script failed (exit ${code})`,
      });
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        stdout,
        stderr: `${stderr}\n${err.message}`,
        outputDir,
        message: `Could not run python3: ${err.message}`,
      });
    });
  });
}

export function readPipelineOutput(week: number): {
  finviz?: unknown[];
  sectors?: unknown[];
  macroMarkdown?: string;
} {
  const scriptsDir = resolveScriptsDir();
  const outputDir = path.join(scriptsDir, 'output');
  const result: {
    finviz?: unknown[];
    sectors?: unknown[];
    macroMarkdown?: string;
  } = {};

  if (!fs.existsSync(outputDir)) return result;

  const stamp = new Date().toISOString().slice(0, 10);
  const finvizCandidates = [
    path.join(outputDir, `macro_finviz_1w_${stamp}.json`),
    path.join(outputDir, `finviz_futures_1W_${stamp}.json`),
  ];
  const sectorsCandidates = [
    path.join(outputDir, `macro_yahoo_sectors_${stamp}.json`),
    path.join(outputDir, `yahoo_sectors_5D_${stamp}.json`),
  ];
  const macroCandidates = [
    path.join(outputDir, `macro_report_w${week}.md`),
    path.join(outputDir, `macro_agent_data_W${week}.md`),
  ];

  const finvizFile = finvizCandidates.find((f) => fs.existsSync(f));
  const sectorsFile = sectorsCandidates.find((f) => fs.existsSync(f));
  const macroFile = macroCandidates.find((f) => fs.existsSync(f));

  if (finvizFile) {
    result.finviz = JSON.parse(fs.readFileSync(finvizFile, 'utf8'));
  }
  if (sectorsFile) {
    result.sectors = JSON.parse(fs.readFileSync(sectorsFile, 'utf8'));
  }
  if (macroFile) {
    result.macroMarkdown = fs.readFileSync(macroFile, 'utf8');
  }

  return result;
}
