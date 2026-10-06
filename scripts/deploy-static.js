// Đẩy thư mục dist/ lên nhánh gh-pages của repo GitHub (GitHub Pages phục vụ prochef.makxim.vn).
//   npm run deploy:static   (tự chạy build trước)
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const git = (args, cwd = root) => execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('Chưa có dist/ — chạy npm run build:static trước.');
  process.exit(1);
}

const remote = git(['remote', 'get-url', 'origin']);
const source = git(['rev-parse', '--short', 'HEAD']);

fs.rmSync(path.join(dist, '.git'), { recursive: true, force: true });
git(['init', '-q', '-b', 'gh-pages'], dist);
git(['add', '-A'], dist);
git(['-c', 'user.name=Makxim', '-c', 'user.email=kinhdoanh@makxim.vn', 'commit', '-q', '-m', `Deploy static site from ${source}`], dist);
execFileSync('git', ['push', '-f', remote, 'gh-pages'], { cwd: dist, stdio: 'inherit' });
fs.rmSync(path.join(dist, '.git'), { recursive: true, force: true });
console.log('Đã đẩy lên nhánh gh-pages.');
