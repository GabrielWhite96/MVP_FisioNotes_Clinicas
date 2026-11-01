const fs = require('fs')
const path = require('path')

const root = 'supabase/functions'
const cors = fs.readFileSync(path.join(root, '_shared/cors.ts'), 'utf8').replace(/\r\n/g, '\n')
const crypto = fs.readFileSync(path.join(root, '_shared/google-crypto.ts'), 'utf8').replace(/\r\n/g, '\n')
const calendar = fs
  .readFileSync(path.join(root, '_shared/google-calendar.ts'), 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/import \{ decryptSecret, encryptSecret \} from "\.\/google-crypto\.ts";\n/, '')

const sharedBundle = `${cors}\n${crypto}\n${calendar}\n`

const fns = [
  ['google-calendar-oauth-start', true],
  ['google-calendar-oauth-callback', false],
  ['google-calendar-disconnect', true],
  ['google-calendar-sync', true],
]

for (const [name, verifyJwt] of fns) {
  let index = fs.readFileSync(path.join(root, name, 'index.ts'), 'utf8').replace(/\r\n/g, '\n')
  // Strip shared imports; keep edge-runtime import
  index = index
    .replace(/import \{[^}]+\} from "\.\.\/_shared\/cors\.ts";\n/, '')
    .replace(/import \{[\s\S]*?\} from "\.\.\/_shared\/google-calendar\.ts";\n/, '')
    .replace(/import \{[^}]+\} from "\.\.\/_shared\/google-crypto\.ts";\n/, '')

  const content = `import "jsr:@supabase/functions-js/edge-runtime.d.ts";\n${sharedBundle}${index.replace(
    /^import "jsr:@supabase\/functions-js\/edge-runtime\.d\.ts";\n/,
    ''
  )}`

  const payload = {
    project_id: 'qdfvhamkbfniepilqhqt',
    name,
    entrypoint_path: 'index.ts',
    verify_jwt: verifyJwt,
    files: [{ name: 'index.ts', content }],
  }
  fs.writeFileSync(`supabase/.temp/deploy-single-${name}.json`, JSON.stringify(payload))
  console.log(name, content.length)
}
