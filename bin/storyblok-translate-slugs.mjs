#!/usr/bin/env node
/* eslint-disable no-console */
import slugify from '@sindresorhus/slugify'
import minimist from 'minimist'
import StoryblokClient from 'storyblok-js-client'
import { performance } from 'perf_hooks'
import dotenvx from '@dotenvx/dotenvx'
import * as deepl from 'deepl-node'

const startTime = performance.now()

dotenvx.config({ quiet: true })

const args = minimist(process.argv.slice(2))

if ('help' in args) {
	console.log(`USAGE
  $ npx storyblok-translate-slugs
  
OPTIONS
  --token <token>                (required) Personal OAuth access token created
                                 in the account settings of a Stoyblok user.
                                 (NOT the Access Token of a Space!)
                                 Alternatively, you can set the STORYBLOK_OAUTH_TOKEN environment variable.
  --space <space_id>             (required) ID of the space to backup
                                 Alternatively, you can set the STORYBLOK_SPACE_ID environment variable.
  --deepl-api-key <key>          (required) DeepL API Key
                                 Alternatively, you can set the DEEPL_API_KEY environment variable.
  --region <region>              Region of the space. Possible values are:
                                 - 'eu' (default): EU
                                 - 'us': US
                                 - 'ap': Australia
                                 - 'ca': Canada
                                 - 'cn': China
                                 Alternatively, you can set the STORYBLOK_REGION environment variable.
  --source-lang <source-lang>    Source locale to translate from (=default Storyblok locale).
                                 Defaults uses DeepL auto-detection.
  --content-types <types>        Comma seperated list of content/component types to process. Defaults to 'page'.
  --skip-stories <stories>       Comma seperated list of the full-slugs of stories to skip.
                                 (e.g. --skip-stories "home,about-us")
  --only-stories <stories>       Comma seperated list of the full-slugs of stories you want to limit processing to.
                                 (e.g. --only-stories "about-us")
  --locales <locales>            Comma seperated languages to process. Leave empty for all languages.
                                 (e.g. --locales "de,fr")
  --overwrite                    Overwrites existing translations. Defaults to false.
  --publish                      Publish stories after updating. Defaults to false.
                                 WARNING: May publish previously unpublished stories.
  --dry-run                      Only display the changes instead of performing them. Defaults to false.
  --verbose                      Show detailed output for every processed story.
  --help                         Show this help

MINIMAL EXAMPLE
  $ npx storyblok-translate-slugs --token 1234567890abcdef --space 12345 --deepl-api-key 1234567890abcdef

MAXIMAL EXAMPLE
  $ npx storyblok-translate-slugs \\
      --token 1234567890abcdef \\
      --deepl-api-key 1234567890abcdef \\
      --region us \\
      --source-lang en \\
      --content-types "page,news-article" \\
      --skip-stories "home" \\
      --locales "de,fr" \\
      --overwrite \\
      --publish \\
      --dry-run
`)
	process.exit(0)
}

if (!('token' in args) && !process.env.STORYBLOK_OAUTH_TOKEN) {
	console.log(
		'Error: State your oauth token via the --token argument or the environment variable STORYBLOK_OAUTH_TOKEN. Use --help to find out more.'
	)
	process.exit(1)
}
const oauthToken = args.token || process.env.STORYBLOK_OAUTH_TOKEN

if (!('space' in args) && !process.env.STORYBLOK_SPACE_ID) {
	console.log(
		'Error: State your space id via the --space argument or the environment variable STORYBLOK_SPACE_ID. Use --help to find out more.'
	)
	process.exit(1)
}
const spaceId = args.space || process.env.STORYBLOK_SPACE_ID

let region = 'eu'
if ('region' in args || process.env.STORYBLOK_REGION) {
	region = args.region || process.env.STORYBLOK_REGION

	if (!['eu', 'us', 'ap', 'ca', 'cn'].includes(region)) {
		console.log('Error: Invalid region parameter stated. Use --help to find out more.')
		process.exit(1)
	}
}

const verbose = 'verbose' in args

if (!('deepl-api-key' in args) && !process.env.DEEPL_API_KEY) {
	console.log(
		'Error: State your DeepL API key via the --deepl-api-key argument or the environment variable DEEPL_API_KEY. Use --help to find out more.'
	)
	process.exit(1)
}
const deeplApiKey = args['deepl-api-key'] || process.env.DEEPL_API_KEY

const sourceLang = args['source-lang'] || null

const contentTypes = args['content-types'] ? args['content-types'].split(',') : ['page']

const locales = args['locales'] ? args['locales'].split(',') : []

const skipStories = args['skip-stories'] ? args['skip-stories'].split(',') : []

const onlyStories = args['only-stories'] ? args['only-stories'].split(',') : []

// Init Management API
const StoryblokMAPI = new StoryblokClient({
	oauthToken: oauthToken,
	region: region,
})

