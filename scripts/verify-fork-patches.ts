#!/usr/bin/env bun
/**
 * verify-fork-patches.ts — Check all fork patches are still alive after upstream merge.
 *
 * Usage: bun run scripts/verify-fork-patches.ts
 * Exit code: 0 = all patches alive, 1 = some missing
 */

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

interface PatchFile {
  path: string
  anchor?: string
  insertBefore?: string
  insertAfter?: string
  replace?: string
  verify: string
}

interface Patch {
  id: string
  feature: string
  description: string
  type: string
  files: PatchFile[]
}

interface Manifest {
  patches: Patch[]
}

const ROOT = resolve(import.meta.dir, '..')
const MANIFEST_PATH = resolve(ROOT, 'docs/fork/patches.json')

interface CheckResult {
  patchId: string
  description: string
  status: 'ok' | 'missing'
  details: string[]
}

function existsInFile(filePath: string, pattern: string): boolean {
  const absPath = resolve(ROOT, filePath)
  if (!existsSync(absPath)) return false
  const content = readFileSync(absPath, 'utf-8')
  return content.includes(pattern)
}

function checkPatch(patch: Patch): CheckResult {
  const result: CheckResult = {
    patchId: patch.id,
    description: patch.description,
    status: 'ok',
    details: [],
  }

  for (const file of patch.files) {
    const found = existsInFile(file.path, file.verify)
    if (!found) {
      result.status = 'missing'
      result.details.push(`  ${file.path}: missing "${file.verify}"`)
    } else {
      result.details.push(`  ${file.path}: ${found ? '✓' : '✗'}`)
    }
  }

  return result
}

async function main() {
  console.log('🔍 Verifying fork patches...\n')

  if (!existsSync(MANIFEST_PATH)) {
    console.error('❌ patches.json not found at', MANIFEST_PATH)
    process.exit(1)
  }

  const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'))
  const results: CheckResult[] = manifest.patches.map(checkPatch)

  const ok = results.filter((r) => r.status === 'ok')
  const missing = results.filter((r) => r.status === 'missing')

  for (const result of results) {
    const icon = result.status === 'ok' ? '✓' : '✗'
    console.log(` ${icon} [${result.patchId}] ${result.description}`)
    for (const detail of result.details) {
      console.log(detail)
    }
  }

  console.log(`\n---`)
  console.log(`Total: ${results.length}, OK: ${ok.length}, Missing: ${missing.length}`)

  if (missing.length > 0) {
    console.log(`\n❌ ${missing.length} patch(es) missing. Run: bun run apply:fork`)
    process.exit(1)
  }

  console.log(`\n✅ All fork patches are alive.`)
}

main()
