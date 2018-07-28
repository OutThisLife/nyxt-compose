declare var global: any = {}

global.PI = Math.PI
global.HALF_PI = global.PI * 0.5
global.TWO_PI = global.PI * 2
global.RADIAN = 180 / global.PI

global.MAX_SIGNED_32_BIT_INT = Math.pow(2, 31) - 1
global.MIN_SIGNED_32_BIT_INT = ~global.MAX_SIGNED_32_BIT_INT

export const ABS_INT = (n: number): number => (n ^ (n >> 31)) - (n >> 31)
export const MAX_INT = (a: number, b: number): number => a - ((a - b) & ((a - b) >> 31))
export const MIN_INT = (a: number, b: number): number => a - ((a - b) & ((b - a) >> 31))
export const IS_INT_POWER_OF_TWO = (n: number): boolean => (n & (n - 1)) === 0 && n !== 0
export const PLUS_ONE_INT = (n: number): number => -~n
export const MINUS_ONE_INT = (n: number): number => ~-n
export const IS_ODD_INT = (n: number): boolean => (n & 1) === 1
export const HAS_SAME_SIGN = (a: number, b: number): boolean => (a ^ b) >= 0
export const POW_OF_2_INT = (n: number): number => 2 << (n - 1)
export const AVG_INT = (a: number, b: number): number => (a + b) >> 1
export const TOGGLE_A_B_INT = (n: number, a: number, b: number): number => a ^ b ^ n
export const SET_BIT = (n: number, bit: number): number => n | (1 << bit)
export const CLEAR_BIT = (n: number, bit: number): number => n & ~(1 << bit)
export const MODULO_INT = (numerator: number, divisor: number): number => numerator & (divisor - 1)

export const ARRAY_SWAP_INT = (r: number[], i: number, j: number): void => {
  r[i] ^= r[j]
  r[j] ^= r[i]
  r[i] ^= r[j]
}

export const CLAMP_INT = (x: number, min: number, max: number): number => {
  x = x - ((x - max) & ((max - x) >> 31))
  return x - ((x - min) & ((x - min) >> 31))
}

// -------------------------------------------------

export const frag = (str: string): DocumentFragment =>
  document.createRange().createContextualFragment(
    str
      .toString()
      .replace(/\s\s+/g, ' ')
      .trim()
  )

export const iter = (set: any[] | number, cb: Function = () => {}): void => {
  let l: number

  if (typeof set === 'object') {
    l = set.length
  } else {
    l = set
  }

  for (let i = 0; i < l; i++) {
    if (cb(typeof set === 'object' ? set[i] : i) === -1) {
      break
    }
  }
}

export const snakeCase = (str: string): string => str.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase()

export const raf = (cb = () => {}, throttle = true) => {
  if (throttle && !global.tick) {
    window.requestAnimationFrame(() => {
      delete global.tick
      cb()
    })

    global.tick = true
  } else if (!throttle) {
    window.requestAnimationFrame(cb)
  }
}

export const shallowEqual = (a: any = {}, b: any = {}): boolean => {
  if (Object.is(a, b)) {
    return true
  } else if (
    typeof a !== 'object' ||
    b === null ||
    typeof a !== 'object' ||
    b === null ||
    Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)
  ) {
    return false
  }

  const keysA = Object.keys(a)
  const len = keysA.length

  if (len ^ Object.keys(b).length) {
    return false
  }

  let res = true

  iter(len, (i: number) => {
    if (!Object.prototype.hasOwnProperty.call(b, keysA[i]) || !Object.is(a[keysA[i]], b[keysA[i]])) {
      res = false
      return -1
    }
  })

  return res
}
