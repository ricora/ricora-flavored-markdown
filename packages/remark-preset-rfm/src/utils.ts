import type * as hast from "hast"
import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic"

export const html2hast = (html: string) => {
  const hast = fromHtmlIsomorphic(html, {
    fragment: true,
  }).children
  return hast as hast.ElementContent[]
}
