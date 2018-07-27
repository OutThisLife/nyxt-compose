const PI = Math.PI
const HALF_PI = PI * 0.5
const TWO_PI = PI * 2
const RADIAN = 180 / PI

const MAX_SIGNED_32_BIT_INT = Math.pow(2, 31) - 1
const MIN_SIGNED_32_BIT_INT = ~MAX_SIGNED_32_BIT_INT

// ECMAScript 6 - MIN/MAX safe integer
if (Number.MAX_SAFE_INTEGER === void 0) {
  Number.MIN_SAFE_INTEGER = -(Number.MAX_SAFE_INTEGER = Math.pow(2, 53) - 1)
}

export const ABS_INT = n => (n ^ (n >> 31)) - (n >> 31)

export const MAX_INT = (a, b) => a - ((a - b) & ((a - b) >> 31))

export const MIN_INT = (a, b) => a - ((a - b) & ((b - a) >> 31))

export const CLAMP_INT = (x, min, max) => {
  x = x - ((x - max) & ((max - x) >> 31))
  return x - ((x - min) & ((x - min) >> 31))
}

export const IS_INT_POWER_OF_TWO = value => (value & (value - 1)) === 0 && value !== 0

export const PLUS_ONE_INT = n => -~n

export const MINUS_ONE_INT = () => ~-n

export const IS_ODD_INT = n => (n & 1) === 1

export const ARRAY_SWAP_INT = (array, i, j) => {
  array[i] ^= array[j]
  array[j] ^= array[i]
  array[i] ^= array[j]
}

export const HAS_SAME_SIGN = (a, b) => (a ^ b) >= 0

export const POW_OF_2_INT = n => 2 << (n - 1)

export const AVG_INT = (a, b) => (a + b) >> 1

export const TOGGLE_A_B_INT = (n, a, b) => a ^ b ^ n

export const SET_BIT = (n, bit) => n | (1 << bit)

export const CLEAR_BIT = (n, bit) => n & ~(1 << bit)

export const MODULO_INT = (numerator, divisor) => numerator & (divisor - 1)
