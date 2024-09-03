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

describe("@r4ai/remark-embed", () => {
  describe("transformerOEmbed", () => {
    test("Correctly embed when oEmbed type is link", async () => {
      const md = dedent`
        https://oembed.example.com/link
      `

      const { html } = await process(md)
      render(html)

      const linkCard = screen.getByRole("link")
      expect(linkCard).toHaveAttribute(
        "href",
        "https://oembed.example.com/link",
      )
      expect(linkCard).toHaveTextContent("https://oembed.example.com/link")
      expect(linkCard).toHaveAttribute("class", "oembed oembed-link")
    })

    test("Correctly embed when oEmbed type is photo", async () => {
      const md = dedent`
        https://oembed.example.com/photo
      `

      const { html } = await process(md)
      render(html)

      const photo = screen.getByRole("img")
      expect(photo).not.toHaveAttribute("href")
      expect(photo).toHaveAttribute("src")
      expect(photo).toHaveAttribute("width")
      expect(photo).toHaveAttribute("height")
      expect(photo).toHaveAttribute("class", "oembed oembed-photo")
    })

    test("Correctly embed when oEmbed type is video", async () => {
      const md = dedent`
        https://oembed.example.com/video
      `

      const { html } = await process(md)
      render(html)

      const video = document.querySelector(".oembed-video")
      expect(video).not.toBeNull()
      expect(video).not.toHaveAttribute("href")
      expect(video).toHaveAttribute("class", "oembed oembed-video")
      expect(video?.querySelector("object")).not.toBeNull()
    })

    test("Correctly embed when oEmbed type is rich", async () => {
      const md = dedent`
        https://oembed.example.com/rich
      `

      const { html } = await process(md)
      render(html)

      const rich = document.querySelector(".oembed-rich")
      expect(rich).not.toBeNull()
      expect(rich).not.toHaveAttribute("href")
      expect(rich).toHaveAttribute("class", "oembed oembed-rich")
      expect(rich?.querySelector("iframe")).not.toBeNull()
    })
  })

  describe("transformerLinkCard", () => {
    test("Correctly generate link card when Open Graph metadata is available", async () => {
      const md = dedent`
        https://open-graph.example.com
      `

      const { html } = await process(md)
      render(html)

      const root = document.querySelector(".link-card")
      expect(root).not.toBeNull()
      expect(root).toHaveAttribute("href", "https://open-graph.example.com/")
      expect(root).toHaveAttribute("target", "_blank")
      expect(root).toHaveAttribute("rel", "noopener noreferrer")

      const container = root?.querySelector(".link-card__container")
      expect(container).not.toBeNull()

      const info = container?.querySelector(".link-card__info")
      expect(info).not.toBeNull()

      const title = info?.querySelector(".link-card__title")
      expect(title).not.toBeNull()
      expect(title).toHaveTextContent("Open Graph")

      const description = info?.querySelector(".link-card__description")
      expect(description).not.toBeNull()
      expect(description).toHaveTextContent("An example of Open Graph")

      const link = info?.querySelector(".link-card__link")
      expect(link).not.toBeNull()

      const favicon = link?.querySelector(".link-card__favicon")
      expect(favicon).not.toBeNull()
      expect(favicon).toHaveAttribute("src")
      expect(favicon).toHaveAttribute(
        "alt",
        "Favicon for open-graph.example.com",
      )
      expect(favicon).toHaveAttribute("loading", "lazy")
      expect(favicon).toHaveAttribute("decoding", "async")

      const hostname = link?.querySelector(".link-card__hostname")
      expect(hostname).not.toBeNull()
      expect(hostname).toHaveTextContent("open-graph.example.com")

      const image = container?.querySelector(".link-card__image img")
      expect(image).not.toBeNull()
      expect(image).toHaveAttribute("src")
      expect(image).toHaveAttribute("loading", "lazy")
      expect(image).toHaveAttribute("decoding", "async")
    })

    test("Correctly generate link card when Twitter Card metadata is available", async () => {
      const md = dedent`
        https://twitter-card.example.com
      `

      const { html } = await process(md)
      render(html)

      const root = document.querySelector(".link-card")
      expect(root).not.toBeNull()
      expect(root).toHaveAttribute("href", "https://twitter-card.example.com/")
      expect(root).toHaveAttribute("target", "_blank")
      expect(root).toHaveAttribute("rel", "noopener noreferrer")

      const container = root?.querySelector(".link-card__container")
      expect(container).not.toBeNull()

      const info = container?.querySelector(".link-card__info")
      expect(info).not.toBeNull()

      const title = info?.querySelector(".link-card__title")
      expect(title).not.toBeNull()
      expect(title).toHaveTextContent("Twitter Card")

      const description = info?.querySelector(".link-card__description")
      expect(description).not.toBeNull()
      expect(description).toHaveTextContent("An example of Twitter Card")

      const link = info?.querySelector(".link-card__link")
      expect(link).not.toBeNull()

      const favicon = link?.querySelector(".link-card__favicon")
      expect(favicon).not.toBeNull()
      expect(favicon).toHaveAttribute("src")
      expect(favicon).toHaveAttribute(
        "alt",
        "Favicon for twitter-card.example.com",
      )
      expect(favicon).toHaveAttribute("loading", "lazy")
      expect(favicon).toHaveAttribute("decoding", "async")

      const hostname = link?.querySelector(".link-card__hostname")
      expect(hostname).not.toBeNull()
      expect(hostname).toHaveTextContent("twitter-card.example.com")

      const image = container?.querySelector(".link-card__image img")
      expect(image).not.toBeNull()
      expect(image).toHaveAttribute("src")
      expect(image).toHaveAttribute("loading", "lazy")
      expect(image).toHaveAttribute("decoding", "async")
    })

    test("Correctly generate link card when Open Graph and Twitter Card metadata are available", async () => {
      const md = dedent`
        https://open-graph.example.com/with-twitter-card
      `

      const { html } = await process(md)
      render(html)

      const root = document.querySelector(".link-card")
      expect(root).not.toBeNull()
      expect(root).toHaveAttribute(
        "href",
        "https://open-graph.example.com/with-twitter-card/",
      )
      expect(root).toHaveAttribute("target", "_blank")
      expect(root).toHaveAttribute("rel", "noopener noreferrer")

      const container = root?.querySelector(".link-card__container")
      expect(container).not.toBeNull()

      const info = container?.querySelector(".link-card__info")
      expect(info).not.toBeNull()

      const title = info?.querySelector(".link-card__title")
      expect(title).not.toBeNull()
      expect(title).toHaveTextContent("Open Graph")

      const description = info?.querySelector(".link-card__description")
      expect(description).not.toBeNull()
      expect(description).toHaveTextContent("An example of Open Graph")

      const link = info?.querySelector(".link-card__link")
      expect(link).not.toBeNull()

      const favicon = link?.querySelector(".link-card__favicon")
      expect(favicon).not.toBeNull()
      expect(favicon).toHaveAttribute("src")
      expect(favicon).toHaveAttribute(
        "alt",
        "Favicon for open-graph.example.com",
      )
      expect(favicon).toHaveAttribute("loading", "lazy")
      expect(favicon).toHaveAttribute("decoding", "async")

      const hostname = link?.querySelector(".link-card__hostname")
      expect(hostname).not.toBeNull()
      expect(hostname).toHaveTextContent("open-graph.example.com")

      const image = container?.querySelector(".link-card__image img")
      expect(image).not.toBeNull()
      expect(image).toHaveAttribute("src")
      expect(image).toHaveAttribute("loading", "lazy")
      expect(image).toHaveAttribute("decoding", "async")
    })

    test("Correctly generate link card when Open Graph and Twitter Card metadata are not available", async () => {
      const md = dedent`
        https://www.example.com
      `

      const { html } = await process(md)
      render(html)

      const root = document.querySelector(".link-card")
      expect(root).not.toBeNull()
      expect(root).toHaveAttribute("href", "https://www.example.com/")
      expect(root).toHaveAttribute("target", "_blank")
      expect(root).toHaveAttribute("rel", "noopener noreferrer")

      const container = root?.querySelector(".link-card__container")
      expect(container).not.toBeNull()

      const info = container?.querySelector(".link-card__info")
      expect(info).not.toBeNull()

      const title = info?.querySelector(".link-card__title")
      expect(title).not.toBeNull()
      expect(title).toHaveTextContent("Example Domain")

      const description = info?.querySelector(".link-card__description")
      expect(description).toBeNull()

      const link = info?.querySelector(".link-card__link")
      expect(link).not.toBeNull()

      const favicon = link?.querySelector(".link-card__favicon")
      expect(favicon).not.toBeNull()
      expect(favicon).toHaveAttribute("src")
      expect(favicon).toHaveAttribute("alt", "Favicon for www.example.com")
      expect(favicon).toHaveAttribute("loading", "lazy")
      expect(favicon).toHaveAttribute("decoding", "async")

      const hostname = link?.querySelector(".link-card__hostname")
      expect(hostname).not.toBeNull()
      expect(hostname).toHaveTextContent("www.example.com")

      const image = container?.querySelector(".link-card__image img")
      expect(image).toBeNull()
    })
  })
})
