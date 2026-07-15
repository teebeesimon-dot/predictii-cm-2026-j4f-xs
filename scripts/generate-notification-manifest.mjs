import { readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rulesDir = join(root, 'lib/notifications/rules')
const output = join(root, 'lib/notifications/rules/generated-manifest.ts')

const files = (await readdir(rulesDir))
  .filter((name) => name.endsWith('-rule.ts'))
  .filter((name) => name !== 'generated-manifest.ts')
  .sort()

const imports = files.map(
  (name, index) =>
    `import plugin${index} from '@/lib/notifications/rules/${name.replace(/\.ts$/, '')}'`,
)
const plugins = files.map((_, index) => `  plugin${index},`)
const content = `// AUTO-GENERAT de scripts/generate-notification-manifest.mjs.
// Nu edita manual. Adaugă un fișier *-rule.ts și template-ul său pereche.
${imports.join('\n')}

export const notificationPlugins = [
${plugins.join('\n')}
] as const
`

await writeFile(output, content)
console.log(
  `[notifications] manifest: ${files.length} pluginuri → ${relative(root, output)}`,
)
