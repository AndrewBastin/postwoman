export type KeysMatching<T, V> = {
  [K in keyof T]-?: T[K] extends V ? K : never
}[keyof T]

/**
 * Branded types are types that are identical to another type, but
 * makes the type system treat them as distinct types. This is useful
 * to avoid mixing up values of the same type (like ids) from being used wrongly
 * and to also to represent provenance of a value.
 *
 * Read more: https://egghead.io/blog/using-branded-types-in-typescript
 */
export type Brand<T, Tag> = T & { __brand: Tag }
