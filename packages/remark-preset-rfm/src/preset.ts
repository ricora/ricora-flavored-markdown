import remarkEmbed, { type RemarkEmbedOptions } from "@r4ai/remark-embed"
import {
  transformerLinkCard,
  transformerOEmbed,
} from "@r4ai/remark-embed/transformers"
import { defu } from "defu"
import type { Options as GfmOptions } from "remark-gfm"
import remarkGfm from "remark-gfm"
import type { PluggableList, Preset } from "unified"

export type Options = {
  /**
   * Options for `remark-gfm`.
   *
   * If `false`, `remark-gfm` will be disabled.
   * Otherwise, it will be enabled with the given options.
   *
   * @see https://github.com/remarkjs/remark-gfm
   *
   * @default {}
   */
  gfm?: GfmOptions | false

  /**
   * Options for `@r4ai/remark-embed`.
   *
   * If `false`, `@r4ai/remark-embed` will be disabled.
   * Otherwise, it will be enabled with the given options.
   *
   * @see https://github.com/r4ai/remark-embed
   */
  embed?: RemarkEmbedOptions | false
}

export const defaultOptions: Required<Readonly<Options>> = {
  gfm: {},
  embed: {
    transformers: [transformerOEmbed(), transformerLinkCard()],
  },
}

export const remarkPresetRfm = (_options?: Readonly<Options>): Preset => {
  const options = defu(_options, defaultOptions)

  const plugins: PluggableList = []
  if (options.gfm !== false) {
    plugins.push([remarkGfm, options.gfm])
  }
  if (options.embed !== false) {
    plugins.push([remarkEmbed, options.embed])
  }

  return { plugins }
}
