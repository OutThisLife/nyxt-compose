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

export const frag = str =>
  document.createRange().createContextualFragment(
    str
      .toString()
      .replace(/\s\s+/g, ' ')
      .trim()
  )

export const iter = (set, cb) => {
  for (let i = 0, l = set.length; i < l; i++) {
    if (cb(set[i]) === -1) {
      break
    }
  }
}

export const snakeCase = str => str.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase()

export const raf = cb => window.requestAnimationFrame(cb)
