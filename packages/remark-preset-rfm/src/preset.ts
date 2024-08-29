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
}

export const defaultOptions: Required<Readonly<Options>> = {
  gfm: {},
}

export const remarkPresetRfm = (_options?: Readonly<Options>): Preset => {
  const options = defu(_options, defaultOptions)

  const plugins: PluggableList = []
  if (options.gfm !== false) {
    plugins.push([remarkGfm, options.gfm])
  }

  return { plugins }
}
