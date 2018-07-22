export const shallowEqual = (a, b) => {
  if (Object.is(a, b)) {
    return true
  }

  if (typeof a !== 'object' || b === null || typeof a !== 'object' || b === null) {
    return false
  }

  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
    return false
  }

  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  if (keysA.length !== keysB.length) {
    return false
  }

  for (let i = 0; i < keysA.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(b, keysA[i]) || !Object.is(a[keysA[i]], b[keysA[i]])) {
      return false
    }
  }

  return true
}

export const iterChildren = (el, cb) => {
  const $children = (() => {
    if (el instanceof DocumentFragment) {
      return el.children[0].childNodes
    }

    return el.querySelectorAll('*')
  })()

  return new Promise((y, n) => {
    try {
      for (let i = 0, l = $children.length; i < l; i++) {
        cb($children[i])

        if (i === l - 1) {
          y()
        }
      }
    } catch (e) {
      n(e)
    }
  })
}

export const frag = str => document.createRange().createContextualFragment(str)

export function iterVars(el, cb) {
  try {
    const vars = (el.nodeValue || el.innerText).match(/({([A-z]+)})/g) || []

    for (let i = 0, l = vars.length; i < l; i++) {
      cb(vars[i], vars[i].slice(1, -1))
    }
  } catch (e) {}
}