// Init DeepL API
const translator = new deepl.Translator(deeplApiKey)

// Default translate function
let detectedSourceLang = null
let totalBilledCharacters = 0
const translate = async (text, targetLang) => {
	const translationResult = await translator.translateText(text, sourceLang, targetLang)

	totalBilledCharacters += translationResult.billedCharacters

	// Check, if auto-detected source language is consistent.
	if (sourceLang === null) {
		if (!detectedSourceLang) {
			detectedSourceLang = translationResult.detectedSourceLang
		} else if (translationResult.detectedSourceLang !== detectedSourceLang) {
			console.log(
				`Error: Detected source language (${translationResult.detectedSourceLang}) is different from previously detected languages (${detectedSourceLang}). You might want to state a fixed source language using the --source-lang parameter.`
			)
			process.exit(1)
		}
	}

	return translationResult.text
}

// Fetch space info
if (locales.length === 0) {
	console.log(`No locales stated.`)
	console.log(`Fetching space locales...`)
	const spaceInfo = await StoryblokMAPI.get(`spaces/${spaceId}/`)
	spaceInfo.data.space.languages.map((language) => locales.push(language.code))
}

// General information
console.log('')
console.log(`Performing translation of story-slugs and -names for space ${spaceId}:`)
console.log(
	`- mode: ${args['dry-run'] ? 'dry-run' : 'live'} ${!args['dry-run'] ? (args.publish ? '(publish)' : '(no-publish)') : ''}`
)
console.log(`- source locale: ${sourceLang || 'auto-detect'}`)
console.log(`- target locales: ${locales.join(', ')}`)
console.log(`- content types: ${contentTypes.join(', ')}`)
if (skipStories.length > 0) {
	console.log(`- skipped stories: ${skipStories.join(', ')}`)
}
if (onlyStories.length > 0) {
	console.log(`- only stories: ${onlyStories.join(', ')}`)
}

// Fetch all stories
console.log('')
console.log(`Fetching stories...`)
const stories = []
const storyList = await StoryblokMAPI.getAll(`spaces/${spaceId}/stories`)
for (const story of storyList) {
	if (
		!story.is_folder &&
		contentTypes.includes(story.content_type) &&
		!skipStories.includes(story.full_slug) &&
		(onlyStories.length > 0 ? onlyStories.includes(story.full_slug) : true)
	) {
		const storyData = await StoryblokMAPI.get(`spaces/${spaceId}/stories/${story.id}`)
		stories.push(storyData.data.story)
	}
}

console.log('')
console.log(`Processing stories...`)
for (let i = 0; i < stories.length; i++) {
	const story = stories[i]

	if (verbose) {
		console.log('')
		console.log(`Default full slug:`, story.full_slug)
		console.log(`Default name:`, story.name)
	}

	for (let j = 0; j < locales.length; j++) {
		const locale = locales[j]

		if (!('localized_paths' in story)) {
			console.log(
				`Error: "localized_paths" key not found in story "${story.full_slug}". Do you have the "Translatable Slug" app installed?`
			)
			process.exit(1)
		}

		const existingTranslation = story.localized_paths.find((item) => item.lang === locale)

		if (existingTranslation && existingTranslation.published && !args.overwrite) {
			if (verbose) {
				console.log(
					`Skipped translation for locale "${locale}" due to published translations of name/slug already present. Use --overwrite, if you want to overwrite existing translation.`
				)
			}
			continue
		}

		// Perform translation of slug
		const slugTranslateResult = await translate(story.slug, locale)

		// Re-slugify the translated slug.
		const translatedSlug = slugify(slugTranslateResult)

		// Perform translation of name
		const translatedName = await translate(story.name, locale)

		// Update slugs in special translated_slugs_attributes property of story.
		if (!('translated_slugs_attributes' in story)) {
			story.translated_slugs_attributes = []
		}

		story.translated_slugs_attributes.push({
			lang: locale,
			slug: translatedSlug,
			name: translatedName,
		})
	}

	if (!('translated_slugs_attributes' in story)) {
		if (verbose) {
			console.log(`No translations needed.`)
		}
		continue
	} else {
		if (verbose) {
			console.log(`Updated translated slugs:`, story.translated_slugs_attributes)
		}
	}

	if (args['dry-run']) {
		if (verbose) {
			console.log('Dry-run mode. No changes performed.')
		}
		continue
	}

	await StoryblokMAPI.put(`spaces/${spaceId}/stories/${story.id}`, {
		story: story,
		...(args.publish ? { publish: 1 } : {}),
	})

	if (verbose) {
		console.log('Update successful.')
	}
}

const endTime = performance.now()

console.log('')
console.log(`Process successfully finished in ${Math.round((endTime - startTime) / 1000)} seconds.`)
console.log(`Total DeepL billed characters: ${totalBilledCharacters}`)
process.exit(0)
