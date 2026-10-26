import { createRequire } from "node:module"
import { copyFile, mkdir, stat } from "node:fs/promises"
import path from "node:path"

// Copies the tesseract.js runtime assets into public/ so the browser never has to
// download them from a CDN. Run through the dev/build scripts in package.json.

const require = createRequire(import.meta.url)
const frontendRoot = path.resolve(import.meta.dirname, "..")

const resolvePackageDir = (packageName) => path.dirname(require.resolve(`${packageName}/package.json`))

const tesseractDir = resolvePackageDir("tesseract.js")

// tesseract.js-core is a dependency of tesseract.js, not a direct dependency, so it is
// resolved relative to tesseract.js instead of from this package.
const coreDir = (() => {
	try {
		return resolvePackageDir("tesseract.js-core")
	} catch {
		return path.join(path.dirname(tesseractDir), "tesseract.js-core")
	}
})()

const languages = ["eng", "nor"]
const languageDataDirs = languages.map(language => resolvePackageDir(`@tesseract.js-data/${language}`))

const publicDir = path.join(frontendRoot, "public")
const workerDir = path.join(publicDir, "tesseract")
const coreTargetDir = path.join(workerDir, "core")
const languagesTargetDir = path.join(publicDir, "tessdata")

const isUpToDate = async (sourcePath, targetPath) => {
	try {
		const [source, target] = await Promise.all([stat(sourcePath), stat(targetPath)])
		return source.size === target.size
	} catch {
		return false
	}
}

const copy = async (sourcePath, targetPath) => {
	if (await isUpToDate(sourcePath, targetPath)) {
		return
	}
	await mkdir(path.dirname(targetPath), { recursive: true })
	await copyFile(sourcePath, targetPath)
	console.log(`copied ${path.relative(frontendRoot, targetPath)}`)
}

const copyLanguageData = async (language, languageDataDir) => {
	// "4.0.0_best_int" is the integerized "best" model: much smaller than "4.0.0" with
	// similar accuracy, which keeps the payload and the recognition start-up small.
	for (const candidate of ["4.0.0_best_int", "4.0.0"]) {
		const sourcePath = path.join(languageDataDir, candidate, `${language}.traineddata.gz`)
		try {
			await stat(sourcePath)
			await copy(sourcePath, path.join(languagesTargetDir, `${language}.traineddata.gz`))
			return
		} catch {
			// try the next candidate
		}
	}
	throw new Error(`No traineddata found in ${languageDataDir}`)
}

await copy(
	path.join(tesseractDir, "dist", "worker.min.js"),
	path.join(workerDir, "worker.min.js")
)

// Only the LSTM-only cores are needed, as createWorker is called with OEM.LSTM_ONLY.
const coreFiles = ["tesseract-core-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"]
for (const coreFile of coreFiles) {
	await copy(path.join(coreDir, coreFile), path.join(coreTargetDir, coreFile))
}

for (const [index, language] of languages.entries()) {
	await copyLanguageData(language, languageDataDirs[index])
}

console.log("tesseract assets are ready")
