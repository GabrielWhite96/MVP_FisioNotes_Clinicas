const fs = require('fs')
const path = require('path')

const root = 'supabase/functions'
const sharedFiles = {
  'shared/cors.ts': fs
    .readFileSync(path.join(root, '_shared/cors.ts'), 'utf8')
    .replace(/\r\n/g, '\n'),
  'shared/google-crypto.ts': fs
    .readFileSync(path.join(root, '_shared/google-crypto.ts'), 'utf8')
    .replace(/\r\n/g, '\n'),
  'shared/google-calendar.ts': fs
    .readFileSync(path.join(root, '_shared/google-calendar.ts'), 'utf8')
    .replace(/\r\n/g, '\n'),
}

const fns = [
  ['google-calendar-oauth-start', true],
  ['google-calendar-oauth-callback', false],
  ['google-calendar-disconnect', true],
  ['google-calendar-sync', true],
]

for (const [name, verifyJwt] of fns) {
  let index = fs
    .readFileSync(path.join(root, name, 'index.ts'), 'utf8')
    .replace(/\r\n/g, '\n')
  index = index.replaceAll('../_shared/', './shared/')
  const payload = {
    project_id: 'qdfvhamkbfniepilqhqt',
    name,
    entrypoint_path: 'index.ts',
    verify_jwt: verifyJwt,
    files: [
      { name: 'index.ts', content: index },
      ...Object.entries(sharedFiles).map(([n, content]) => ({ name: n, content })),
    ],
  }
  fs.writeFileSync(`supabase/.temp/deploy-${name}.json`, JSON.stringify(payload))
  console.log(name, 'ok', payload.files.length)
}
