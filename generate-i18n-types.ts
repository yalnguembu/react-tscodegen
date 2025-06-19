import fs from "fs"
import path from "path"

const namespaces = ["translation"]

// Générer les types pour chaque namespace
namespaces.forEach((ns) => {
  const inputPath = path.resolve(`public/locales/en/${ns}.json`)
  const outputPath = path.resolve(`src/types/i18n/${ns}.d.ts`)

  const translations = JSON.parse(fs.readFileSync(inputPath, "utf-8"))

  // Créer le répertoire s'il n'existe pas
  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  }

  const typeDefinition = `export default ${JSON.stringify(translations, null, 2)} as const`
  fs.writeFileSync(outputPath, typeDefinition)
})

// Générer le fichier principal de types
const mainTypeDefinition = `
import 'i18next'
import translation from './translation'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: {
      translation: typeof translation
    }
  }
}
`

fs.writeFileSync(path.resolve("src/types/i18n/i18n.d.ts"), mainTypeDefinition)
console.log("Types générés avec succès !")
