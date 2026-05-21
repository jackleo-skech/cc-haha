#!/usr/bin/env bun
/**
 * apply-fork-patches.ts — Auto-apply fork patches after upstream merge.
 *
 * Reads docs/fork/patches.json and applies missing patches.
 * Three layers:
 *   L0 — New files are preserved by git merge, nothing to do.
 *   L1 — Text-based insert/replace from patches.json.
 *   L2 — git cherry-pick each feature commit when text patches can't cover it.
 *
 * Usage: bun run scripts/apply-fork-patches.ts [--dry-run]
 *   --dry-run: show what would be applied without modifying files
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { spawnSync } from 'bun'

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
  featureBranches: Record<string, string>
  patches: Patch[]
}

const ROOT = resolve(import.meta.dir, '..')
const MANIFEST_PATH = resolve(ROOT, 'docs/fork/patches.json')
const DRY_RUN = process.argv.includes('--dry-run')

function filePath(p: string): string {
  return resolve(ROOT, p)
}

function readFileContent(p: string): string | null {
  const abs = filePath(p)
  if (!existsSync(abs)) return null
  return readFileSync(abs, 'utf-8')
}

function writeFileContent(p: string, content: string): void {
  if (DRY_RUN) {
    console.log(`  [dry-run] would write ${p}`)
    return
  }
  writeFileSync(filePath(p), content, 'utf-8')
}

function isPatchApplied(patchFile: PatchFile): boolean {
  const content = readFileContent(patchFile.path)
  if (!content) return false
  return content.includes(patchFile.verify)
}

function applyTextPatch(patch: Patch): { applied: number; skipped: number; failed: string[] } {
  let applied = 0
  let skipped = 0
  const failed: string[] = []

  for (const file of patch.files) {
    if (isPatchApplied(file)) {
      skipped++
      continue
    }

    const content = readFileContent(file.path)
    if (!content) {
      failed.push(`${file.path}: file not found`)
      continue
    }

    switch (patch.type) {
      case 'insert_after': {
        if (!file.anchor || !file.insertAfter) {
          failed.push(`${file.path}: missing anchor or insertAfter`)
          continue
        }
        const idx = content.indexOf(file.anchor)
        if (idx === -1) {
          failed.push(`${file.path}: anchor "${file.anchor}" not found`)
          continue
        }
        const insertPos = idx + file.anchor.length
        const newContent = content.slice(0, insertPos) + file.insertAfter + content.slice(insertPos)
        writeFileContent(file.path, newContent)
        applied++
        break
      }

      case 'insert_before': {
        if (!file.anchor || !file.insertBefore) {
          failed.push(`${file.path}: missing anchor or insertBefore`)
          continue
        }
        const idx = content.indexOf(file.anchor)
        if (idx === -1) {
          failed.push(`${file.path}: anchor "${file.anchor}" not found`)
          continue
        }
        const newContent = content.slice(0, idx) + file.insertBefore + content.slice(idx)
        writeFileContent(file.path, newContent)
        applied++
        break
      }

      case 'replace': {
        if (!file.anchor || !file.replace) {
          failed.push(`${file.path}: missing anchor or replace`)
          continue
        }
        const idx = content.indexOf(file.anchor)
        if (idx === -1) {
          failed.push(`${file.path}: anchor "${file.anchor}" not found`)
          continue
        }
        const newContent = content.replace(file.anchor, file.replace)
        if (newContent === content) {
          failed.push(`${file.path}: replace had no effect`)
          continue
        }
        writeFileContent(file.path, newContent)
        applied++
        break
      }

      default:
        failed.push(`${file.path}: unknown type "${patch.type}"`)
    }
  }

  return { applied, skipped, failed }
}

function cherryPickFeature(featureBranch: string): boolean {
  // Try to cherry-pick the feature commit onto current HEAD
  // Get the commit hash from the branch
  const revParse = spawnSync(['git', 'rev-parse', featureBranch], { cwd: ROOT })
  if (revParse.exitCode !== 0) {
    console.log(`  ⚠  Branch ${featureBranch} not found locally`)
    return false
  }

  const target = spawnSync(['git', 'merge-base', featureBranch, 'HEAD'], { cwd: ROOT })
  if (target.exitCode !== 0) return false

  // Try to cherry-pick all commits on the branch that aren't in HEAD
  const logResult = spawnSync(
    ['git', 'log', '--reverse', '--format=%H', `${target.stdout.toString().trim()}..${featureBranch}`],
    { cwd: ROOT },
  )
  if (logResult.exitCode !== 0 || !logResult.stdout.toString().trim()) {
    return false
  }

  const commits = logResult.stdout.toString().trim().split('\n')
  let allSucceeded = true

  for (const commit of commits) {
    const cp = spawnSync(['git', 'cherry-pick', '--no-commit', commit], { cwd: ROOT })
    if (cp.exitCode !== 0) {
      // Cherry-pick failed; abort and report
      spawnSync(['git', 'cherry-pick', '--abort'], { cwd: ROOT })
      allSucceeded = false
      break
    }
  }

  if (allSucceeded) {
    // Commit all staged changes as a single cherry-pick commit
    spawnSync(['git', 'commit', '-m', `chore: apply fork patch from ${featureBranch}`], { cwd: ROOT })
  }

  return allSucceeded
}

async function main() {
  console.log('🔧 Applying fork patches...\n')

  if (!existsSync(MANIFEST_PATH)) {
    console.error('❌ patches.json not found at', MANIFEST_PATH)
    process.exit(1)
  }

  const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'))

  if (DRY_RUN) {
    console.log('  --dry-run mode: no files will be modified --\n')
  }

  let totalApplied = 0
  let totalSkipped = 0
  const totalFailed: string[] = []

  for (const patch of manifest.patches) {
    const { applied, skipped, failed } = applyTextPatch(patch)
    totalApplied += applied
    totalSkipped += skipped

    if (applied > 0) {
      console.log(`  ✓ [${patch.id}] ${patch.description}`)
    } else if (failed.length > 0) {
      // Try L2: git cherry-pick
      console.log(`  ! [${patch.id}] text patch failed, trying cherry-pick from ${patch.feature}...`)
      const cherryPicked = cherryPickFeature(patch.feature)
      if (cherryPicked) {
        console.log(`    ✓ Cherry-picked ${patch.feature}`)
        totalApplied++
      } else {
        console.log(`    ✗ Cherry-pick also failed`)
        for (const f of failed) {
          console.log(`      ${f}`)
          totalFailed.push(f)
        }
      }
    } else {
      console.log(`  - [${patch.id}] already applied (${skipped} file(s) skipped)`)
    }
  }

  console.log(`\n---`)
  console.log(`Applied: ${totalApplied}, Already applied: ${totalSkipped}, Failed: ${totalFailed.length}`)

  if (totalFailed.length > 0) {
    console.log(`\n❌ Some patches could not be applied automatically:`)
    for (const f of totalFailed) {
      console.log(`  ${f}`)
    }
    console.log(`\nThese require manual intervention. See docs/fork/README.md for guidance.`)
    process.exit(1)
  }

  console.log(`\n✅ All fork patches applied. Run 'bun run check:fork' to verify.`)
}

main()
