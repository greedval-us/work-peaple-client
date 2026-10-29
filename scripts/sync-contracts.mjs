import { cp, mkdir, readdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(process.argv[2] || resolve(repositoryRoot, '../work-peaple-server/proto'))
const destination = resolve(repositoryRoot, 'proto')

if (source === destination) throw new Error('Source and destination proto directories must differ.')

async function collectProtoFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) files.push(...await collectProtoFiles(resolve(directory, entry.name), relative))
    else if (entry.isFile() && entry.name.endsWith('.proto')) files.push(relative)
  }
  return files
}

const files = await collectProtoFiles(source)
if (files.length === 0) throw new Error(`No .proto contracts found in ${source}.`)
for (const file of files) {
  const target = resolve(destination, file)
  await mkdir(dirname(target), { recursive: true })
  await cp(resolve(source, file), target)
}
console.log(`Synchronized ${files.length} protobuf contract(s) into ${destination}.`)
console.log('Review the proto diff before committing; remove obsolete contracts explicitly when retiring an API version.')
