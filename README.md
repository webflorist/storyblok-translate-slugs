# DeepL-translation of slugs/names for Storyblok stories

[![npm version](https://img.shields.io/npm/v/storyblok-translate-slugs.svg)](https://www.npmjs.com/package/storyblok-translate-slugs)
[![license](https://img.shields.io/github/license/webflorist/storyblok-translate-slugs)](https://github.com/webflorist/storyblok-translate-slugs/blob/main/LICENSE)

An npx CLI tool to automatically translate the story-slugs and -names of a [Storyblok CMS](https://www.storyblok.com) space using the DeepL API.

## Requirements

- A **Storyblok** space with the [Translatable slugs app](https://www.storyblok.com/apps/translatable-slugs) installed (requires at least **Entry** plan).
- A **DeepL API** account (Free or Pro).

## Installation

```shell

# simply auto-download and run via npx
$ npx storyblok-translate-slugs

# or install globally
$ npm install -g storyblok-translate-slugs

# or install for project using npm
$ npm install storyblok-translate-slugs

# or install for project using yarn
$ yarn add storyblok-translate-slugs

# or install for project using pnpm
$ pnpm add storyblok-translate-slugs
```

## Usage

Call `npx storyblok-translate-slugs` with the following options:

### Options

```text
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
--force                        Creates new slug, even if slug-field already has content. Defaults to false.
--publish                      Publish stories after updating. Defaults to false.
                               WARNING: May publish previously unpublished stories.
--dry-run                      Only display the changes instead of performing them. Defaults to false.
--verbose                      Show detailed output for every processed story.
--help                         Show this help
```

Storyblok OAuth token, space-id and region as well as the DeepL API Key can be set via environment variables. You can also use a `.env` file in your project root for this (see `.env.example`).

### Minimal example

```shell
npx storyblok-translate-slugs --token 1234567890abcdef --space 12345 --deepl-api-key 1234567890abcdef
```

### Maximal example

```shell
npx storyblok-translate-slugs \
    --token 1234567890abcdef \
    --deepl-api-key 1234567890abcdef \
    --region us \
    --source-lang en \
    --content-types "page,news-article" \
    --skip-stories "home" \
    --locales "de,fr" \
    --force \
    --publish \
    --dry-run \
    --verbose
```

## License

This package is open-sourced software licensed under the [MIT license](https://github.com/webflorist/storyblok-translate-slugs/blob/main/LICENSE).
