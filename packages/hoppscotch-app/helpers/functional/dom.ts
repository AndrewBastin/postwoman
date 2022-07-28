import * as O from "fp-ts/Option"

/**
 * Gets the children of a DOM element as an array
 * @param el The element to get the children of
 * @returns The children of the given element as an array
 */
export const domGetChildrenOfEl = (el: Element) => {
  const arr = []

  for (let i = 0; i < el.children.length; i++) {
    arr.push(el.children.item(i)!)
  }

  return arr
}

/**
 * Gets the attribute present in an element as an Option
 * @param attr The attribute to look for
 */
export const domElGetAttribute =
  (attr: string) =>
  (el: Element): O.Option<string> =>
    el.hasAttribute(attr) ? O.some(el.getAttribute(attr)!) : O.none
