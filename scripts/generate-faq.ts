import assert from 'node:assert'
import fs from 'node:fs'
import process from 'node:process'

const MaxCharacters = 3800 // based on Discord 4k character limitation. 200 character reserved for formatting

generateFrequentlyAskedQuestions()
process.exit(0)

function generateFrequentlyAskedQuestions(): void {
  const featuresPage = fs.readFileSync('docs/FAQ.md', 'utf8').trim()

  const entries = featuresPage.split('##')
  entries.shift() // header

  const result: { title: string; body: string }[] = []

  for (let entry of entries) {
    entry = entry.trim()
    const parts = entry.split('\n')
    const title = parts.shift()
    const body = parts.join('\n').trim()

    assert.ok(title !== undefined)
    assert.ok(body.length > 1)
    assert.ok(title.length + body.length <= MaxCharacters)

    result.push({ title, body })
  }

  fs.writeFileSync('resources/faq.json', JSON.stringify(result, undefined, 2))
}
