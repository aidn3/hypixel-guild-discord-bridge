import fs from 'node:fs/promises'

async function loadAssets(): Promise<ApplicationAssets> {
  // Bundle controlled by rollup.config.js
  const BundledAssets: { blob: undefined | Record<keyof ApplicationAssets, string> } = { blob: undefined }
  const bundleBlob = BundledAssets.blob
  if (bundleBlob !== undefined) return loadBundledAssets(bundleBlob)

  return loadFiles()
}

function loadBundledAssets(bundle: Record<keyof ApplicationAssets, string>): ApplicationAssets {
  const result: Record<string, Buffer> = {}
  for (const [key, encoded] of Object.entries(bundle)) {
    result[key] = Buffer.from(encoded, 'base64')
  }

  return result as unknown as ApplicationAssets
}

async function loadFiles(): Promise<ApplicationAssets> {
  return {
    configurationExample: await fs.readFile('./config_example.yaml'),

    xIcon: await fs.readFile('./resources/x.webp'),
    alertIcon: await fs.readFile('./resources/alert.png'),

    minecraftFontDefault: await fs.readFile('./resources/fonts/minecraft-regular.ttf'),
    minecraftFontBold: await fs.readFile('./resources/fonts/minecraft-bold.otf'),
    minecraftFontItalic: await fs.readFile('./resources/fonts/minecraft-italic.otf'),
    minecraftFontUnicode: await fs.readFile('./resources/fonts/minecraft-unicode.ttf')
  }
}

export interface ApplicationAssets {
  configurationExample: Buffer

  xIcon: Buffer
  alertIcon: Buffer

  minecraftFontDefault: Buffer
  minecraftFontBold: Buffer
  minecraftFontItalic: Buffer
  minecraftFontUnicode: Buffer
}

export const Assets = await loadAssets()
