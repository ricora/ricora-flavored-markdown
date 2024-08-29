/// <reference lib="dom" />

import { getAllByRole, getByRole, screen } from "@testing-library/dom"
import dedent from "dedent"
import type * as hast from "hast"
import type * as mdast from "mdast"
import rehypeStringify from "rehype-stringify"
import remarkMath from "remark-math"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"
import { describe, expect, test } from "vitest"
import { type Options, remarkPresetRfm } from "./preset.js"

const process = async (md: string, options?: Options) => {
  let hast: hast.Node
  let mdast: mdast.Root

  const html = (
    await unified()
      .use(remarkParse)
      .use(remarkMath)
      .use(remarkPresetRfm(options))
      .use(() => (tree: mdast.Root) => {
        mdast = tree
        return mdast
      })
      .use(remarkRehype)
      .use(() => (tree: hast.Node) => {
        hast = tree
        return hast
      })
      .use(rehypeStringify)
      .process(md)
  ).toString()

  // @ts-expect-error: hast and mdast is assigned
  return { hast, mdast, html }
}

const render = (html: string) => {
  document.body.innerHTML = html
}

describe("remark-gfm", () => {
  test("Should correctly process GFM autolink literals", async () => {
    const md = dedent`
      www.example.com

      https://www.example.com

      contact@example.com
    `

    const { html } = await process(md)
    render(html)

    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(3)
    expect(links[0]).toHaveProperty("href", "http://www.example.com/")
    expect(links[1]).toHaveProperty("href", "https://www.example.com/")
    expect(links[2]).toHaveProperty("href", "mailto:contact@example.com")
  })

  test("Should correctly process GFM footnote", async () => {
    const md = dedent`
      According to [^1]

      [^1]: This is a footnote.
    `

    const { html } = await process(md)
    render(html)

    const ref = screen.getByRole("superscript")
    const refLink = getByRole(ref, "link")
    expect(refLink.getAttribute("href")).toMatch(/#user-content-fn-1$/)
    expect(refLink).toHaveAttribute("data-footnote-ref")
    expect(refLink).toHaveTextContent("1")

    const footnoteHeading = screen.getByRole("heading")
    expect(footnoteHeading).toHaveAttribute("id", "footnote-label")
    expect(footnoteHeading).toHaveTextContent("Footnotes")

    const footnotes = screen.getAllByRole("listitem")
    expect(footnotes).toHaveLength(1)
    expect(footnotes[0]).toHaveTextContent("This is a footnote.")
    expect(getByRole(footnotes[0], "link")).toHaveAttribute(
      "href",
      "#user-content-fnref-1",
    )
  })

  test("Should correctly process GFM strikethrough", async () => {
    const md = dedent`
      ~~strikethrough~~
    `

    const { html } = await process(md)
    render(html)

    const strikethrough = screen.getByRole("deletion")
    expect(strikethrough).toHaveTextContent("strikethrough")
  })

  test("Should correctly process GFM table", async () => {
    const md = dedent`
      | a | b  |  c |  d  |
      | - | :- | -: | :-: |
    `

    const { html } = await process(md)
    render(html)

    const table = screen.getByRole("table")

    const rows = getAllByRole(table, "row")
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent("a b c d")

    const colHeaders = getAllByRole(rows[0], "columnheader")
    expect(colHeaders).toHaveLength(4)

    expect(colHeaders[0]).toHaveTextContent("a")
    expect(colHeaders[0]).not.toHaveAttribute("align")

    expect(colHeaders[1]).toHaveTextContent("b")
    expect(colHeaders[1]).toHaveAttribute("align", "left")

    expect(colHeaders[2]).toHaveTextContent("c")
    expect(colHeaders[2]).toHaveAttribute("align", "right")

    expect(colHeaders[3]).toHaveTextContent("d")
    expect(colHeaders[3]).toHaveAttribute("align", "center")
  })

  test("Should correctly process GFM tasklist", async () => {
    const md = dedent`
      - [ ] hoge
      - [x] fuga
    `

    const { html } = await process(md)
    render(html)

    const taskList = screen.getByRole("list")
    expect(taskList.className).toBe("contains-task-list")

    const taskListItems = getAllByRole(taskList, "listitem")
    expect(taskListItems).toHaveLength(2)

    expect(taskListItems[0].className).toBe("task-list-item")
    const checkbox = getByRole(taskListItems[0], "checkbox", { checked: false })
    expect(checkbox).toHaveProperty("disabled", true)

    expect(taskListItems[1].className).toBe("task-list-item")
    const checkedCheckbox = getByRole(taskListItems[1], "checkbox", {
      checked: true,
    })
    expect(checkedCheckbox).toHaveProperty("disabled", true)
  })
})
