/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */

declare type Awaitable<V> = PromiseLike<V> | V

declare type Writeable<T> = { -readonly [P in keyof T]: T[P] }

/* eslint-disable @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-empty-object-type */
// https://stackoverflow.com/a/49670389
declare type DeepReadonly<T> = T extends (infer R)[]
  ? DeepReadonlyArray<R>
  : T extends Function
    ? T
    : T extends object
      ? DeepReadonlyObject<T>
      : T

interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

type DeepReadonlyObject<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>
}
/* eslint-enable @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-empty-object-type */
