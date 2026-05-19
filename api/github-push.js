// api/github-push.js — Push/update file lên GitHub qua REST API
// Không cần git CLI — chạy hoàn toàn serverless trên Vercel

const GITHUB_API = 'https://api.github.com';
const OWNER = process.env.GITHUB_OWNER || 'lhtrong0-oss';
const REPO_TOUR360 = 'trongletour360';
const REPO_BONSAI = 'bonsaidalat';

async function githubRequest(method, path, body) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers: {
      'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `GitHub API error: ${res.status}`);
  return data;
}

// Lấy SHA của file nếu đã tồn tại (cần để update)
async function getFileSha(repo, filePath) {
  try {
    const data = await githubRequest('GET', `/repos/${OWNER}/${repo}/contents/${filePath}`);
    return data.sha;
  } catch {
    return null; // File chưa tồn tại
  }
}

// Push file lên GitHub (create hoặc update)
export async function pushFile({ repo = REPO_TOUR360, filePath, content, commitMessage }) {
  const sha = await getFileSha(repo, filePath);
  const body = {
    message: commitMessage || `[Agent] ${sha ? 'Update' : 'Create'} ${filePath}`,
    content: Buffer.from(content).toString('base64'),
  };
  if (sha) body.sha = sha;

  await githubRequest('PUT', `/repos/${OWNER}/${repo}/contents/${filePath}`, body);
  return `https://${repo === REPO_TOUR360 ? 'trongletour360.net' : 'bonsai-dalat-trangle.vercel.app'}/${filePath}`;
}

// Push nhiều file cùng lúc
export async function pushFiles(files, repo = REPO_TOUR360) {
  const results = [];
  for (const { filePath, content, commitMessage } of files) {
    const url = await pushFile({ repo, filePath, content, commitMessage });
    results.push(url);
  }
  return results;
}
